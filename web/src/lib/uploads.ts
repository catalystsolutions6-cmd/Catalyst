/**
 * Product photo storage. Picks a backend from the environment:
 *   - Vercel Blob   when BLOB_READ_WRITE_TOKEN is set (added automatically when you connect a Blob store in Vercel)
 *   - Cloudinary    when CLOUDINARY_URL is set (cloudinary://API_KEY:API_SECRET@CLOUD_NAME)
 *   - Local disk    otherwise (development only; files go to UPLOAD_DIR and are served at /uploads/<name>)
 * Force one with STORAGE_DRIVER=vercel-blob | cloudinary | local.
 */
import { mkdir, readFile, writeFile } from "fs/promises";
import { createHash } from "crypto";
import path from "path";
import { put } from "@vercel/blob";
import { randomSuffix } from "./util";

export const UPLOAD_DIR = process.env.UPLOAD_DIR || "/tmp";
export const UPLOAD_FOLDER = (process.env.UPLOAD_FOLDER || "products").replace(/[^a-zA-Z0-9/_-]/g, "");
// Vercel functions accept request bodies up to 4.5 MB, so keep uploads under that.
export const MAX_UPLOAD = 4 * 1024 * 1024;
export const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
/** A problem with the image the client sent (bad type, too big): answer 400. Storage failures are other errors (502). */
export class UploadError extends Error {}

const STORAGE_TIMEOUT_MS = 20_000;
const EXT_TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

type Driver = "vercel-blob" | "cloudinary" | "local";

export function storageDriver(): Driver {
  const forced = process.env.STORAGE_DRIVER as Driver | undefined;
  if (forced === "vercel-blob" || forced === "cloudinary" || forced === "local") return forced;
  if (process.env.BLOB_READ_WRITE_TOKEN) return "vercel-blob";
  if (process.env.CLOUDINARY_URL) return "cloudinary";
  return "local";
}

function cloudinaryConfig() {
  const u = new URL(process.env.CLOUDINARY_URL || "");
  if (u.protocol !== "cloudinary:" || !u.username || !u.password || !u.hostname) {
    throw new Error("CLOUDINARY_URL must look like cloudinary://API_KEY:API_SECRET@CLOUD_NAME");
  }
  return { apiKey: decodeURIComponent(u.username), apiSecret: decodeURIComponent(u.password), cloudName: u.hostname };
}

async function uploadCloudinary(bytes: Buffer, mediaType: string, publicId: string) {
  const { apiKey, apiSecret, cloudName } = cloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  // Signature: sorted params joined with & + secret, SHA-1 (https://cloudinary.com/documentation/authentication_signatures)
  const params: Record<string, string | number> = { folder: UPLOAD_FOLDER, public_id: publicId, timestamp };
  const toSign = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  const signature = createHash("sha1").update(toSign + apiSecret).digest("hex");
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type: mediaType }));
  for (const [k, v] of Object.entries(params)) form.append(k, String(v));
  form.append("api_key", apiKey);
  form.append("signature", signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: form, signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS) });
  const data = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !data.secure_url) throw new Error("Cloudinary upload failed: " + (data.error?.message || res.status));
  return data.secure_url;
}

/** Validates and stores an uploaded image. Returns its public URL (absolute for cloud storage,
 *  "/uploads/<name>" for local disk) plus the bytes, so callers can also run AI on it. */
export async function saveImage(file: File) {
  const ext = ALLOWED[file.type];
  if (!ext) throw new UploadError("Only JPEG, PNG or WebP images are allowed");
  if (file.size > MAX_UPLOAD) throw new UploadError("Image is larger than 4 MB");
  const bytes = Buffer.from(await file.arrayBuffer());
  const base = `${Date.now().toString(36)}-${randomSuffix(8)}`;
  const mediaType = file.type;
  let url: string;

  switch (storageDriver()) {
    case "vercel-blob": {
      // The Blob SDK retries on network errors, so cap the whole call, not just one attempt.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), STORAGE_TIMEOUT_MS);
      const blob = await Promise.race(
}
