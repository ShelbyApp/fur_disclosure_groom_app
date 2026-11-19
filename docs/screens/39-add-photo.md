# Add to the lookbook

**Route** `#/add-photo` with dog ID

Choose a file or take a photo using the device camera when supported. Accept JPEG, PNG and WebP up to 12 MB. Resize locally to at most 900px and save as JPEG, with a preview. Immediately below the two photo buttons show:

1. Private / Public radio cards. Private is always the initial choice. Explain that public shares the image, caption, dog name, breed and provider, not contact details or groom plans.
2. Optional “Tag a location or provider” search. Two letters minimum; debounce 250ms. Search all approved categories in the existing Supabase directory, including salons, mobile, daycare and boarding. Show up to eight compact matches with business, cities and services. No map or mandatory city/filter workflow. More matches request a narrower query. Pending, merged and inactive providers are excluded. Selecting a result shows a removable tag; typing again clears it. Ignore stale responses and dispose listeners when leaving.
3. Optional caption, up to 120 characters, and Add to lookbook.

Disable saving until the photo is ready. Errors preserve the image and all choices. Search failure does not block an untagged upload. A repeated image shows an explicit duplicate notice rather than silently dropping the new settings. Saving returns to the selected dog’s lookbook. Requires migration 006 for sharing/tags; private untagged uploads still work before migration. Existing and groom-generated photos remain private.

[Screen index](README.md) · [Account setup](../SUPABASE.md)
