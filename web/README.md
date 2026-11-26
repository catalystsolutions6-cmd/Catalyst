# Tech marketplace (working name "Barq")

Multi-vendor marketplace for tech products by Catalyst Solutions. Shops from Hafeez Center / Hall Road
get a virtual shop; their products appear on one storefront. Customers never see the shop; the admin does.

Stack: Next.js 15 (App Router) · Prisma · SQLite in dev (Postgres in prod) · Tailwind CSS 4.

## Run locally
```bash
cp .env.example .env      # set ADMIN_PASSWORD and GEMINI_API_KEY (free)
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

## Deploy to Vercel
This repository is a monorepo, so in Vercel set **Root Directory = `web`** when importing the project
(Project → Settings → Build and Deployment → Root Directory). `web/vercel.json` sets the framework,
build command and the Mumbai region (closest to Pakistan).

1. Database: in `prisma/schema.prisma` set `provider = "postgresql"` and set `DATABASE_URL` to a Postgres database
   (Vercel → Storage → Neon is easiest). Run `npx prisma db push` once, and `npm run db:seed` if you want demo data.
2. Photos: connect a Vercel Blob store (or set `CLOUDINARY_URL`).
3. Environment variables: `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `GEMINI_API_KEY`, plus the storage variable.
4. To keep the site private before launch, turn on Vercel Authentication (Settings → Deployment Protection).
