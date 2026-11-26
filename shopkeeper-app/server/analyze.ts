/**
 * Product photo -> listing draft, using Claude vision.
 *
 * Drop-in module for the marketplace backend (copy to src/lib/analyze.ts).
 * Reads ANTHROPIC_API_KEY from the environment. Depends only on @anthropic-ai/sdk and zod.
 *
 * Optional env:
 *   ANALYZE_MODEL   (default "claude-opus-5-5")
 *   ANALYZE_EFFORT  low | medium | high (default "low": a shopkeeper is waiting on this)
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
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

const SUPPORTED_MEDIA = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type SupportedMedia = (typeof SUPPORTED_MEDIA)[number];
const MAX_BYTES = 5 * 1024 * 1024; // API limit per image (base64 adds ~33%, still under request cap)

const DraftSchema = z.object({
  is_product: z
    .boolean()
    .describe("false if the photo does not show a sellable tech product"),
  title: z.string(),
  description: z.string(),
  category_slug: z.enum(CATEGORY_SLUGS),
  brand: z.string(),
  model: z.string(),
  condition: z.enum(["new", "used", "refurbished"]),
  specs: z.array(z.object({ name: z.string(), value: z.string() })),
  confidence: z.number(),
});

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

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AnalyzeError("AI is not configured (ANTHROPIC_API_KEY missing)", 503);
  }
  client ??= new Anthropic();
  return client;
}

export async function analyzeProductImage(input: {
  bytes: Buffer;
  mediaType: string;
}): Promise<ListingDraft> {
  const mediaType = input.mediaType.toLowerCase().replace("image/jpg", "image/jpeg");
  if (!SUPPORTED_MEDIA.includes(mediaType as SupportedMedia)) {
    throw new AnalyzeError(`Unsupported image type: ${input.mediaType}`, 415);
  }
  if (input.bytes.length === 0) throw new AnalyzeError("Empty image", 400);
  if (input.bytes.length > MAX_BYTES) {
    throw new AnalyzeError("Image is larger than 5 MB, please resize before upload", 413);
  }

  const effort = (process.env.ANALYZE_EFFORT ?? "low") as "low" | "medium" | "high";

  let response;
  try {
    response = await getClient().beta.messages.parse({
      model: process.env.ANALYZE_MODEL ?? "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      // If a safety classifier declines, the API retries on a fallback model in the same call.
      fallbacks: "default",
      output_config: { effort, format: betaZodOutputFormat(DraftSchema) },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as SupportedMedia,
                data: input.bytes.toString("base64"),
              },
            },
            { type: "text", text: "Draft the listing for this product photo." },
          ],
        },
      ],
    });
  } catch (err) {
    if (err instanceof AnalyzeError) throw err;
    if (err instanceof Anthropic.RateLimitError) {
      throw new AnalyzeError("AI is busy, please try again in a moment", 429);
    }
    if (err instanceof Anthropic.BadRequestError) {
      throw new AnalyzeError("The photo could not be read, please retake it", 400);
    }
    if (err instanceof Anthropic.APIError) {
      throw new AnalyzeError("AI service error, please try again", 502);
    }
    throw err; // network errors etc. surface as 500
  }

  if (response.stop_reason === "refusal") {
    throw new AnalyzeError("This photo could not be processed, please fill the listing manually", 422);
  }
  const out = response.parsed_output;
  if (!out) throw new AnalyzeError("AI returned an incomplete result, please try again", 502);
  if (!out.is_product) {
    throw new AnalyzeError("No product found in the photo, please retake it closer", 422);
  }

  const specs: Record<string, string> = {};
  for (const { name, value } of out.specs) {
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
