# First, meet your pup.

**Route:** `#/dog` · **Stage:** Your dog · **Design reference:** 02

## Purpose

Who’s coming in for a groom?

## Inputs and displayed content

- **Dog’s name** — text · required
- **Breed or mix** — text · optional
- **Age** — text · optional
- **Weight, with unit** — text · optional
- **Grooming business** — text · optional
- **Individual groomer** — text · optional
- **Visit date** — date · optional
- **Birthday** — date · optional
- **Groomer address** — text · optional
- **Groomer email** — email · optional
- **Groomer phone** — tel · optional

## Navigation

basic haircut path: [welcome](02-welcome.md) → [dog](03-dog.md) → [service](05-service.md). advanced haircut path: [welcome](02-welcome.md) → [dog](03-dog.md) → [current-photos](04-current-photos.md).

## Behavior and acceptance

A signed-in visit uses the selected dog’s saved identity. Choosing a saved groomer on the dog profile prefills the person, business, address, email and phone. Visit edits do not modify the saved groomer. The owner can edit dog details for this visit. Guests enter their own dog. A dog name is required. Salon, individual groomer and visit date are independent optional values. A date is an owner-entered detail, not a booking.

[All screens](README.md) · [Brand and interaction guide](../BRAND.md)
