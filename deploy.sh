#!/usr/bin/env bash
# Manual deploy: build all three images in ACR (tagged with the current git SHA) and roll them onto
# the Container Apps. Run from Cloud Shell (already logged in) or anywhere with `az login` + Owner on
# the resource group. This is the interim deploy path until GitHub Actions CI/CD is unblocked
# (see DEPLOYMENT.md — needs an Entra app registration, which requires directory-admin help).
set -euo pipefail

RG=spotbuddy-rg
ACR=spotbuddyacr
BACKEND_URL=https://spotbuddy-backend.yellowsea-e9574071.westeurope.azurecontainerapps.io

TAG=$(git rev-parse --short HEAD)
echo ">> Deploying tag: $TAG"

echo ">> Building images in ACR..."
az acr build -r "$ACR" -i "spotprice-backend:$TAG"  -f spotPriceCalc/Dockerfile .
az acr build -r "$ACR" -i "spotprice-calc:$TAG"     ./calc-service
az acr build -r "$ACR" -i "spotprice-frontend:$TAG" --build-arg VITE_API_BASE_URL="$BACKEND_URL" ./frontend

echo ">> Rolling out to Container Apps..."
az containerapp update -g "$RG" -n spotbuddy-backend  --image "$ACR.azurecr.io/spotprice-backend:$TAG"
az containerapp update -g "$RG" -n spotbuddy-calc      --image "$ACR.azurecr.io/spotprice-calc:$TAG"
az containerapp update -g "$RG" -n spotbuddy-frontend --image "$ACR.azurecr.io/spotprice-frontend:$TAG"

echo ">> Done. Deployed $TAG to backend / calc / frontend."
