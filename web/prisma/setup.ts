/* Runs on every deploy (npm run vercel-build) and in `npm run setup`.
   - Makes sure the product categories exist (safe to re-run, never deletes anything).
   - If SEED_DEMO=true and the database has no shops yet, loads the demo shops and products. */
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const categories: [string, string][] = [
  ["laptops", "Laptops"],
  ["desktops", "Desktops & PCs"],
  ["monitors-lcds", "Monitors & LCDs"],
  ["headphones", "Headphones & Audio"],
  ["accessories", "Accessories"],
  ["gaming", "Gaming"],
  ["storage", "Storage & Memory"],
  ["networking", "Networking"],
  ["mobiles-tablets", "Mobiles & Tablets"],
];

const db = new PrismaClient();

async function main() {
  for (const [i, [slug, name]] of categories.entries()) {
    await db.category.upsert({ where: { slug }, update: { name, sortOrder: i }, create: { slug, name, sortOrder: i } });
  }
  console.log(`Categories ready (${categories.length}).`);
  const shops = await db.shop.count();
  if (process.env.SEED_DEMO === "true" && shops === 0) {
    await db.$disconnect();
    console.log("SEED_DEMO=true and no shops yet: loading demo data...");
    execSync("tsx prisma/seed.ts", { stdio: "inherit" });
  } else if (process.env.SEED_DEMO === "true") {
    console.log(`Demo data skipped: database already has ${shops} shop(s).`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
