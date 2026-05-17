targetScope = 'resourceGroup'

@description('The name prefix for all resources')
param appName string = 'ai-marketplace'

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Deployment environment')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'

@description('Azure AD tenant ID for Entra ID app registration')
param tenantId string = subscription().tenantId

@description('Container image tag to deploy')
param imageTag string = 'latest'

@description('Whether to deploy a new Cosmos DB account. Set to false when existingCosmosAccountName is provided.')
param deployCosmos bool = true

@description('Whether to deploy the API backend as an Azure Container App')
param deployFunctions bool = true

@description('Whether to deploy onboarding monitoring workbook and alerts')
param deployOnboardingMonitoring bool = true

@description('Azure Monitor action group resource IDs used by onboarding alert rules. Alert rules are skipped when empty.')
param onboardingAlertActionGroupIds array = []

@description('''
Name of an EXISTING Cosmos DB account to use instead of provisioning a new one.
When set, deployCosmos is ignored and this account is referenced directly.
Example: ai-marketplace-cosmos-p7a65r22uhdxo
''')
param existingCosmosAccountName string = ''

@description('Azure AD app registration client ID (from app registration)')
param azureAdClientId string = ''

@description('Azure AD / Entra ID tenant ID')
param azureAdTenantId string = ''

@description('HMAC secret used to verify GitHub webhook payloads. Store as a secure deployment parameter.')
@secure()
param githubWebhookSecret string

@description('HMAC secret used to verify CI deployment-output callback payloads. Store as a secure deployment parameter.')
@secure()
param deploymentOutputsSecret string

var useExistingCosmos = !empty(existingCosmosAccountName)
var suffix = uniqueString(resourceGroup().id)
var shortSuffix = substring(suffix, 0, 8)
var cosmosAccountName = '${appName}-cosmos-${suffix}'
var apiAppName = '${appName}-api-${environment}'
var storageAccountName = 'aimktstore${shortSuffix}'
var appInsightsName = '${appName}-insights-${environment}'
var keyVaultName = 'aimkt-kv-${shortSuffix}'
var acrName = 'aimktacr${shortSuffix}'
var containerAppEnvName = '${appName}-env-${environment}'
var containerAppName = '${appName}-web-${environment}'
var shouldDeployApi = deployFunctions && (deployCosmos || !empty(existingCosmosAccountName))
var apiContainerImage = '${acr.outputs.loginServer}/api:${imageTag}'

// Application Insights
module appInsights 'modules/appinsights.bicep' = {
  name: 'appInsights'
  params: {
    name: appInsightsName
    location: location
  }
}

// Key Vault
module keyVault 'modules/keyvault.bicep' = {
  name: 'keyVault'
  params: {
    name: keyVaultName
    location: location
    tenantId: tenantId
  }
}

// Container Registry
module acr 'modules/containerregistry.bicep' = {
  name: 'containerRegistry'
  params: {
    name: acrName
    location: location
  }
}

// ─── Cosmos DB — new account + containers (skipped when using existing) ──────
module cosmos 'modules/cosmos.bicep' = if (!useExistingCosmos && deployCosmos) {
  name: 'cosmos'
  params: {
    accountName: cosmosAccountName
    location: location
    databaseName: 'ai-marketplace'
  }
}

// ─── Cosmos DB — database + containers on the existing account ───────────────
// When using an existing account we still idempotently ensure all 10 containers exist.
module cosmosContainers 'modules/cosmos.bicep' = if (useExistingCosmos) {
  name: 'cosmosContainers'
  params: {
    accountName: existingCosmosAccountName
    location: location
    databaseName: 'ai-marketplace'
    useExistingAccount: true
  }
}

// Resolve endpoint and key based on whether we're using existing or new account
var resolvedCosmosEndpoint = useExistingCosmos
  ? cosmosContainers.outputs.endpoint
  : (!useExistingCosmos && deployCosmos ? cosmos.outputs.endpoint : '')

var resolvedCosmosKey = useExistingCosmos
  ? cosmosContainers.outputs.primaryKey
  : (!useExistingCosmos && deployCosmos ? cosmos.outputs.primaryKey : '')

// Store runtime secrets in Key Vault so ACA resolves them by managed identity.
resource cosmosKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (useExistingCosmos || deployCosmos) {
  name: '${keyVaultName}/cosmos-primary-key'
  properties: {
    value: resolvedCosmosKey
  }
  dependsOn: [keyVault]
}

resource apiStorageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = if (shouldDeployApi) {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource apiStorageConnectionStringSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (shouldDeployApi) {
  name: '${keyVaultName}/api-azure-webjobs-storage'
  properties: {
    value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};AccountKey=${apiStorageAccount!.listKeys().keys[0].value};EndpointSuffix=${az.environment().suffixes.storage}'
  }
  dependsOn: [keyVault]
}

resource githubWebhookSecretResource 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (shouldDeployApi) {
  name: '${keyVaultName}/github-webhook-secret'
  properties: {
    value: githubWebhookSecret
  }
  dependsOn: [keyVault]
}

resource deploymentOutputsSecretResource 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (shouldDeployApi) {
  name: '${keyVaultName}/deployment-outputs-secret'
  properties: {
    value: deploymentOutputsSecret
  }
  dependsOn: [keyVault]
}

module onboardingMonitoring 'modules/onboarding-monitoring.bicep' = if (deployOnboardingMonitoring && shouldDeployApi) {
  name: 'onboardingMonitoring'
  params: {
    name: '${appName}-onboarding-${environment}'
    location: location
    appInsightsResourceId: appInsights.outputs.resourceId
    workspaceResourceId: appInsights.outputs.workspaceId
    healthCheckUrl: shouldDeployApi ? '${containerApp.outputs.apiUrl}/api/onboarding/telemetry/health' : ''
    actionGroupIds: onboardingAlertActionGroupIds
  }
}

// Container App (web frontend)
module containerApp 'modules/containerapp.bicep' = {
  name: 'containerApp'
  params: {
    environmentName: containerAppEnvName
    appName: containerAppName
    location: location
    containerImage: 'mcr.microsoft.com/k8se/quickstart:latest'
    deployApi: shouldDeployApi
    apiAppName: apiAppName
    apiContainerImage: apiContainerImage
    acrLoginServer: acr.outputs.loginServer
    acrName: acr.outputs.name
    appInsightsConnectionString: appInsights.outputs.connectionString
    cosmosEndpoint: resolvedCosmosEndpoint
    keyVaultName: keyVaultName
    cosmosKeySecretUrl: '${keyVault.outputs.vaultUri}secrets/cosmos-primary-key'
    azureWebJobsStorageSecretUrl: '${keyVault.outputs.vaultUri}secrets/api-azure-webjobs-storage'
    githubWebhookSecretUrl: '${keyVault.outputs.vaultUri}secrets/github-webhook-secret'
    deploymentOutputsSecretUrl: '${keyVault.outputs.vaultUri}secrets/deployment-outputs-secret'
    azureAdClientId: azureAdClientId
    azureAdTenantId: azureAdTenantId
  }
  dependsOn: [cosmosKeySecret, apiStorageConnectionStringSecret, githubWebhookSecretResource, deploymentOutputsSecretResource]
}

// Outputs
output appInsightsKey string = appInsights.outputs.instrumentationKey
output acrLoginServer string = acr.outputs.loginServer
output webAppUrl string = containerApp.outputs.appUrl
output apiUrl string = shouldDeployApi ? containerApp.outputs.apiUrl : ''
output cosmosEndpoint string = resolvedCosmosEndpoint
output cosmosAccountName string = useExistingCosmos ? cosmosContainers.outputs.accountName : (!useExistingCosmos && deployCosmos ? cosmos.outputs.accountName : '')
output functionsUrl string = shouldDeployApi ? containerApp.outputs.apiUrl : ''

