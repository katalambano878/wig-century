# Execution prompt — Wig Century: Supabase Cloud → plain Postgres on big-vps

Paste this entire document as the task. Execute it. Do not redesign the shop. Do not stop after a partial cutover. Do not delete the Supabase project.

---

You are migrating **Wig Century** off Supabase Cloud onto **big-vps**, with **both the Next.js app and its database** on that host, and **no data loss** and **no broken storefront, admin, payments, auth, or media**.

## Facts you must treat as already verified (re-check counts before cutover; do not invent different hosts)

### What is live today (as of 2026-10-13)

| Piece | Where |
|---|---|
| Public site | `https://wigcentury.com` and `https://www.wigcentury.com` |
| DNS | Both names → **84.247.165.196** (`coolify-vps`) |
| Coolify app | name `wig-century`, uuid `wb79s2axozby3kkjejybf7nh`, git `katalambano878/wig-century`, branch `main`, status running |
| Database | **Supabase Cloud** project `https://dqudhlphqloujlwbulne.supabase.co` |
| App code | `/Users/dr.barns/Documents/Websites/wigcentury222` |
| Not on big-vps | There is **no** wig-century row in big-vps Coolify `applications` |

Live row counts (re-count immediately before the final dump; abort if you cannot match these or explain the delta):

| Table | Count |
|---|---|
| products | 27 |
| product_images | 29 |
| product_variants | 21 |
| orders | 32 |
| order_items | 33 |
| categories | 5 |
| customers | 4 |
| profiles | 1 |
| site_settings | 5 |
| cms_content | 3 |
| coupons, reviews, contact_submissions | 0 |
| auth.users | 1 |

Storage bucket `products`: **53 objects** (png/jpg/jpeg, plus one object with no extension). Buckets `avatars`, `blog`, `media`, `reviews`: **empty**. Product image URLs in the database are absolute:

`https://dqudhlphqloujlwbulne.supabase.co/storage/v1/object/public/products/...`

There are **no videos in storage yet**, but the admin upload path must keep working after the move.

### Target (do not deviate)

- **Compute:** big-vps `169.58.8.203`, Coolify at `http://169.58.8.203:8000`, API token `~/.config/coolify-vps/token-bigvps`. SSH: `ssh big-vps`.
- **Database:** shared **`fleet-postgres`** (+ `fleet-pgbouncer`) on the `coolify` Docker network. One database and role for this app. Password file `~/.config/coolify-vps/wigcentury-pg-pw` mode `600`. **Not** Supabase-on-supabase-vps. **Not** a new Postgres container.
- **Do not** deploy this app to coolify-vps (`84.247.165.196`). That host is the current production and stays untouched until DNS cutover, then remains as rollback.
- **Do not** edit production container files over SSH. Coolify rebuilds wipe them.

### Reference implementation (copy this architecture, do not invent another)

The closest already-migrated shop is:

`/Users/dr.barns/Documents/Websites/luxurystrand`

Copy its plain-Postgres shape, then adapt it to Wig Century’s schema and the gaps listed below. Relevant files:

- `lib/db/mode.ts` — plain-PG mode when `DATABASE_URL` or `POSTGRES_URL` is set
- `lib/db/pool.ts` — `pg` pool; date/timestamptz/numeric parsers must stay PostgREST-shaped (strings for dates, floats for numeric)
- `lib/db/auth.ts` — GoTrue-compatible auth against `auth.users.encrypted_password` (bcrypt), JWT via `jose`, `AUTH_JWT_SECRET`
- `lib/db/storage.ts` — disk storage under `STORAGE_ROOT`
- `lib/db/supabase-compat.ts` — supabase-js query builder over SQL
- `lib/db/fk-map.ts` — embeds; **regenerate for Wig Century**, do not copy Luxury Strand’s extra tables (`academia_*`, `product_category_links`, riders, etc.)
- `lib/supabase-admin.ts` — if plain PG, `createClient()` from the compat layer; never the hosted service-role client
- `lib/supabase.ts` — browser client stays `@supabase/supabase-js`, but `NEXT_PUBLIC_SUPABASE_URL` becomes **this site’s own origin**
- `app/auth/v1/[...path]/route.ts`
- `app/rest/v1/[table]/route.ts`
- `app/rest/v1/rpc/[fn]/route.ts`
- `app/storage/v1/object/public/[bucket]/[...path]/route.ts`
- `app/storage/v1/object/sign/[bucket]/[...path]/route.ts`
- `app/storage/v1/object/[bucket]/[...path]/route.ts`
- `middleware.ts` — `verifyPlainPgAdmin` using `AUTH_JWT_SECRET` when `NEXT_PUBLIC_USE_PLAIN_PG=true`

Fleet tooling already exists. Prefer it over hand-rolling Coolify and the compat copy:

- Playbook: `/Users/dr.barns/Documents/Websites/Migration/PLAYBOOK-LESSONS.md`
- Toolkit: `/Users/dr.barns/Documents/Websites/Migration/toolkit/` (`port-compat.mjs`, `provision-coolify.mjs`, `prepare-and-restore.mjs`, `run-site.mjs`)
- Gate runner: `/Users/dr.barns/Documents/Websites/Migration/scripts/diagnose-site.mjs`
- Tracker: Wig Century is wave `1-quick-wins` in `migration-waves.json`, decision `migrate`, folder `wigcentury222`. There is **no** `Migration/batch-state/wig*.json` yet. Luxury Strand’s batch state (`luxurystrand.json`, staging app `rzh9hdesnyka024gg6wwn596`, database `luxurystrand_staging`) is the template, not a database to reuse.

Browser pages keep calling `supabase.from(...)`. Server routes keep calling `supabaseAdmin`. You are replacing the network behind those calls, not rewriting every page. There is no Realtime and no `supabase/functions` folder. Do not add either.

## Hard rules

1. **Supabase Cloud is read-only** until cutover is verified. No deletes, no bucket wipes, no user deletes, no project pause.
2. **Dump, don’t replay through REST.** A REST export drops functions, enums, sequences, triggers, and `auth.users.encrypted_password`. Admin login must keep working with the **existing bcrypt hash**. Do not reset the admin password unless login is proven broken and the user approves.
3. **Schema source of truth is the live database**, not only `supabase/migrations/`. Repo migrations can lag production. Diff them. If live has extra columns, keep them.
4. **Same IDs.** UUIDs for products, orders, users, images stay identical so order history and image rows still match.
5. **Two-phase cutover.** Staging hostname on big-vps must pass every gate **before** DNS for `wigcentury.com` / `www` moves from `84.247.165.196` to `169.58.8.203`.
6. **Secrets stay out of git, chat, and rule files.** Read them from the current Coolify app env and local `.env`. Write new DB password only to the chmod-600 file.
7. **Do not mark the job done** while admin images, login, checkout, or payment verify fail.
8. Luxury Strand’s REST routes currently allow unauthenticated INSERT/PATCH/DELETE. **Do not ship that.** Wig Century’s browser uses the anon key for the whole admin UI, protected today by RLS (`auth.uid()`, `is_admin_or_staff()`). Preserve that behavior (see Security section).

## What the app actually depends on

### Auth (GoTrue) — must keep working

| Call | Where |
|---|---|
| `signInWithPassword` | `app/admin/login/page.tsx`, `app/auth/login/page.tsx` |
| `signUp` | `app/auth/signup/page.tsx` |
| `resetPasswordForEmail` | `app/auth/forgot-password/page.tsx` |
| `updateUser({ password })` | `app/auth/reset-password/page.tsx`, `app/account/page.tsx` |
| `updateUser` (profile metadata) | `app/account/page.tsx` |
| `getSession` / `onAuthStateChange` / `signOut` | Header, admin layout, account, checkout, POS, order success, reviews |
| `auth.getUser(token)` | `middleware.ts`, `lib/auth.ts` |
| Cookie `sb-access-token` | set on **admin** login only (`app/admin/login/page.tsx`); middleware reads it |

Customer login (`app/auth/login/page.tsx`) does **not** set `sb-access-token`. It relies on the supabase-js session in the browser, which then calls `/auth/v1`. Both paths must work. `profiles.id` references `auth.users.id`. `handle_new_user` reads `raw_user_meta_data` (`first_name`, `last_name`, `phone`, `newsletter`). There is **1** auth user and **1** profile. Copy `encrypted_password` verbatim. Signup metadata must still create a `customer` profile.

Luxury Strand’s `/auth/v1/recover` is a stub that sends no email. **Wig Century must not ship that stub.** Wire recover to the existing Resend path (`RESEND_API_KEY`, `EMAIL_FROM`) so the reset link hits `/auth/reset-password` on this site. If Resend is empty in Coolify, say so and still implement the route; do not pretend reset works.

After cutover, old Supabase JWTs will not verify. That is fine. Passwords must.

### Data access the compat layer must support

The shop and admin use more than simple `.eq()`:

- Nested embeds: `product_images(url)`, `product_images(url, position)`, `product_variants(...)`, `order_items(*)`, `categories(...)`
- `.order('position', { foreignTable: 'product_images' })` in `app/shop/page.tsx`
- `.in('categories.slug', ...)` in `app/shop/page.tsx`
- `.or('id.eq...,slug.eq...')` and `.or('order_number.eq...,id.eq...')`
- `.ilike`, `.gte`, `.lte`, `.lt`, `.neq`, `.in`, `.range`, `.limit`, count/head queries
- `.upsert` on `site_settings` and `store_modules`
- `.single()`

If `foreignTable` order or embedded `.in('categories.slug')` is missing from the copied compat layer, **implement it or change those two queries so the shop still filters and still returns images**. A shop page that 500s or shows products with null images is a failed migration. Known failure mode from the fleet: ordering a nested embed that isn’t selected (`position does not exist`).

### RPCs that must exist as real SQL functions in the new database

| Function | Callers |
|---|---|
| `mark_order_paid(order_ref text, moolre_ref text)` | Paystack webhook, Paystack callback, Paystack verify, Moolre callback, Moolre verify, admin POS. Idempotent stock reduction via `metadata.stock_reduced`. |
| `upsert_customer_from_order(...)` | `app/checkout/page.tsx`, `app/admin/pos/page.tsx` |
| `is_admin_or_staff()` | RLS policies |
| `handle_new_user()` | trigger on `auth.users` insert |
| `update_product_rating_stats`, `update_customer_stats`, `reduce_stock_on_order`, `get_all_customer_emails`, `get_all_customer_phones`, `update_updated_at_column` | defined in `supabase/migrations/20260209000000_complete_schema.sql` — restore them even if the UI rarely calls them |

`exec_sql` is only used by local maintenance scripts. Do not expose it on the public RPC route.

Public RPC route: allow `mark_order_paid` and `upsert_customer_from_order` only in the ways the app uses them. Do not leave every `SECURITY DEFINER` function callable anonymously.

### Storage

Buckets in schema: `products`, `avatars`, `blog`, `media`, `reviews`. Only `products` has files.

Upload code:

- `app/api/admin/media/upload/route.ts` — admin JWT, then `supabaseAdmin.storage.from('products').createSignedUploadUrl`
- `components/admin/ProductForm.tsx` — PUT to that signed URL (videos up to 50 MB: mp4/webm/mov/avi/m4v) with XHR progress, SDK fallback
- `app/admin/categories/page.tsx` — direct `supabase.storage.from('products').upload` for category images

Luxury Strand’s storage shim has `upload`, `getPublicUrl`, `createSignedUrl`, `remove`. It does **not** implement `createSignedUploadUrl`. You must add signed upload (or an equivalent PUT route) so product videos still upload. Max size stays 50 MB. MIME allowlist stays images + those video types.

Public URL shape after cutover, stored in the database:

`/storage/v1/object/public/products/<path>`

or absolute `https://<this-host>/storage/v1/object/public/products/<path>`.

Rewrite every stored URL that contains `dqudhlphqloujlwbulne.supabase.co` (product images, category images, CMS, banners, anywhere else a scan finds it). Keep the object path. Download all 53 objects (and any new ones at dump time) onto the storage volume before DNS cutover.

`next.config.ts` `images.remotePatterns` currently allows `*.supabase.co`. After the move, product `<Image>` tags must still load. Add the staging host and `wigcentury.com` / `www.wigcentury.com`, **or** use a native `<img>` for `/storage/` paths. Broken admin/store images are a hard fail.

Volume: mount a persistent Coolify volume at `STORAGE_ROOT` (not the container filesystem). Set `STORAGE_PUBLIC_URL` to the public origin.

### Server routes that use `supabaseAdmin` (must hit Postgres, never the old Supabase URL)

- `app/api/payment/paystack/route.ts`, `webhook`, `callback`, `verify`
- `app/api/payment/moolre/route.ts`, `callback`, `verify`
- `app/api/notifications/route.ts`
- `app/api/cron/payment-reminders/route.ts`
- `app/api/storefront/products/route.ts`, `categories`, `search`
- `app/api/admin/media/upload/route.ts`
- `app/sitemap.ts`, `app/product/[slug]/page.tsx`
- `lib/notifications.ts`, `lib/auth.ts`, `middleware.ts`

These construct their **own** `createClient(NEXT_PUBLIC_SUPABASE_URL, …)` and must be switched to `supabaseAdmin` / the compat client (pool, not HTTP): storefront `products` / `search` / `categories` routes, `app/sitemap.ts`, `app/product/[slug]/page.tsx`, `app/api/cron/payment-reminders/route.ts`, and **`lib/notifications.ts`** (it loads `order_items` with the anon client from inside Paystack/Moolre callbacks). If `NEXT_PUBLIC_SUPABASE_URL` is the public site, a server `createClient` that loops back through HTTP will deadlock or call itself.

`app/product/[slug]/page.tsx` metadata select uses fields that are not in the live schema (`image_urls`, `stock_quantity`). Do not “fix” that by inventing columns. Point it at real columns (`quantity`, `product_images`) only if the page 500s; otherwise leave behavior unchanged.

### Env the running app needs (copy values from the current Coolify app; do not print them)

Already in use: `NEXT_PUBLIC_APP_URL`, Supabase URL + anon + service role, reCAPTCHA, Resend (`RESEND_API_KEY`, `ADMIN_EMAIL`, `EMAIL_FROM`), Moolre (API user, pubkey, account, merchant email, callback secret, SMS key), Paystack secret + public key, `CRON_SECRET`.

Add for plain PG:

- `DATABASE_URL` — app role on `fleet-postgres` / pgbouncer, database `wigcentury`, **not** the public IP
- `NEXT_PUBLIC_USE_PLAIN_PG=true`
- `NEXT_PUBLIC_SUPABASE_URL=https://<the host this deployment serves>` (staging host during rehearsal, `https://wigcentury.com` at cutover)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — any non-empty placeholder the browser client accepts; it is not a Supabase JWT anymore
- `AUTH_JWT_SECRET` — new long random secret, stored only in Coolify and the local secret file
- `STORAGE_ROOT`, `STORAGE_PUBLIC_URL`, `STORAGE_SIGNING_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY` may remain as a server-only dummy if code still reads it, but it must not be required to reach Supabase Cloud

Remove any runtime dependency on `dqudhlphqloujlwbulne.supabase.co`.

## Security (do this; Luxury Strand’s open REST is not acceptable here)

RLS today is the only thing stopping the anon key from rewriting the catalog. Policies use `auth.uid()` and `is_admin_or_staff()` (`supabase/migrations/20260209000000_complete_schema.sql`).

Implement:

1. Recreate `auth.uid()` and `auth.role()` so they read `current_setting('request.jwt.claim.sub', true)` and `request.jwt.claim.role`.
2. The REST shim, per request:
   - No / invalid user JWT → role `anon`
   - Valid user JWT → role `authenticated` and `sub` = that user id
   - Server `supabaseAdmin` (webhooks, cron, storefront server fetches) → a role that bypasses RLS, **only inside the Node process**, never via a public header
3. `anon` may SELECT what today’s policies allow the public to read, and may INSERT only what the storefront already inserts as a guest: `orders`, `order_items`, `contact_submissions`. Reviews require an authenticated user (`auth.uid() = user_id`).
4. Staff writes (products, images, variants, categories, coupons, orders, CMS, settings) require `profiles.role` in `admin` or `staff`.
5. Do not publish Postgres `5432`. App connects on the Docker network.

Wrong-password login must return 400/401 from `/auth/v1/token?grant_type=password`, never 404.

## Execution order

### 1. Inventory lock

- Re-count the tables above and the `products` bucket object count.
- Dump live column lists for `public` and confirm enums (`product_status`, `order_status`, `payment` statuses, `user_role`, `review_status`, `blog_status`).
- Save counts to `migration-artifacts/wigcentury-pre-counts.json` in the repo (numbers only, no secrets, no customer PII).

### 2. Logical backup

On a machine that can reach Supabase, take a custom-format or SQL dump of:

- schema `public` (tables, data, sequences, functions, triggers, enums, grants)
- `auth.users` including `encrypted_password`, `raw_user_meta_data`, `raw_app_meta_data`, `email_confirmed_at`, `deleted_at`
- nothing else from `auth` that you do not need, but do not omit password hashes

Store the dump on big-vps under something like `/data/coolify/wigcentury-migration/dumps/`, not in git.

Download every object in bucket `products` into `/data/coolify/wigcentury-migration/storage/products/`. Byte-count must match the listing (53, or the new count).

Keep a second copy of the dump until the user says Supabase can be retired.

### 3. Database on fleet-postgres

- Create role + database `wigcentury` on `fleet-postgres`. Password only in `~/.config/coolify-vps/wigcentury-pg-pw`.
- Create schema `auth` with an `auth.users` table matching what `lib/db/auth.ts` selects: `id, email, phone, encrypted_password, email_confirmed_at, phone_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, deleted_at`.
- Restore `public` **before** attaching FKs that point at `auth.users`, or restore `auth.users` first, then `public`.
- Restore functions and the `on_auth_user_created` trigger.
- `setval` any sequences.
- Row counts in Postgres must equal the pre-counts. Spot-check one order’s items, one product’s variants, one product’s image path.

### 4. Code

In `/Users/dr.barns/Documents/Websites/wigcentury222`:

- Port `lib/db/*` from Luxury Strand. Regenerate `fk-map.ts` from Wig Century’s real FKs and jsonb columns (`products.metadata`, `products.options` if present, `orders.shipping_address`, `orders.billing_address`, `orders.metadata`, `product_variants.metadata`, `site_settings.value`, `profiles.preferences`, and any others the dump shows).
- Port auth, rest, rpc, and storage routes.
- Point `lib/supabase-admin.ts` at the compat client when `DATABASE_URL` is set.
- Update middleware like Luxury Strand’s plain-PG branch.
- Fix every **server** `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, ...)` so it cannot HTTP-loop. Use `supabaseAdmin`.
- Implement `createSignedUploadUrl` (and the PUT that fulfills it) for the products bucket.
- Implement `/auth/v1/recover` for real (Resend), not the Luxury Strand stub.
- Rewrite stored media URLs to this app’s `/storage/v1/object/public/...` path.
- `next.config.ts`: images still load for the new host. Keep AVIF/WebP if it still works for `/storage/`; otherwise native `<img>` for those paths.
- Add `pg`, `bcryptjs`, `jose` if missing. Do not remove `@supabase/supabase-js`; the browser still uses it against the local auth/rest routes.
- Do not commit `.env`, dumps, or storage files.

### 5. Staging app on big-vps

- New Coolify application on **big-vps** only. Confirm the GitHub source Coolify can clone (`katalambano878/wig-century`). Do not reuse uuid `wb79s2axozby3kkjejybf7nh` (that is coolify-vps).
- Work on branch `staging/plain-postgres`. Do not cut `main` until staging gates pass.
- Staging name `wigcentury-staging`. FQDN `https://wigcentury-staging.169-58-8-203.sslip.io`. Not `wigcentury.com` yet.
- Database/role `wigcentury_staging` for the rehearsal. Production database `wigcentury` is created at cutover (or promoted from staging only after a fresh delta restore). Password files: `~/.config/coolify-vps/wigcentury-staging-pg-pw` and `wigcentury-staging-jwt`, mode `600`.
- `DATABASE_URL` for the running app: `postgresql://wigcentury_staging:<pw>@fleet-postgres:5432/wigcentury_staging` on the `coolify` Docker network. Use `fleet-postgres:5432` for restore. Do not publish 5432.
- Env from the current production app, plus the plain-PG variables. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_APP_URL`, and `STORAGE_PUBLIC_URL` must be the **staging** origin for this deploy.
- `DATABASE_URL`, `AUTH_JWT_SECRET`, and `JWT_SECRET` must be **build-time** Coolify env (`is_buildtime=true`). A runtime-only `DATABASE_URL` makes `next build` initialize the hosted Supabase client and the image comes up wrong.
- Persistent storage via Coolify’s volume UI, not a `-v` flag in `custom_docker_run_options` (broken on Coolify 4.1.2). Host path `/data/coolify/wigcentury-staging/storage` → container `/app/storage`. `STORAGE_ROOT=/app/storage`. `chown 1001` on the host directory before the first boot. Copy the storage objects in before the first real test.
- Deploy with the Coolify API on big-vps. Wait until the deployment is finished. Do not DNS-cutover on a failed build.
- Run `Migration/scripts/diagnose-site.mjs --base <staging-url>` and keep going until Gates A/B/C below have zero failures. Write `Migration/diagnosis/wigcentury-<date>.md`.

### 6. Gates (all must pass on the staging host)

**Gate A — storefront**

- `/` and `/shop` HTTP 200, products visible
- `/api/storefront/products?featured=true` returns JSON with products, not an HTML 500
- A product page (`/product/<real-slug>`) shows the real image, price, and variants
- `/storage/v1/object/public/products/<a real object>` returns 200 and the bytes
- Shop cards are not placeholders
- Category filter and search return rows
- No console-breaking REST errors

**Gate B — admin**

- `/admin/login` 200
- Login with the **existing** admin password (user will type it; do not extract or print it) lands in the dashboard
- Product list and product edit show thumbnails
- Upload a small image **and** a small mp4; both appear in the media grid and the mp4 plays on the product page
- `/auth/v1/token?grant_type=password` with a wrong password returns 400 or 401, never 404

**Gate C — commerce**

- Add to cart from a product page. Mini cart opens full-height (it is portaled to `document.body`) and shows the line
- Checkout loads. Region dropdown then city dropdown still work
- Place a test order only if payment keys are the live ones and you can void it, **or** stop before submit and instead prove: order insert path and `mark_order_paid` against a transaction you roll back. Do not create a real charge by accident
- Paystack and Moolre routes read their secrets and can load an existing order by id. Do not fire a live charge unless the user asks

**Data**

- Staging counts equal the pre-dump counts
- The 32 orders and 33 order items are present with the same ids
- Image object count equals the bucket listing

If any gate fails, fix staging. Do not touch DNS.

### 7. Production cutover

Only after staging gates pass:

1. Put the current site in a short write freeze (or take a **second** dump + storage sync and apply the delta) so orders placed during rehearsal are not lost.
2. Re-count. If production counts moved, restore the delta into `wigcentury` before DNS.
3. Change the big-vps app env from the staging origin to `https://wigcentury.com` (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `STORAGE_PUBLIC_URL`). Redeploy.
4. Rewrite any absolute staging URLs in the database to `wigcentury.com` or to host-relative `/storage/v1/...`.
5. Point DNS for `wigcentury.com` and `www` from `84.247.165.196` to `169.58.8.203`.
6. Re-run Gates A, B, and C on `https://www.wigcentury.com`.
7. Leave the coolify-vps app **stopped or unused but not deleted**, and leave Supabase Cloud **intact**, until a second check the next day still matches. Do not drop the Supabase project in this task.

### 8. Rollback

If production gates fail after DNS:

- Point DNS back to `84.247.165.196` (coolify-vps app `wb79s2axozby3kkjejybf7nh`, which still talks to Supabase Cloud)
- Do not delete the fleet-postgres database
- Orders written only to the new database during the failed window must be exported and shown to the user before anyone treats Supabase as current again

## Done means

- `https://www.wigcentury.com` resolves to **169.58.8.203**
- The Coolify app serving it is on **big-vps**
- `DATABASE_URL` points at **fleet-postgres** database `wigcentury`
- No server or browser request to `dqudhlphqloujlwbulne.supabase.co` for normal browsing, admin, upload, or webhooks
- Pre-cutover row counts and storage object counts match
- Admin can log in with the old password, see images, upload a video
- Cart, checkout region/city, and payment route code paths work
- Supabase Cloud still exists as a cold backup

## Out of scope

- Do not migrate any other site
- Do not “clean up” products, orders, or images
- Do not rotate Paystack/Moolre keys
- Do not force-push `main`
- Do not print secrets, password hashes, or customer emails in the final report

## Report when finished

Write `migration-artifacts/wigcentury-cutover-report.md` with:

- Staging URL, production URL, big-vps Coolify app uuid
- Pre and post counts
- Storage object count
- Gate A/B/C results (pass/fail with the URL you hit)
- DNS before and after
- Rollback pointer (coolify-vps uuid + Supabase project host)
- Anything you could not verify (for example a live card charge)
