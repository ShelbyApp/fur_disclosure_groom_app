# Fur Disclosure Groom Planner

The owner flow starts with email and password login or account creation, a household profile and a dog picker. Save multiple dogs and groomers. Dog basics and usual care have separate screens. Each dog profile shows the latest three grooms, complete history and a swipeable Polaroid lookbook. Choose a saved groomer to prefill their contact details in a Basic or Advanced groom. Dogs, owner information, groomers, photos and finished visits are saved privately to Supabase. Guest entry is hidden for this iteration. Refreshing the current visit keeps its draft in this tab.

**Connect the project.** Follow the [Supabase and Vercel setup guide](docs/SUPABASE.md). After owner migrations 001 and 002, use [the combined directory SQL](supabase/deploy/RUN_THIS_create_tables_and_import.sql) to create/update the directory and import providers. It is rerunnable and includes Google-data storage safeguards. The [directory guide](docs/DIRECTORY.md) explains city search, coverage, provenance and independent review sources. Use a separate Vercel project for the planner.

**Run locally.** Use Node 22.14 or newer, run `npm ci`, then `npm run dev`. Open http://127.0.0.1:4381/. Configure the publishable key in .env.local to exercise password authentication. Login requires the publishable key.

**Validation.** `npm test` runs plan, profile and directory tests, including SQL migrations, bounded search and owner policies against a local PostgreSQL test engine. With the dev server running, `node test/browser-smoke.mjs` exercises multiple dogs, history, copy/edit, photo notes and both planning modes. `node test/directory-browser.mjs` checks city search, mobile coverage, pagination, errors, selection and missing-business creation with local fixtures.

[Screen specifications](docs/screens/README.md) · [Brand guide](docs/BRAND.md) · [Feature scope](docs/SCOPE.md)

**Verify a release.** Vercel writes the deployed Git SHA to `/version.json`. After a push, run `node scripts/verify-deployment.mjs https://groom.furdisclosure.com <full-commit-sha>` to check that revision, the deployed assets and public Supabase configuration. The check does not write database records.
