# ZK-AfterLife — Frontend Design System

> Design direction + UI/UX spec for the frontend redesign. Written 2026-08-04.
> This is the source of truth for the visual rebuild. Implementation notes are in
> §9; build order in §10. Pairs with `context.md` (what the app does) and
> `newplan.md` (the engineering roadmap).

---

## 1. Why redesign — diagnosis of the current UI

The current frontend reads as machine-generated, for concrete reasons:

- **Purple→blue gradients everywhere** used as decoration, not meaning.
- **Emoji as UI** (🔐 📄 ✍️ 🎉 🇮🇳) standing in for real iconography and hierarchy.
- **Glassmorphism by default** — translucent cards with no material logic.
- **Flat, generic hierarchy** — everything is a rounded card on a gradient; nothing
  is quiet, so nothing is loud. No typographic point of view.
- **Tone mismatch** — this product is about *death, legacy, and cryptographic
  secrecy*. The bubbly gradient-and-emoji look trivializes a solemn, high-trust act.

The redesign fixes all five with one disciplined direction.

---

## 2. Design thesis — "Quiet Cryptography"

**One line:** the cold precision of cryptography, in service of a warm human act —
passing on what matters, privately.

The whole product lives on a single tension, and the design is built from it:

| Cold (cryptography) | Warm (inheritance) |
|---|---|
| Obsidian dark canvas | Heirloom off-white text |
| Monospace hashes, addresses, proofs | A single seal-gold accent (wax, brass, estate) |
| Redacted commitments (`██████`) | The person behind them, still alive |

Nothing is playful. It is **solemn, precise, and reassuring** — closer to a private
bank vault or an estate lawyer's letterpress than a DeFi dashboard. From **Renegade**:
the cinematic warm-charcoal canvas, the refined **editorial serif** display, the
duotone of warm amber + cool blue-white directional light, and generous negative
space. From **Apple**: spatial generosity, deference, and typographic clarity.
No gradients-as-decoration, no emoji, no glass.

**The design should feel like handling a sealed, cryptographically-guaranteed
document that only opens when it must.**

### Three type voices

The tri-type system *is* the thesis, one typeface per world:

- **Serif (display)** — the human, legal, heirloom voice. The will as a document.
- **Mono (data)** — the cryptographic voice. Hashes, addresses, proofs, amounts.
- **Sans (interface)** — the quiet functional voice. Labels, prose, controls.

A screen that puts a serif headline above a monospace commitment above sans body
copy is telling the whole story — warm intent, cold proof, clear interface — in type
alone. (Full specs in §4.2.)

---

## 3. Brand & voice

**Name treatment:** `ZK-AFTERLIFE` set in monospace, letter-spaced, all caps for
the wordmark; sentence case everywhere else.

**Voice:** plain, calm, exact. Solemn without being morbid; reassuring without
overselling. Name things by what the person does, not how the system works.

- Say **"Seal a will"**, not "Register commitment".
- Say **"Check in"** / **"You're active"**, not "Submit heartbeat tx".
- Say **"Name your beneficiaries"**, not "Add Merkle leaves".
- Redaction copy: *"Sealed until it's needed."*
- Empty state (no will yet): *"Nothing is sealed yet. When you're ready, we'll
  turn your wishes into a proof only you can open."*
- Error (tx failed): *"The seal didn't complete — your wallet rejected the
  transaction. Nothing was stored. Try again."* (state what happened + that
  nothing changed + the next step; never apologize, never vague.)

Copy is sentence case, active voice, consistent verbs across a flow (a button that
says **Seal will** produces a toast that says **Will sealed**).

---

## 4. Design tokens

### 4.1 Color

A tuned obsidian base (faint cool undertone, never pure `#000`), heirloom off-white
text, and **one** brand accent — seal gold. Green and red exist **only** as
semantic status (alive / grace-danger), muted so they never compete with gold.

```
/* Base — warm charcoal / obsidian (Renegade-warm, never pure #000) */
--bg            #0C0C0E   /* app canvas */
--surface-1     #141416   /* raised card */
--surface-2     #1A1B1E   /* nested / hover */
--hairline      #26272B   /* 1px borders, dividers */
--hairline-soft rgba(245,243,238,0.06)

/* Ink — heirloom paper, not pure white */
--ink           #F5F3EE   /* primary text */
--ink-muted     #9BA1AA   /* secondary text, labels */
--ink-faint     #5C616B   /* tertiary, placeholders, disabled */

/* Accent — Seal Gold (the single brand color; use sparingly) */
--seal          #D8B26A   /* primary accent: CTAs, key numbers, the seal */
--seal-hi       #EAC98A   /* hover / highlight */
--seal-dim      rgba(216,178,106,0.14)  /* accent wash, focus ring bg */

/* Semantic status (functional only, never decorative) */
--alive         #5CE1A6   /* liveness / "you're active" / heartbeat */
--grace         #E5A94D   /* grace period / caution */
--danger        #E5544B   /* execution / veto / destructive */
--info          --ink-muted
```

**Contrast rules:** seal gold is for **large text (≥18px semibold), numerals,
icons, borders, and fills** — not for small body copy on obsidian (fails AA at body
sizes). Body text is always `--ink` / `--ink-muted`. Status colors follow the same
rule: use as accents/indicators, pair with an `--ink` label for anything small.

**Cinematic light, not flat fills.** Renegade gets its richness from *lighting*, not
gradient swatches: warm amber beams and cool blue-white glow raking across a dark
render. Borrow that only in hero / key moments — a soft radial pool of `--seal` warmth
meeting a cool `rgba(180,200,255,0.06)` glow behind the subject, over obsidian. It
reads as atmosphere, not decoration. Everywhere else stays matte and flat; the only
other permitted gradient is a near-invisible hero vignette for depth. Never gradient
buttons, borders, or text.

### 4.2 Typography

Three roles, three faces (§2): a **high-contrast editorial serif** for display (the
Renegade move — elegant, literary, reads like a legal document), a **clean grotesque
sans** for interface/prose (Apple-like clarity), and a **monospace** reserved
strictly for cryptographic data (hashes, addresses, amounts, timers, proofs).

- **Display / headlines — Serif (high-contrast, with a real italic).**
  Aspirational: **Canela** / **Ogg** / **GT Sectra**. Free path: **Fraunces**
  (variable, optical sizing + expressive italic — avoids the Playfair cliché).
  Used for hero and section headlines; emphasis words set in *italic* (as Renegade
  does with *Dark Pool*). Restraint: serif is display-only, never body.
- **Interface / prose — Grotesque sans.**
  Aspirational: **Söhne** / **Neue Haas Grotesk**. Free path: **Geist Sans** (or
  Inter). Paragraphs, form fields, buttons, navigation, most labels.
- **Data — Monospace.**
  Aspirational: **Berkeley Mono**. Free path: **Geist Mono** (or Commit Mono).
  All addresses/hashes/amounts/timers, mono eyebrows (`01 — SEAL`), the wordmark,
  and the two signatures (Pulse readout, Commitment). Never for reading prose.

**Type scale** (desktop; scale down ~1 step on mobile):

```
Display    60 / 64   serif, -1.5% tracking, weight 400 (italic emphasis)  (hero)
H1         40 / 46   serif, -1% tracking, weight 400                       (section)
H2         26 / 32   sans,  weight 600
H3         19 / 26   sans,  weight 600
Body-L     18 / 30   sans,  weight 400
Body       15 / 24   sans,  weight 400
Eyebrow    13 / 16   mono,  +8% tracking, UPPERCASE, --ink-muted
Label      13 / 16   sans,  weight 500, --ink-muted        (form labels)
Data       15 / 22   mono,  tabular-nums                   (addresses, amounts)
Caption    12 / 16   mono,  --ink-faint
```

Always `font-variant-numeric: tabular-nums` on data. Numbers never reflow. Give the
serif generous line-height and space — it should feel calm and set, not cramped.

### 4.3 Spacing, radius, elevation

- **Spacing:** 4px base; scale `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128`.
  Be generous (Apple): section vertical rhythm 96–128px on desktop; page gutters
  min 24px mobile / 64px+ desktop; max content width ~1120px, prose ~680px.
- **Radius:** `--r-card: 10px`, `--r-control: 8px`, `--r-pill: 999px`.
  Data rows and dividers are **sharp (0)** — precision detailing.
- **Elevation:** no drop shadows for depth. Depth = surface tint + 1px hairline.
  A card is `--surface-1` + `1px --hairline`. Hover lifts to `--surface-2`. The
  one exception: focused modals get a soft ambient shadow to separate from canvas.

### 4.4 Motion

Restrained and meaningful. Everything respects `prefers-reduced-motion` (falls back
to instant/static).

- Easing: `cubic-bezier(0.2, 0.8, 0.2, 1)`; durations 160ms (controls) / 320ms
  (reveals) / 700ms+ (ambient).
- Default entrance: 8px rise + fade, staggered 40ms per item. Never bounce.
- Hover: hairline brightens + text→seal; no scaling of large surfaces.

---

## 5. Signature elements

Two elements carry the identity. Everything else stays quiet around them.

### 5.1 The Pulse — living liveness line

The core mechanic is a heartbeat: check in, or the will executes. So the signature
motif is **a single monospace pulse line** — a slow, calm cardiac trace that runs as
ambient atmosphere in the hero and as the literal status indicator on the dashboard.

- **Alive:** the line pulses steadily in `--alive`, ~1 beat / 4s (calm, not anxious).
- **Grace period:** the line slows and shifts to `--grace`; a countdown sits on it.
- **Executed / inactive:** the line goes flat and `--ink-faint` — a single quiet
  statement of finality.

It's not decoration: its color and rhythm *are* the account status. Reduced-motion →
a static trace with a text status. This one element ties the whole protocol to a
single, unmistakable image.

### 5.2 The Seal — commitment & redaction

Privacy is the promise, so sensitive values render as **sealed commitments**:
monospace blocks shown as `██████` or a truncated hash `0x9f3a··4e21` with a small
seal-gold wax mark. On the owner's authenticated view, a sealed value **resolves**
with a brief monospace "decrypt" scramble (characters settle into the real value
over ~320ms). To everyone/everything else it stays sealed.

Used for: beneficiary amounts pre-execution, the will commitment, proof digests.
This makes the ZK privacy *visible and tangible* rather than an invisible backend
fact — the product's biggest differentiator, shown not told.

---

## 6. Core component specs

- **Button.**
  - *Primary:* seal-gold fill, obsidian label, mono uppercase 13/16, radius 8,
    height 44. Hover → `--seal-hi`. The only gold-filled element on a screen —
    one primary action per view.
  - *Secondary:* transparent, 1px `--hairline`, `--ink` label; hover hairline→seal.
  - *Ghost / destructive:* text-only; destructive uses `--danger`.
  - Focus: 2px `--seal` ring with `--seal-dim` halo. Loading: label → animated
    mono dots, never a spinner emoji.
- **Vault card.** `--surface-1`, 1px hairline, radius 10, padding 24–32. A mono
  eyebrow label top-left; optional seal mark top-right. Hover (if interactive):
  surface→`--surface-2`, hairline brightens.
- **Data row.** Sharp-cornered row: mono label left (`--ink-muted`), mono value
  right (`--ink`, tabular). Addresses truncated `0x1234··abcd` with click-to-copy
  (copies full, toast: *Address copied*). Amounts right-aligned, unit dimmed.
- **Commitment / redaction.** See §5.2. Sealed and resolved states; copy affordance
  only when resolved.
- **Pulse indicator.** See §5.1. Compact (nav/status chip) and full (hero/dashboard).
- **Stepper (register flow).** Horizontal on desktop, mono numerals `01 02 03 04`,
  a hairline track that fills seal-gold as you progress. Numbers are meaningful here
  (a real sequence), so numbering is earned. Completed = seal check; current =
  gold ring; upcoming = `--ink-faint`.
- **Status badge.** Pill, 1px border in the status color, mono uppercase label,
  no fill: `ACTIVE` (alive), `GRACE · 29d` (grace), `SEALED`, `EXECUTED`, `VETOED`.
- **Stat tile.** Big mono numeral (Display/H1), mono Label eyebrow, tabular-nums.
  For dashboards; no gradient, no icon-in-a-colored-circle.
- **Form field.** Label = mono uppercase Label; input on `--surface-1`, 1px
  hairline, focus→seal ring; mono for address/amount inputs, sans for text. Inline
  validation in `--danger` with a plain fix instruction.
- **Modal.** Centered, `--surface-1`, hairline, soft ambient shadow, obsidian scrim
  at 70%. Used for confirm-before-seal and confirm-before-execute.
- **Toast.** Bottom-center, `--surface-2`, hairline, mono label, status dot. Auto
  4s. Consistent verbs with the action that triggered it.
- **Empty state.** Centered flat statement + one primary action (§3 voice). No
  illustration clip-art.

Iconography: a single thin line-icon set (e.g. Lucide at 1.5px stroke, `--ink-muted`,
seal on emphasis). **No emoji anywhere in the product.**

---

## 7. Page-by-page redesign

**Landing (`/`).** A large rounded hero container (like Renegade's) holding a
cinematic, dimly-lit scene — obsidian with the warm-gold + cool-white light pool
(§4.1) and the Pulse running ambient through it. Serif Display headline with an
italic emphasis word — *"Pass on what matters. **Privately.**"* (emphasis italic) —
a one-line sans subhead, minimal top nav (Docs · Github · one CTA). One primary CTA
(**Seal a will**), one secondary (**How it works**), and a quiet down-arrow to scroll.
Below the fold: a single sealed-will artifact card whose redacted commitment resolves
on scroll — the product in one frame. Then three quiet sections (Seal → Check in →
Execute) as a real numbered sequence with hairline dividers and a mono data-row
explanation each. No feature-grid of gradient cards.

**Dashboard (`/app`).** The full Pulse indicator is the hero of the page — your
liveness status is the first thing you see, with the next check-in countdown in mono.
Below: stat tiles (assets sealed, beneficiaries, time until grace), then your sealed
will as a vault card with redacted amounts (resolvable by you), then primary actions.

**Register / Seal (`/register`).** The 4-step stepper (§6). Step 0 identity (Self) —
redesign the QR moment as a clean vault card, not a gradient box; drop the "skip for
testing" button from the production look (dev-only). Steps: will details →
beneficiaries (each beneficiary a data-row card) → review (everything shown as it
will be sealed, amounts in mono, a clear "X ETH will be locked" summary) → seal
(confirm modal → progress → sealed success with the commitment shown once).

**Check-in (`/checkin`).** Single-purpose, calm. The Pulse front and center, a big
mono countdown to next required check-in, one primary **Check in** button. After:
line pulses, toast *You're active — next check-in in N days*.

**Execute (`/execute`), Veto (`/veto`), Claims (`/claims`), Withdraw (`/withdraw`).**
Consistent pattern: a vault card per will/claim with a status badge, data rows, and
one clear action. Grace/veto uses `--grace`; execution/destructive uses `--danger`
with a confirm modal. Claims show the beneficiary's own share resolving from sealed.

**Privacy / Terms.** Prose max-width 680, sans body, mono eyebrows. Replace the
current placeholder text with real copy (or a clear "Draft" banner).

**Global chrome.** Slim top bar: mono wordmark left, compact Pulse status chip +
wallet (truncated address, mono) right. Footer: hairline, mono links, one line on
the honest privacy limitation (ties to `context.md` §7).

---

## 8. Accessibility & quality floor

- Contrast: body/`--ink` on `--bg` ≥ AA; gold/status colors only where §4.1 permits.
- Visible keyboard focus on every interactive element (seal ring); logical tab order.
- `prefers-reduced-motion`: Pulse → static, reveals → instant, scrambles → plain.
- Full responsive down to 360px; the stepper stacks; data rows wrap label-over-value.
- Click-to-copy has a non-hover affordance; never rely on hover alone.
- Never encode meaning in color alone — status always pairs color with a mono label.

---

## 9. Implementation notes

- **Stack stays** Next.js 14 + Tailwind v4. Define the tokens in §4 as CSS variables
  in `globals.css` and map them to Tailwind theme tokens (`@theme`), so classes read
  `bg-surface-1`, `text-ink`, `border-hairline`, `text-seal`.
- **Fonts:** load mono + sans via `next/font` (self-hosted for the free faces; if
  licensing Berkeley Mono/Söhne, self-host those). Set `--font-mono` / `--font-sans`.
- **Rip out:** all purple/blue gradient classes, glasscard translucency, and every
  emoji; delete `GlassCard`'s frosted look (repurpose as the flat vault card) and
  replace ad-hoc gradient boxes.
- **Keep:** the working logic in the pages (wallet, `blockchainService`,
  `noirService`) — this is a **visual** reskin; do not touch tx logic. Build a small
  primitives layer (`Button`, `VaultCard`, `DataRow`, `Commitment`, `Pulse`,
  `StatusBadge`, `Stepper`, `Field`, `StatTile`, `Toast`) and refactor pages onto it.
- Keep `dataviz` skill in mind if any real charts appear (none needed for V1).

---

## 10. Build order

1. Tokens + fonts wired into Tailwind (`globals.css`, `@theme`). Ship a `/styleguide`
   route rendering every token + component for review.
2. Primitives layer (§6) with the two signatures: `Pulse` and `Commitment`.
3. Reskin in this order: global chrome → landing → dashboard → check-in →
   register → execute/veto/claims/withdraw → privacy/terms.
4. Pass on motion, reduced-motion, responsive, and focus states.
5. Screenshot review against this doc; cut one accessory per screen (restraint).

---

## Open items for you

- **Fonts:** free tri-face pairing to start — **Fraunces** (serif display) +
  **Geist Sans** (interface) + **Geist Mono** (data). Aspirational licensed swap:
  Canela/Ogg (serif) + Söhne (sans) + Berkeley Mono. Want the free set, or license
  the aspirational faces?
- **Accent:** seal-gold as cinematic warm light (matches Renegade's amber-beam hero)
  is the recommended distinctive choice over the default crypto acid-green. Retune
  the exact gold value once we see it live on the `/styleguide` route.
- Want me to build the `/styleguide` route first so you can see the direction live
  before committing to the full reskin?
