# agent-aca Terraform Module

Deploys a domain agent as an Azure Container App with a user-assigned managed identity. The module is intended for GitHub-based onboarding pipelines that deploy an agent and then post deployment outputs back to the marketplace onboarding API.

## Example

```hcl
module "claims_agent" {
  source = "./modules/agent-aca"

  name                         = "claims-copilot"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  container_app_environment_id = azurerm_container_app_environment.main.id
  image                        = "contoso.azurecr.io/claims-copilot:1.0.0"

  env = {
    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.main.connection_string
  }

  tags = {
    workload = "ai-marketplace-agent"
  }
}
```

Post `module.claims_agent.endpoint_url` and `module.claims_agent.container_app_id` to the signed deployment-output callback after deployment succeeds.