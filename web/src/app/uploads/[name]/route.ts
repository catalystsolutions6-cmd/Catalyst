import { readFile } from "fs/promises";
import path from "path";
import { UPLOAD_DIR } from "@/lib/uploads";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!/^[A-Za-z0-9._-]+$/.test(name)) return new Response("Not found", { status: 404 });
  const type = TYPES[name.split(".").pop() || ""];
  if (!type) return new Response("Not found", { status: 404 });
  try {
    const buf = await readFile(path.join(UPLOAD_DIR, name));
    return new Response(new Uint8Array(buf), { headers: { "content-type": type, "cache-control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
