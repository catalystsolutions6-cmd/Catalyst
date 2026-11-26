# Shopkeeper app ("Catalyst Seller", placeholder name)

Android app (Expo / React Native, TypeScript) for marketplace shopkeepers: snap a product photo, AI fills title, description, category, brand, model, condition and specs, shopkeeper adds price and stock, publishes.

## Layout
- `src/app/` screens (Expo Router): `login`, `index` (My listings), `new` (snap -> AI -> review -> publish), `product/[id]` (edit, hide, sold out)
- `src/api.ts` API client (contract below), `src/auth.tsx` session in SecureStore
- `src/photos.ts` camera/gallery + resize to 1600px JPEG before upload
- `src/brand.ts` brand name and colours (change here + `app.json` to rebrand)
- `server/analyze.ts` AI vision module for the marketplace backend (Claude, `claude-opus-5-5`, structured output)
- `server/mock-server.ts` dev mock of the shop API

## Run locally
```bash
npm install
# terminal 1: mock API (sample AI result unless GEMINI_API_KEY is set)
cd server && npm install && npx tsx mock-server.ts      # login 03001234567 / demo1234
# terminal 2
EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:4000 npx expo start   # scan with Expo Go on Android
```

## Build for the Play Store
1. `npm i -g eas-cli && eas login` (free Expo account), then `eas init`
2. Set the real API URL in `eas.json` (`EXPO_PUBLIC_API_URL`)
3. Test APK: `eas build -p android --profile preview`
4. Store bundle: `eas build -p android --profile production`, then `eas submit -p android` (needs a Google Play developer account and a service account key)

Package id: `com.catalystsolutions.seller` (change in `app.json` before the first Play upload; it can never change after).

## API contract (implemented by the marketplace backend, Bearer token)
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | /api/shop/auth/login | {phone, password} | {token, shop} |
| GET | /api/shop/me | | {shop} |
| GET | /api/categories | | [{slug, name}] |
| POST | /api/shop/uploads | multipart `image` | {url} |
| POST | /api/shop/listings/analyze | multipart `image` | {title, description, categorySlug, brand, model, condition, specs, confidence} |
| POST | /api/shop/products | {title, description, categorySlug, brand, model, condition, specs, price, stock, images, status} | product |
| GET | /api/shop/products | | own products |
| PATCH | /api/shop/products/:id | any product fields | product |

Errors: `{error}` with an HTTP status. The analyze route should call `analyzeProductImage()` from `server/analyze.ts` and map `AnalyzeError.status` to the response status.
