import { db } from "@/lib/db";

export async function GET() {
  const cats = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  return Response.json(cats.map((c) => ({ slug: c.slug, name: c.name })));
}
