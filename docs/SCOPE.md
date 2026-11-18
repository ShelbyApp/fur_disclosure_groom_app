# Mobile owner planner

Basic and Advanced describe how much information the owner shares. The service is chosen independently.

| Feature | Basic | Advanced |
| --- | --- | --- |
| Dog, salon, individual groomer and service | Yes | Yes |
| Anxiety, handling, optional health details | Yes | Yes |
| Sensitive spots on a guide dog | Yes | Yes |
| Independent preferences for cut changes, time, fees, distress and missed contact | Yes | Yes |
| Current coat photos with numbered notes | — | Face, side and back |
| Desired-look photos and notes | — | Two references for visits with styling |
| Overall finish, face, body, legs, ears and tail | — | Optional for visits with styling |
| Review, local groomer copy and print | Yes | Yes |

An owner can open the sensitive-spot map from coat, handling or contingencies even when the coat has no tangles. Numbered notes are tied to one guide or one uploaded image. Changing a marked photo requires confirmation. Basic excludes all advanced pictures, picture annotations and styling values when reviewing and finishing a visit.

Signed-in owners have a household profile with optional city/state, multiple dogs, multiple manually entered groomers and per-dog history in Supabase. Dog basics and usual care are separate pages. Pet identity, birthday, weight, usual care choices and owner contact details prefill new visits. Selecting a saved groomer prefills their person, business and contact fields. A dog profile shows the latest three grooms and a link to the complete history. Its swipeable Polaroid lookbook accepts uploads and camera photos, and includes current-coat photos from completed grooms without importing inspiration images. All these records are private to the owner.

The visit screen selects saved groomers from a dropdown and shows their contact details read-only. Creating a groomer from this screen saves to the household and returns to the same draft. Dog care setup also collects allergies, relevant medications or conditions, mobility and comfort notes. These prefill new visits and can be edited for one groom without changing the profile. Keep in touch displays the primary owner contact and offers an optional secondary contact name and phone. Contact sharing applies to both people.

Copying a finished record creates a new editable visit, including its photo and sensitive-spot notes. Acknowledgements and contact sharing are reviewed again. Drafts stay scoped to the dog and current browser tab. Guest entry is hidden; existing local guest drafts remain compatible. QR delivery and groomer agreement remain future work.

The [service directory pilot](DIRECTORY.md) adds city-first search for Sarasota, St. Petersburg and Tampa, independent grooming/daycare/boarding flags, salon/mobile coverage, contacts and rating support. A mobile provider can serve multiple cities through one record. User entries become private contacts and review submissions with provenance and potential duplicates. Run the combined SQL import before deployment. Ratings require own-app reviews or separately licensed data; Google rating integration is disabled under the default policy. Moderation tooling remains future work.

Finished plans, the local groomer copy and saved-history plans share a monochrome portrait print/PDF layout. It prioritizes sensitive spots and care, distinguishes Basic from Advanced, and preserves all entered notes and separate permission choices. Uploaded photos remain available on screen and are omitted from the printout; their notes print alongside a reserved, explicitly inactive QR gallery area. Standard examples fit one page, while longer content continues without truncation. No database migration or public photo sharing is introduced.

Completed with the map picker update (November 18, 2026): `Version: 01.01` appears in small, centered text immediately below Create Account on the login page only. The build derives this label from the package's major/minor version.
