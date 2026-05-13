# Onboarding Reviewer Guide

Reviewers approve domain agents only after the automated gates provide enough evidence to support marketplace publication.

## Review Inputs

- Manifest validation output and JSON-pointer errors, if any.
- Risk tier and factors computed by the LangGraph onboarding runner.
- SLSA provenance verification result, issuer, subject, source commit, builder identity, attestation URL, and SBOM URL.
- Security scan summary, including critical findings and PHI suspicion result.
- GitHub gate/check-run status.
- Eval report pass rate and score delta versus prior approved version.
- Deployment endpoint and ACA resource ID after activation.

## Approval Guidance

- Approve low/medium-risk agents when manifest ownership is clear, data categories are declared, provenance matches the submitted commit, scans have no critical findings, and eval thresholds pass.
- Reject submissions with undeclared PHI, mismatched provenance issuer or source SHA, critical findings, unclear owner, or missing eval evidence.
- Require manual security review for agents with PHI, production network egress, privileged tools, or nonstandard deployment targets.

## Audit Expectations

Every reviewer decision must include a justification. The onboarding service persists approval, rejection, withdrawal, provenance, scan, eval, gate, and activation events to the audit log with `tenantId` partitioning.
