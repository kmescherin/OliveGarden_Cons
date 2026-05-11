# Public Mercury Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the Mercury dark design system from `design_theme` to the Olive Garden public pages and shared public header.

**Architecture:** Add Mercury theme tokens globally, then apply public-specific layout primitives to the homepage, about/contact pages, and `/info/*` routes. Keep Supabase queries, i18n namespaces, auth checks, and authenticated app layouts structurally unchanged.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, next-intl, Supabase server components.

---

## File Structure

- Modify `apps/web/src/app/globals.css`: add Mercury tokens, map shadcn variables to the Mercury palette, add base body styles, and define public utility classes in `@layer components`.
- Modify `apps/web/src/components/ui/button-variants.ts`: make buttons pill-shaped and align `default`, `secondary`, `outline`, and `ghost` variants with the Mercury palette.
- Modify `apps/web/src/components/ui/card.tsx`: reduce public-facing card rounding and make default cards match dark Mercury surfaces.
- Modify `apps/web/src/components/ui/badge.tsx`: make badges match the dark surface and Lead border system.
- Modify `apps/web/src/components/site-header-client.tsx`: restyle header, nav links, auth action, mobile sheet trigger, and mobile nav separators.
- Modify `apps/web/src/features/marketing/hero-ctas.tsx`: replace current shimmer colors with Mercury CTA styling.
- Modify `apps/web/src/app/[locale]/page.tsx`: rebuild homepage as a Mercury public hero plus feature list.
- Modify `apps/web/src/app/[locale]/about/page.tsx`: apply public page shell and editorial text treatment.
- Modify `apps/web/src/app/[locale]/contacts/page.tsx`: apply public page shell and public information panels.
- Modify `apps/web/src/app/[locale]/info/layout.tsx`: apply public shell spacing to all info pages.
- Modify `apps/web/src/app/[locale]/info/announcements/page.tsx`: apply public content list styling.
- Modify `apps/web/src/app/[locale]/info/board/page.tsx`: apply public content grid styling.
- Modify `apps/web/src/app/[locale]/info/meetings/page.tsx`: apply public section/list styling to scheduled and completed meetings.
- Modify `apps/web/src/app/[locale]/info/elections/page.tsx`: apply public content list styling.
- Modify `apps/web/src/app/[locale]/info/rules/page.tsx`: apply public article styling.
- Modify `apps/web/src/app/[locale]/info/zones/page.tsx`: apply public content grid styling.

---

### Task 1: Add Mercury Theme Tokens And Public Utilities

**Files:**
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Add Mercury variables to `:root`**

In `apps/web/src/app/globals.css`, replace the current `:root` variable block with:

```css
:root {
  --color-mercury-blue: #5266eb;
  --color-ghost-blue: #cdddff;
  --color-deep-space: #171721;
  --color-midnight-slate: #1e1e2a;
  --color-graphite: #272735;
  --color-lead: #70707d;
  --color-starlight: #ededf3;
  --color-silver: #c3c3cc;
  --color-pure-white: #ffffff;

  --background: #171721;
  --foreground: #ededf3;
  --card: #1e1e2a;
  --card-foreground: #ededf3;
  --popover: #1e1e2a;
  --popover-foreground: #ededf3;
  --primary: #5266eb;
  --primary-foreground: #ffffff;
  --secondary: rgb(205 221 255 / 0.16);
  --secondary-foreground: #ededf3;
  --muted: #272735;
  --muted-foreground: #c3c3cc;
  --accent: #272735;
  --accent-foreground: #ededf3;
  --destructive: oklch(0.704 0.191 22.216);
  --border: rgb(112 112 125 / 0.42);
  --input: rgb(112 112 125 / 0.55);
  --ring: #5266eb;
  --chart-1: #ededf3;
  --chart-2: #c3c3cc;
  --chart-3: #70707d;
  --chart-4: #5266eb;
  --chart-5: #272735;
  --radius: 0.25rem;
  --sidebar: #1e1e2a;
  --sidebar-foreground: #ededf3;
  --sidebar-primary: #5266eb;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #272735;
  --sidebar-accent-foreground: #ededf3;
  --sidebar-border: rgb(112 112 125 / 0.42);
  --sidebar-ring: #5266eb;
}
```

- [ ] **Step 2: Align `.dark` with the same Mercury palette**

Replace the current `.dark` variable block with:

```css
.dark {
  --background: #171721;
  --foreground: #ededf3;
  --card: #1e1e2a;
  --card-foreground: #ededf3;
  --popover: #1e1e2a;
  --popover-foreground: #ededf3;
  --primary: #5266eb;
  --primary-foreground: #ffffff;
  --secondary: rgb(205 221 255 / 0.16);
  --secondary-foreground: #ededf3;
  --muted: #272735;
  --muted-foreground: #c3c3cc;
  --accent: #272735;
  --accent-foreground: #ededf3;
  --destructive: oklch(0.704 0.191 22.216);
  --border: rgb(112 112 125 / 0.42);
  --input: rgb(112 112 125 / 0.55);
  --ring: #5266eb;
  --chart-1: #ededf3;
  --chart-2: #c3c3cc;
  --chart-3: #70707d;
  --chart-4: #5266eb;
  --chart-5: #272735;
  --sidebar: #1e1e2a;
  --sidebar-foreground: #ededf3;
  --sidebar-primary: #5266eb;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #272735;
  --sidebar-accent-foreground: #ededf3;
  --sidebar-border: rgb(112 112 125 / 0.42);
  --sidebar-ring: #5266eb;
}
```

- [ ] **Step 3: Update base styles and add public utility classes**

Replace the current `@layer base` block with:

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  html {
    @apply font-sans;
    background: var(--color-deep-space);
  }

  body {
    @apply bg-background text-foreground;
    background:
      radial-gradient(circle at 50% 0%, rgb(82 102 235 / 0.16), transparent 34rem),
      linear-gradient(180deg, var(--color-deep-space), var(--color-midnight-slate) 42rem);
    min-height: 100vh;
  }
}

@layer components {
  .public-shell {
    @apply mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8;
  }

  .public-section {
    @apply py-12 md:py-20;
  }

  .public-heading {
    @apply text-4xl leading-tight font-light tracking-[0.01em] text-foreground md:text-5xl;
  }

  .public-kicker {
    @apply text-xs font-medium tracking-[0.24px] text-muted-foreground uppercase;
  }

  .public-lead {
    @apply max-w-3xl text-base leading-7 text-muted-foreground md:text-lg;
  }

  .public-panel {
    @apply border border-border bg-card/78 p-5 text-card-foreground md:p-6;
  }

  .public-row {
    @apply border-b border-border py-5 first:border-t;
  }

  .public-link {
    @apply text-foreground underline-offset-4 transition-colors hover:text-muted-foreground hover:underline;
  }
}
```

- [ ] **Step 4: Run CSS/type validation**

Run:

```bash
cd apps/web
npm run typecheck
```

Expected: TypeScript completes without errors introduced by CSS changes.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "style: add mercury public theme tokens"
```

---

### Task 2: Restyle Shared UI Primitives

**Files:**
- Modify: `apps/web/src/components/ui/button-variants.ts`
- Modify: `apps/web/src/components/ui/card.tsx`
- Modify: `apps/web/src/components/ui/badge.tsx`

- [ ] **Step 1: Update button variants**

In `apps/web/src/components/ui/button-variants.ts`, replace the first string passed to `cva` with:

```ts
"group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-medium tracking-[0.01em] whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
```

Replace the `variant` object with:

```ts
variant: {
  default:
    "bg-primary text-primary-foreground hover:bg-primary/90 [a]:hover:bg-primary/90",
  outline:
    "border-border bg-transparent text-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
  ghost:
    "text-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
  destructive:
    "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
  link: "text-foreground underline-offset-4 hover:text-muted-foreground hover:underline",
}
```

Replace the `size` object with:

```ts
size: {
  default:
    "h-10 gap-1.5 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
  xs: "h-7 gap-1 px-3 text-xs has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3",
  sm: "h-8 gap-1 px-4 text-[0.8rem] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-3.5",
  lg: "h-12 gap-2 px-6 text-base has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
  icon: "size-9",
  "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
  "icon-sm": "size-8",
  "icon-lg": "size-10",
}
```

- [ ] **Step 2: Update card defaults**

In `apps/web/src/components/ui/card.tsx`, change the Card class string to:

```tsx
"group/card flex flex-col gap-4 overflow-hidden rounded-none border border-border bg-card/82 py-4 text-sm text-card-foreground has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0"
```

Change `CardHeader` class string to:

```tsx
"group/card-header @container/card-header grid auto-rows-min items-start gap-1 px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3"
```

Change `CardTitle` class string to:

```tsx
"font-heading text-base leading-snug font-medium tracking-[0.01em] group-data-[size=sm]/card:text-sm"
```

Change `CardFooter` class string to:

```tsx
"flex items-center border-t border-border bg-muted/50 p-4 group-data-[size=sm]/card:p-3"
```

- [ ] **Step 3: Update badge defaults**

Open `apps/web/src/components/ui/badge.tsx` and adjust the variant classes so `default`, `secondary`, and `outline` use Mercury surfaces. The `badgeVariants` call should contain:

```ts
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium tracking-[0.01em] whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 [&>svg]:size-3",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground",
        secondary:
          "border-border bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive/10 text-destructive",
        outline:
          "border-border bg-transparent text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
```

- [ ] **Step 4: Run typecheck**

Run:

```bash
cd apps/web
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/button-variants.ts apps/web/src/components/ui/card.tsx apps/web/src/components/ui/badge.tsx
git commit -m "style: align shared primitives with mercury theme"
```

---

### Task 3: Restyle Public Header And CTAs

**Files:**
- Modify: `apps/web/src/components/site-header-client.tsx`
- Modify: `apps/web/src/features/marketing/hero-ctas.tsx`

- [ ] **Step 1: Update header container and brand classes**

In `apps/web/src/components/site-header-client.tsx`, change the returned header opening to:

```tsx
<header className="sticky top-0 z-40 border-b border-border bg-background/78 backdrop-blur-xl">
  <div className="public-shell flex h-16 items-center justify-between gap-4">
```

Change the brand Link class to:

```tsx
className="shrink-0 text-sm font-medium tracking-[0.02em] text-foreground"
```

- [ ] **Step 2: Update nav and auth link button classes**

For the `/about`, `/contacts`, and authenticated `/dashboard` links, keep `buttonVariants({ variant: "ghost", size: "sm" })` and append:

```tsx
"justify-start text-muted-foreground hover:text-foreground md:justify-center"
```

For the unauthenticated login link, keep `buttonVariants({ size: "sm" })` and append:

```tsx
"justify-center px-5"
```

- [ ] **Step 3: Update mobile sheet details**

In the `SheetTrigger` class append `"shrink-0 border border-border md:hidden"`.

Change `SheetContent` to:

```tsx
<SheetContent
  side="right"
  className="w-[min(100vw-2rem,20rem)] border-border bg-card text-card-foreground"
>
```

Change both mobile separator wrappers from `border-t pt-3` to:

```tsx
"border-t border-border pt-3"
```

- [ ] **Step 4: Update hero CTA component**

In `apps/web/src/features/marketing/hero-ctas.tsx`, change each `ShimmerButton` to use Mercury colors.

Logged-in button:

```tsx
<ShimmerButton
  background="#5266eb"
  shimmerColor="#cdddff"
  className="rounded-full px-6 text-primary-foreground"
  onClick={() => router.push("/dashboard")}
>
  {t("ctaDashboard")}
</ShimmerButton>
```

Login button:

```tsx
<ShimmerButton
  background="#5266eb"
  shimmerColor="#cdddff"
  className="rounded-full px-6 text-primary-foreground"
  onClick={() => router.push("/login")}
>
  {t("ctaLogin")}
</ShimmerButton>
```

Register button:

```tsx
<ShimmerButton
  background="rgb(205 221 255 / 0.16)"
  shimmerColor="#cdddff"
  className="rounded-full border border-border px-6 text-foreground"
  onClick={() => router.push("/register")}
>
  {t("ctaRegister")}
</ShimmerButton>
```

- [ ] **Step 5: Run typecheck**

Run:

```bash
cd apps/web
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/site-header-client.tsx apps/web/src/features/marketing/hero-ctas.tsx
git commit -m "style: restyle public header and ctas"
```

---

### Task 4: Rebuild Homepage Public Layout

**Files:**
- Modify: `apps/web/src/app/[locale]/page.tsx`

- [ ] **Step 1: Remove old homepage-specific imports**

Remove these imports from `apps/web/src/app/[locale]/page.tsx`:

```ts
import { BorderBeam } from "@/components/ui/border-beam";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
```

- [ ] **Step 2: Replace the `main` content**

Keep the existing metadata, translations, Supabase user lookup, and `<SiteHeader user={user} />`. Replace the `<main>` block with:

```tsx
<main className="flex flex-1 flex-col">
  <section className="public-shell flex min-h-[calc(100svh-4rem)] items-center py-16 text-center">
    <div className="mx-auto max-w-4xl">
      <p className="public-kicker mb-5">{t("badge")}</p>
      <h1 className="text-5xl leading-[1.05] font-light tracking-[0.01em] text-foreground md:text-7xl">
        {t("title")}
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl">
        {t("subtitle")}
      </p>
      <div className="mt-9 flex flex-wrap justify-center gap-4">
        <HeroCtas loggedIn={Boolean(user)} />
      </div>
    </div>
  </section>

  <section className="public-shell public-section">
    <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="public-kicker mb-3">{t("badge")}</p>
        <h2 className="public-heading">{t("featuresTitle")}</h2>
      </div>
      <p className="public-lead md:max-w-md">{t("subtitle")}</p>
    </div>

    <div className="grid gap-0 md:grid-cols-3">
      <article className="public-panel md:border-r-0">
        <h3 className="text-2xl font-light tracking-[0.01em]">{t("f1Title")}</h3>
        <p className="mt-4 leading-7 text-muted-foreground">{t("f1Desc")}</p>
      </article>
      <article className="public-panel md:border-r-0">
        <h3 className="text-2xl font-light tracking-[0.01em]">{t("f2Title")}</h3>
        <p className="mt-4 leading-7 text-muted-foreground">{t("f2Desc")}</p>
      </article>
      <article className="public-panel">
        <h3 className="text-2xl font-light tracking-[0.01em]">{t("f3Title")}</h3>
        <p className="mt-4 leading-7 text-muted-foreground">{t("f3Desc")}</p>
      </article>
    </div>
  </section>
</main>
```

- [ ] **Step 3: Run typecheck**

Run:

```bash
cd apps/web
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add 'apps/web/src/app/[locale]/page.tsx'
git commit -m "style: rebuild public landing page"
```

---

### Task 5: Restyle About And Contact Pages

**Files:**
- Modify: `apps/web/src/app/[locale]/about/page.tsx`
- Modify: `apps/web/src/app/[locale]/contacts/page.tsx`

- [ ] **Step 1: Update about page layout**

In `apps/web/src/app/[locale]/about/page.tsx`, replace the `<main>` block with:

```tsx
<main className="public-shell flex-1 py-16 md:py-24">
  <article className="max-w-4xl">
    <p className="public-kicker mb-4">{t("title")}</p>
    <h1 className="public-heading">{t("title")}</h1>
    <p className="public-lead mt-6">{t("lead")}</p>
    <div className="mt-12 max-w-3xl space-y-0 text-muted-foreground">
      <p className="public-row whitespace-pre-line leading-7">{t("p1")}</p>
      <p className="public-row whitespace-pre-line leading-7">{t("p2")}</p>
      <p className="public-row whitespace-pre-line leading-7">{t("p3")}</p>
    </div>
  </article>
</main>
```

- [ ] **Step 2: Update contacts page panels**

In `apps/web/src/app/[locale]/contacts/page.tsx`, keep the Card imports. Replace the `<main>` block with:

```tsx
<main className="public-shell flex-1 py-16 md:py-24">
  <div className="max-w-4xl">
    <p className="public-kicker mb-4">{t("title")}</p>
    <h1 className="public-heading">{t("title")}</h1>
    <p className="public-lead mt-6">{t("lead")}</p>
  </div>

  <div className="mt-12 grid gap-4 md:grid-cols-2">
    <Card className="public-panel">
      <CardHeader>
        <CardTitle className="text-lg">{t("addressLabel")}</CardTitle>
      </CardHeader>
      <CardContent className="whitespace-pre-line leading-7 text-muted-foreground">
        {t("addressValue")}
      </CardContent>
    </Card>
    <Card className="public-panel">
      <CardHeader>
        <CardTitle className="text-lg">{t("phoneLabel")}</CardTitle>
      </CardHeader>
      <CardContent>
        <a href={`tel:${t("phoneHref")}`} className="public-link">
          {t("phoneValue")}
        </a>
      </CardContent>
    </Card>
    <Card className="public-panel">
      <CardHeader>
        <CardTitle className="text-lg">{t("emailLabel")}</CardTitle>
      </CardHeader>
      <CardContent>
        <a href={`mailto:${t("emailValue")}`} className="public-link">
          {t("emailValue")}
        </a>
      </CardContent>
    </Card>
    <Card className="public-panel">
      <CardHeader>
        <CardTitle className="text-lg">{t("hoursLabel")}</CardTitle>
      </CardHeader>
      <CardContent className="whitespace-pre-line leading-7 text-muted-foreground">
        {t("hoursValue")}
      </CardContent>
    </Card>
  </div>
</main>
```

- [ ] **Step 3: Run typecheck**

Run:

```bash
cd apps/web
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add 'apps/web/src/app/[locale]/about/page.tsx' 'apps/web/src/app/[locale]/contacts/page.tsx'
git commit -m "style: restyle public about and contact pages"
```

---

### Task 6: Restyle Info Layout And Simple Info Pages

**Files:**
- Modify: `apps/web/src/app/[locale]/info/layout.tsx`
- Modify: `apps/web/src/app/[locale]/info/announcements/page.tsx`
- Modify: `apps/web/src/app/[locale]/info/board/page.tsx`
- Modify: `apps/web/src/app/[locale]/info/elections/page.tsx`
- Modify: `apps/web/src/app/[locale]/info/rules/page.tsx`
- Modify: `apps/web/src/app/[locale]/info/zones/page.tsx`

- [ ] **Step 1: Update info layout shell**

In `apps/web/src/app/[locale]/info/layout.tsx`, replace:

```tsx
<div className="container flex-1 py-8">{children}</div>
```

with:

```tsx
<div className="public-shell flex-1 py-16 md:py-24">{children}</div>
```

- [ ] **Step 2: Update announcements page classes**

In `apps/web/src/app/[locale]/info/announcements/page.tsx`, change the outer wrapper to:

```tsx
<div className="space-y-10">
  <h1 className="public-heading">{t("announcements")}</h1>
```

Change the empty state to:

```tsx
<p className="text-sm text-muted-foreground">—</p>
```

Change the list class to:

```tsx
<ul className="space-y-4">
```

Change each `Card` to:

```tsx
<Card className="public-panel">
```

Change announcement `CardTitle` to:

```tsx
<CardTitle className="text-xl font-light tracking-[0.01em]">{a.title}</CardTitle>
```

- [ ] **Step 3: Update board page classes**

In `apps/web/src/app/[locale]/info/board/page.tsx`, change the outer wrapper to:

```tsx
<div className="space-y-10">
  <h1 className="public-heading">{t("board")}</h1>
```

Change each `Card` to:

```tsx
<Card className="public-panel">
```

Change contact links to:

```tsx
className="public-link"
```

- [ ] **Step 4: Update elections page classes**

In `apps/web/src/app/[locale]/info/elections/page.tsx`, change the outer wrapper and heading to:

```tsx
<div className="space-y-10">
  <h1 className="public-heading">{t("title")}</h1>
```

Change each `Card` to:

```tsx
<Card className="public-panel">
```

Change candidate `CardTitle` to:

```tsx
<CardTitle className="text-xl font-light tracking-[0.01em]">{c.full_name}</CardTitle>
```

- [ ] **Step 5: Update rules page article**

In `apps/web/src/app/[locale]/info/rules/page.tsx`, replace the article block with:

```tsx
<article className="max-w-4xl space-y-8">
  <h1 className="public-heading">{page.title ?? t("rules")}</h1>
  <div className="public-panel whitespace-pre-wrap leading-7 text-muted-foreground">
    {page.body}
  </div>
</article>
```

- [ ] **Step 6: Update zones page classes**

In `apps/web/src/app/[locale]/info/zones/page.tsx`, change the outer wrapper and heading to:

```tsx
<div className="space-y-10">
  <h1 className="public-heading">{t("zones")}</h1>
```

Change each `Card` to:

```tsx
<Card className="public-panel">
```

- [ ] **Step 7: Run typecheck**

Run:

```bash
cd apps/web
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add 'apps/web/src/app/[locale]/info/layout.tsx' 'apps/web/src/app/[locale]/info/announcements/page.tsx' 'apps/web/src/app/[locale]/info/board/page.tsx' 'apps/web/src/app/[locale]/info/elections/page.tsx' 'apps/web/src/app/[locale]/info/rules/page.tsx' 'apps/web/src/app/[locale]/info/zones/page.tsx'
git commit -m "style: restyle public info pages"
```

---

### Task 7: Restyle Meetings Info Page

**Files:**
- Modify: `apps/web/src/app/[locale]/info/meetings/page.tsx`

- [ ] **Step 1: Update heading and section wrappers**

In `apps/web/src/app/[locale]/info/meetings/page.tsx`, change:

```tsx
<div className="space-y-8">
  <h1 className="text-3xl font-semibold">{t("title")}</h1>
```

to:

```tsx
<div className="space-y-12">
  <h1 className="public-heading">{t("title")}</h1>
```

Change both section headings from:

```tsx
<h2 className="text-xl font-medium">
```

to:

```tsx
<h2 className="text-2xl font-light tracking-[0.01em]">
```

- [ ] **Step 2: Update meeting cards**

Change every meeting `Card` opening to:

```tsx
<Card className="public-panel">
```

Change every meeting `CardTitle` class from:

```tsx
className="text-base"
```

to:

```tsx
className="text-xl font-light tracking-[0.01em]"
```

Change decision list item class from:

```tsx
className="rounded-lg border p-2"
```

to:

```tsx
className="border border-border bg-muted/40 p-3"
```

- [ ] **Step 3: Run typecheck**

Run:

```bash
cd apps/web
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add 'apps/web/src/app/[locale]/info/meetings/page.tsx'
git commit -m "style: restyle public meetings page"
```

---

### Task 8: Verification And Visual Review

**Files:**
- No source edits expected unless verification finds a defect.

- [ ] **Step 1: Run static checks**

Run:

```bash
cd apps/web
npm run typecheck
npm run lint
```

Expected: both commands pass.

- [ ] **Step 2: Run production build if env allows it**

Run:

```bash
cd apps/web
npm run build
```

Expected: build passes. If it fails because Supabase/OpenAI environment variables are missing, record the exact missing variable error and continue to local visual verification.

- [ ] **Step 3: Start the dev server**

Run:

```bash
cd apps/web
npm run dev
```

Expected: Next.js starts and prints a local URL, usually `http://localhost:3000`.

- [ ] **Step 4: Verify public routes**

Open these routes at desktop and mobile widths:

```text
http://localhost:3000/en
http://localhost:3000/en/about
http://localhost:3000/en/contacts
http://localhost:3000/en/info/announcements
http://localhost:3000/en/info/board
http://localhost:3000/en/info/meetings
http://localhost:3000/en/info/elections
http://localhost:3000/en/info/rules
http://localhost:3000/en/info/zones
```

Expected visual results:

- Header is dark, translucent, readable, and usable on mobile.
- Homepage hero uses the Mercury dark canvas, centered headline, and pill CTAs.
- Public content pages use Starlight/Silver text with Lead borders.
- Mercury Blue appears only on primary CTAs or primary badges.
- No text overlaps at mobile width.
- Authenticated dashboards are still navigable if a user is signed in.

- [ ] **Step 5: Commit verification fixes if needed**

If visual verification requires small fixes, commit them:

```bash
git add apps/web/src
git commit -m "fix: polish mercury public restyle"
```

If no fixes are needed, do not create an empty commit.

---

## Self-Review Notes

- Spec coverage: the plan covers global tokens, shared header, landing page, about/contact pages, all `/info/*` pages, unchanged data flow, unchanged error behavior, and verification.
- Red-flag scan: no unfinished markers or unspecified implementation steps are intentionally present.
- Type consistency: all file paths and component names match the current codebase inspected before writing this plan.
