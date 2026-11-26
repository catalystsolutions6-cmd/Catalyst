import { readFile } from "fs/promises";
import path from "path";
import { getShopFromRequest, jsonError } from "@/lib/auth";
import { ALLOWED, UPLOAD_DIR, saveImage } from "@/lib/uploads";
import { AnalyzeError, analyzeProductImage } from "@/lib/analyze";

export const maxDuration = 60;

const EXT_TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function POST(req: Request) {
  const shop = await getShopFromRequest(req);
  if (!shop) return jsonError("Unauthorized", 401);

  let bytes: Buffer;
  let mediaType: string;
  let imageUrl: string | undefined;
  const ct = req.headers.get("content-type") || "";
  try {
    if (ct.includes("multipart/form-data")) {
      const file = (await req.formData()).get("image");
      if (!(file instanceof File)) return jsonError('Send the photo as multipart field "image"', 400);
      const saved = await saveImage(file);
      ({ bytes, mediaType, url: imageUrl } = saved);
    } else {
      const body = await req.json().catch(() => null);
      const url = String(body?.imageUrl ?? "");
      const m = url.match(/\/uploads\/([A-Za-z0-9._-]+)$/);
      if (!m) return jsonError("imageUrl must be a url returned by /api/shop/uploads", 400);
      const ext = m[1].split(".").pop() || "";
      mediaType = EXT_TYPES[ext];
      if (!mediaType || !Object.keys(ALLOWED).includes(mediaType)) return jsonError("Unsupported image type", 400);
      bytes = await readFile(path.join(UPLOAD_DIR, m[1])).catch(() => {
        throw new Error("Image not found");
      });
      imageUrl = `/uploads/${m[1]}`;
    }
  } catch (e) {
    return jsonError((e as Error).message, 400);
  }

  try {
    const result = await analyzeProductImage({ bytes, mediaType });
    return Response.json({ ...result, imageUrl });
  } catch (e) {
    if (e instanceof AnalyzeError) return jsonError(e.message, e.status);
    console.error("analyze failed", e);
    return jsonError("Could not read the photo, please try again", 502);
  }
}
