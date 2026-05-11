# Public Mercury Restyle Design

## Goal

Apply the `design_theme` Mercury visual system to the public Olive Garden web app surface: the landing page, shared site header, `/about`, `/contacts`, and all `/info/*` pages. Authenticated dashboard, board, and admin workflows should keep their current information architecture and density.

## Source Theme

Use the design files in `C:\Users\apm\Documents\Projects\KGM\OliveGardens\design_theme` as the source of truth:

- Dark surfaces: Deep Space `#171721`, Midnight Slate `#1e1e2a`, Graphite `#272735`.
- Text: Starlight `#ededf3` for primary text, Silver `#c3c3cc` for secondary text.
- Accent: Mercury Blue `#5266eb`, reserved for primary calls to action and key active states.
- Borders: Lead `#70707d`, usually low-opacity.
- Shape language: pill buttons and inputs; public information cards and list rows use square or near-square corners.
- No elevation shadows. Depth comes from surface color, opacity, borders, and spacing.

## Architecture

The implementation should preserve the current Next.js App Router and `next-intl` route structure.

Global CSS will add the Mercury custom properties and map the existing shadcn theme variables to the dark Mercury palette. This lets shared UI components inherit the palette without introducing a parallel styling framework.

Public route styling should be organized through small reusable public primitives or class patterns:

- Public page shell and content width.
- Public hero treatment.
- Public page heading block.
- Public list/card treatment for database-backed public content.

These helpers should avoid changing the behavior of server actions, Supabase reads, authentication checks, or i18n.

## Page Treatments

### Shared Header

The header becomes a dark translucent bar with subtle Lead borders and Starlight/Silver nav links. Login/dashboard actions use a Mercury-style pill button. Mobile sheet behavior stays the same.

### Landing Page

The homepage becomes the primary visual expression of the Mercury theme:

- Full-viewport or near-full-viewport dark cinematic hero.
- Centered display headline and supporting copy.
- Pill CTA group for login/register/dashboard.
- Follow-up public content uses a simple, spacious layout with dark surfaces and bordered feature rows or panels.

The design should not introduce a marketing-only page separate from the app. The first screen remains actionable for residents.

### About And Contact

These pages become editorial public pages:

- Large light-weight headings.
- Secondary text in Silver.
- Contact details in separated dark panels or bordered rows.
- Links use restrained hover states; Mercury Blue is used only when the link is a primary action.

### Info Pages

The `/info/*` pages use one consistent content framing:

- Title at the top with a generous max-width.
- Empty states remain simple and readable.
- Announcements, board members, meetings, elections, rules, and zones use dark panels or bordered rows matching the Mercury style.
- Existing database data and ordering remain unchanged.

## Data Flow

No data model changes are needed. Existing Supabase queries remain in their current server components:

- `announcements`
- `board_members`
- `meetings` and nested `decisions`
- `election_candidates`
- `content_pages`
- `social_zones`

The restyle is presentation-only.

## Error Handling

Existing route behavior should remain intact:

- `/info/rules` continues to call `notFound()` when the content page is missing.
- Empty public datasets continue to render clear empty states.
- Mobile navigation continues to use the existing sheet state and auth-aware links.

## Testing And Verification

Run the available local checks after implementation:

- `npm run typecheck`
- `npm run lint`
- `npm run build` if environment variables allow it

Start the web app locally and verify public routes visually at desktop and mobile widths:

- `/en`, `/en/about`, `/en/contacts`
- `/en/info/announcements`
- `/en/info/board`
- `/en/info/meetings`
- `/en/info/elections`
- `/en/info/rules`
- `/en/info/zones`

Authenticated pages should be spot-checked for obvious breakage from shared token changes, but their layouts are not part of this restyle.
