# dukhaansin — Photography Portfolio + Personal App Suite

> Canonical reference. Read this first when working on the site.
> Update this file whenever the architecture, routing, schema, or
> design system changes.

---

## 1. What This Is

Three things that share one domain:

1. **Photography portfolio** at `dukhaansin.com` — a public, editorial gallery of albums with full-bleed photos and a masonry lightbox.
2. **Admin CMS** at `dukhaansin.com/admin` — password-gated tool to create albums, upload + reorder + resize photos, and set covers. JWT auth.
3. **Personal app** at `dukhaansin.com/app` — a standalone Vite + React SPA:
   - `/app/gym` — a workout + PR + body metrics tracker

Everything runs on **Vercel Hobby** with **Cloudflare R2** for images and **Supabase** for app data. No framework (except the React SPA); no build step for the gallery.

---

## 2. Architecture At A Glance

```
Browser ──► Vercel ──► static frontend/   (gallery, admin, built gym SPA)
              │
              └──► /api/*  serverless functions ──► Cloudflare R2  (photos, meta.json)
                                                  └► Supabase     (Postgres: gym data)
```

- **Frontend**: static HTML/CSS/JS in `frontend/` — the gallery is vanilla; the gym app is Vite + React and builds into `frontend/app/gym`.
- **Backend**: Node.js serverless functions in `api/`. File = endpoint.
- **Storage**: Cloudflare R2 (S3-compatible) for photos; a `meta.json` per album holds the album record.
- **Database**: Supabase Postgres for the gym app (exercises, workouts, records, metrics).
- **Auth**: JWT in HttpOnly cookie + bcrypt password (admin CMS only; the app is single-user, no auth).
- **Deploy**: `vercel.json` serves `frontend/` and routes `/api/*`.
- **Hard constraint**: Vercel Hobby allows **12 serverless functions max**. The app API is a single function (`api/app/[app].js`) to preserve budget.

---

## 3. Domain & Routing

Defined in `vercel.json`:

| URL                         | Serves                                |
|-----------------------------|----------------------------------------|
| `/`                         | `frontend/index.html` (gallery home)   |
| `/album/:slug`              | `frontend/album.html` (photo viewer)   |
| `/admin`                    | `frontend/admin/index.html`            |
| `/admin/login`              | `frontend/admin/login.html`            |
| `/admin/album/:slug`        | `frontend/admin/album.html`            |
| `/app`                      | `frontend/app/index.html` (landing)    |
| `/app/gym`                  | `frontend/app/gym/index.html` (SPA)    |
| `/api/*`                    | matching function in `api/`            |

**Cache headers**:
- `/css/*` and `/js/*` → immutable 1 year (`?v=N` cache-bust in links).
- `/app/*.html` → `no-cache, no-store, must-revalidate` so a new hashed bundle is never masked by stale HTML.
- `/api/*` → `no-store`.

---

## 4. Directory Layout

```
api/                             # Vercel Serverless Functions (11 total, room for 1 more)
  _utils/
    auth.js                      # JWT + bcrypt
    r2.js                        # R2 client (list, get/put JSON, presigned URLs, delete)
    supabase.js                  # Shared Supabase client
  albums.js                      # GET list / POST create album
  login.js                       # POST set JWT cookie
  logout.js                      # POST clear cookie
  me.js                          # GET auth status
  storage.js                     # GET R2 usage vs 10 GB cap
  albums/[slug]/
    index.js                     # GET detail / PUT update / DELETE album
    photos.js                    # GET list / POST presigned upload URLs
    photos/[filename].js         # DELETE one photo
    cover.js                     # PUT set cover
    reorder.js                   # PUT save order + grid spans
    finalize.js                  # POST register uploaded files in meta.json
  app/
    [app].js                     # GET/PUT/POST/DELETE — gym app API

apps/                            # React SPA (builds into frontend/app/)
  gym/
    index.html                   # entry, loads Inter + JetBrains Mono
    vite.config.js               # base: /app/gym/, outDir: ../../frontend/app/gym
    supabase-setup.sql           # one-time schema + seed (idempotent re-run OK)
    package.json
    src/
      main.jsx                   # React root
      App.jsx                    # one-file SPA (~2300 lines)

frontend/                        # Vercel outputDirectory — everything served static
  index.html                     # Public gallery home (editorial list of albums)
  album.html                     # Public album viewer (masonry + lightbox)
  404.html                       # Custom 404
  admin/
    login.html
    index.html                   # Dashboard (albums list, storage, create form)
    album.html                   # Album editor (upload, reorder, resize, cover, delete)
  css/style.css                  # All styles — public + admin in one file
  js/
    gallery.js                   # Public gallery JS (render + lightbox)
    admin.js                     # Admin CMS JS
  app/                           # BUILD OUTPUT — do not hand-edit
    index.html                   # /app landing page
    gym/
      index.html                 # built from apps/gym
      assets/index-*.js

vercel.json                      # routing, rewrites, headers, outputDirectory
package.json                     # root deps + build chain for apps
```

---

## 5. Services & External Dependencies

### Vercel
- **Deployments**: auto-deploy from `main` to production. PR branches get preview URLs.
- **Serverless functions**: Node.js runtime. Each file in `api/` is one function.
- **Static**: everything in `frontend/` is served unchanged.
- **Project name**: `dukhaansin` on Vercel (linked in `.vercel/project.json` locally).

### Cloudflare R2
- **Bucket**: `dukhaansin-images`
- **Access**: S3-compatible via `@aws-sdk/client-s3` in `api/_utils/r2.js`.
- **Layout**: one folder per album, `{slug}/img_NNN.jpg` + `{slug}/meta.json`.
- **Public URL**: photos served directly from R2 (no proxy).
- **Presigned URLs**: 1-hour validity, generated server-side for uploads (bypass API for the big file transfer).
- **Storage cap**: 10 GB (the `/api/storage` endpoint reports current usage).

### Supabase (Postgres)
- **Project**: `drlimemicsthqpwofytm` (region: ap-northeast-2, Postgres 17)
- **Single client**: `api/_utils/supabase.js` — used by `api/app/[app].js` only.
- **RLS**: enabled on all tables. Policy on each: public read + write (single-user personal app, no multi-user security needed).

#### Tables

**exercises** (gym tracker — exercise library)
```
id uuid, name, training_type, sort_order,
sets int, reps text, rest_seconds int, created_at
```

**workouts** (gym tracker — session log)
```
id uuid, date, training_type, notes, exercises jsonb, created_at
```
`exercises` is a JSONB array of `{ exerciseId, name, sets: [{ reps, weight }, ...] }`.

**templates** (gym tracker — saved session templates)
```
id uuid, name, training_type, exercises jsonb, created_at
```

**personal_records**
```
id uuid, exercise_name, weight numeric, reps int, date,
workout_id uuid → workouts.id (ON DELETE SET NULL)
```

**body_metrics**
```
id uuid, date (unique), weight_kg numeric, energy_level (1-5), notes, created_at
```

---

## 6. API Reference

### Public (no auth)

| Method | Path | Purpose |
|--------|------|---------|
| GET  | `/api/albums` | List albums (with cover URL + photo count) |
| GET  | `/api/albums/{slug}` | One album (title, description, order, gridSpans) |
| GET  | `/api/albums/{slug}/photos` | Photos in an album (src URLs) |

### Admin (JWT required)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/login` | Authenticate, set JWT cookie |
| POST | `/api/logout` | Clear cookie |
| GET  | `/api/me` | Check auth |
| POST | `/api/albums` | Create album |
| PUT/DELETE | `/api/albums/{slug}` | Update / delete |
| POST | `/api/albums/{slug}/photos` | Request presigned upload URLs |
| DELETE | `/api/albums/{slug}/photos/{filename}` | Delete one photo |
| PUT | `/api/albums/{slug}/cover` | Set cover |
| PUT | `/api/albums/{slug}/reorder` | Save photo order + grid spans |
| POST | `/api/albums/{slug}/finalize` | Register uploaded files in meta.json |
| GET  | `/api/storage` | R2 usage |

### App API — `/api/app/[app]`

Router file `api/app/[app].js`. The `app` param is `gym`.

#### `/api/app/gym` — routed by `?resource=…`

| Method | `resource` | Extra | Purpose |
|--------|-----------|-------|---------|
| GET    | `workouts`  | — | List workouts |
| POST   | `workouts`  | body: `{ date, trainingType, notes, exercises }` | Create + auto-detect PRs |
| DELETE | `workouts`  | `?id=…` | Delete one |
| GET/POST/PUT/DELETE | `exercises` | `?id=…` on PUT/DELETE | Exercise library CRUD |
| GET/POST/DELETE | `templates` | `?id=…` on DELETE | Templates |
| GET    | `records`   | — | Personal records |
| GET/POST/DELETE | `metrics` | body: `{ date, weightKg?, energyLevel?, notes? }` | Body metrics (date is unique; POST upserts) |
| GET    | `export`    | — | Full JSON export |
| POST   | `import`    | body: exported JSON | Replace all data |

**camelCase ↔ snake_case**: the app endpoint normalizes both sides (`trainingType` ↔ `training_type`). Frontend always speaks camelCase.

---

## 7. Design System

The gym app and the gallery share one typographic system in two palettes — dark for the app, warm light for the gallery. They're visual inverses.

### Tokens (gym app — dark)

| Token     | Value                      | Use |
|-----------|----------------------------|------|
| `bg`      | `#0A0A0B`                  | page |
| `surface` | `rgba(255,255,255,0.025)`  | card bg |
| `line`    | `rgba(255,255,255,0.06)`   | hairline |
| `line-hi` | `rgba(255,255,255,0.12)`   | emphasis border |
| `text`    | `#F2F2F0`                  | body |
| `heading` | `#FAFAF7`                  | display type |
| `secondary` | `#A6A6AB`                | body secondary |
| `muted`   | `#6F6F76`                  | captions, labels |
| `accent`  | `#FAFAF7` on `#0A0A0B`     | primary button |

### Tokens (public gallery — light, inverse)

| Token     | Value                      | Use |
|-----------|----------------------------|------|
| `bg`      | `#FAFAF7`                  | page |
| `ink`     | `#0A0A0B`                  | body & heading |
| `secondary` | `#4A4A50`                | body secondary |
| `muted`   | `#8A8A8F`                  | captions |
| `line`    | `rgba(10,10,11,0.08)`      | hairline |

### Typography

| Face           | Role                                      |
|----------------|-------------------------------------------|
| **Inter**      | body + app display (weight 300 for large type, tight `-0.02em` tracking) |
| **Fraunces**   | public gallery display only (wordmark + titles, weight 300, `-0.045em` tracking) |
| **JetBrains Mono** | numbers, labels, counters              |

### Motion

- `fadeUp` — page entry (600ms)
- `scaleIn` — confirmations
- `drawCheck` — session-complete checkmark
- `pulse` — live dot in eyebrow
- Photo stagger: `animation-delay: calc(var(--i) * 40ms)` via inline `style="--i:N"`
- All transitions honor `prefers-reduced-motion`

### Data-viz palette (gym app only, desaturated)

| Name       | Hex       | Where |
|------------|-----------|------|
| push_run   | `#C97B5E` | warm amber |
| leg_day    | `#9681C4` | violet |
| pull_run   | `#7593C2` | slate |
| rest       | `#3B3B40` | neutral |
| warn       | `#C9A06E` | warnings (amber) |
| danger     | `#C56B6B` | alerts, overload |
| good       | `#7FA98A` | completed / cleared |

---

## 8. Build & Deploy

### Local build
```sh
npm install                 # root deps (API)
npm run build               # builds the gym app into frontend/app/gym
```

The root `build` script builds the gym app:
```
cd apps/gym && npm install && npm run build
```

### Local dev servers

Dev servers for previewing before deploy:

- **Gallery**: `vercel dev --yes --listen 3456` (runs both static + API)
- **Gym SPA**: `cd apps/gym && npm run dev` (port 5173)

Configured in `.claude/launch.json` for `preview_start`.

### Deploy

`main` auto-deploys on Vercel. Workflow:

```sh
# on a feature branch
git commit -am "..."
git push origin my-branch
gh pr create --title "..." --body "..."
gh pr merge NN --merge            # merges + triggers production deploy
```

For quick personal-app changes, merge directly to `main` is fine (single-user project).

---

## 9. Environment Variables

All configured on Vercel (Production + Preview). Not in git.

| Var                    | Purpose |
|------------------------|---------|
| `ADMIN_USERNAME`       | admin login |
| `ADMIN_PASSWORD`       | bcrypt hash |
| `JWT_SECRET`           | JWT signing |
| `R2_ACCESS_KEY_ID`     | R2 |
| `R2_SECRET_ACCESS_KEY` | R2 |
| `R2_ACCOUNT_ID`        | R2 account |
| `R2_BUCKET_NAME`       | `dukhaansin-images` |
| `R2_PUBLIC_URL`        | public photo URL base |
| `SUPABASE_URL`         | `https://drlimemicsthqpwofytm.supabase.co` |
| `SUPABASE_ANON_KEY`    | publishable key (safe client-side, but the API uses it server-side) |

---

## 10. Images — How The Masonry Works

Both the public gallery and the admin editor use an **18-column CSS sub-grid** with **margin-based gaps** for pixel precision:

- `grid-template-columns: repeat(18, 1fr)`
- `grid-auto-rows: 1px; gap: 0`
- Each `.grid-item` has `margin: 6px`
- JS sets `grid-row-end: span {N}` per item based on image aspect ratio

**SPAN_MAP** (how a `gridSpans[filename]` value becomes CSS sub-cols):

| span  | sub-cols | width        |
|-------|----------|--------------|
| 0.5   | 3  (`subcol-3`)  | half |
| 0.67  | 4  (`subcol-4`)  | two-thirds |
| 1     | 6  (default)     | normal |
| 1.33  | 8  (`subcol-8`)  | four-thirds |
| 1.5   | 9  (`subcol-9`)  | one-and-half |
| 2     | 12 (`subcol-12`) | double |
| 3     | 18 (`subcol-18`) | full-width |

Responsive: drops to 12 cols at 1024px, single column at 600px.

**Upload flow:**
1. Admin picks files (drag-drop or input).
2. Frontend POSTs filenames to `/api/albums/{slug}/photos` → gets presigned URLs.
3. Frontend PUTs each file directly to R2 (bypasses our API).
4. Frontend POSTs `/api/albums/{slug}/finalize` to register them in `meta.json`.
5. Files are auto-renamed to `img_NNN.jpg`.

---

## 11. Gym Tracker — Quick Guide

- **Training types**: `push_run`, `leg_day`, `pull_run` (Lower B was removed in April 2026; `lower_a` was renamed to `leg_day` in May 2026).
- **Sessions**: user picks today's type → sees the exercise library → only the exercises they engage with (weight entered, or for cardio a set checked) count. Blank kg = skipped. Treadmill Run and other cardio don't have a kg input at all.
- **Exercises**: each has `sets` (int), `reps` (text — `"10-12"` or `"15 min easy"` both OK), `rest_seconds` (int).
- **PRs**: auto-detected on POST — compares max weight in the new workout against the exercise's current max.
- **Timer**: presets 30/60/90/120/180s, vibrates via `navigator.vibrate()` on complete.
- **localStorage**: the in-progress checklist for today is cached so iOS Safari tab suspensions don't eat your data. A `gym_v` version key clears stale shape on mismatch.

---

## 12. When You Change Things

- **Schema changes**: update `apps/{app}/supabase-setup.sql` AND apply via the Supabase MCP or SQL editor. SQL file is documentation + cold-start; live DB is source of truth.
- **New route**: add to `vercel.json` `rewrites`.
- **New function**: stay under 12. If adding a new app, extend `api/app/[app].js` rather than a new file.
- **Redesign**: keep tokens in sync. The gym's `T` object defines the dark palette; the gallery CSS `:root` mirrors it for light.
- **Cache-busting**: bump `?v=N` on the CSS/JS links in `frontend/index.html` + `frontend/album.html` + the admin pages. Current version: `?v=13`.

---

## 13. Remote Work From Phone

This file is the single source of truth for Claude Code running remotely on this repo. When asking Claude Code to make changes from a phone:

- Reference this file (`CLAUDE.md` at repo root) as context.
- Tell it which surface to touch (gallery / admin / gym / API).
- If it needs DB schema, point it at `apps/gym/supabase-setup.sql` and the `Tables` section above.
- For design changes, say "match the gym token system" — tokens are documented in §7.
- To deploy: merge your PR. Vercel auto-deploys `main`. No manual step.

---

## 14. Common Tasks

**Add a training type to the gym app**
1. Add to `TYPE_COLORS`, `TYPE_LABELS`, `TRAINING_TYPES` in `apps/gym/src/App.jsx`.
2. Seed exercises via `INSERT INTO exercises ... training_type='new_type'` (SQL editor or MCP).
3. Rebuild: `cd apps/gym && npm run build`.

**Create a new album**
1. Admin UI at `/admin` → "New album" form. Alternatively POST to `/api/albums` with `{ title, description, slug }`.
2. Upload photos in the editor.

**Add a second app under `/app/newthing`**
1. `cp -r apps/gym apps/newthing`, update `vite.config.js` paths.
2. Add `case 'newthing': return await handleNewThing(req, res);` in `api/app/[app].js`.
3. Add rewrite in `vercel.json`.
4. Chain its build in root `package.json`.
5. Add a row to `frontend/app/index.html`.
