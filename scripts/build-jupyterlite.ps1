<#
.SYNOPSIS
    Build the JupyterLite static site that ships under apps/web/public/jupyterlite/.

.DESCRIPTION
    Wraps `jupyter lite build` with:
      - automatic venv activation (idempotent)
      - clean of the previous output dir
      - sanity check that scripts/build-starter-notebook.py has run

    Run from repo root.

.EXAMPLE
    .\scripts\build-jupyterlite.ps1
#>
[CmdletBinding()]
param(
    [switch]$SkipNotebookBuild
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot
try {
    # 1. Activate venv if not already active.
    if (-not $env:VIRTUAL_ENV) {
        $activate = Join-Path $repoRoot ".venv\Scripts\Activate.ps1"
        if (-not (Test-Path -LiteralPath $activate)) {
            throw "Python venv not found at .venv\. Create it first: python -m venv .venv"
        }
        . $activate
    }

    # 2. Verify jupyter lite is installed.
    $jl = Get-Command "jupyter" -ErrorAction SilentlyContinue
    if (-not $jl) {
        throw "jupyter is not on PATH after activating .venv. See docs/jupyterlite-content/README.md."
    }

    # 3. (Re)build starter.ipynb unless caller opts out.
    if (-not $SkipNotebookBuild) {
        Write-Host "==> Regenerating docs\jupyterlite-content\starter.ipynb" -ForegroundColor Cyan
        python scripts\build-starter-notebook.py
        if ($LASTEXITCODE -ne 0) {
            throw "build-starter-notebook.py failed with exit code $LASTEXITCODE"
        }
    } else {
        $nb = Join-Path $repoRoot "docs\jupyterlite-content\starter.ipynb"
        if (-not (Test-Path -LiteralPath $nb)) {
            throw "Notebook missing at $nb. Run without -SkipNotebookBuild or run scripts\build-starter-notebook.py first."
        }
    }

    # 4. Clean previous JupyterLite output.
    $outDir = Join-Path $repoRoot "apps\web\public\jupyterlite"
    if (Test-Path -LiteralPath $outDir) {
        Write-Host "==> Cleaning $outDir" -ForegroundColor Cyan
        Get-ChildItem -LiteralPath $outDir -Force | Remove-Item -Recurse -Force
    } else {
        New-Item -ItemType Directory -Path $outDir | Out-Null
    }

    # 5. Build.
    # Run the build from inside docs/jupyterlite-content so jupyter lite
    # does NOT walk up to the repo-root package.json and mis-detect the
    # repo as a JS workspace (it then writes paths under
    # apps/web/public/jupyterlite/node_modules/ai-marketplace-web/... and
    # fails). Absolute paths are required when cwd != repo root.
    Write-Host "==> jupyter lite build" -ForegroundColor Cyan
    $contentsAbs = Join-Path $repoRoot "docs\jupyterlite-content"
    $outputAbs   = $outDir
    Push-Location $contentsAbs
    try {
        jupyter lite build `
            --contents $contentsAbs `
            --output-dir $outputAbs
        if ($LASTEXITCODE -ne 0) {
            throw "jupyter lite build failed with exit code $LASTEXITCODE"
        }
    }
    finally {
        Pop-Location
    }

    # 6. Sanity-check the emitted artifact.
    $indexHtml = Join-Path $outDir "notebooks\index.html"
    $starterIpynb = Join-Path $outDir "files\starter.ipynb"
    foreach ($p in @($indexHtml, $starterIpynb)) {
        if (-not (Test-Path -LiteralPath $p)) {
            throw "Expected artifact missing after build: $p"
        }
    }

    # Regression guard: if jupyter lite mis-detected the repo as a JS
    # workspace, it would have written a node_modules tree into $outDir.
    $strayNodeModules = Join-Path $outDir "node_modules"
    if (Test-Path -LiteralPath $strayNodeModules) {
        throw "jupyter lite mis-detected the repo as a JS workspace; rerun from docs/jupyterlite-content (found $strayNodeModules)."
    }

    $size = [math]::Round(((Get-ChildItem -LiteralPath $outDir -Recurse -File | Measure-Object Length -Sum).Sum / 1MB), 1)
    Write-Host ("==> JupyterLite built successfully ({0} MB)" -f $size) -ForegroundColor Green
    Write-Host "    Open Editor target: /jupyterlite/notebooks/index.html?path=starter.ipynb"
}
finally {
    Pop-Location
}
