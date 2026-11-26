# Tech marketplace (working name "Barq")

Multi-vendor marketplace for tech products by Catalyst Solutions. Shops from Hafeez Center / Hall Road
get a virtual shop; their products appear on one storefront. Customers never see the shop; the admin does.

Stack: Next.js 15 (App Router) · Prisma · SQLite in dev (Postgres in prod) · Tailwind CSS 4.

## Run locally
You need Node 20+ and a Postgres database (a free Neon database works, or local Postgres).
```bash
cp .env.example .env      # set DATABASE_URL, ADMIN_PASSWORD, GEMINI_API_KEY (free), SEED_DEMO=true for demo data
npm install
npm run setup             # creates the tables, categories and (with SEED_DEMO=true) demo shops/products
npm run dev               # http://localhost:3000
```
- Storefront: `/`  ·  Admin: `/admin` (ADMIN_EMAIL / ADMIN_PASSWORD from .env)
- Demo shopkeeper app login (with demo data): `03001234567` / `shop1234`
- `npm run db:seed` wipes the database and reloads demo data (never run it against real data).

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

## AI photo-to-listing (free)
`src/lib/analyze.ts` sends the shopkeeper's photo to Google Gemini and gets back title, description, category,
brand, model, condition and specs. Gemini's free tier needs no card: create a key at
https://aistudio.google.com/apikey and set `GEMINI_API_KEY`. Without a key the analyze endpoint returns 503 and the
shopkeeper fills the listing in by hand. The free tier has daily limits (see https://aistudio.google.com/rate-limit);
when they run out the app shows "Free AI limit reached" and the shopkeeper can type the details.

## Product photo storage
Photos uploaded from the shopkeeper app are stored by `src/lib/uploads.ts`, which picks a backend from the environment:

| Backend | Turn it on with | Notes |
|---|---|---|
| Vercel Blob (recommended on Vercel) | `BLOB_READ_WRITE_TOKEN` | In Vercel: project → Storage → Create → Blob → connect to this project. The token is added for you. |
| Cloudinary | `CLOUDINARY_URL=cloudinary://KEY:SECRET@CLOUD_NAME` | From the Cloudinary dashboard ("API environment variable"). |
| Local disk (development) | neither set | Saved to `UPLOAD_DIR` (default `./uploads`) and served at `/uploads/<name>`. Does not work on Vercel. |

Set `STORAGE_DRIVER` to force one, and `UPLOAD_FOLDER` (default `products`) to choose the folder.
Cloud backends return absolute `https://` image URLs; local disk returns `/uploads/...`. Uploads are limited to 4 MB (Vercel's request limit is 4.5 MB).

## Deploy to Vercel (free tiers)
Root Directory must be **`web`** (this repo is a monorepo). `web/vercel.json` runs `npm run vercel-build`, which
creates/updates the database tables, makes sure categories exist, loads demo data once if `SEED_DEMO=true`, then builds.

Environment variables:
| Name | Where it comes from |
|---|---|
| `DATABASE_URL` | Added automatically when you connect a Neon database (Vercel → Storage → Neon, free plan) |
| `BLOB_READ_WRITE_TOKEN` | Added automatically when you connect a Blob store (Vercel → Storage → Blob) |
| `GEMINI_API_KEY` | Free key from https://aistudio.google.com/apikey |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Your admin panel login |
| `SEED_DEMO` | `true` to load demo shops/products on the first deploy (optional) |

To keep the site private before launch: Settings → Deployment Protection → Vercel Authentication.
