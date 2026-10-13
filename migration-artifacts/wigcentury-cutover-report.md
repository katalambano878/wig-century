# Wig Century cutover report — 2026-10-13

## Where it runs

- Production URL: https://www.wigcentury.com and https://wigcentury.com
- DNS A for `wigcentury.com`: `169.58.8.203` (big-vps). `www` is still a CNAME to the apex. Email MX/TXT records were left in place.
- Previous DNS: `84.247.165.196` (coolify-vps)
- Coolify app on big-vps: `wig-century-staging`, uuid `cmxuj331upwhxsfj2yfwusv9`
- Staging hostname still routed to the same app: https://wig-century-staging.169-58-8-203.sslip.io
- Database: `fleet-postgres` database `wigcentury`, role `wigcentury`
- Rehearsal database left in place: `wig_century_staging`
- Storage: Coolify volume `/data/coolify/wig-century-staging/storage` mounted at `/app/storage` (62 files)
- Git: `staging/plain-postgres` (`6652df8`)

## Counts

| | Before | After |
|---|---|---|
| products | 27 | 27 |
| product_images | 29 | 29 |
| product_variants | 21 | 21 |
| orders | 32 | 32 |
| order_items | 33 | 33 |
| categories | 5 | 5 |
| profiles | 1 | 1 |
| auth.users | 1 (password hash restored) | 1 |

Media URLs in `wigcentury` now use `https://wigcentury.com/storage/v1/object/public/...`.

## Gates

Staging diagnose: 22/23 pass, 0 failures, 1 warning (checkout HTML does not contain the word "moolre" because the payment UI is client-rendered).

Production `https://www.wigcentury.com`: same result, 0 failures.

Also checked on production:

- Featured products JSON length 23
- Categories JSON length 5
- Product page and `/shop` HTTP 200
- A real product image HTTP 200
- Wrong admin password on `/auth/v1/token?grant_type=password` HTTP 400

## Not verified

- Signing in with the real admin password (the bcrypt hash was copied; the password was not printed or reset)
- A live Paystack or Moolre charge

## Rollback

- Point the `wigcentury.com` A record back to `84.247.165.196`
- coolify-vps app uuid `wb79s2axozby3kkjejybf7nh` was not deleted and still talks to Supabase Cloud `dqudhlphqloujlwbulne.supabase.co`
- The Supabase project was not paused or deleted
