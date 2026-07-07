# Landing page additions + nationality filter expansion

Date: 2026-07-07
Branch: `feature/landing-additions` (based on `analyzer-restyle`)

## Background

`reference/eidaah-mockup/eidaah-injaz.html` is a static HTML mockup of a richer
landing page (features, "why", journey, "coming soon", team identity). The
current `frontend/src/pages/LandingPage.js` only has a hero + two entry cards
(`entry-grid`). This spec covers porting the *new* sections only, rebuilt as
React components using the existing مداد design system — not copying the
static HTML.

A second, unrelated request was folded into the same branch: expand the
nationality filter on the curriculum video list from 3 broad buckets
(`sa`/`gcc`/`ar`) to 4 concrete countries (`sa`/`jo`/`eg`/`kw`).

## Part 1 — Landing page additions

### Already covered, not duplicated
- `entry-grid`/`entry-card` in `LandingPage.js` already covers the mockup's
  `path-grid` ("اختر كيف تريد البدء") — left untouched.
- The mockup's 4 AI-tool feature cards are already `AIF` in
  `frontend/src/data/curriculum.js`, used by `AiToolsPanel.js` — reused as-is,
  not re-authored.
- `.home-id` CSS already exists in `theme.css` (was unused) — reused, not
  rewritten.
- All icons needed already exist in `frontend/src/components/Icon.js`.

### New sections added to `LandingPage.js`, after `entry-grid`, in order
1. **Hero illustration** — small decorative SVG next to the existing hero
   text, desktop-only (`lg` breakpoint), purely additive; existing hero
   markup/copy untouched.
2. **Features (`feat4`)** — 4 cards reusing `AIF` data.
3. **Why (`why-row`)** — 3 trust badges, new data.
4. **Journey (`jr`)** — 5-step flow, new data.
5. **Coming soon (`soon-grid`)** — 6 cards: بنك الأسئلة، الملخصات الذكية،
   الاختبارات التكيفية، خطط المذاكرة، **لوحة متابعة التقدم**، المساعد الدراسي
   الشخصي.
6. **Team identity (`home-id`)** — closing brand panel wired to the existing
   unused CSS, with buttons to `/about` and `/faq`.

### Files
- New: `frontend/src/data/landing.js` — exports `LP_WHY`, `LP_JOURNEY`,
  `LP_SOON`.
- Edited: `frontend/src/pages/LandingPage.js` — new sections as small inline
  presentational components (`FeatureCard`, `WhyItem`, `JourneyStep`,
  `SoonCard`), matching the existing per-page pattern (e.g. `GradeCard` in
  `CurriculumHome.js`).
- Edited: `frontend/src/styles/theme.css` — append-only: new classes for
  `.lp-sec/.lp-t/.lp-ts`, `.feat4/.feat-card/.feat-ic`, `.why-row/.why-item`,
  `.jr/.jr-step/.jr-ic/.jr-sep`, `.soon-grid/.soon-card/.soon-badge`, hero
  illustration classes, plus matching `[data-theme="dark"]` overrides. No
  edits to existing rules.

### Explicitly out of scope
No changes to `About.js`, `FAQ.js`, `Footer.js`, `TopNav.js`, or any
curriculum page.

## Part 2 — Nationality filter expansion (curriculum video filter)

### Current state
`frontend/src/data/curriculum.js`: `CHANNELS` tag each mock channel with a
broad `nat` bucket (`sa`, `gcc`, `ar`); `NAT_NAMES` labels them "سعودي" /
"خليجي" / "عربي". `VideoGrid.js` renders the "جنسية الشارح" filter from a
hardcoded `opts` list and `applyFilters` does an exact-match filter on `nat`.

### Change
Replace the 3 broad buckets with 4 concrete countries so the filter narrows
real results rather than being decorative:
- `NAT_NAMES` → `{ sa: "سعودي", jo: "أردني", eg: "مصري", kw: "كويتي" }`
- Re-tag the 8 existing mock `CHANNELS` across the 4 codes (4×sa, 2×kw,
  1×jo, 1×eg) so every option has at least one matching result.
- `VideoGrid.js` `FILTER_FIELDS` nat `opts` updated to the 4 new codes/labels.
- No changes to `applyFilters` logic — the exact-match comparison already
  works generically for any `nat` value.
- No new design system classes needed — same `<select>`/`.fsel` markup.

This is mock/prototype data (placeholder channel names), so re-tagging it
carries no real-world factual risk.

### Files
- Edited: `frontend/src/data/curriculum.js`
- Edited: `frontend/src/pages/curriculum/VideoGrid.js`

## Testing
- Existing tests reference only `nat: "sa"` and the "جنسية الشارح" label —
  unaffected by the bucket rename.
- Run `npm test` (CRA/Jest) in `frontend/` after changes.
