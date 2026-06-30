---
date: 2026-05-24
topic: loan-default-prediction-app
focus: predict defaulter based on mortgage/loan info
---

# Ideation: Loan / Mortgage Default Prediction App

## Codebase Context

- **Workspace:** Azure AI Asset Marketplace — platform for publishing/orchestrating AI agents, MCP servers, models, and workflow templates on Azure AI Foundry with a visual React Flow canvas.
- **Stack:** Next.js 15 (web), Azure Functions v4 + Node/TS (api), Cosmos DB (tenantId-partitioned), Bicep IaC, Entra ID, App Insights.
- **Implication:** A defaulter-prediction app fits as a **marketplace asset** (agent + MCP tools + orchestrator template) rather than a standalone ML script. The marketplace's governance pipeline, multi-tenant Cosmos partitioning, and visual orchestrator are reusable leverage points.
- **Domain pain to weight:** explainability for adverse-action compliance (ECOA / FCRA / Reg B), fair-lending disparate-impact risk, continuous portfolio monitoring (not just origination), and alternative-data thin-file borrowers.
- **Past learnings:** None recorded yet in `docs/solutions/`.

## Ranked Ideas

### 1. Default Risk Agent Pack (marketplace bundle)
**Description:** A packaged marketplace offering combining (a) a default classifier exposed as an MCP tool, (b) a SHAP/LIME explainer agent, (c) a fair-lending bias scanner, and (d) an FCRA-compliant adverse-action notice generator. Sold/deployed as one bundle through the marketplace.
**Rationale:** The blocker for lenders deploying ML on credit isn't the model — it's the surrounding governance plumbing. Bundling solves the "I built a model but legal won't sign off" problem and showcases the marketplace's governance + orchestration value.
**Downsides:** Larger scope; depends on the publisher pipeline (Sprint 2 work).
**Confidence:** 80%
**Complexity:** Medium-High
**Status:** Unexplored

### 2. Portfolio Watchtower
**Description:** Continuous-monitoring agent that re-scores every loan in a lender's portfolio nightly using updated payment behavior, macro signals (rates, CPI, regional unemployment), and credit-bureau refreshes. Flags deterioration *before* delinquency. Implemented as a React Flow template: ingest → score → diff vs. last run → alert.
**Rationale:** Most default-prediction products score at origination once and never again. The real lender pain is mid-life portfolio surveillance. Plays directly to the orchestrator canvas.
**Downsides:** Needs ongoing data feeds (cost); value scales with portfolio size.
**Confidence:** 75%
**Complexity:** Medium
**Status:** Unexplored

### 3. Re-Default Predictor (loss-mitigation niche)
**Description:** Specialized model for loans already in delinquency/workout: given a restructure offer (rate cut, term extension, forbearance), predict probability of re-default. Targets servicers' loss-mitigation teams, not originators.
**Rationale:** Underserved market — most vendors focus on origination. High margin, willing-to-pay buyers, less crowded.
**Downsides:** Narrower TAM; servicing data is harder to source than origination data.
**Confidence:** 70%
**Complexity:** Medium
**Status:** Unexplored

### 4. Time-to-Default (Survival Model)
**Description:** Instead of "will this borrower default (yes/no)?" produce "*when* — with what probability over the next 6 / 12 / 24 months?" using survival analysis (Cox PH / DeepSurv).
**Rationale:** Differentiates from the commoditized binary-classifier market; matches how risk officers actually think (PD term structure, IFRS 9 / CECL provisioning).
**Downsides:** Harder to explain to non-technical stakeholders; calibration validation is tricky.
**Confidence:** 65%
**Complexity:** Medium
**Status:** Unexplored

### 5. Portfolio Scenario Simulator
**Description:** Reframe from per-loan scoring to **portfolio-level what-if**: "what happens to expected loss if Fed funds +200 bps, or unemployment +1.5 pp in TX?" Visual simulator on top of the default model.
**Rationale:** CFOs, CROs, and regulators (CCAR/DFAST) care about portfolio-level scenarios far more than individual scores. Much higher leverage on top of any underlying model.
**Downsides:** Macro modeling adds real complexity; UI work is non-trivial.
**Confidence:** 75%
**Complexity:** High
**Status:** Unexplored

### 6. Counterfactual Recommender ("what would prevent this default")
**Description:** For each high-risk borrower, surface the minimal actionable interventions that would flip them to low-risk (e.g., "rate cut of 75 bps + 6 mo extension reduces PD from 38% → 9%"). Turns risk scoring into retention / loss-mitigation action.
**Rationale:** Inverts the typical workflow — prediction becomes intervention. Stronger ROI story than "we found risky loans."
**Downsides:** Counterfactual methods (DiCE, CFE) are sensitive; needs guardrails for action validity (cannot recommend illegal terms).
**Confidence:** 60%
**Complexity:** High
**Status:** Unexplored

### 7. Alt-Data Predictor for Thin-File Borrowers
**Description:** Default model targeted at gig workers, self-employed, and no-doc applicants, using cash-flow / bank-txn data (Plaid/Finicity), rent payments, and utility history instead of (or alongside) traditional bureau data.
**Rationale:** Growing borrower segment (~30 M+ in US), poorly served by FICO-centric models. CFPB tailwinds for alt-data adoption.
**Downsides:** Data sourcing is the hard part; bias risk is non-trivial.
**Confidence:** 65%
**Complexity:** Medium-High
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Generic ML wrapper REST API | Commoditized; SageMaker/Vertex/Foundry already do this |
| 2 | Loan-officer triage queue | Subsumed by Agent Pack (#1) |
| 3 | Prepay/saver predictor | Off-focus (user asked about defaulters) |
| 4 | Auto-retrain MLOps pipeline | Table-stakes infrastructure, not a product |
| 5 | Fair-lending benchmark scoring other lenders' models | Legally/competitively risky; narrow B2B2B market |
| 6 | Synthetic data generator for stress tests | Niche tooling; off the user's stated goal |
| 7 | Multi-tenant SaaS deployment | A delivery model, not an idea — applies to all survivors |
| 8 | Adversarial robustness checker | Too research-y; weak commercial pull |
| 9 | Excel/CSV defaulter plugin | Too narrow; subsumed by Watchtower (#2) |
| 10 | Standalone "loan risk analyst" agent | Subsumed by Agent Pack (#1) |
| 11 | Standalone bias scanner | Folded into Agent Pack (#1) |
| 12 | Standalone adverse-action note generator | Folded into Agent Pack (#1) |

## Session Log

- 2026-05-24: Initial ideation — 26 raw candidates generated across 6 frames (user pain, unmet need, inversion/automation, reframing, leverage, extremes); 14 unique after dedupe; 7 survived adversarial filtering.
