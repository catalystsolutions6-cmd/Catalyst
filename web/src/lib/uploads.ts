import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomSuffix } from "./util";

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./uploads");
export const MAX_UPLOAD = 8 * 1024 * 1024;
export const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Saves an uploaded image locally and returns its public URL path.
 *  For production, swap this for S3 / Cloudflare R2 / Cloudinary. */
export async function saveImage(file: File) {
  const ext = ALLOWED[file.type];
  if (!ext) throw new Error("Only JPEG, PNG or WebP images are allowed");
  if (file.size > MAX_UPLOAD) throw new Error("Image is larger than 8 MB");
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now().toString(36)}-${randomSuffix(8)}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, name), bytes);
  return { url: `/uploads/${name}`, bytes, mediaType: file.type };
}
