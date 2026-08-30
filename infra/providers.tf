terraform {
  required_version = ">= 1.9"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # State lives in the bootstrap storage account (see bootstrap.sh).
  backend "azurerm" {
    resource_group_name  = "spotbuddy-bootstrap-rg"
    storage_account_name = "spotbuddytfstate"
    container_name       = "tfstate"
    key                  = "spotbuddy.tfstate"
    use_azuread_auth     = true
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}
