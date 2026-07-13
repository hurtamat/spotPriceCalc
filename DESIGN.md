# Design — Loads, Parameters & Implementation Choices

Companion to the architecture summary in [README.md](./README.md). This doc covers **what the user
configures**, **how different load types relate**, and the reasoning behind the scoping decisions.

## Scope: design generic, ship narrow

We do **not** philosophically commit to "only pools," but we also do **not** build five load types up
front. The move:

- **Model a generic deferrable load** in the calc engine — something that needs a known amount of energy
  delivered by a deadline, draws a known power, and has scheduling constraints.
- **Ship *pool* as the first (flagship) concrete implementation** of that interface.
- Keep the interface clean enough that adding EV/heat-pump later is a few days, not a rewrite. **Do not
  hardcode pool assumptions into the core scheduler.**

Why this works: pool, EV, water heater, and home heat pump are all the **same scheduling problem**
underneath — *fit N units of runtime into the cheapest price windows subject to constraints*. What
differs between them is only **how you compute the energy needed.**

### Why pool first (and the honest tradeoff)

Pool is one of the *harder* loads, because energy-needed depends on a thermal model (weather, evaporation,
losses). That thermal sophistication is exactly what differentiates us from rigid off-the-shelf software —
so it's a defensible flagship. But note the tradeoff:

- **Fastest path to an impressive demo = EV charging** — simpler math, and a *year-round* market instead
  of a seasonal, minority-of-homes one.
- We're choosing pool because it's the differentiator and we have the domain interest — but the generic
  interface keeps EV a cheap follow-up.

## The shared interface

Every load type reduces to the same abstraction. Conceptually:

```
DeferrableLoad
  ├─ EnergyNeeded()      → how much energy must be delivered   (THE part that differs per load)
  ├─ Power (kW)          → draw when running
  └─ Constraints         → deadline, available hours, min runtime, block structure
```

The **scheduler** consumes only this interface. It never knows whether it's scheduling a pool or a car.
The two families differ purely in `EnergyNeeded()`:

| Family | Examples | `EnergyNeeded()` | Weather? |
| ------ | -------- | ---------------- | -------- |
| **Fixed / known** | EV charger, water heater | Basically fixed and known ("40 kWh by 7am", "reheat tank to 55°C") | No |
| **Thermal / modeled** | **Pool**, home heat pump | Computed from a thermal model (heat loss to ambient, evaporation, weather-dependent) | Yes |

The fixed family is the **pure form** of the scheduling algorithm. The thermal family wraps it with a
weather-driven energy estimate — and that's where the Python scientific stack earns its place.

## Parameters — Pool (flagship)

The earlier draft parameter set (pool size, target temp, available hours, block preference) **cannot
actually produce a schedule** — you can't convert "energy needed" into "runtime hours" without knowing
the heater. Full set:

### Required (schedule is impossible without these)

| Parameter | Why it's required |
| --------- | ----------------- |
| **Volume** (or dimensions) | Base of the energy calculation. Dimensions preferred — they give *surface area*, which drives loss (a wide shallow pool loses far more than a deep narrow one of equal volume). |
| **Current water temperature** | You need the **delta** to target, not just the target. "Heat to 28°C" is meaningless without knowing it's 18 vs 26 now. |
| **Target temperature** | The goal state. |
| **Heater power (kW)** | Non-negotiable — this is what turns *energy-needed* into *runtime-hours*. A 3 kW resistive element and a 12 kW heat pump heating the same pool need wildly different schedules. |
| **Heater type** (resistive / heat pump) | Not cosmetic. A heat pump has COP ~4–5 (delivers 4–5× the heat per kWh), and its COP **drops as it gets colder outside** — which changes the optimal schedule (see below). |
| **Location** | Needed to fetch weather for the thermal model. |

### Nice-to-have (rough priority order)

| Parameter | Effect |
| --------- | ------ |
| **Cover** (y/n) | Biggest single lever after heater power — a cover cuts heat loss dramatically. |
| **Pool dimensions** (vs just volume) | Derives surface area for a better loss model. |
| **Indoor / outdoor** | Changes exposure and loss profile. |

## Scheduling modes

We were implicitly conflating two different jobs. Make it an **explicit mode toggle** early — different
UX and different scheduling logic:

- **Heat-up by deadline** — "pool is cold, I want it at 28°C by Saturday 2pm." One big energy chunk; all
  runtime must finish before the deadline.
- **Maintenance** — "keep it at 28°C." Small daily top-ups to replace losses, spread into each day's
  cheapest windows.

Most real users over a season want **maintenance** with occasional **heat-up**.

## Block structure & anti-cycling

Including a single-block vs multi-block preference is a good call:

- **Single continuous block** — operationally gentle, simple, but pays more (can't cherry-pick scattered
  cheap hours).
- **Multiple blocks** — grabs all the cheapest scattered slots, saves more, but cycles the equipment more.

Make it a user preference — **but also enforce a minimum-runtime / anti-cycling constraint**, because heat
pumps genuinely dislike short cycling and some have a hard minimum. So it's not purely user taste; the
**equipment imposes limits the scheduler must respect.**

## The payoff — why weather modeling matters

This is the insight that beats the cheap competition:

> **For a heat pump, the cheapest hour by *electricity price* is not always the cheapest hour by
> *cost-to-heat*.**

Running the pump at 3am when it's −5°C (low COP → sips more electricity per unit of heat) can cost **more**
than running it at 2pm when it's +8°C and cheaper to move the same heat — even if the 3am spot price is
lower. A naive "rank hours by price" scheduler gets this wrong. Ours, factoring **weather + COP**, gets it
right. That's the demo that sells the product, and it's why the Python thermal model earns its place.

## Summary — the pool parameter set

**Required:** volume (or dimensions), current temp, target temp, heater power (kW), heater type, location.
**Nice-to-have:** cover y/n, dimensions, indoor/outdoor.
**Scheduling prefs:** mode (heat-up / maintenance), block structure (single / multi), available hours (if
manual), minimum runtime.

## Open next step

Turn this into the concrete **.NET → FastAPI request contract** — a typed schema with these fields,
sensible defaults, and required-vs-optional marking. (See the data-flow section in the README for where
that call sits.)
