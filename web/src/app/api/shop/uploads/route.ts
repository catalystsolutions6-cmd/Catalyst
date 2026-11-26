import { getShopFromRequest, jsonError } from "@/lib/auth";
import { saveImage } from "@/lib/uploads";

export async function POST(req: Request) {
  const shop = await getShopFromRequest(req);
  if (!shop) return jsonError("Unauthorized", 401);
  const form = await req.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) return jsonError('Send the photo as multipart field "image"', 400);
  try {
    const { url } = await saveImage(file);
    return Response.json({ url }, { status: 201 });
  } catch (e) {
    return jsonError((e as Error).message, 400);
  }
}
