# Fur Disclosure Groom Planner

The owner flow starts with email and password login or account creation, a household profile and a dog picker. Save multiple dogs and groomers. Dog basics and usual care have separate screens. Each dog profile shows the latest three grooms, complete history and a swipeable Polaroid lookbook. Choose a saved groomer to prefill their contact details in a Basic or Advanced groom. Dogs, owner information, groomers, photos and finished visits are saved privately to Supabase. Selecting Continue as a guest starts a blank visit. Refreshing the current visit keeps its draft in this tab.

**Connect the project.** Follow the [Supabase and Vercel setup guide](docs/SUPABASE.md). New installations run migrations [001](supabase/001_owner_profiles.sql) then [002](supabase/002_profiles_groomers_lookbook.sql), once each. Existing installations only need 002 for this update. Use a separate Vercel project for the planner. Extract the deployment ZIP at the root of its GitHub repository.

**Run locally.** Use Node 22.14 or newer, run `npm ci`, then `npm run dev`. Open http://127.0.0.1:4381/. Configure the publishable key in .env.local to exercise password authentication. The guest planner works without a key.

**Validation.** `npm test` runs plan and profile tests, including the SQL migration and owner policies against a local PostgreSQL test engine. With the dev server running, `node test/browser-smoke.mjs` exercises multiple dogs, history, copy/edit, photo notes and both planning modes.

[Screen specifications](docs/screens/README.md) · [Brand guide](docs/BRAND.md) · [Feature scope](docs/SCOPE.md)
