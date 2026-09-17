# Design Review — Loop (todo app)

**Mode:** review · **Date:** 2026-09-17 · **Verdict:** Block
**Score:** 30/50

## Heuristic scores

| Lens | Score | Key finding |
|---|---|---|
| First impression | 6/10 | Clean dark surface with a real point of view (brand mark, tagline), but the violet-to-pink glow reads like a generated SaaS default |
| Hierarchy | 6/10 | Primary action (Add task) is clear, but the five-column form squeezes inputs until placeholders truncate, and the top bar crowds out Settings on mobile |
| Color voice | 6/10 | One accent carries action correctly, but settings checkboxes fall back to native blue and the primary glow is louder than the product register needs |
| Type voice | 7/10 | System stack with a workable hierarchy; truncated placeholders undermine it |
| Interaction feel | 5/10 | Missing field labels, silent load failure, no expanded/pressed state announcements, reduced-motion ignored, sub-floor hit areas, horizontal overflow at 375px |

## Findings

| # | Severity | Discipline | Location | Before | After | Why |
|---|---|---|---|---|---|---|
| 1 | HIGH | Layout | `public/styles.css:46` + `public/index.html:14` | Topbar is one nowrap flex row; at 375px the Settings button is cut off entirely (observed) | Let the bar wrap, tighten mobile padding | Escalation trigger: content out of reach at narrow widths |
| 2 | HIGH | Layout | `public/styles.css:113` | Five grid columns in a 720px card; placeholders render as "What needs dc" at 1280px and the row contributes to mobile clipping | Recompose as wrapping flex: title full row, then description, priority, date, Add task | Controls squeezed below usable size; truncation hides the input's purpose |
| 3 | HIGH | Accessibility | `public/styles.css:32-38` | `.bg` runs an infinite 9s `breathe` animation unconditionally | Gate it under `@media (prefers-reduced-motion: no-preference)` | Escalation trigger: self-starting decorative motion ignores the preference |
| 4 | HIGH | Accessibility | `public/index.html:54-61` | Title and description have no label, only placeholder; select/date use `aria-label` | Add visually-hidden `<label for>` to all four fields | Escalation trigger: placeholder doing the label's job |
| 5 | MEDIUM | Accessibility | `public/styles.css:163` | Only inputs get a focus style; `.btn`, `.filter`, `.check`, `.delete` rely on the bare default outline | Add a consistent `:focus-visible` ring from a `--focus-ring` token | Focus must be visible and uniform across every interactive element |
| 6 | MEDIUM | Accessibility | `public/index.html:22,67-69` | Settings toggle has no `aria-expanded`; filter pills have no `aria-pressed` | Set both attributes and keep them in sync in `app.js` | Control state is not announced to assistive tech |
| 7 | MEDIUM | Interaction | `public/app.js` (`loadTasks`) | Initial fetch has no error handling; a failed load leaves a silently empty list | Catch and render an error empty state plus toast | Blank waiting is not acceptable; failure must be visible |
| 8 | MEDIUM | Accessibility | `public/styles.css:223,298` | `.check` is 24px; `.delete` is a small text button — both under the 24px floor | Expand hit areas to 44px with `::after` overlays | Adjacent cramped targets mis-tap |
| 9 | MEDIUM | Color | `public/index.html:38,42` | Settings checkboxes render native blue, off-brand | `accent-color: var(--accent)` | State color inconsistent with the app's vocabulary |
| 10 | LOW | Color | `public/styles.css:163-166` | Gradient CTA with a heavy pink glow | Solid violet accent, restrained shadow | Product register earns restraint; the glow is the loudest thing on a working screen |
| 11 | LOW | Accessibility | `public/styles.css` | `::placeholder` is UA-default gray, likely under-contrast on dark inputs | Set placeholder color from the muted token | Placeholder text still counts for contrast |

## Considered but rejected

| Location | Candidate | Rejected because |
|---|---|---|
| `public/index.html:61` | Replace `dd/mm/yyyy` placeholder | It is a format hint from `input[type=date]`, not a label substitute once real labels exist |
| `public/app.js` (`removeTask`) | Replace `window.confirm` with undo | Undo needs backend soft-delete; confirm names the object and the stakes are low for a personal list. Noted as a later improvement, not a defect |
| Accent hue (violet) | Recolor to a different hue | The hue is a product decision; this pass disciplines its use without repainting the brand unasked |

## Verification

**Ran:** headless Chrome (CDP) renders of the live server at 1280px in four states — populated list, settings open, All filter, focused primary button — and at 375px. Observed: Add task aligned with inputs (prior fix holds), truncated form placeholders at 1280px, Settings cut off at 375px, visible default focus ring on the primary button, native blue checkboxes in settings.

**Not verified:** screen reader walkthrough, APCA contrast measurements (estimated visually), 200% zoom, keyboard end-to-end flow.

## Verdict

**Block** — four escalation-trigger findings stand (mobile clipping ×2, reduced-motion motion, placeholder-as-label).
