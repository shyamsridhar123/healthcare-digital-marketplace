@description('Name of the Container Apps Environment')
param environmentName string

@description('Azure AD app registration client ID')
param azureAdClientId string = ''

@description('Azure AD / Entra ID tenant ID')
param azureAdTenantId string = ''

@description('Name of the Container App')
param appName string

@description('Whether to deploy the API as an Azure Container App in the same environment')
param deployApi bool = false

@description('Name of the API Container App')
param apiAppName string = ''

@description('Azure region')
param location string

@description('Container image (e.g. myacr.azurecr.io/web:latest)')
param containerImage string = 'mcr.microsoft.com/k8se/quickstart:latest'

@description('API container image (e.g. myacr.azurecr.io/api:latest)')
param apiContainerImage string = 'mcr.microsoft.com/azure-functions/node:4-node20'

@description('ACR login server')
param acrLoginServer string

@description('ACR name (for pull credentials)')
param acrName string

@description('App Insights connection string')
param appInsightsConnectionString string

@description('API base URL for the frontend')
param apiBaseUrl string = ''

@description('Cosmos DB endpoint for the API container')
param cosmosEndpoint string = ''

@description('Key Vault name containing API runtime secrets')
param keyVaultName string = ''

@description('Key Vault secret URL for the Cosmos DB key')
param cosmosKeySecretUrl string = ''

@description('Key Vault secret URL for the Functions host storage connection string used by the API container')
param azureWebJobsStorageSecretUrl string = ''

@description('Key Vault secret URL for the GitHub webhook HMAC secret')
param githubWebhookSecretUrl string = ''

@description('Key Vault secret URL for the deployment outputs HMAC secret')
param deploymentOutputsSecretUrl string = ''

// ── Log Analytics workspace for the environment ───────────────────────────
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${environmentName}-logs'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

// ── Container Apps Environment ────────────────────────────────────────────
resource env 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: environmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// ── ACR reference for pull secret ────────────────────────────────────────
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: acrName
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = if (deployApi && !empty(keyVaultName)) {
  name: keyVaultName
}

resource apiIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = if (deployApi) {
  name: '${apiAppName}-mi'
  location: location
}

var resolvedApiBaseUrl = deployApi ? 'https://${apiApp!.properties.configuration.ingress.fqdn}' : apiBaseUrl

// ── Container App ─────────────────────────────────────────────────────────
resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  tags: {
    'azd-service-name': 'web'
  }
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
      }
      registries: [
        {
          server: acrLoginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: acr.listCredentials().passwords[0].value
        }
      ]
    }
    template: {
      containers: [
        {
          name: appName
          image: containerImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'NEXT_PUBLIC_API_BASE_URL'
              value: resolvedApiBaseUrl
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: appInsightsConnectionString
            }
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'AZURE_AD_CLIENT_ID'
              value: azureAdClientId
            }
            {
              name: 'AZURE_AD_TENANT_ID'
              value: azureAdTenantId
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 3
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '10'
              }
            }
          }
        ]
      }
    }
  }
}

// API runs as a containerized Functions host on ACA so ingress and scaling stay with Container Apps.
resource apiApp 'Microsoft.App/containerApps@2024-03-01' = if (deployApi) {
  name: apiAppName
  location: location
  tags: {
    'azd-service-name': 'api'
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${apiIdentity!.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      ingress: {
        external: true
        targetPort: 80
        transport: 'auto'
      }
      registries: [
        {
          server: acrLoginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: acr.listCredentials().passwords[0].value
        }
        {
          name: 'azure-webjobs-storage'
          keyVaultUrl: azureWebJobsStorageSecretUrl
          identity: apiIdentity!.id
        }
        {
          name: 'cosmos-key'
          keyVaultUrl: cosmosKeySecretUrl
          identity: apiIdentity!.id
        }
        {
          name: 'github-webhook-secret'
          keyVaultUrl: githubWebhookSecretUrl
          identity: apiIdentity!.id
        }
        {
          name: 'deployment-outputs-secret'
          keyVaultUrl: deploymentOutputsSecretUrl
          identity: apiIdentity!.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: apiAppName
          image: apiContainerImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'AzureWebJobsStorage'
              secretRef: 'azure-webjobs-storage'
            }
            {
              name: 'FUNCTIONS_EXTENSION_VERSION'
              value: '~4'
            }
            {
              name: 'FUNCTIONS_WORKER_RUNTIME'
              value: 'node'
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: appInsightsConnectionString
            }
            {
              name: 'COSMOS_ENDPOINT'
              value: cosmosEndpoint
            }
            {
              name: 'COSMOS_KEY'
              secretRef: 'cosmos-key'
            }
            {
              name: 'COSMOS_DATABASE'
              value: 'ai-marketplace'
            }
            {
              name: 'GITHUB_WEBHOOK_SECRET'
              secretRef: 'github-webhook-secret'
            }
            {
              name: 'DEPLOYMENT_OUTPUTS_SECRET'
              secretRef: 'deployment-outputs-secret'
            }
            {
              name: 'NODE_ENV'
              value: 'production'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 5
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '20'
              }
            }
          }
        ]
      }
    }
  }
  dependsOn: [apiKeyVaultSecretsUserAssignment]
}

// Allow the API container app identity to resolve Key Vault-backed ACA secrets before app creation.
resource apiKeyVaultSecretsUserAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deployApi && !empty(keyVaultName)) {
  name: guid(keyVault.id, apiIdentity!.id, '4633458b-17de-408a-b874-0445c86b69e6')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: apiIdentity!.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

output fqdn string = app.properties.configuration.ingress.fqdn
output appUrl string = 'https://${app.properties.configuration.ingress.fqdn}'
output apiFqdn string = deployApi ? apiApp!.properties.configuration.ingress.fqdn : ''
output apiUrl string = deployApi ? 'https://${apiApp!.properties.configuration.ingress.fqdn}' : ''
