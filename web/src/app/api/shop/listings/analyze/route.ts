import { getShopFromRequest, jsonError } from "@/lib/auth";
import { UploadError, loadImage, saveImage } from "@/lib/uploads";
import { AnalyzeError, analyzeProductImage } from "@/lib/analyze";

export const maxDuration = 60;

export async function POST(req: Request) {
  const shop = await getShopFromRequest(req);
  if (!shop) return jsonError("Unauthorized", 401);

  let bytes: Buffer;
  let mediaType: string;
  let imageUrl: string;
  const ct = req.headers.get("content-type") || "";
  try {
    if (ct.includes("multipart/form-data")) {
      const file = (await req.formData()).get("image");
      if (!(file instanceof File)) return jsonError('Send the photo as multipart field "image"', 400);
      ({ bytes, mediaType, url: imageUrl } = await saveImage(file));
    } else {
      const body = await req.json().catch(() => null);
      imageUrl = String(body?.imageUrl ?? "");
      ({ bytes, mediaType } = await loadImage(imageUrl));
    }
  } catch (e) {
    if (e instanceof UploadError) return jsonError(e.message, 400);
    console.error("image load/save failed", e);
    return jsonError("Could not save the photo, please try again", 502);
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
