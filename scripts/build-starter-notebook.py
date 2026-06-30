"""Build docs/jupyterlite-content/starter.ipynb with executed outputs.

Mirrors the markdown preview from `mockNotebooks[0]` in
`apps/web/app/imde/notebooks/[id]/page.tsx` and adds a real synthetic
RCM denials walk-through (table + chart + baseline model) so the
JupyterLite iframe shows a Colab-like notebook even when the in-browser
Pyodide kernel is not used.

Run from repo root with the project venv active:

    python scripts/build-starter-notebook.py

Idempotent: overwrites docs/jupyterlite-content/starter.ipynb.
"""
from __future__ import annotations

from pathlib import Path

import nbformat
from nbclient import NotebookClient


REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = REPO_ROOT / "docs" / "jupyterlite-content"
OUT_PATH = OUT_DIR / "starter.ipynb"


MARKDOWN_INTRO = """\
# Revenue Cycle Denial Prediction

> **Sandbox:** `imde-rcm-denial-demo`  ·  **Runtime:** 5 min  ·  **Author:** Priya Shah · Revenue Cycle AI Lab

## Objective
Build a classifier to predict claim denials based on historical patterns.

## Data Overview
- **Training Set**: 10K+ claims with outcomes
- **Features**: Claim details, provider info, patient demographics
- **Target**: Binary (Approved / Denied)

## Quick Start
1. Load the training data
2. Explore patterns
3. Train a baseline model
4. Evaluate performance
"""

MARKDOWN_STEP1 = """\
## 1. Load the training data

We use a synthetic but realistic RCM claims sample. In production this
cell would call the curated dataset registered for the
`imde-rcm-denial-demo` sandbox.
"""

CODE_LOAD = """\
import numpy as np
import pandas as pd

rng = np.random.default_rng(seed=7)

N = 500
payers = ["Aetna", "BCBS", "Cigna", "Humana", "Medicare", "UHC"]
specialties = ["Cardiology", "Oncology", "Orthopedics", "Primary Care", "Radiology"]

age = rng.integers(18, 90, N)
charge = rng.gamma(shape=2.4, scale=950, size=N).round(2)
prior_denials = rng.integers(0, 6, N)
days_to_submit = rng.integers(0, 45, N)
payer = rng.choice(payers, N, p=[0.16, 0.20, 0.14, 0.12, 0.20, 0.18])
specialty = rng.choice(specialties, N)
modifier_count = rng.integers(0, 4, N)

# Hand-tuned signal so the baseline actually learns something demo-worthy.
logit = (
    -2.10
    + 0.018 * (age - 55)
    + 0.00018 * (charge - 1800)
    + 0.42 * prior_denials
    + 0.035 * days_to_submit
    + 0.55 * (payer == "Medicare")
    + 0.30 * (payer == "Humana")
    - 0.25 * (payer == "BCBS")
    + 0.20 * (specialty == "Oncology")
    + 0.15 * modifier_count
    + rng.normal(0, 0.55, N)
)
prob = 1 / (1 + np.exp(-logit))
denied = (rng.random(N) < prob).astype(int)

claims = pd.DataFrame(
    {
        "claim_id": [f"CLM-{i:05d}" for i in range(1, N + 1)],
        "payer": payer,
        "specialty": specialty,
        "patient_age": age,
        "charge_amount": charge,
        "prior_denials_12mo": prior_denials,
        "days_to_submit": days_to_submit,
        "modifier_count": modifier_count,
        "denied": denied,
    }
)

print(f"Loaded {len(claims):,} claims  |  denial rate = {claims['denied'].mean():.1%}")
claims.head(10)
"""

MARKDOWN_STEP2 = """\
## 2. Explore patterns

Look at denial rate by payer — payer mix is one of the strongest signals
in RCM data.
"""

CODE_EXPLORE = """\
%matplotlib inline
import matplotlib.pyplot as plt

denial_by_payer = (
    claims.groupby("payer")["denied"]
    .mean()
    .sort_values(ascending=False)
)

ax = denial_by_payer.plot(
    kind="bar",
    color="#7c3aed",
    edgecolor="#312e81",
    figsize=(8, 4.2),
)
ax.set_title("Denial rate by payer", fontsize=13, fontweight="bold")
ax.set_ylabel("Denial rate")
ax.set_xlabel("")
ax.set_ylim(0, max(denial_by_payer.values) * 1.25)
for i, v in enumerate(denial_by_payer.values):
    ax.text(i, v + 0.005, f"{v:.0%}", ha="center", fontsize=10, color="#312e81")
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
plt.xticks(rotation=0)
plt.tight_layout()
plt.show()
"""

MARKDOWN_STEP3 = """\
## 3. Train a baseline model

A logistic regression on a small set of engineered features gives us a
sensible starting AUC. Replace this with XGBoost / LightGBM in the
production notebook.
"""

CODE_TRAIN = """\
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, classification_report

X = pd.get_dummies(
    claims[
        [
            "payer",
            "specialty",
            "patient_age",
            "charge_amount",
            "prior_denials_12mo",
            "days_to_submit",
            "modifier_count",
        ]
    ],
    drop_first=True,
)
y = claims["denied"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=7, stratify=y
)

model = LogisticRegression(max_iter=2000, C=1.0)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
y_proba = model.predict_proba(X_test)[:, 1]

auc = roc_auc_score(y_test, y_proba)
print(f"Holdout AUC: {auc:.3f}")
print()
print(classification_report(y_test, y_pred, target_names=["approved", "denied"]))
"""

MARKDOWN_STEP4 = """\
## 4. Inspect feature importance

Coefficient magnitude tells us which inputs drive the denial signal.
"""

CODE_IMPORTANCE = """\
importance = (
    pd.Series(model.coef_[0], index=X.columns)
    .sort_values(key=lambda s: s.abs(), ascending=False)
    .head(10)
)

ax = importance.iloc[::-1].plot(
    kind="barh",
    color=["#16a34a" if v < 0 else "#dc2626" for v in importance.iloc[::-1].values],
    figsize=(8, 4.5),
)
ax.set_title("Top feature coefficients (red = pushes toward denial)", fontsize=12, fontweight="bold")
ax.set_xlabel("Coefficient")
ax.axvline(0, color="#475569", linewidth=0.8)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
plt.tight_layout()
plt.show()
"""

MARKDOWN_NEXT = """\
## Next Steps

- Feature engineering — provider-level rolling stats, ICD groupings
- Model tuning — gradient boosting, calibration
- Production deployment — register to the Marketplace and promote via Atlas

---

_This notebook ships with **pre-executed outputs** so the demo always
renders even when the in-browser Pyodide kernel is still warming up.
Click **Restart Kernel** in the JupyterLite toolbar to re-run live._
"""


def build_notebook() -> nbformat.NotebookNode:
    nb = nbformat.v4.new_notebook()
    nb.metadata = {
        "kernelspec": {
            "display_name": "Python (Pyodide)",
            "language": "python",
            "name": "python",
        },
        "language_info": {
            "name": "python",
            "version": "3.11",
            "mimetype": "text/x-python",
            "file_extension": ".py",
            "codemirror_mode": {"name": "ipython", "version": 3},
        },
        "title": "RCM Denial Prediction Starter",
    }
    nb.cells = [
        nbformat.v4.new_markdown_cell(MARKDOWN_INTRO),
        nbformat.v4.new_markdown_cell(MARKDOWN_STEP1),
        nbformat.v4.new_code_cell(CODE_LOAD),
        nbformat.v4.new_markdown_cell(MARKDOWN_STEP2),
        nbformat.v4.new_code_cell(CODE_EXPLORE),
        nbformat.v4.new_markdown_cell(MARKDOWN_STEP3),
        nbformat.v4.new_code_cell(CODE_TRAIN),
        nbformat.v4.new_markdown_cell(MARKDOWN_STEP4),
        nbformat.v4.new_code_cell(CODE_IMPORTANCE),
        nbformat.v4.new_markdown_cell(MARKDOWN_NEXT),
    ]
    return nb


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    nb = build_notebook()
    print(f"Executing {len(nb.cells)} cells...")
    client = NotebookClient(nb, timeout=120, kernel_name="python3")
    client.execute()
    nbformat.write(nb, OUT_PATH)
    size_kb = OUT_PATH.stat().st_size / 1024
    print(f"Wrote {OUT_PATH.relative_to(REPO_ROOT)} ({size_kb:,.1f} KB)")


if __name__ == "__main__":
    main()
