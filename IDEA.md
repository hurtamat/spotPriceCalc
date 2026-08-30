# Idea — supplier-agnostic energy automation SaaS

> **One line:** the *brain* that decides when your home's devices switch on/off to ride real-time
> electricity prices — without changing your supplier or buying any hardware.

This is the product direction. For the current state of the code (a .NET price-ingestion API) see
[DESIGN.md](./DESIGN.md); that API is the price-data layer of what's described here.

---

## What it is

A **supplier-agnostic, hardware-agnostic SaaS** that automates household energy consumption based on
spot electricity prices (spot / dynamic tariffs).

- **Market:** Europe

## Core value proposition

> *"Keep your current electricity supplier, keep your current smart-home devices — we're just the brain
> that decides when to turn things on and off to save you money."*

No supplier switch. No hardware to buy. No installer visit. You connect what you already have.

---

## How it works (three layers)

| Layer | What it does | Status |
| --- | --- | --- |
| **1. Price data** | Pulls day-ahead spot prices from **ENTSO-E**. | Built — the current .NET API. |
| **2. Decision engine** | C#/.NET + Python FastAPI backend computes **optimal on/off windows per device** — <br/>e.g. "cheapest 6 hours", "never above X €/MWh" — respecting comfort constraints (e.g. minimum temperature). | Planned. |
| **3. Control layer** | Pushes commands to devices the customer **already owns**, via existing manufacturer APIs/protocols. **Starts with Shelly** (MQTT / Cloud API). No hardware sales, no installation visits. | Planned. |

---

## Business model

**Subscription SaaS** — a monthly fee for the automation/optimization service.

**Why this beats a "we come install stuff" model:** no per-customer labor cost, no install scheduling. It scales like software, 
not like a trades business.

---

## Competitive position

**Closest comparable: Tibber.** Tibber bundles this same idea (price data + automation) **but only works
if you switch to Tibber as your electricity supplier**, and their hardware (Pulse) is a *metering* sensor,
not a *control* device.

