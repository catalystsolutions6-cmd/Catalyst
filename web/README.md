# Tech marketplace (working name "Barq")

Multi-vendor marketplace for tech products by Catalyst Solutions. Shops from Hafeez Center / Hall Road
get a virtual shop; their products appear on one storefront. Customers never see the shop; the admin does.

Stack: Next.js 15 (App Router) · Prisma · SQLite in dev (Postgres in prod) · Tailwind CSS 4.

## Run locally
```bash
cp .env.example .env      # set ADMIN_PASSWORD and ANTHROPIC_API_KEY
npm install
npm run setup             # creates the database and loads demo shops/products
npm run dev               # http://localhost:3000
```
- Storefront: `/`  ·  Admin: `/admin` (ADMIN_EMAIL / ADMIN_PASSWORD from .env)
- Demo shopkeeper app login: `03001234567` / `shop1234`

## Rename the brand
Edit `src/lib/brand.ts` (name, tagline, support phone, delivery fee). Logo mark is in `src/components/Logo.tsx`.

## Shopkeeper app API (Bearer token)
| Method | Path | Body / notes |
|---|---|---|
| POST | /api/shop/auth/login | `{phone, password}` → `{token, shop}` |
| GET | /api/shop/me | → `{shop}` |
| GET | /api/categories | → `[{slug, name}]` (public) |
| POST | /api/shop/uploads | multipart `image` → `{url}` |
| POST | /api/shop/listings/analyze | multipart `image` or `{imageUrl}` → AI draft `{title, description, categorySlug, brand, model, condition, specs, confidence, imageUrl}` |
| GET | /api/shop/products | own products (`?status=draft`) |
| POST | /api/shop/products | `{title, description, categorySlug, brand, model, condition, specs, price, comparePrice?, stock, images, status}` |
| GET/PATCH/DELETE | /api/shop/products/:id | DELETE archives |

Errors are `{error}` with an HTTP status. Prices are integer PKR.

## Going to production
1. In `prisma/schema.prisma` set `provider = "postgresql"`, point `DATABASE_URL` at Postgres (Neon, Supabase, RDS), run `npx prisma db push`.
2. Move uploads from local disk (`src/lib/uploads.ts`) to S3 / Cloudflare R2 / Cloudinary if hosting on Vercel.
3. Set a strong `ADMIN_PASSWORD` and `ANTHROPIC_API_KEY`.
