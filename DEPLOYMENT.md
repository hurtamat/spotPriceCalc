# Deployment & CI/CD

How SpotBuddy is containerized and shipped to **Azure Container Apps (ACA)** via **GitHub Actions**.

> **Status:** deployed and live. All three services run on ACA (resource group `spotbuddy-rg`, West Europe),
> backed by a managed **Postgres Flexible Server**. Images live in `spotbuddyacr` and are pulled with each
> app's **system-assigned managed identity** (AcrPull). Deploys currently go through **`deploy.sh`** (manual);
> the GitHub Actions pipeline is blocked on a directory permission — see *Connect GitHub to Azure* below.

## Coming from GitLab CI — the mental map

| GitLab CI | GitHub Actions (this repo) |
| --- | --- |
| `.gitlab-ci.yml` | `.github/workflows/*.yml` (one file per pipeline) |
| `stages` / `jobs` | `jobs` (run in parallel unless `needs:` chains them) |
| Runners | GitHub-hosted `ubuntu-latest` runners |
| CI/CD Variables (masked) | **Secrets** (masked) + **Variables** (plain), under repo *Settings → Secrets and variables → Actions* |
| `rules:` / `only:` | `on:` triggers + `if:` conditions |
| GitLab Container Registry | **Azure Container Registry (ACR)** |
| `deploy` stage with a `$KUBECONFIG` | `azure/login` via **OIDC** + `az containerapp update` |

The big difference: instead of storing a long-lived Azure password, we use **OIDC federated credentials** — GitHub mints a short-lived token per run and Azure trusts it. Nothing secret to rotate.

## What runs where

| Service | Image | Port | Prod (ACA) | Local (compose) |
| --- | --- | --- | --- | --- |
| `frontend` (React/Vite → nginx) | `spotprice-frontend` | 8080 | Container App, external ingress | `localhost:3000` |
| `spotPriceCalc` (.NET API) | `spotprice-backend` | 8080 | Container App, external ingress | `localhost:8080` |
| `calc-service` (FastAPI) | `spotprice-calc` | 8000 | Container App, **internal** ingress | `localhost:8000` |
| Postgres | — | 5432 | **Azure Database for PostgreSQL Flexible Server** (managed) | postgres container |

> The frontend's API URL is **baked in at build time** (Vite inlines `VITE_API_BASE_URL`). That's why the deploy workflow passes it as a `--build-arg`, and why changing the backend URL means a rebuild, not just an env change.

## The two pipelines

- **`ci.yml`** — on PRs and non-main branches. Builds the .NET app, lints + builds the frontend, and import-checks the Python service. Pure verification; no Azure access.
- **`deploy.yml`** — on push to `main` (or manual dispatch). Logs into Azure via OIDC, builds all three images server-side with `az acr build` (tagged with the commit SHA), then rolls each Container App onto the new tag. Rollback = re-run `az containerapp update` with an older SHA tag. *(Not active yet — see the OIDC prerequisite below.)*
- **`deploy.sh`** (repo root) — manual fallback that does the same build + rollout by hand. Run from Cloud Shell: `cd ~/spotPriceCalc && git pull && bash deploy.sh`. This is the current deploy path until `deploy.yml` is unblocked.

---

## One-time Azure setup

Run these once (locally with `az login`, or in Cloud Shell). Replace the placeholder values at the top.

```bash
# ---- pick your values ----
RG=spotbuddy-rg
LOCATION=westeurope
ACR=spotbuddyacr                 # must be globally unique, lowercase
ENV=spotbuddy-env                # Container Apps environment
PG=spotbuddy-pg                  # Postgres server name (globally unique)
PG_ADMIN=spotadmin
PG_PASSWORD='CHANGE-ME-strong!'  # store this; you'll need it in the connection string

az group create -n $RG -l $LOCATION

# Container registry (Basic is fine to start)
az acr create -g $RG -n $ACR --sku Basic

# Container Apps environment
az extension add --name containerapp --upgrade
az provider register -n Microsoft.App --wait
az provider register -n Microsoft.OperationalInsights --wait
az containerapp env create -g $RG -n $ENV -l $LOCATION

# Managed Postgres (Flexible Server) + database
az postgres flexible-server create -g $RG -n $PG -l $LOCATION \
  --admin-user $PG_ADMIN --admin-password "$PG_PASSWORD" \
  --tier Burstable --sku-name Standard_B1ms --storage-size 32 \
  --version 17 --public-access 0.0.0.0   # allow Azure services; tighten later
az postgres flexible-server db create -g $RG -s $PG -d spotprice
```

### Create the three Container Apps

Deploy a placeholder image first; the pipeline replaces it on the next push to main.

```bash
ACR_SERVER=$ACR.azurecr.io
PG_CONN="Host=$PG.postgres.database.azure.com;Port=5432;Database=spotprice;Username=$PG_ADMIN;Password=$PG_PASSWORD;SSL Mode=Require;Trust Server Certificate=true"

# calc-service — INTERNAL only (nothing outside the env should reach it)
az containerapp create -g $RG -n spotbuddy-calc --environment $ENV \
  --image mcr.microsoft.com/k8se/quickstart:latest \
  --ingress internal --target-port 8000 --min-replicas 1

# backend — external, min-replicas 1 (the in-process daily scheduler needs an always-on replica)
az containerapp create -g $RG -n spotbuddy-backend --environment $ENV \
  --image mcr.microsoft.com/k8se/quickstart:latest \
  --ingress external --target-port 8080 --min-replicas 1 \
  --secrets pg-conn="$PG_CONN" \
  --env-vars ASPNETCORE_ENVIRONMENT=Production \
             ConnectionStrings__Postgres=secretref:pg-conn \
             Entsoe__SecurityToken=secretref:entsoe-token

# frontend — external
az containerapp create -g $RG -n spotbuddy-frontend --environment $ENV \
  --image mcr.microsoft.com/k8se/quickstart:latest \
  --ingress external --target-port 8080 --min-replicas 1
```

Add the ENTSO-E token secret (it's currently only in `appsettings.Development.json`, which does **not** ship in the image):

```bash
az containerapp secret set -g $RG -n spotbuddy-backend \
  --secrets entsoe-token='YOUR-ENTSOE-TOKEN'
```

### Wire the cross-service URLs

Get the public FQDNs and feed them back in:

```bash
BACKEND_URL=https://$(az containerapp show -g $RG -n spotbuddy-backend --query properties.configuration.ingress.fqdn -o tsv)
CALC_URL=https://spotbuddy-calc  # internal DNS name inside the ACA environment

# Let the backend accept CORS calls from the deployed frontend:
FRONTEND_URL=https://$(az containerapp show -g $RG -n spotbuddy-frontend --query properties.configuration.ingress.fqdn -o tsv)
az containerapp update -g $RG -n spotbuddy-backend \
  --set-env-vars Cors__AllowedOrigins__0="$FRONTEND_URL"

echo "Backend URL (use as VITE_API_BASE_URL): $BACKEND_URL"
```

> If/when the backend starts calling the Python service, add its internal URL as a backend env var (e.g. `CalcService__BaseUrl=$CALC_URL`) — internal ingress means only apps in the same environment can reach it.

### Let ACA pull from ACR

```bash
az containerapp registry set -g $RG -n spotbuddy-backend  --server $ACR_SERVER --identity system
az containerapp registry set -g $RG -n spotbuddy-calc     --server $ACR_SERVER --identity system
az containerapp registry set -g $RG -n spotbuddy-frontend --server $ACR_SERVER --identity system
# grant each app's managed identity AcrPull (repeat per app, or use a shared user-assigned identity)
```

---

## Connect GitHub to Azure (OIDC)

> **Prerequisite — directory permission (the current blocker).** Creating an app registration is a *Microsoft
> Entra ID (directory)* action, which is a **separate system from Azure RBAC**. Being subscription **Owner /
> Account admin is not enough** — you also need the **Application Developer** Entra role (or the tenant setting
> *Users can register applications = Yes*). On a managed tenant (e.g. a Visual Studio Enterprise / MPN
> subscription) a directory admin must grant this; otherwise `az ad app create` fails with *Insufficient
> privileges* and the Entra ID portal blade returns 401. The `role assignment` (Contributor on the RG) at the
> end of this block is RBAC, which Owner can already do — only the app-registration part needs the directory role.

Create an app registration GitHub can log in as, with a **federated credential** scoped to this repo's `main` branch:

```bash
APP_ID=$(az ad app create --display-name "spotbuddy-github-oidc" --query appId -o tsv)
az ad sp create --id $APP_ID
SUB_ID=$(az account show --query id -o tsv)

# Federated credential: trust tokens from this repo on branch main
az ad app federated-credential create --id $APP_ID --parameters '{
  "name": "github-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:YOUR_GH_ORG/YOUR_REPO:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'

# Give it permission to push images and update the container apps (Contributor on the RG is simplest to start)
az role assignment create --assignee $APP_ID --role Contributor \
  --scope /subscriptions/$SUB_ID/resourceGroups/$RG

echo "AZURE_CLIENT_ID=$APP_ID"
echo "AZURE_TENANT_ID=$(az account show --query tenantId -o tsv)"
echo "AZURE_SUBSCRIPTION_ID=$SUB_ID"
```

> Add a second federated credential with subject `repo:YOUR_GH_ORG/YOUR_REPO:pull_request` only if you later want CI to touch Azure — the current `ci.yml` doesn't need it.

## GitHub configuration

Under **Settings → Secrets and variables → Actions**:

**Secrets** (from the OIDC step above):
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

**Variables**:
- `AZURE_RESOURCE_GROUP` = `spotbuddy-rg`
- `ACR_NAME` = `spotbuddyacr`
- `ACA_BACKEND` = `spotbuddy-backend`
- `ACA_FRONTEND` = `spotbuddy-frontend`
- `ACA_CALC` = `spotbuddy-calc`
- `VITE_API_BASE_URL` = the backend URL printed above (e.g. `https://spotbuddy-backend.xxxx.westeurope.azurecontainerapps.io`)

That's it — push to `main` and the deploy workflow builds and rolls out all three services.

---

## Local development

```bash
docker compose up --build
```

- Frontend → http://localhost:3000
- Backend  → http://localhost:8080
- calc-service → http://localhost:8000
- Postgres → localhost:5433

The compose backend runs `ASPNETCORE_ENVIRONMENT=Development`; its ENTSO-E token still comes from `appsettings.Development.json`. HTTPS redirect is skipped inside containers (the platform handles TLS), so browser calls to the HTTP ports work directly.
