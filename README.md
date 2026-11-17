# Fur Disclosure Groom Planner

The owner flow starts with email sign-in, a household profile and a dog picker. Choose a dog to edit their usual care preferences, start a Basic or Advanced groom, or open and copy a previous visit. Dogs, owner information and finished visits are saved to Supabase. Guests can plan a single visit in their browser tab.

**Connect the project.** Follow the [Supabase and Vercel setup guide](docs/SUPABASE.md) and run the [database migration](supabase/001_owner_profiles.sql). Use a separate Vercel project for the planner. Extract the deployment ZIP at the root of its GitHub repository.

**Run locally.** Use Node 22.14 or newer, run `npm ci`, then `npm run dev`. Open http://127.0.0.1:4381/. Configure the publishable key in .env.local to exercise email sign-in. The guest planner works without a key.

**Validation.** `npm test` runs plan and profile tests, including the SQL migration and owner policies against a local PostgreSQL test engine. With the dev server running, `node test/browser-smoke.mjs` exercises multiple dogs, history, copy/edit, photo notes and both planning modes.

[Screen specifications](docs/screens/README.md) · [Brand guide](docs/BRAND.md) · [Feature scope](docs/SCOPE.md)
