locals {
  acr_login_server = azurerm_container_registry.main.login_server

  # Before the first image build ACR is empty, so fall back to a placeholder.
  images = {
    backend  = var.image_tag == "" ? "mcr.microsoft.com/k8se/quickstart:latest" : "${local.acr_login_server}/spotprice-backend:${var.image_tag}"
    calc     = var.image_tag == "" ? "mcr.microsoft.com/k8se/quickstart:latest" : "${local.acr_login_server}/spotprice-calc:${var.image_tag}"
    frontend = var.image_tag == "" ? "mcr.microsoft.com/k8se/quickstart:latest" : "${local.acr_login_server}/spotprice-frontend:${var.image_tag}"
  }
}

resource "azurerm_resource_group" "main" {
  name     = "${var.prefix}-rg"
  location = var.location
}

# ---------------------------------------------------------------- registry

resource "azurerm_container_registry" "main" {
  name                = "${var.prefix}acr"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Basic"
  admin_enabled       = false
}

# Shared pull identity. User-assigned, not system-assigned: it must hold AcrPull
# before the apps start, and a system identity doesn't exist until the app does.
resource "azurerm_user_assigned_identity" "apps" {
  name                = "${var.prefix}-apps-identity"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
}

resource "azurerm_role_assignment" "acr_pull" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.apps.principal_id
}

# ---------------------------------------------------------------- container apps env

resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.prefix}-logs"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

resource "azurerm_container_app_environment" "main" {
  name                       = "${var.prefix}-env"
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  logs_destination           = "log-analytics"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
}

# ---------------------------------------------------------------- postgres

resource "random_password" "postgres" {
  length           = 32
  special          = true
  override_special = "!#$%*-_="
}

resource "azurerm_postgresql_flexible_server" "main" {
  name                = "${var.prefix}-pg"
  resource_group_name = azurerm_resource_group.main.name
  # westeurope is blocked for Flexible Server on this subscription.
  location                      = var.postgres_location
  version                       = "17"
  administrator_login           = var.postgres_admin_username
  administrator_password        = random_password.postgres.result
  sku_name                      = "B_Standard_B1ms"
  storage_mb                    = 32768
  zone                          = "1"
  public_network_access_enabled = true
  backup_retention_days         = 7

  lifecycle {
    ignore_changes = [zone]
  }
}

resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = "spotprice"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "azure_services" {
  name             = "allow-azure-services"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# ---------------------------------------------------------------- apps

# Internal ingress: reachable only from inside the environment, at http://spotbuddy-calc.
resource "azurerm_container_app" "calc" {
  name                         = "${var.prefix}-calc"
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.apps.id]
  }

  registry {
    server   = local.acr_login_server
    identity = azurerm_user_assigned_identity.apps.id
  }

  ingress {
    external_enabled = false
    target_port      = 8000
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = 1
    max_replicas = 2

    container {
      name   = "calc"
      image  = local.images.calc
      cpu    = 0.5
      memory = "1Gi"
    }
  }

  depends_on = [azurerm_role_assignment.acr_pull]
}

resource "azurerm_container_app" "frontend" {
  name                         = "${var.prefix}-frontend"
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.apps.id]
  }

  registry {
    server   = local.acr_login_server
    identity = azurerm_user_assigned_identity.apps.id
  }

  ingress {
    external_enabled = true
    target_port      = 8080
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = 1
    max_replicas = 2

    container {
      name   = "frontend"
      image  = local.images.frontend
      cpu    = 0.25
      memory = "0.5Gi"
    }
  }

  depends_on = [azurerm_role_assignment.acr_pull]
}

# min_replicas 1: the in-process daily price scheduler needs an always-on replica.
resource "azurerm_container_app" "backend" {
  name                         = "${var.prefix}-backend"
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.apps.id]
  }

  registry {
    server   = local.acr_login_server
    identity = azurerm_user_assigned_identity.apps.id
  }

  secret {
    name  = "pg-conn"
    value = "Host=${azurerm_postgresql_flexible_server.main.fqdn};Port=5432;Database=${azurerm_postgresql_flexible_server_database.main.name};Username=${var.postgres_admin_username};Password=${random_password.postgres.result};SSL Mode=Require;Trust Server Certificate=true"
  }

  secret {
    name  = "entsoe-token"
    value = var.entsoe_token
  }

  ingress {
    external_enabled = true
    target_port      = 8080
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = 1
    max_replicas = 3

    container {
      name   = "backend"
      image  = local.images.backend
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "ASPNETCORE_ENVIRONMENT"
        value = "Production"
      }

      env {
        name        = "ConnectionStrings__Postgres"
        secret_name = "pg-conn"
      }

      env {
        name        = "Entsoe__SecurityToken"
        secret_name = "entsoe-token"
      }

      env {
        name  = "CalcService__BaseUrl"
        value = "http://${azurerm_container_app.calc.name}/"
      }

      env {
        name  = "Cors__AllowedOrigins__0"
        value = "https://${azurerm_container_app.frontend.ingress[0].fqdn}"
      }
    }
  }

  depends_on = [azurerm_role_assignment.acr_pull]
}
