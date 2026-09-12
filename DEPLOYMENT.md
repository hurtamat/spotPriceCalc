# Deployment

SpotBuddy runs on Azure Container Apps, provisioned with Terraform and deployed by GitHub Actions.
Docker Compose is used for local development.

## Contents

1. [Azure](#azure)
2. [Local development](#local-development)

---

# Azure

## Architecture

Four services in resource group `spotbuddy-rg` (westeurope):

| Resource | Type | Notes |
| --- | --- | --- |
| `spotbuddy-frontend` | Container App | React build served by nginx, port 8080, public |
| `spotbuddy-backend` | Container App | .NET API, port 8080, public, 0.5 vCPU / 1Gi, always one replica for the daily scheduler |
| `spotbuddy-calc` | Container App | FastAPI, port 8000, internal ingress only, 0.25 vCPU / 0.5Gi, **scales to zero** |
| `spotbuddy-pg` | PostgreSQL Flexible Server | B1ms Burstable, database `spotprice` |
| `spotbuddyacr` | Container Registry | Basic tier, images pulled by managed identity |
| `spotbuddy-env` | Container Apps Environment | backed by `spotbuddy-logs` (Log Analytics) |
| `spotbuddy-appi` | Application Insights | workspace-based on `spotbuddy-logs`; its connection string reaches the backend as `APPLICATIONINSIGHTS_CONNECTION_STRING` |

The calc-service has no public address. Only apps inside the environment reach it, at
`http://spotbuddy-calc/`. It has `min_replicas = 0`, so the first call after an idle period pays a cold
start — the backend's HTTP client retries through it, which is why that client has a resilience handler
despite calc being ours and reliable.

The backend exposes `/healthz/live` (no checks, for liveness) and `/healthz/ready` (checks Postgres, for
readiness); calc answers on `/healthz` and `/`; nginx on `/healthz`. **No probes are configured in Terraform
yet** — the endpoints exist, nothing points at them.

Postgres is in **northeurope**, not westeurope. The subscription is restricted from provisioning
Flexible Server in westeurope, so `var.postgres_location` is a separate variable.

A second resource group, `spotbuddy-bootstrap-rg`, holds the Terraform state storage account
(`spotbuddytfstate`) and the managed identity GitHub Actions authenticates as
(`spotbuddy-github-oidc`). It is created by hand and never managed by Terraform, so a
`terraform destroy` cannot destroy the state file or the deploy credentials.

## Authentication

There is no Entra ID directory permission on this subscription, so app registrations and service
principals are unavailable. Instead a **user-assigned managed identity** carries GitHub OIDC federated
credentials. A managed identity is an ordinary Azure resource governed by RBAC, so it needs no
directory rights, and since 2023 it can hold federated credentials.

At deploy time GitHub mints a short lived token describing the run. Azure matches its issuer, subject
and audience against a federated credential on the identity and issues an Azure token in exchange.
Nothing is stored on either side beyond three non secret GUIDs, and there is no password to rotate.

Two credentials exist, matched verbatim with no wildcards:

| Name | Subject | Used by |
| --- | --- | --- |
| `github-main` | `repo:hurtamat/spotPriceCalc:ref:refs/heads/main` | deploy |
| `github-pr` | `repo:hurtamat/spotPriceCalc:pull_request` | plan |

The identity holds Contributor on the subscription and Storage Blob Data Contributor on the state
storage account. Both are needed: Azure separates control plane from data plane, and Contributor
alone can delete a storage account without being able to read a blob inside it.

## First time setup

Terraform cannot create the storage account holding its own state, nor the identity it authenticates
as. Both are created once by `infra/bootstrap.sh`:

```bash
bash infra/bootstrap.sh
```

This creates the bootstrap resource group, the state storage account with TLS 1.2, no public blob
access and blob versioning enabled, the state container, the managed identity, both federated
credentials and the role assignments. It prints the values needed for GitHub secrets and the
Terraform backend.

The script is not idempotent, so do not re-run it casually. Role assignments take 30 to 60 seconds to
propagate; a 403 on the first `terraform init` usually just means waiting and retrying.

Then add four repository secrets under Settings, Secrets and variables, Actions:

| Secret | Source |
| --- | --- |
| `AZURE_CLIENT_ID` | client id printed by the bootstrap script |
| `AZURE_TENANT_ID` | tenant id |
| `AZURE_SUBSCRIPTION_ID` | subscription id |
| `ENTSOE_TOKEN` | ENTSO-E security token, passed to Terraform as `TF_VAR_entsoe_token` |

No repository variables are used. Everything else comes from Terraform outputs.

## Pipelines

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `ci.yml` | every push and pull request | Builds .NET, lints and builds the frontend, import checks the Python service, validates and format checks Terraform. No Azure access. |
| `terraform-plan.yml` | pull requests touching `infra/**` | Runs `terraform plan` and posts the diff as a pull request comment. Read only. |
| `deploy.yml` | push to `main`, or manual dispatch | Builds the three images in ACR tagged with the commit SHA, then applies with that tag. |

Deploy reads `acr_name` and `backend_url` from Terraform outputs before building. This matters because
Vite inlines `VITE_API_BASE_URL` into the frontend bundle at build time, so the backend URL must be
known before the frontend image exists. It is already in state from the previous apply, so no two pass
apply is needed.

Images are built with `az acr build`, which builds inside the registry. The runner needs no Docker and
no registry login. Deploys are serialised with a concurrency group so two applies cannot collide on
the state lock.

`workflow_dispatch` on any branch other than `main` fails at login, because no federated credential
matches that ref.

## Terraform

The configuration lives in `infra/`. `providers.tf` pins azurerm 5.x and configures the remote
backend, `variables.tf` holds six inputs of which only `entsoe_token` has no default, `main.tf`
declares twelve resources and `outputs.tf` exposes the values the pipeline consumes.

Local runs need `infra/terraform.tfvars` containing the ENTSO-E token. That file is gitignored; copy
`terraform.tfvars.example` and fill it in. CI supplies the same value as an environment variable.

Four things in `main.tf` are non obvious and should not be tidied away:

* `local.images` falls back to a Microsoft placeholder image when `var.image_tag` is empty, so the
  first apply works against an empty registry. Any manual apply must pass a real tag, or it reverts
  the running deployment to the placeholder.
* All three apps declare `depends_on` on the AcrPull role assignment. Terraform infers ordering from
  references, and nothing in an app's configuration mentions that role, but it must exist before the
  app can pull an image.
* Image pulls use a user-assigned identity rather than a system-assigned one. A system identity does
  not exist until its app does, which makes granting AcrPull impossible to sequence.
* Postgres ignores changes to `zone`, because Azure reports it back in a way that otherwise produces a
  phantom replacement on every plan.

The Postgres firewall rule from `0.0.0.0` to `0.0.0.0` is Azure's convention for allowing Azure
services. GitHub runners are not Azure services and are not covered by it.

## Deploying manually

The same steps the pipeline runs:

```bash
TAG=$(git rev-parse --short HEAD)
BACKEND_URL=$(cd infra && terraform output -raw backend_url)

az acr build -r spotbuddyacr -t spotprice-backend:$TAG -f spotPriceCalc/Dockerfile .
az acr build -r spotbuddyacr -t spotprice-calc:$TAG ./calc-service
az acr build -r spotbuddyacr -t spotprice-frontend:$TAG --build-arg VITE_API_BASE_URL="$BACKEND_URL" ./frontend

cd infra && terraform apply -var="image_tag=$TAG"
```

## Rolling back

Apply an older tag:

```bash
cd infra && terraform apply -var="image_tag=<older-sha>"
```

Container Apps keeps previous revisions, so the swap is quick. Terraform state is blob versioned if it
ever needs restoring.

## Database migrations

There is no migration step in the pipeline. The API applies pending EF Core migrations at startup and
then seeds the bidding zones idempotently, so schema and code ship together and cannot fall out of
step.

This suits a project without production data. Three limitations are worth knowing. During a rollout
the old and new revisions overlap briefly, so two versions can migrate at once. A failing migration
means the new revision never becomes healthy, which is safe but late. A destructive migration runs
unreviewed the moment a container starts.

Once there is data worth protecting, generate an idempotent SQL script with
`dotnet ef migrations script --idempotent`, review it in the pull request, and apply it from a
Container Apps Job, which runs inside the environment and inherits its network access. A plain
pipeline step is awkward because a GitHub runner cannot reach the database without opening a temporary
firewall rule for its address.

## Operations

```bash
az containerapp logs show -n spotbuddy-backend -g spotbuddy-rg --tail 50 --follow
az containerapp revision list -n spotbuddy-backend -g spotbuddy-rg -o table
cd infra && terraform output -raw postgres_password
```

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `terraform init` returns 403 | Missing Storage Blob Data Contributor, or role assignments have not propagated yet. |
| `azure/login` fails in Actions | `permissions: id-token: write` is missing, or the branch has no matching federated credential. |
| `The value of 'Version' should be in: []` | Not a version problem. The subscription is restricted from provisioning Postgres in that region. |
| Apps unhealthy after a first apply | They are still on the placeholder image, which listens on port 80 while ingress expects 8080. The first real deploy fixes it. |
| Backend starts and then exits | Usually the database. `DbInitializer` retries `MigrateAsync` 5 times, 3s apart, so a slow Postgres no longer crash-loops the container — if it still exits, the DB is genuinely unreachable. Check the backend logs for the migrate warnings. |

---

# Local development

## Docker Compose

```bash
docker compose up --build
```

| Service | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| API | http://localhost:8080 |
| calc-service | http://localhost:8000 (docs at `/docs`) |
| Postgres | localhost:5433 |

Postgres is mapped to host port 5433 so a native install can keep 5432.

Compose differs from Azure in four ways. The API runs with `ASPNETCORE_ENVIRONMENT=Development`, so
its ENTSO-E token comes from `appsettings.Development.json`, which is neither in git nor in the image.
HTTPS redirection is skipped inside containers because the platform terminates TLS, so calls to the
HTTP ports work directly. `VITE_API_BASE_URL` is baked in as `http://localhost:8080`, so the browser
reaches the API through the host port mapping. The API reaches Postgres and the calc-service by
compose service name rather than through those host mappings.

## Without containers

Three terminals, one per service:

```bash
cd spotPriceCalc && dotnet run                                        # http://localhost:5262
cd calc-service  && source .venv/bin/activate && fastapi dev main.py  # http://localhost:8000
cd frontend      && npm run dev                                       # http://localhost:5173
```

First run in `calc-service` needs a virtualenv:

```bash
python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

The Vite dev server proxies `/api` to port 5262. A local Postgres is still required; see
`scripts/local-db.sh`.
