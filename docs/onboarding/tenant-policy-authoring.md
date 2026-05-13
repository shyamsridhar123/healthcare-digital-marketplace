# Tenant Policy Authoring for Onboarding

Tenant policies define which domain agents can progress through onboarding without manual exceptions.

## Baseline Rules

- Require `owner.team` and `owner.email` for every manifest.
- Require `repository.url` to match a GitHub App-registered repository.
- Require SLSA issuer `token.actions.githubusercontent.com`.
- Require source SHA in provenance to match the submitted commit SHA.
- Fail any critical scan finding.
- Fail PHI-suspected submissions unless `rai.data_categories` includes `phi`.
- Require eval pass rate of at least `0.8` and score delta no worse than `-0.02`.

## Example Policy Record

```json
{
  "id": "tenant-default-onboarding-policy",
  "tenantId": "contoso",
  "type": "onboarding-policy",
  "version": "1.0.0",
  "risk": {
    "autoApprove": ["low"],
    "manualReview": ["medium", "high"]
  },
  "evidence": {
    "requireSlsa": true,
    "requireSbom": true,
    "blockCriticalFindings": true,
    "blockUndeclaredPhi": true
  },
  "eval": {
    "minPassRate": 0.8,
    "minScoreDeltaVsPrior": -0.02
  }
}
```

Store tenant policies in the `tenant-policies` container using `tenantId` as the partition key.
