# Deployment

Production runs on Azure Container Apps, declared in Terraform and deployed by GitHub Actions.

| Resource | Notes |
| --- | --- |
| `spotbuddy-frontend` | React build served by nginx. Custom domains `spotsteer.eu`, `www.spotsteer.eu`. |
| `spotbuddy-backend` | ASP.NET Core API, one replica always on for the daily price job. Custom domain `api.spotsteer.eu`. |
| `spotbuddy-calc` | FastAPI, internal ingress only, scales to zero. |
| `spotbuddy-pg` | PostgreSQL Flexible Server (B1ms). |
| `spotbuddyacr` | Container Registry; images pulled by a user-assigned managed identity. |
| `spotbuddy-appi` | Application Insights over a Log Analytics workspace. |

The `spotbuddy` prefix predates the SpotSteer name. Azure cannot rename resources, and changing
`var.prefix` would recreate all of them, including the database, so it stays.

## Terraform

`infra/` declares every resource: the registry, identity and role assignments, the Container Apps
environment, the three apps, Postgres and the custom domains. State lives in an Azure storage
account (blob versioning on) created once by `infra/bootstrap.sh`, together with the identity CI
deploys as. Neither is managed by Terraform, so `terraform destroy` cannot remove the state or the
deploy credentials.

The only input without a default is the ENTSO-E token (`infra/terraform.tfvars` locally,
`TF_VAR_entsoe_token` in CI).

## Authentication

The subscription has no Entra ID directory permissions, so app registrations are unavailable.
GitHub Actions authenticates through **OIDC federated credentials on a user-assigned managed
identity** instead. No password or client secret is stored anywhere; the repository holds only
three non-secret IDs plus the ENTSO-E token.

## Pipelines

| Workflow | Trigger | Does |
| --- | --- | --- |
| `ci.yml` | push, pull request | Builds and tests .NET, lints and builds the frontend, checks the Python service, validates Terraform. |
| `terraform-plan.yml` | PR touching `infra/` | Posts the `terraform plan` diff as a PR comment. |
| `deploy.yml` | push to `main` | Builds the three images in ACR tagged with the commit SHA, then `terraform apply`. |

The API applies EF Core migrations on startup, so schema and code ship together. Rolling back is
`terraform apply -var="image_tag=<older-sha>"`.

