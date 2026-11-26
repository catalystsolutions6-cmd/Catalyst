/**
 * Product photo -> listing draft, using Google Gemini (free tier works).
 *
 * Get a free key at https://aistudio.google.com/apikey and set GEMINI_API_KEY.
 * Optional env:
 *   GROQ_API_KEY  optional free backup AI (https://console.groq.com/keys) used when Gemini is busy or out of quota
 *   GROQ_MODEL    (default "qwen/qwen3.8-27b")
 *   GEMINI_MODEL  (default "gemini-flash-latest", Google's alias for the newest Flash model;
 *                  if that name is unavailable, picks the newest Flash model the key can use)
 * Uses the Gemini REST API directly (no SDK). Depends only on zod.
 */
import { z } from "zod";

export const CATEGORY_SLUGS = [
  "laptops",
  "desktops",
  "monitors-lcds",
  "headphones",
  "accessories",
  "gaming",
  "storage",
  "networking",
  "mobiles-tablets",
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];
export type Condition = "new" | "used" | "refurbished";

export interface ListingDraft {
  title: string;
  description: string;
  categorySlug: CategorySlug;
  brand: string;
  model: string;
  condition: Condition;
  specs: Record<string, string>;
  /** 0..1, how sure the model is about the exact product identification. */
  confidence: number;
}

export class AnalyzeError extends Error {
  constructor(
    message: string,
    /** Suggested HTTP status for the route handler. */
    public status: number,
  ) {
    super(message);
  }
}

const SUPPORTED_MEDIA = ["image/jpeg", "image/png", "image/webp"] as const;
type SupportedMedia = (typeof SUPPORTED_MEDIA)[number];
const MAX_BYTES = 5 * 1024 * 1024;

const DraftSchema = z.object({
  is_product: z.boolean(),
  title: z.string(),
  description: z.string(),
  category_slug: z.enum(CATEGORY_SLUGS),
  brand: z.string(),
  model: z.string(),
  condition: z.enum(["new", "used", "refurbished"]),
  specs: z.array(z.object({ name: z.string(), value: z.string() })),
  confidence: z.number(),
});

// Same shape as DraftSchema, in the OpenAPI subset Gemini's responseSchema accepts.
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    is_product: { type: "BOOLEAN", description: "false if the photo does not show a sellable tech product" },
    title: { type: "STRING" },
    description: { type: "STRING" },
    category_slug: { type: "STRING", enum: [...CATEGORY_SLUGS] },
    brand: { type: "STRING" },
    model: { type: "STRING" },
    condition: { type: "STRING", enum: ["new", "used", "refurbished"] },
    specs: {
      type: "ARRAY",
      items: { type: "OBJECT", properties: { name: { type: "STRING" }, value: { type: "STRING" } }, required: ["name", "value"] },
    },
    confidence: { type: "NUMBER" },
  },
  required: ["is_product", "title", "description", "category_slug", "brand", "model", "condition", "specs", "confidence"],
  propertyOrdering: ["is_product", "title", "category_slug", "brand", "model", "condition", "specs", "description", "confidence"],
};

const SYSTEM_PROMPT = `You write product listings for a Pakistani online marketplace that sells only tech products (laptops, desktops, monitors/LCDs, headphones, accessories, gaming gear, storage, networking, mobiles and tablets). Shopkeepers in Lahore electronics markets photograph an item with their phone and you draft the listing from the photo. The shopkeeper reviews and edits it before it goes live, and sets the price themselves.

Identify the product from everything visible: logos, model numbers on stickers, boxes and labels, spec stickers (CPU, RAM, GPU badges), port layout, design. Read text in the photo carefully.

Fields:
- title: how a buyer would search for it, at most 80 characters. Brand + model + the 1-3 specs that matter most for that category (e.g. "Dell Latitude 5420 Core i5 11th Gen 16GB 256GB SSD 14\\""). Leave out specs you cannot see or reliably infer.
- description: 2-4 short sentences in plain English for buyers, then nothing else. Mention condition cues you can actually see (box, seal, scratches, wear). No prices, no phone numbers, no warranty promises, no hype words.
- category_slug: the single best category.
- brand, model: as printed on the product when visible; otherwise your best identification, or "" if unknown.
- condition: "new" only if it looks sealed or in-box unused; "used" if wear or no packaging; "refurbished" only if a refurbished label is visible. When unsure, "used".
- specs: 3-8 key specs relevant to the category (laptop: Processor, RAM, Storage, Display, Graphics; monitor: Screen Size, Resolution, Refresh Rate, Panel; headphones: Type, Connectivity, Noise Cancellation; etc.). Only include a spec if it is visible in the photo or is fixed for that exact model. Never invent configurable specs like RAM or storage when they are not shown.
- confidence: 0 to 1, how sure you are of the exact brand and model.
- is_product: false if the photo shows no sellable tech product (then fill the other fields with your best guess or empty strings).`;

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; message?: string; status?: string };
};

let resolvedModel: string | null = null;

/** Lists the models this key can use and picks the newest general-purpose Flash model. */
async function findFlashModels(key: string): Promise<string[]> {
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
      headers: { "x-goog-api-key": key },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const { models = [] } = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
    const names = models
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""))
      .filter((n) => /flash/.test(n) && !/image|tts|audio|live|thinking|exp|preview/.test(n));
    const version = (n: string) => parseFloat(n.match(/(\d+(\.\d+)?)/)?.[1] || "0");
    // Newest full Flash models first, Flash-Lite models after them as a fallback.
    names.sort((a, b) => Number(/lite/.test(a)) - Number(/lite/.test(b)) || version(b) - version(a) || a.length - b.length);
    return names;
  } catch {
    return [];
  }
}

type CallResult = { status: number; data: GeminiResponse };
// Models that rejected the low-thinking setting (older models); we stop sending it to them.
const noThinkingConfig = new Set<string>();

async function callGemini(model: string, key: string, mediaType: SupportedMedia, base64: string, timeoutMs: number): Promise<CallResult> {
  const send = async (withThinking: boolean): Promise<CallResult> => {
    const generationConfig: Record<string, unknown> = { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA, temperature: 0.2 };
    // Newer Flash models "think" before answering, which can take most of a minute. A listing doesn't need it.
    if (withThinking) generationConfig.thinkingConfig = { thinkingLevel: "low" };
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ inlineData: { mimeType: mediaType, data: base64 } }, { text: "Draft the listing for this product photo." }] }],
          generationConfig,
        }),
      });
      return { status: res.status, data: (await res.json().catch(() => ({}))) as GeminiResponse };
    } catch (err) {
      if ((err as Error).name === "TimeoutError") return { status: 504, data: { error: { message: `${model} timed out` } } };
      throw err;
    }
  };
  const useThinking = !noThinkingConfig.has(model);
  let r = await send(useThinking);
  if (useThinking && r.status === 400 && /thinking/i.test(r.data.error?.message || "")) {
    noThinkingConfig.add(model);
    r = await send(false);
  }
  return r;
}

export async function analyzeProductImage(input: { bytes: Buffer; mediaType: string }): Promise<ListingDraft> {
  const mediaType = input.mediaType.toLowerCase().replace("image/jpg", "image/jpeg");
  if (!SUPPORTED_MEDIA.includes(mediaType as SupportedMedia)) {
    throw new AnalyzeError(`Unsupported image type: ${input.mediaType}`, 415);
  }
  if (input.bytes.length === 0) throw new AnalyzeError("Empty image", 400);
  if (input.bytes.length > MAX_BYTES) throw new AnalyzeError("Image is larger than 5 MB, please resize before upload", 413);
  const base64 = input.bytes.toString("base64");
  const media = mediaType as SupportedMedia;

  const gemini = process.env.GEMINI_API_KEY;
  const groq = process.env.GROQ_API_KEY;
  if (!gemini && !groq) throw new AnalyzeError("AI is not configured (set GEMINI_API_KEY)", 503);
  // Vercel stops the function at 60 s. With a backup AI configured, leave it ~17 s.
  const start = Date.now();
  if (gemini) {
    try {
      return await analyzeWithGemini(gemini, media, base64, start + (groq ? 38_000 : 55_000));
    } catch (e) {
      const fallbackWorthy = e instanceof AnalyzeError && [429, 502, 503, 504].includes(e.status);
      if (!groq || !fallbackWorthy) throw e;
      console.warn("Gemini failed, trying Groq:", (e as Error).message);
    }
  }
  return analyzeWithGroq(groq!, media, base64, start + 56_000);
}

async function analyzeWithGemini(key: string, media: SupportedMedia, base64: string, deadline: number): Promise<ListingDraft> {
  const left = () => deadline - Date.now();
  // 429 is per model on the free tier, so another model may still have quota left.
  const retryable = (st: number) => st === 404 || st === 429 || st === 500 || st === 503 || st === 504;
  let r: CallResult;
  try {
    let model = process.env.GEMINI_MODEL || resolvedModel || "gemini-flash-latest";
    r = await callGemini(model, key, media, base64, Math.min(25_000, left()));
    if (retryable(r.status) && left() > 8_000) {
      // Model unavailable, overloaded or slow: try other Flash models this key can use (Flash-Lite last).
      const tried = new Set([model]);
      for (const candidate of (await findFlashModels(key)).filter((m) => !tried.has(m))) {
        if (left() < 8_000) break;
        model = candidate;
        r = await callGemini(model, key, media, base64, Math.min(20_000, left()));
        if (!retryable(r.status)) break;
      }
    }
    if (r.status === 200) resolvedModel = model;
  } catch {
    throw new AnalyzeError("Could not reach the AI service, please try again", 502);
  }

  const { status, data } = r;
  if (status === 504) throw new AnalyzeError("AI took too long, please try again", 504);
  if (status === 503 || status === 500) throw new AnalyzeError("The free AI is busy right now, please try again in a minute", 503);
  if (status === 429) {
    console.error("Gemini quota", data.error?.message);
    const daily = /per ?day|daily|PerDay/i.test(data.error?.message || "");
    throw new AnalyzeError(daily ? "Today's free AI limit is used up. It resets at 1 PM Pakistan time; until then please type the details." : "Free AI limit reached for now, please try again in a minute", 429);
  }
  if (status === 400 && /api key/i.test(data.error?.message || "")) throw new AnalyzeError("AI key is invalid (check GEMINI_API_KEY)", 503);
  if (status === 401 || status === 403) throw new AnalyzeError("AI key is invalid or not allowed (check GEMINI_API_KEY)", 503);
  if (status === 400) throw new AnalyzeError("The photo could not be read, please retake it", 400);
  if (status !== 200) {
    console.error("Gemini error", status, data.error);
    const why = (data.error?.message || data.error?.status || "").replace(/\s+/g, " ").slice(0, 160);
    throw new AnalyzeError(`AI service error, please try again (Gemini ${status}${why ? ": " + why : ""})`, 502);
  }
  if (data.promptFeedback?.blockReason) throw new AnalyzeError("This photo could not be processed, please fill the listing manually", 422);

  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return toDraft(text);
}

/** Validates the model's JSON and turns it into a ListingDraft. */
function toDraft(text: string): ListingDraft {
  let parsed;
  try {
    parsed = DraftSchema.safeParse(JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")));
  } catch {
    parsed = null;
  }
  if (!parsed?.success) throw new AnalyzeError("AI returned an incomplete result, please try again", 502);
  const out = parsed.data;
  if (!out.is_product) throw new AnalyzeError("No product found in the photo, please retake it closer", 422);

  const specs: Record<string, string> = {};
  for (const { name, value } of out.specs.slice(0, 12)) {
    if (name.trim() && value.trim()) specs[name.trim()] = value.trim();
  }

  return {
    title: out.title.trim().slice(0, 120),
    description: out.description.trim(),
    categorySlug: out.category_slug,
    brand: out.brand.trim(),
    model: out.model.trim(),
    condition: out.condition,
    specs,
    confidence: Math.max(0, Math.min(1, out.confidence)),
  };
}

// ---- Optional backup: Groq (free tier, OpenAI-compatible API). Used only if GROQ_API_KEY is set
// and Gemini is busy, out of free quota, or slow. Free key: https://console.groq.com/keys
async function analyzeWithGroq(key: string, media: SupportedMedia, base64: string, deadline: number): Promise<ListingDraft> {
  const model = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
  const shape = `Reply with only a JSON object with exactly these keys: is_product (boolean), title (string), description (string), category_slug (one of: ${CATEGORY_SLUGS.join(", ")}), brand (string), model (string), condition ("new" | "used" | "refurbished"), specs (array of {"name": string, "value": string}), confidence (number 0-1).`;
  let res: Response;
  try {
    res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(Math.max(5_000, deadline - Date.now())),
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${SYSTEM_PROMPT}\n\n${shape}` },
          {
            role: "user",
            content: [
              { type: "text", text: "Draft the listing for this product photo." },
              { type: "image_url", image_url: { url: `data:${media};base64,${base64}` } },
            ],
          },
        ],
      }),
    });
  } catch (err) {
    if ((err as Error).name === "TimeoutError") throw new AnalyzeError("AI took too long, please try again", 504);
    throw new AnalyzeError("Could not reach the AI service, please try again", 502);
  }
  const data = (await res.json().catch(() => ({}))) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
  if (res.status === 429) throw new AnalyzeError("Free AI limit reached for now, please try again in a minute", 429);
  if (res.status === 401 || res.status === 403) throw new AnalyzeError("Backup AI key is invalid (check GROQ_API_KEY)", 503);
  if (!res.ok) {
    console.error("Groq error", res.status, data.error);
    throw new AnalyzeError(`AI service error, please try again (Groq ${res.status}: ${(data.error?.message || "").slice(0, 160)})`, 502);
  }
  return toDraft(data.choices?.[0]?.message?.content ?? "");
}
