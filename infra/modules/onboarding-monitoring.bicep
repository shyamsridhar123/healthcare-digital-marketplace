param name string
param location string
param appInsightsResourceId string
param workspaceResourceId string
param healthCheckUrl string = ''
param actionGroupIds array = []

var workbookName = guid(resourceGroup().id, name, 'onboarding-agent-workbook')
var runbookBaseUrl = 'https://aka.ms/uap-onboarding-runbooks'

resource workbook 'Microsoft.Insights/workbooks@2023-06-01' = {
  name: workbookName
  location: location
  kind: 'shared'
  properties: {
    displayName: 'Onboarding Agent Pipeline'
    category: 'workbook'
    sourceId: appInsightsResourceId
    serializedData: string({
      version: 'Notebook/1.0'
      items: [
        {
          type: 1
          content: {
            json: '# Onboarding Agent Pipeline\nSubmission funnel, stage latency, failures, approval queue health, and agent quality signals.'
          }
          name: 'title'
        }
        {
          type: 3
          content: {
            version: 'KqlItem/1.0'
            query: 'AppEvents\n| where Name startswith "uap."\n| summarize Count=count() by Name, bin(TimeGenerated, 1h)'
            size: 0
            title: 'Submission funnel by stage'
            queryType: 0
            resourceType: 'microsoft.operationalinsights/workspaces'
          }
          name: 'submission-funnel'
        }
        {
          type: 3
          content: {
            version: 'KqlItem/1.0'
            query: 'AppEvents\n| where Name startswith "uap."\n| extend DurationMs=todouble(Properties.duration_ms), Stage=tostring(Properties.stage)\n| summarize p50=percentile(DurationMs, 50), p95=percentile(DurationMs, 95) by Stage'
            size: 0
            title: 'Lead time per stage'
            queryType: 0
            resourceType: 'microsoft.operationalinsights/workspaces'
          }
          name: 'lead-time-per-stage'
        }
        {
          type: 3
          content: {
            version: 'KqlItem/1.0'
            query: 'AppEvents\n| where Name startswith "uap."\n| extend Outcome=tostring(Properties.outcome), Cause=tostring(Properties.failure_cause)\n| summarize Count=count() by Outcome, Cause'
            size: 0
            title: 'Failure-rate breakdown'
            queryType: 0
            resourceType: 'microsoft.operationalinsights/workspaces'
          }
          name: 'failure-breakdown'
        }
        {
          type: 3
          content: {
            version: 'KqlItem/1.0'
            query: 'AppEvents\n| where Name == "uap.stage7.activate_agentcard"\n| extend LeadTimeMinutes=todouble(Properties.lead_time_minutes), SubmissionId=tostring(Properties.submission_id)\n| top 10 by LeadTimeMinutes desc\n| project TimeGenerated, SubmissionId, LeadTimeMinutes'
            size: 0
            title: 'Top 10 slowest submissions'
            queryType: 0
            resourceType: 'microsoft.operationalinsights/workspaces'
          }
          name: 'slowest-submissions'
        }
        {
          type: 3
          content: {
            version: 'KqlItem/1.0'
            query: 'AppEvents\n| where Name == "uap.stage4.await_approval"\n| extend Queue=tostring(Properties.reviewer_queue), SlaBreached=tobool(Properties.sla_breached), WaitMinutes=todouble(Properties.wait_minutes)\n| summarize Open=count(), OldestWaiting=max(WaitMinutes), Breached=countif(SlaBreached) by Queue'
            size: 0
            title: 'Approval queue health'
            queryType: 0
            resourceType: 'microsoft.operationalinsights/workspaces'
          }
          name: 'approval-queue-health'
        }
        {
          type: 3
          content: {
            version: 'KqlItem/1.0'
            query: 'AppEvents\n| where Name startswith "uap.agent_quality"\n| extend JudgeScore=todouble(Properties.judge_score), TokensIn=todouble(Properties.tokens_in), TokensOut=todouble(Properties.tokens_out)\n| summarize AvgJudgeScore=avg(JudgeScore), Tokens=sum(TokensIn + TokensOut) by bin(TimeGenerated, 1h)'
            size: 0
            title: 'Agent quality'
            queryType: 0
            resourceType: 'microsoft.operationalinsights/workspaces'
          }
          name: 'agent-quality'
        }
      ]
      fallbackResourceIds: [workspaceResourceId]
    })
  }
}

resource availabilityTest 'Microsoft.Insights/webtests@2022-06-15' = if (!empty(healthCheckUrl)) {
  name: '${name}-health-test'
  location: location
  kind: 'ping'
  tags: {
    'hidden-link:${appInsightsResourceId}': 'Resource'
  }
  properties: {
    SyntheticMonitorId: '${name}-health-test'
    Name: 'Onboarding telemetry health'
    Description: 'Availability test for the onboarding telemetry health endpoint.'
    Enabled: true
    Frequency: 300
    Timeout: 30
    Kind: 'standard'
    Locations: [
      { Id: 'us-fl-mia-edge' }
    ]
    Request: {
      RequestUrl: healthCheckUrl
      HttpVerb: 'GET'
      ParseDependentRequests: false
    }
    ValidationRules: {
      ExpectedHttpStatusCode: 200
      SSLCheck: true
    }
  }
}

var alertQueries = [
  {
    suffix: 'stage-failure-rate'
    displayName: 'Onboarding stage failure rate spike'
    severity: 3
    route: 'platform-on-call'
    runbook: '${runbookBaseUrl}/stage-failure-rate'
    windowSize: 'PT1H'
    query: 'AppEvents | where Name startswith "uap." | summarize Total=count(), Failed=countif(tostring(Properties.outcome) == "failed") | extend Failures=iff(Total == 0, 0.0, todouble(Failed) / todouble(Total) * 100.0)'
    threshold: 10
  }
  {
    suffix: 'lead-time-slo-miss'
    displayName: 'Onboarding end-to-end SLO miss'
    severity: 3
    route: 'platform-on-call'
    runbook: '${runbookBaseUrl}/lead-time-slo-miss'
    windowSize: 'PT2H'
    query: 'AppEvents | where Name == "uap.stage7.activate_agentcard" | summarize Failures=percentile(todouble(Properties.lead_time_minutes), 95)'
    threshold: 60
  }
  {
    suffix: 'approval-queue-stalled'
    displayName: 'Onboarding approval queue stalled'
    severity: 3
    route: 'reviewer-manager'
    runbook: '${runbookBaseUrl}/approval-queue-stalled'
    windowSize: 'PT15M'
    query: 'AppEvents | where Name == "uap.stage4.await_approval" | summarize Failures=countif(todouble(Properties.sla_fraction_elapsed) > 0.8)'
    threshold: 0
  }
  {
    suffix: 'approval-sla-breach'
    displayName: 'Onboarding approval SLA breached'
    severity: 2
    route: 'escalation-reviewer'
    runbook: '${runbookBaseUrl}/approval-sla-breach'
    windowSize: 'PT15M'
    query: 'AppEvents | where Name == "uap.stage4.await_approval" and tostring(Properties.sla_breached) == "true" | summarize Failures=count()'
    threshold: 0
  }
  {
    suffix: 'slsa-failures'
    displayName: 'Onboarding SLSA verification failures'
    severity: 1
    route: 'security-on-call'
    runbook: '${runbookBaseUrl}/slsa-failures'
    windowSize: 'PT1H'
    query: 'AppEvents | where Name == "uap.stage2.verify_slsa" and tostring(Properties.outcome) == "failed" | summarize Failures=count()'
    threshold: 0
  }
  {
    suffix: 'phi-unattested'
    displayName: 'Onboarding PHI detected in unattested submission'
    severity: 1
    route: 'rai-on-call'
    runbook: '${runbookBaseUrl}/phi-unattested'
    windowSize: 'PT1H'
    query: 'AppEvents | where Name == "uap.stage2.ingest_scans" and tostring(Properties.phi_unattested) == "true" | summarize Failures=count()'
    threshold: 0
  }
  {
    suffix: 'terraform-failure-burst'
    displayName: 'Onboarding Terraform apply failure burst'
    severity: 2
    route: 'platform-on-call'
    runbook: '${runbookBaseUrl}/terraform-failure-burst'
    windowSize: 'PT15M'
    query: 'AppEvents | where Name == "uap.stage5.terraform_apply" and tostring(Properties.outcome) == "failed" | summarize Failures=count()'
    threshold: 3
  }
  {
    suffix: 'cosmos-throttle'
    displayName: 'Onboarding Cosmos throttle'
    severity: 2
    route: 'platform-on-call'
    runbook: '${runbookBaseUrl}/cosmos-throttle'
    windowSize: 'PT5M'
    query: 'AppDependencies | where Target contains "documents.azure.com" and ResultCode == "429" | summarize Failures=count()'
    threshold: 0
  }
  {
    suffix: 'agent-down'
    displayName: 'Onboarding Agent health probe failing'
    severity: 1
    route: 'platform-on-call'
    runbook: '${runbookBaseUrl}/agent-down'
    windowSize: 'PT5M'
    query: 'AppAvailabilityResults | where Name contains "onboarding" and Success == false | summarize Failures=count()'
    threshold: 0
  }
  {
    suffix: 'github-webhook-backlog'
    displayName: 'Onboarding GitHub App webhook backlog'
    severity: 2
    route: 'platform-on-call'
    runbook: '${runbookBaseUrl}/github-webhook-backlog'
    windowSize: 'PT5M'
    query: 'AppMetrics | where Name == "uap.github.webhook_backlog" | summarize Failures=countif(Sum > 100)'
    threshold: 0
  }
  {
    suffix: 'phi-scrubber-regression'
    displayName: 'Onboarding PHI scrubber regression'
    severity: 1
    route: 'platform-eng'
    runbook: '${runbookBaseUrl}/phi-scrubber-regression'
    windowSize: 'PT15M'
    query: 'AppEvents | where Name == "uap.phi_scrubber.golden_set" and tostring(Properties.outcome) == "failed" | summarize Failures=count()'
    threshold: 0
  }
  {
    suffix: 'phi-scrubber-heartbeat-missing'
    displayName: 'Onboarding PHI scrubber heartbeat missing'
    severity: 2
    route: 'platform-eng'
    runbook: '${runbookBaseUrl}/phi-scrubber-heartbeat-missing'
    windowSize: 'PT30M'
    query: 'AppEvents | where Name == "uap.phi_scrubber.golden_set" | summarize Heartbeats=count() | extend Failures=iff(Heartbeats == 0, 1, 0)'
    threshold: 0
  }
  {
    suffix: 'module-breaking-change'
    displayName: 'Onboarding Terraform module breaking change flagged'
    severity: 3
    route: 'platform-eng'
    runbook: '${runbookBaseUrl}/module-breaking-change'
    windowSize: 'PT15M'
    query: 'AppEvents | where Name == "uap.module.version_check" and tostring(Properties.breaking_change) == "true" | summarize Failures=count()'
    threshold: 0
  }
]

resource scheduledAlerts 'Microsoft.Insights/scheduledQueryRules@2023-12-01' = [for alert in alertQueries: if (!empty(actionGroupIds)) {
  name: '${name}-${alert.suffix}'
  location: location
  properties: {
    displayName: alert.displayName
    description: 'Route: ${alert.route}. Runbook: ${alert.runbook}'
    severity: alert.severity
    enabled: true
    scopes: [workspaceResourceId]
    evaluationFrequency: 'PT5M'
    windowSize: alert.windowSize
    criteria: {
      allOf: [
        {
          query: alert.query
          timeAggregation: 'Total'
          metricMeasureColumn: 'Failures'
          operator: 'GreaterThan'
          threshold: alert.threshold
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: actionGroupIds
      customProperties: {
        route: alert.route
        runbook: alert.runbook
      }
    }
  }
}]

output workbookId string = workbook.id
