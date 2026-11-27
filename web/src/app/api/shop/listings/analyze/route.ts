import { getShopFromRequest, jsonError } from "@/lib/auth";
import { StorageConfigError, UploadError, storageErrorHint, loadImage, saveImage } from "@/lib/uploads";
import { AnalyzeError, analyzeProductImage } from "@/lib/analyze";

export const maxDuration = 60;

type Outcome = { status: number; body: Record<string, unknown> };

async function run(req: Request): Promise<Outcome> {
  let bytes: Buffer;
  let mediaType: string;
  let imageUrl: string;
  const ct = req.headers.get("content-type") || "";
  try {
    if (ct.includes("multipart/form-data")) {
      const file = (await req.formData()).get("image");
      if (!(file instanceof File)) return { status: 400, body: { error: 'Send the photo as multipart field "image"' } };
      ({ bytes, mediaType, url: imageUrl } = await saveImage(file));
    } else {
      const body = await req.json().catch(() => null);
      imageUrl = String(body?.imageUrl ?? "");
      ({ bytes, mediaType } = await loadImage(imageUrl));
    }
  } catch (e) {
    if (e instanceof UploadError) return { status: 400, body: { error: e.message } };
    if (e instanceof StorageConfigError) return { status: 503, body: { error: e.message } };
    console.error("image load/save failed", e);
    return { status: 502, body: { error: `Could not save the photo, please try again (${storageErrorHint(e)})` } };
  }

  try {
    const result = await analyzeProductImage({ bytes, mediaType });
    return { status: 200, body: { ...result, imageUrl } };
  } catch (e) {
    if (e instanceof AnalyzeError) return { status: e.status, body: { error: e.message } };
    console.error("analyze failed", e);
    return { status: 502, body: { error: "Could not read the photo, please try again" } };
  }
}

/**
 * ?stream=1: answer 200 at once and send a space every few seconds until the result is ready.
 * The AI can take most of a minute, and some mobile networks drop a connection that stays silent
 * that long. Leading spaces are valid JSON whitespace. Errors come back as {error, status} in the body.
 */
function streamed(work: Promise<Outcome>) {
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(enc.encode(" "));
      const tick = setInterval(() => controller.enqueue(enc.encode(" ")), 4000);
      try {
        const { status, body } = await work;
        controller.enqueue(enc.encode(JSON.stringify(status >= 400 ? { ...body, status } : body)));
      } catch (e) {
        console.error("analyze stream failed", e);
        controller.enqueue(enc.encode(JSON.stringify({ error: "Could not read the photo, please try again", status: 502 })));
      } finally {
        clearInterval(tick);
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}

export async function POST(req: Request) {
  const shop = await getShopFromRequest(req);
  if (!shop) return jsonError("Unauthorized", 401);

  if (new URL(req.url).searchParams.get("stream") === "1") return streamed(run(req));

  const { status, body } = await run(req);
  return Response.json(body, { status });
}
