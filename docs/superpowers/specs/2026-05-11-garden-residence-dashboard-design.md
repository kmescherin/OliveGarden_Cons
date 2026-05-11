# Garden Residence Dashboard Design

## Goal
Restyle the resident, board, and admin app surfaces around the approved Garden Residence direction: warmer olive depth, gold accents, better dashboard spacing, serif headings, tasteful backgrounds, and restrained motion.

## Scope
- Change global theme tokens and font pairing.
- Add reusable dashboard shell/section/card styling classes.
- Restyle the site header, dashboard nav, admin nav, dashboard landing, and primary dashboard pages.
- Keep all existing data loading, auth, permissions, forms, and actions intact.

## Visual Direction
- Palette: deep olive/charcoal background, warm ivory text, muted sage secondary surfaces, and restrained gold accents.
- Typography: elegant serif headings with clean sans body copy.
- Layout: page content sits inside a centered shell with generous mobile/desktop padding; no text or controls should sit close to the left viewport edge.
- Surfaces: translucent olive panels, 8px radius cards, subtle borders, and gentle hover lift.
- Motion: one-time entrance animations for page sections and cards, plus subtle hover transitions. No continuous decorative motion.

## Verification
- Run typecheck, lint, build, auth doctor, and user-path audit.
- Visually verify desktop and mobile dashboard pages with screenshots.
- Confirm no UI text overlaps, cards retain stable dimensions, and authenticated paths still load.
