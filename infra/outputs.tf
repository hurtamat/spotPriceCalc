output "backend_url" {
  description = "Public backend URL as VITE_API_BASE_URL for frontend"
  value       = var.api_hostname == "" ? "https://${azurerm_container_app.backend.ingress[0].fqdn}" : "https://${var.api_hostname}"
}

output "frontend_url" {
  value = length(var.frontend_hostnames) == 0 ? "https://${azurerm_container_app.frontend.ingress[0].fqdn}" : "https://${var.frontend_hostnames[0]}"
}

output "acr_name" {
  value = azurerm_container_registry.main.name
}

output "acr_login_server" {
  value = local.acr_login_server
}

output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "postgres_fqdn" {
  value = azurerm_postgresql_flexible_server.main.fqdn
}

output "postgres_password" {
  value     = random_password.postgres.result
  sensitive = true
}
