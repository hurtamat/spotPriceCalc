#!/usr/bin/env bash
# One-time. What Terraform can't create for itself: state storage + CI identity.
set -euo pipefail

RG=spotbuddy-bootstrap-rg
LOCATION=westeurope
SA=spotbuddytfstate
CONTAINER=tfstate
UAMI=spotbuddy-github-oidc
REPO=hurtamat/spotPriceCalc

SUB_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

az group create -n "$RG" -l "$LOCATION" -o none

az storage account create -n "$SA" -g "$RG" -l "$LOCATION" \
  --sku Standard_LRS --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false \
  --public-network-access Enabled \
  -o none

az storage account blob-service-properties update \
  -n "$SA" -g "$RG" --enable-versioning true -o none

# AD auth, not account keys
az storage container create -n "$CONTAINER" --account-name "$SA" --auth-mode login -o none

CLIENT_ID=$(az identity create -n "$UAMI" -g "$RG" -l "$LOCATION" --query clientId -o tsv)
PRINCIPAL_ID=$(az identity show -n "$UAMI" -g "$RG" --query principalId -o tsv)

# --subject: exact match on the token's `sub` claim
az identity federated-credential create --name github-main \
  --identity-name "$UAMI" -g "$RG" \
  --issuer https://token.actions.githubusercontent.com \
  --subject "repo:$REPO:ref:refs/heads/main" \
  --audiences api://AzureADTokenExchange -o none

az identity federated-credential create --name github-pr \
  --identity-name "$UAMI" -g "$RG" \
  --issuer https://token.actions.githubusercontent.com \
  --subject "repo:$REPO:pull_request" \
  --audiences api://AzureADTokenExchange -o none

# Subscription scope - Terraform creates the app RG itself
az role assignment create \
  --assignee-object-id "$PRINCIPAL_ID" --assignee-principal-type ServicePrincipal \
  --role Contributor --scope "/subscriptions/$SUB_ID" -o none

# Data plane; Contributor doesn't cover blobs
az role assignment create \
  --assignee-object-id "$PRINCIPAL_ID" --assignee-principal-type ServicePrincipal \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/$SUB_ID/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$SA" -o none

# Same for you, so local apply works
MY_ID=$(az ad signed-in-user show --query id -o tsv 2>/dev/null || echo "")
if [ -n "$MY_ID" ]; then
  az role assignment create --assignee-object-id "$MY_ID" --assignee-principal-type User \
    --role "Storage Blob Data Contributor" \
    --scope "/subscriptions/$SUB_ID/resourceGroups/$RG/providers/Microsoft.Storage/storageAccounts/$SA" -o none
else
  echo "!! Could not resolve user object id - grant Storage Blob Data Contributor on $SA manually."
fi

cat <<SUMMARY

================================================================
GitHub > Settings > Secrets and variables > Actions > Secrets:
  AZURE_CLIENT_ID        $CLIENT_ID
  AZURE_TENANT_ID        $TENANT_ID
  AZURE_SUBSCRIPTION_ID  $SUB_ID

infra/providers.tf, backend "azurerm" block:
  resource_group_name  = "$RG"
  storage_account_name = "$SA"
  container_name       = "$CONTAINER"
  key                  = "spotbuddy.tfstate"
  use_azuread_auth     = true
================================================================
SUMMARY
