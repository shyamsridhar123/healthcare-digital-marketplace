output "container_app_id" {
  description = "Container App resource ID."
  value       = azurerm_container_app.agent.id
}

output "identity_principal_id" {
  description = "Managed identity principal ID for downstream RBAC assignment."
  value       = azurerm_user_assigned_identity.agent.principal_id
}

output "endpoint_url" {
  description = "HTTPS endpoint exposed by the Container App."
  value       = "https://${azurerm_container_app.agent.latest_revision_fqdn}"
}
