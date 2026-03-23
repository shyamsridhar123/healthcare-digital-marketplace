@description('Cosmos DB account name')
param accountName string

@description('Azure region')
param location string

@description('Database name')
param databaseName string = 'ai-marketplace'

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: accountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    capabilities: [
      { name: 'EnableServerless' }
    ]
    backupPolicy: {
      type: 'Continuous'
      continuousModeProperties: { tier: 'Continuous7Days' }
    }
  }
}

resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmosAccount
  name: databaseName
  properties: {
    resource: { id: databaseName }
  }
}

// ─── Containers with partition keys ─────────────────────────────────────────

resource assetsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'assets'
  properties: {
    resource: {
      id: 'assets'
      partitionKey: {
        paths: ['/tenantId', '/type']
        kind: 'MultiHash'
        version: 2
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        includedPaths: [{ path: '/*' }]
        excludedPaths: [{ path: '/"_etag"/?' }]
        compositeIndexes: [
          [
            { path: '/deploymentCount', order: 'descending' }
            { path: '/rating', order: 'descending' }
          ]
        ]
      }
    }
  }
}

resource publishersContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'publishers'
  properties: {
    resource: {
      id: 'publishers'
      partitionKey: { paths: ['/publisherId'], kind: 'Hash' }
    }
  }
}

resource submissionsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'submissions'
  properties: {
    resource: {
      id: 'submissions'
      partitionKey: { paths: ['/tenantId'], kind: 'Hash' }
      defaultTtl: -1
    }
  }
}

resource workflowsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'workflows'
  properties: {
    resource: {
      id: 'workflows'
      partitionKey: { paths: ['/tenantId'], kind: 'Hash' }
    }
  }
}

resource auditLogContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'audit-log'
  properties: {
    resource: {
      id: 'audit-log'
      partitionKey: { paths: ['/tenantId'], kind: 'Hash' }
      defaultTtl: 7776000  // 90 days TTL
    }
  }
}

resource ratingsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'ratings'
  properties: {
    resource: {
      id: 'ratings'
      partitionKey: { paths: ['/assetId'], kind: 'Hash' }
      indexingPolicy: {
        indexingMode: 'consistent'
        includedPaths: [{ path: '/*' }]
        excludedPaths: [{ path: '/"_etag"/?' }]
      }
    }
  }
}

resource projectsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'projects'
  properties: {
    resource: {
      id: 'projects'
      partitionKey: { paths: ['/tenantId'], kind: 'Hash' }
    }
  }
}

resource versionPinsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'version-pins'
  properties: {
    resource: {
      id: 'version-pins'
      partitionKey: { paths: ['/projectId'], kind: 'Hash' }
    }
  }
}

resource sessionsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'sessions'
  properties: {
    resource: {
      id: 'sessions'
      partitionKey: { paths: ['/tenantId'], kind: 'Hash' }
      defaultTtl: 86400  // 24 h — sessions expire automatically
    }
  }
}

// ─── User configuration (preferences, saved filters, theme, etc.) ───────────
resource userConfigContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'user-config'
  properties: {
    resource: {
      id: 'user-config'
      partitionKey: { paths: ['/userId'], kind: 'Hash' }
    }
  }
}

// ─── MCP Gateway & Registry ──────────────────────────────────────────────────
resource mcpServersContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'mcp-servers'
  properties: {
    resource: {
      id: 'mcp-servers'
      partitionKey: { paths: ['/tenantId'], kind: 'Hash' }
      indexingPolicy: {
        indexingMode: 'consistent'
        includedPaths: [{ path: '/*' }]
        excludedPaths: [{ path: '/"_etag"/?' }]
      }
    }
  }
}

resource mcpToolsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'mcp-tools'
  properties: {
    resource: {
      id: 'mcp-tools'
      partitionKey: { paths: ['/serverId'], kind: 'Hash' }
    }
  }
}

// ─── A2A Agent Registry ──────────────────────────────────────────────────────
resource a2aAgentsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'a2a-agents'
  properties: {
    resource: {
      id: 'a2a-agents'
      partitionKey: { paths: ['/tenantId'], kind: 'Hash' }
      indexingPolicy: {
        indexingMode: 'consistent'
        includedPaths: [{ path: '/*' }]
        excludedPaths: [{ path: '/"_etag"/?' }]
      }
    }
  }
}

// ─── Agent Skills Registry ───────────────────────────────────────────────────
resource skillsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'skills'
  properties: {
    resource: {
      id: 'skills'
      partitionKey: { paths: ['/tenantId'], kind: 'Hash' }
    }
  }
}

// ─── IAM: Groups & Service Accounts ────────────────────────────────────────
resource iamGroupsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'iam-groups'
  properties: {
    resource: {
      id: 'iam-groups'
      partitionKey: { paths: ['/tenantId'], kind: 'Hash' }
    }
  }
}

resource iamServiceAccountsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'iam-service-accounts'
  properties: {
    resource: {
      id: 'iam-service-accounts'
      partitionKey: { paths: ['/tenantId'], kind: 'Hash' }
    }
  }
}

// ─── Server Health & Security Scans ─────────────────────────────────────────
resource serverHealthContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'server-health'
  properties: {
    resource: {
      id: 'server-health'
      partitionKey: { paths: ['/serverId'], kind: 'Hash' }
      defaultTtl: 604800  // 7 days retention
    }
  }
}

resource securityScansContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'security-scans'
  properties: {
    resource: {
      id: 'security-scans'
      partitionKey: { paths: ['/targetId'], kind: 'Hash' }
      defaultTtl: 2592000  // 30 days retention
    }
  }
}

resource policiesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'policies'
  properties: {
    resource: {
      id: 'policies'
      partitionKey: { paths: ['/tenantId'], kind: 'Hash' }
    }
  }
}

resource orchestrationTemplatesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'orchestration-templates'
  properties: {
    resource: {
      id: 'orchestration-templates'
      partitionKey: { paths: ['/tenantId'], kind: 'Hash' }
    }
  }
}

resource orchestrationExecutionsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'orchestration-executions'
  properties: {
    resource: {
      id: 'orchestration-executions'
      partitionKey: { paths: ['/tenantId'], kind: 'Hash' }
      defaultTtl: 7776000  // 90 days retention
    }
  }
}

output endpoint string = cosmosAccount.properties.documentEndpoint
output primaryKey string = cosmosAccount.listKeys().primaryMasterKey
output accountName string = cosmosAccount.name
