import { readPrivateBlob } from "@/lib/uploads";

// Serves product photos from a private Vercel Blob store (public stores use direct CDN urls instead).
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (!path.length || path.some((p) => !/^[A-Za-z0-9._-]+$/.test(p) || p === "." || p === "..")) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const r = await readPrivateBlob(path.join("/"));
    if (!r || !r.contentType.startsWith("image/")) return new Response("Not found", { status: 404 });
    return new Response(r.stream, {
      headers: { "content-type": r.contentType, "cache-control": "public, max-age=31536000, immutable" },
    });
  } catch (e) {
    console.error("media read failed", e);
    return new Response("Not found", { status: 404 });
  }
}
