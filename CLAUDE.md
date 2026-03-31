# dukhaansin — Photography Portfolio + Personal App

## What This Is

A serverless photography portfolio with an admin CMS, plus a personal web app suite. Vanilla HTML/CSS/JS frontend served as static files on Vercel, with Vercel Serverless Functions as the API layer and Cloudflare R2 for image storage. No database — all metadata lives in R2 JSON files. The personal app (`/app`) uses Vite + React SPAs that build into the same static `frontend/` directory.

## Architecture

```
Browser → Vercel (static frontend + serverless API) → Cloudflare R2 (images + metadata)
```

- **Frontend**: Static HTML/CSS/JS in `frontend/` — no framework, no build step
- **Backend**: Node.js serverless functions in `api/` — each file = one endpoint
- **Storage**: Cloudflare R2 (S3-compatible) — images + `meta.json` per album
- **Auth**: JWT tokens in HttpOnly cookies, bcrypt password hashing
- **Deploy**: `vercel.json` serves `frontend/` as static, routes `/api/*` to functions

## Directory Layout

```
api/                        # Vercel Serverless Functions
  _utils/auth.js            # JWT + bcrypt auth helpers
  _utils/r2.js              # R2 client (list, get/put JSON, presigned URLs, delete)
  albums.js                 # GET: list albums (public) | POST: create album (admin)
  login.js                  # POST: authenticate, set JWT cookie
  logout.js                 # POST: clear cookie
  me.js                     # GET: check auth status
  storage.js                # GET: storage usage vs 10 GB limit
  albums/[slug]/
    index.js                # GET: album detail | PUT: update | DELETE: delete album
    photos.js               # GET: list photos | POST: get presigned upload URLs
    photos/[filename].js    # DELETE: remove single photo
    cover.js                # PUT: set cover image
    reorder.js              # PUT: save photo order + grid spans
    finalize.js             # POST: register newly uploaded files in metadata

frontend/                   # Static files (Vercel outputDirectory)
  index.html                # Public gallery home
  album.html                # Public album viewer (masonry grid + lightbox)
  404.html                  # Custom 404
  admin/
    login.html              # Admin login
    index.html              # Admin dashboard (albums list, storage, create)
    album.html              # Album editor (upload, reorder, resize, cover, delete)
  css/style.css             # All styles (single file)
  js/gallery.js             # Public album rendering + lightbox
  js/admin.js               # Admin dashboard + album editor logic
```

## R2 Data Model

Each album is a folder in R2: `{slug}/`

```
{slug}/
  meta.json          # Album metadata (source of truth)
  img_001.jpg        # Photos with sequential naming
  img_002.jpg
  ...
```

**meta.json structure:**
```json
{
  "title": "Album Title",
  "description": "Optional",
  "order": ["img_001.jpg", "img_002.jpg"],
  "cover": "img_001.jpg",
  "gridSpans": { "img_002.jpg": 1.5 },
  "createdAt": "2026-03-29T..."
}
```

- `order` controls display sequence
- `gridSpans` maps filename to width multiplier (default 1 if absent)
- `cover` is the album thumbnail on the home page

## CSS Grid Masonry System

The gallery uses an **18-column CSS sub-grid** for fractional photo sizing:

- `grid-template-columns: repeat(18, 1fr)` — 6 sub-columns per visual column (3 visual columns)
- `grid-auto-rows: 1px` with `gap: 0` — pixel-perfect row spanning
- Each item gets `margin: 6px` for uniform gaps
- Row span = `Math.ceil(imgNaturalHeight / imgNaturalWidth * visibleWidth + margin * 2)`

**Width sizing (SPAN_MAP):**
| Display Size | Sub-columns | Class |
|---|---|---|
| 0.5 (half) | 3 | `subcol-3` |
| 0.67 (two-thirds) | 4 | `subcol-4` |
| 1 (default) | 6 | `subcol-6` |
| 1.33 (four-thirds) | 8 | `subcol-8` |
| 1.5 (one-and-half) | 9 | `subcol-9` |
| 2 (double) | 12 | `subcol-12` |
| 3 (full-width) | 18 | `subcol-18` |

Responsive: 18 cols > 12 cols at 1024px > single column at 600px.

## Image Loading Strategy

- First 6 images: `loading="eager"` + `fetchpriority="high"` (above the fold)
- Remaining: `loading="lazy"` + `decoding="async"` (non-blocking)
- Images served directly from R2 public URL (no proxy)
- CSS/JS cached 1 year with `?v=12` cache-busting query strings

## Upload Flow

1. Admin selects files in the upload zone (drag-drop or file picker)
2. Frontend POSTs filenames to `/api/albums/{slug}/photos` to get presigned R2 URLs
3. Frontend PUTs files directly to R2 using presigned URLs (bypasses backend)
4. Frontend POSTs to `/api/albums/{slug}/finalize` to update `meta.json` with new filenames
5. Files are auto-renamed to `img_NNN.jpg` format

## Admin Grid Editing

Photos can be resized and reordered in the admin album editor:

- **Drag-to-reorder**: Drag photos to change sequence
- **Drag-to-resize**: Drag right edge to snap to valid spans (0.5, 0.67, 1, 1.33, 1.5, 2, 3)
- **+/- buttons**: Increment/decrement span one step at a time
- **Set cover**: Star button marks a photo as album cover
- Changes saved via PUT to `/api/albums/{slug}/reorder`

## Key Functions Reference

### `api/_utils/r2.js`
- `getJSON(key)` / `putJSON(key, data)` — read/write metadata
- `listObjects(prefix)` — recursive listing with pagination
- `getPresignedUploadUrl(key, contentType)` — 1-hour upload URL
- `getNextImageNumber(objects)` — next sequential `img_NNN` number
- `getOrCreateMeta(slug, objects)` — lazy-init album metadata

### `api/_utils/auth.js`
- `createToken()` — 24-hour JWT
- `isAuthenticated(req)` — verify JWT from cookie, returns `{ role }` or `false`
- `checkPassword(password)` — bcrypt compare against `ADMIN_PASSWORD`

### `frontend/js/gallery.js`
- `renderGallery(photos)` — builds grid HTML with subcol classes + lazy loading
- `applyRowSpans()` — calculates pixel-precise row spans from image dimensions
- Lightbox with keyboard nav (Escape, Left/Right arrows)

### `frontend/js/admin.js`
- `initDashboard()` / `initAlbumPage()` — page entry points
- `renderPreviewGrid(photos)` — admin grid with resize handles + action buttons
- `updateItemSpan(item, newSpan, grid, slug)` — apply span change + save
- `snapToNearestSpan(rawSpan)` — snap to valid VALID_SPANS array
- `uploadFiles(files)` — presigned URL upload pipeline

## Environment Variables

| Variable | Purpose |
|---|---|
| `ADMIN_USERNAME` | Login username |
| `ADMIN_PASSWORD` | Bcrypt-hashed password |
| `JWT_SECRET` | JWT signing key |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_BUCKET_NAME` | R2 bucket name (`dukhaansin-images`) |
| `R2_PUBLIC_URL` | Public R2 URL for serving images |

## Vercel Routing (`vercel.json`)

- `outputDirectory: "frontend"` — static file root
- `/app/debt` → `/app/debt/index.html` (debt tracker)
- `/album/:slug` → `album.html` (public album viewer)
- `/admin` → `admin/index.html`, `/admin/album/:slug` → `admin/album.html`
- CSS/JS: `Cache-Control: max-age=31536000, immutable`
- API: `Cache-Control: no-store`

## Dependencies

Only 4 npm packages (all for the API layer):
- `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` — R2 access
- `bcryptjs` — password hashing
- `jsonwebtoken` — JWT tokens

## Personal Web App (`/app`)

A personal app suite at `dukhaansin.com/app/`, built as separate Vite + React SPAs that build into `frontend/app/`. Currently contains the Debt Tracker, with Fitness Tracker and a dashboard planned for the future.

### Debt Tracker (`/app/debt`)

A financial dashboard for tracking loan repayment progress. Single-component React app with animated numbers, progress rings, calendar heatmaps, and installment payment simulation.

**Features:**
- Overview tab: income, remaining debt, DSR gauge, monthly cash flow breakdown
- Loans tab: per-loan detail cards with payment heatmaps and "Pay installment" buttons
- Cash flow tab: income allocation breakdown
- Action plan tab: prioritized debt payoff strategy

**Loans tracked:** BOCHK, Mox, Standard Chartered, X Wallet #1 (catch-up plan), X Wallet #2

### Web App Directory Layout

```
apps/
  debt/                     # Vite + React source
    index.html              # Entry HTML
    vite.config.js          # Builds to ../../frontend/app/debt/
    src/
      main.jsx              # React root
      App.jsx               # FinancialDashboard component (all-in-one)

frontend/app/               # Build output (served as static files)
  debt/
    index.html              # Built entry point
    assets/                 # Vite-hashed JS bundles
```

### Web App Build

The root `package.json` build script handles all app builds:
```
npm run build → cd apps/debt && npm install && npm run build
```

Each app's `vite.config.js` sets `base` and `outDir` to build into the correct `frontend/app/` subdirectory. Vercel runs this build command during deployment.

### Web App Routing

Rewrites in `vercel.json`:
- `/app/debt` → `/app/debt/index.html`

### Adding New Apps

1. Create `apps/{name}/` with Vite + React setup
2. Set `base: '/app/{name}/'` and `outDir: '../../frontend/app/{name}'` in vite config
3. Chain the build in root `package.json`: `&& cd ../apps/{name} && npm install && npm run build`
4. Add rewrite in `vercel.json`: `/app/{name}` → `/app/{name}/index.html`

## Design

- Color scheme: light background (#fafafa), dark text (#1a1a1a)
- Fonts: Inter (body), Playfair Display (headings/branding)
- Minimal UI with hover-reveal admin controls
- Responsive breakpoints: 1024px (tablet), 768px, 600px (mobile)
- **Debt Tracker**: Dark theme (#0A0A0F), DM Sans + JetBrains Mono fonts, color-coded loans
