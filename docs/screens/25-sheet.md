# Groom Blueprint

**Route:** `#/sheet` · **Stage:** Role / visit handoff · **Design reference:** 31

## Purpose

The owner’s request for this visit. Review it together before starting.

## Inputs and displayed content

Dated, read-only visit snapshot and **Print / save PDF** action. A prominent BASIC GROOM or ADVANCED GROOM badge is separate from the chosen service. The same plan appears as a readable mobile preview and a monochrome portrait printout.

## Navigation

Print or return to review for edits. Return to the household or guest account entry.

## Behavior and acceptance

The output uses the approved portrait layout: **01 Check comfort**, **02 Confirm the look**, **03 Agree before changing**, followed by contacts and the grooming team. Sensitive spots appear before styling, on the exact saved guide with unchanged marker positions. The guide and brand logo print in grayscale. Basic snapshots omit advanced photos, photo notes and styling; Advanced bath-only visits omit haircut requests while retaining current-coat information.

Uploaded photographs are available in a collapsible on-screen gallery and are excluded from paper/PDF. Their saved notes and reference descriptions still print. When photos exist, the gallery section reserves space for a future QR connection and explicitly says sharing is not yet available. It must not contain a fabricated code or a private login URL. The scan destination is outside this iteration.

Each permission remains independent. Missing preferences say they need discussion; absent care details never imply no known conditions. The contact-sharing choice applies to both primary and backup contacts. Completed records remain owner requests, not agreed plans.

Print waits for fonts and guide images, then opens the browser print dialog. Users may print or choose Save as PDF, portrait, with browser headers/footers off. Standard populated Basic and Advanced examples fit one Letter/A4 page. Longer content flows to additional pages without clipping or reducing the font; longer care sections use wider note rows. A running dog/visit label identifies continuation pages. Page counts appear in browsers supporting CSS page-margin counters. Edit still returns to review.

Implementation: `public/print-plan.js` and `public/print-plan.css`, reused by the groomer copy and groom history.

[All screens](README.md) · [Brand and interaction guide](../BRAND.md)
