# Edit a lookbook photo

**Route** `#/edit-photo/{dogId}/{photoId}`

Load a single photo belonging to the signed-in owner and selected dog. Show its image, saved visibility, removable provider tag and caption. Use the same privacy and provider-search controls as add-photo, without replacement upload buttons. Save updates only caption, visibility and provider ID; image, owner, dog and original groom remain immutable. The database resolves the provider label from an approved directory entry. Making a public photo private immediately removes it from subsequent public lookbook queries. Saving returns to the dog profile; Back cancels changes. Failures keep input available for retry.

[Screen index](README.md) · [Add photo](39-add-photo.md)
