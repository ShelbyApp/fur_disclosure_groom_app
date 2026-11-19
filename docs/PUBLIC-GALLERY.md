# Landing-page public gallery

Migration [007_public_gallery.sql](../supabase/007_public_gallery.sql) extends 006 for the separate landing repository. Run it in the shared Supabase project; it is safe to rerun. It does not change photo visibility or app screens.

- `quality_score`: internal nullable integer 1–10. Score 1 hides a public photo from discovery; 2–10 takes priority on the landing page. Null is eligible for random fallback. Browser users cannot assign or edit quality scores.
- `uploader_type`: owner/groomer account category, assigned by a database trigger from signup metadata. Existing photos are backfilled once. It is not business verification. Photos generated from groom snapshots remain private by default.
- Public metadata, individual image, featured selection and location search RPCs provide the gallery with no owner/contact/health/history exposure. The existing owner/private photo policies remain intact. Insert grants are narrowed to prevent forging quality scores or uploader categories.
- Gallery location filters use a photo's tagged directory provider and its coverage cities. They never use the owner's profile address.

The landing page requires `SUPABASE_PUBLISHABLE_KEY` in its own Vercel project. Gallery UI and setup/scoring instructions are in that repository's `docs/lookbook.md`. Public score exclusions and visibility changes apply on subsequent reads; previously downloaded photos cannot be recalled. AI review and contests are not implemented yet.

Run `npm test` to include `test/public-gallery.test.mjs`, which applies the migrations in PostgreSQL/PGlite and checks permissions, quality selection, uploader roles, paging, mobile coverage, public projections and the existing groom-photo trigger.
