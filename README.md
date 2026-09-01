# SpotBuddy

Automates household energy consumption around day-ahead electricity spot prices. Keep your supplier,
keep your devices; this is the brain that decides when things switch on.

![Interactive map with zone prices](docs/price-map.png)

## What it does

* **Works with Shelly and Home Assistant.** Shelly scripts ship in the repo; the Home Assistant
  integration has [its own repository](https://github.com/matejhurta/spotbuddy-homeassistant) and
  calls the endpoint served here. No hardware to buy, no supplier to switch.
* **Day-ahead spot prices** for 45 European bidding zones, refreshed daily.
* **Every 15 minute slot classified** as cheap, average or expensive, judged against its own zone.
* **Interactive map:** pick a zone, see yesterday, today and tomorrow.
* **Scheduling API:** ask for "4 hours before 6am", get back the cheapest blocks. The plan is
  committed once a day, not re-optimised as the day passes.
* Prices in c/kWh in the zone's own local time.
* Weather per zone, feeding the classification and thermal scheduling.

## Components

* **React, TypeScript, Vite and MUI.** The web app. Built to static files and served by nginx.
* **ASP.NET Core.** Owns the REST surface, the database and the external clients, and runs a
  background job that fetches tomorrow's prices each afternoon.
* **Python and FastAPI.** Computes quantile residuals to categorise how expensive an hour is, and
  picks the cheapest usable windows. Kept separate so the maths can iterate on its own.
* **PostgreSQL.** Prices, weather snapshots and bidding zones.
* **Terraform and GitHub Actions.** Every Azure resource declared, built and deployed on merge.

## Smart-home control

Layer 3 of the product: the backend decides, the client acts. Both integrations post the same
device-agnostic request and get back the run blocks; neither optimises anything itself.

| Client | Endpoint | Where it lives |
| --- | --- | --- |
| Shelly (Gen2+) | `POST /api/schedule`, `GET /api/schedule/status` | [`scripts/shelly/`](./scripts/shelly/README.md) |
| Home Assistant | `POST /api/homeassistant/schedule` | [`spotbuddy-homeassistant`](https://github.com/matejhurta/spotbuddy-homeassistant) |

The Home Assistant integration is a separate repository because HACS installs from a repository root
and its validation assumes the repo *is* the integration. The endpoint it depends on is defined here,
so the two move together — see [homeAssistantIntegration.md](./homeAssistantIntegration.md).

## Running it

```bash
docker compose up --build
```

Frontend on `:3000`, API on `:8080`, calc-service on `:8000`, Postgres on `:5433`.

Services can also be run directly without containers, and the whole stack deploys to Azure Container
Apps. Both are covered in [DEPLOYMENT.md](./DEPLOYMENT.md).

## Documentation

| Doc | What's in it |
| --- | --- |
| [IDEA.md](./IDEA.md) | The product direction |
| [DESIGN.md](./DESIGN.md) | How the .NET API works today |
| [smartHomeIntegration.md](./smartHomeIntegration.md) | The schedule API and the reasoning behind its shape |
| [homeAssistantIntegration.md](./homeAssistantIntegration.md) | The HA endpoint and how the integration consumes it |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Running locally and deploying to Azure |

## Data sources

ENTSO-E Transparency Platform for day-ahead prices (token required) and Open-Meteo for weather.
EPEX SPOT's own feed is licensed for retail use, which is why it is not used here. Verify current
terms before extending the fetchers.
