# LocatorLab — practice site for Selenium & Playwright learners

A free, beautiful, **static** practice website for people learning web automation. It packs every type of HTML form control into five deterministic pages, plus a **Locator Coach** that tells you the exact Selenium and Playwright locators for each element — on screen, while you practise.

No backend. No build step. No signup. Open the folder and go.

---

## Why this site exists

Most automation practice sites fall into two traps:

- **Ugly and thin** — a handful of controls, unstable markup, `nth-child` locators that break.
- **Tool-specific** — built for one framework, so Selenium learners feel like second-class citizens.

LocatorLab fixes both:

| What you get | Why it matters |
|---|---|
| **Locator Coach overlay** | Toggle it, hover any control, click the badge → get `id`, `name`, `data-testid`, CSS, XPath **plus** copy-ready Selenium (Python / Java / C#) and Playwright (JS / Python) code |
| **4 stable hooks per element** | `id` + `name` + `data-testid` + `data-automation-id`, all predictable, plus a real `<label for>` |
| **244 stable targets** | Auto-generated reference table — never guess a selector again |
| **Practice tasks with answers** | Every section ships a concrete task and a collapsible answer, so you learn what to assert, not just where to click |
| **Dark + light themes** | Also a free exercise: test theme-dependent selectors |

---

## Quick start

```bash
# 1. serve the folder over HTTP (recommended)
npx serve .                  # → http://localhost:3000
# or
python -m http.server 4173   # → http://localhost:4173

# 2. open the site and press the "Locator Coach" button in the top bar
```

Opening `index.html` directly with `file://` mostly works, but clipboard copy, downloads and a few fetches behave better over HTTP.

---

## What's inside

| Page | Contents |
|---|---|
| `pages/form-essentials.html` | 44 controls — all text input types, password reveal, read-only / disabled / hidden, live validation, every checkbox variant (incl. indeterminate), radio groups and cards, native `<select>` (single / multi / optgroup / disabled), custom dropdown, searchable combobox, cascading dropdowns, tag input |
| `pages/dates-ranges.html` | All 5 native date/time types, custom calendar picker, date-range picker, range sliders, dual-thumb range, star rating, Likert matrix, colour picker |
| `pages/files-buttons.html` | Single + multiple upload, drag-and-drop zone, real generated downloads (TXT / JSON / CSV), every button variant, loading / disabled / toggle states |
| `pages/wizard-submit.html` | Full registration form with live validation and a slow submit, password strength meter, 6-digit OTP row, four-step wizard with review screen |
| `pages/behaviors.html` | Tabs, accordion, modal with focus trap, native `alert/confirm/prompt`, toasts, tooltip, sortable / searchable / paginated table, drag & drop, delayed load, flaky element, infinite scroll, iFrames + nested frames, Shadow DOM, popup window, cookie banner, simulated basic auth |
| `pages/locator-reference.html` | Searchable, filterable table of every stable selector — auto-generated from the HTML |

Regenerate the reference data after editing any page:

```bash
node scripts/build-locator-data.js
```

---

## The locator contract

Every interactive element on this site carries the same four hooks and a real label:

```html
<input
  type="text"
  id="first-name"                  <!-- Selenium: By.id("first-name")          -->
  name="firstName"                 <!-- Selenium: By.name("firstName")         -->
  data-testid="first-name"         <!-- Playwright: page.getByTestId(...)      -->
  data-automation-id="first-name"  <!-- generic / Cypress / Robot Framework    -->
>
<label for="first-name">First name</label>
```

**Rules of thumb**

- Playwright → prefer `getByTestId()`, fall back to `getByLabel()`.
- Selenium → prefer `By.id()`, fall back to `By.name()`.
- Prove the label wiring with `getByLabel()` / `//label[...]/following::input[1]`.
- Never reach for `nth-child` here — if you have to, you have a bug in your locator.

---

## Starters

Runnable example suites that target this site live in [`starters/`](starters):

- `starters/selenium-python/practice.py` — Selenium 4 + Python, covers form essentials and the wizard
- `starters/playwright-js/practice.spec.js` — Playwright Test, covers the same flows plus the behaviors page

```bash
# Selenium
cd starters/selenium-python
pip install selenium
python practice.py

# Playwright
cd starters/playwright-js
npm i -D @playwright/test
npx playwright install
npx playwright test
```

Set `BASE_URL` if you are not serving on `http://localhost:4173`.

---

## Credentials & known values

| Where | Value |
|---|---|
| Simulated basic auth (`behaviors.html`) | `admin` / `admin` |
| OTP demo code (`wizard-submit.html`) | `482913` |
| "Email already registered" trigger | `taken@example.com` |
| Card number (wizard step 3) | `4111 1111 1111 1111` |

---

## Self-test

The repo tests itself — every documented `data-testid` must exist in its HTML, every `<label for>` must point at a real id, and every page must serve:

```bash
node scripts/self-test.js
```

---

## Project structure

```
automationpractice/
├─ index.html                     Landing page
├─ pages/
│  ├─ form-essentials.html
│  ├─ dates-ranges.html
│  ├─ files-buttons.html
│  ├─ wizard-submit.html
│  ├─ behaviors.html
│  └─ locator-reference.html
├─ assets/
│  ├─ css/lab.css                 Design tokens + all components
│  ├─ frames/                     iframe documents (single + nested)
│  └─ js/
│     ├─ main.js                  Shell: theme, nav, toasts, clipboard
│     ├─ locator-coach.js         The overlay + snippet generators
│     ├─ locator-data.js          AUTO-GENERATED — do not edit
│     └─ sections/*.js            One script per practice page
├─ docs/locators.md               AUTO-GENERATED locator table
├─ scripts/
│  ├─ build-locator-data.js       Regenerates the two files above
│  └─ self-test.js                Consistency + HTTP smoke test
├─ starters/                      Runnable Selenium & Playwright suites
└─ README.md
```

---

## Tech

Plain HTML + CSS + vanilla JavaScript. Zero dependencies, zero build, hostable on GitHub Pages, Netlify, S3 or a USB stick. Fonts load from Google Fonts; everything else is local.

Licence: use it, fork it, teach with it.
