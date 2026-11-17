# First, meet your pup.

**Route:** `#/dog` · **Stage:** Your dog · **Design reference:** 02

## Purpose

Who’s coming in for a groom?

## Inputs and displayed content

Saved dog identity with optional per-visit edits; saved-groomer dropdown with read-only contact summary; Create a groomer button; optional visit date. No inline groomer text fields.

## Navigation

basic haircut path: [welcome](02-welcome.md) → [dog](03-dog.md) → [service](05-service.md). advanced haircut path: [welcome](02-welcome.md) → [dog](03-dog.md) → [current-photos](04-current-photos.md).

## Behavior and acceptance

A signed-in visit uses the selected dog’s saved identity. Select an existing saved groomer from a dropdown; show their person, business, address, email and phone as a read-only card. There are no inline business, groomer or groomer-contact text inputs. Choose later clears all linked groomer details. Create a groomer opens edit-groomer/new/visit, saves the contact to the household and returns to this same draft with the new groomer selected. Back cancels creation without losing visit details. The return path survives reload. Earlier copied selections remain visible until deliberately changed. Groomer loading errors offer retry. Dog identity and the optional visit date remain editable. A date is an owner-entered detail, not a booking.

[All screens](README.md) · [Brand and interaction guide](../BRAND.md)
