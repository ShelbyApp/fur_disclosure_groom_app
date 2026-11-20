# Breed catalog

Run `supabase/010_breed_catalog.sql` in the existing project SQL editor after migration 001. The transaction is safe to rerun and ends with verification queries: expect 320 catalog rows, including Unknown, Mixed breed, and Goldendoodle. No database migration has been applied automatically.

The catalog contains 297 names from the AKC breed directory retrieved November 20, 2026 (including its Foundation Stock Service and miscellaneous listings, not a claim that all are fully recognized breeds), 18 named mix categories, and five unspecified choices. Common doodle crosses are our added choices, not AKC recognition claims. Source URLs are stored per AKC entry. Unknown also recognizes the misspelling `unkown` and `not sure`.

`fd_breeds` is publicly readable and client read-only. `fd_dogs.breed_id` references it; a trigger resolves names/aliases when the existing text field is saved. Existing text, custom mixes, and historical groom plans are preserved. Unlisted text remains unclassified (`breed_id` null). Blank existing values resolve to Unknown without rewriting their text. Dog access retains the existing owner-only policies.

Dog profile and guest-visit breed inputs offer a searchable native datalist, while allowing unlisted mixes. The browser loads the active catalog during household loading and falls back to a bundled copy before the migration or during an outage. A saved profile canonicalizes known aliases. The saved groom plan still records the visible breed text so historical plans stay independent of catalog edits.

Edit `supabase/data/breeds.json` and run `node scripts/build-breeds.mjs` to refresh the SQL and browser fallback together. Apply the regenerated SQL when changing the database catalog. The seed does not reset an administrator’s `active` flag.
