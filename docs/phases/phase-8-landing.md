# Phase 8 · Landing page

**Goal:** a visitor who opens the site sees what the company does, can play with it, and gets into the demo in one click.

**Time:** ~3h, Sunday night. **Depends on:** Phase 7. One public read: no schema change, no new Server Action, no new dependency.

Decisions: D65 (landing page, look from `../../design.md`), D66 (public catalog read) in `../context.md`. Design: `../lld/07-landing.md`.

---

## Slice 8.1 · Page, hero and orbit

**Outcome:** `/` is a page. It opens on a full-screen black hole scene with the headline, and further down a visitor can pick a planet from an orbit.

### Build

| Layer | Work |
|---|---|
| Service | `landing/service.ts` `getLandingCatalog`: planets (name, days from Earth, delivery charge) nearest first, products (name, price) by name. No session check (D66) |
| Domain | `landing/orbit.ts`, pure: the look of each planet, `starField` (fixed seed), `routeBetween` (both ends in percent of the frame, and the angle) |
| Route | `app/page.tsx`: a signed-in user is redirected to the role home, a visitor gets `LandingPage` |
| Styles | `.landing` token scope and the landing keyframes in `app/globals.css` |
| Hero | `components/ui/singularity-horizon.tsx` (client): the 21st.dev "Singularity Horizon" the owner supplied. Three looks that cycle every 10 seconds, each with our title and status, four readouts with real numbers, and a slot with the headline and two links. `singularity-states.ts` holds the looks as plain data |
| UI | `LandingPage` (nav, section order), `OrbitExplorer` (client): rings turning in CSS, planet list, readout card, route line and rocket from Earth, pause button, Pluto |

### Acceptance criteria

- [ ] A visitor on `/` sees the landing page. A signed-in user lands on the role home.
- [ ] Every planet in the database is in the list. A click on a planet, on the map or in the list, stops the orbit, draws the route from Earth and shows days and delivery charge.
- [ ] A second click on the same planet starts the orbit again.
- [ ] The page is dark with either theme cookie, and the dashboard theme is unchanged.
- [ ] No horizontal page scroll at 390px.

### Edge cases

| Case | Expected |
|---|---|
| A planet in the database with no entry in `ORBITS` | In the list and in the readout, not on the map, no route |
| Pluto | A readout with a joke. No route, the orbit keeps turning |
| `prefers-reduced-motion` | Nothing turns. A selected route shows the rocket at the planet |
| Keyboard only | The planet list and the pause button are reachable. The map buttons are skipped |
| Empty database | The page renders with zero planets and no calculator |
| No WebGL2 | The hero shows a still gradient of the same subject. Text and buttons are unchanged |
| The hero is scrolled off screen | The scene stops drawing |
| A finger swipes up on the hero | The page scrolls. A sideways drag turns the camera |

### Tests

`service.test.ts`: answers without a session, planets nearest first, products by name, the allowed keys signed out and as Admiral. `orbit.test.ts`: an orbit for every seeded planet, rings unique and inside the frame, Earth between Venus and Mars, no orbit for Pluto, the same stars every time, route ends and angles.

---

## Slice 8.2 · Numbers and how it works

**Outcome:** the page explains the product with real numbers and lets a visitor enter as any role.

### Build

| Piece | Work |
|---|---|
| Numbers | Planets, products, `TRIP_CAPACITY`, days to the nearest and the farthest planet. `CountUp` (client) counts up when the row scrolls into view |
| Steps | `landing/steps.ts`: the four roles in order, each with a demo account. `HowItWorks` draws them on a flight line, and a rocket follows the scroll with CSS `animation-timeline` |
| Demo entry | `DemoEntryForm` and `DemoEntryButton` (client) submit `demoLoginAction` |

### Acceptance criteria

- [ ] Every number matches the database or the rule constant.
- [ ] "Enter as Captain" logs in as a captain and opens `/captain`. The same for the other three roles.
- [ ] Where scroll timelines are not supported, the line is full and the rocket rests at the end.

### Tests

`steps.test.ts`: every role once, each demo account exists and has that role.

---

## Slice 8.3 · Cost calculator, launch pad, footer

**Outcome:** a visitor can price a delivery, and there is one thing on the page that is only for fun.

### Build

| Piece | Work |
|---|---|
| `CostCalculator` (client) | Planet and product as radio pills, units on a range input from 1 to `MAX_UNITS`. Total from `lineTotalCents`, arrival text from `etaText` |
| `LaunchPad` (client) | A button, a countdown, a rocket that leaves, a dry log line and a counter |
| `LandingFooter` | Links, a status line, the name as a large outline |

### Acceptance criteria

- [ ] The total equals what the checkout shows for the same planet, product and units.
- [ ] The arrow keys move between pills and move the slider.
- [ ] A launch ends with a log line and a new rocket on the pad, with and without reduced motion.

### Edge cases

| Case | Expected |
|---|---|
| The Admiral changes a price | The next load of `/` shows the new price |
| Launch pressed during a countdown | Nothing: the button is disabled until the rocket is back |

---

## Phase gate

On the live URL: `/` loads without a session, a planet can be picked, the calculator total for 3 Water to Mars is $45.00, "Enter as Customer" opens `/customer`, and `npm run smoke -- <url>` passes.
