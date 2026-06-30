import { NextRequest, NextResponse } from "next/server"
import {
  isAmlConfigured,
  listAmlModels,
  listAmlModelVersions,
  registerAmlModel,
  amlModelToMarketplace,
  type RegisterModelInput,
} from "@/lib/azure-ml-client"
import { demoPublishedModelExperience, models as staticModels } from "@/lib/models-data"

const IMDE_DEMO_SCENARIO_ID = "imde-rcm-denial-demo"

function isAllowedDemoTenant(tenantId: string) {
  return (process.env.UAP_IMDE_DEMO_TENANTS ?? "default")
    .split(",")
    .map((tenant) => tenant.trim())
    .filter(Boolean)
    .includes(tenantId)
}

function resolveBackendApiBase(): string {
  // Server-side code must use an absolute URL. Prefer API_BASE_URL (absolute,
  // server-only) and fall back to NEXT_PUBLIC_API_BASE_URL only when it is
  // already absolute. Otherwise default to the local Functions host.
  const serverBase = process.env.API_BASE_URL
  if (serverBase && /^https?:\/\//.test(serverBase)) return serverBase
  const publicBase = process.env.NEXT_PUBLIC_API_BASE_URL
  if (publicBase && /^https?:\/\//.test(publicBase)) return publicBase
  return "http://localhost:7071/api"
}

async function listDemoPublishedModels(demoScenarioId: string | null, tenantId: string) {
  if (demoScenarioId !== IMDE_DEMO_SCENARIO_ID) return []
  if (!isAllowedDemoTenant(tenantId)) return []

  const apiBase = resolveBackendApiBase()
  const url = new URL(`${apiBase.replace(/\/$/, "")}/model-experiences`)
  url.searchParams.set("tenantId", tenantId)
  url.searchParams.set("demoScenarioId", demoScenarioId)
  url.searchParams.set("modelRouteId", demoPublishedModelExperience.id)

  try {
    const response = await fetch(url, { cache: "no-store" })
    if (!response.ok) return []

    const payload = await response.json() as { items?: Array<Record<string, any>> }
    return (payload.items ?? []).map((experience) => ({
      ...demoPublishedModelExperience,
      version: String(experience.version ?? demoPublishedModelExperience.version),
      status: "demo-ready",
      trustStatus: experience.trustStatus === "governance-passed" ? "governance-passed" : demoPublishedModelExperience.trustStatus,
      lineage: {
        ...demoPublishedModelExperience.lineage,
        ...(typeof experience.lineage === "object" && experience.lineage ? experience.lineage : {}),
      },
    }))
  } catch (err) {
    console.warn("[api/models] demo model-experiences sync failed:", err)
    return []
  }
}

/**
 * GET /api/models
 *
 * Returns model list from:
 *  1. Static marketplace catalog (models-data.ts)
 *  2. Azure ML workspace if configured (AZURE_ML_WORKSPACE env set)
 *
 * Query params:
 *   source=all|static|azureml   (default: all)
 */
export async function GET(req: NextRequest) {
  const source = req.nextUrl.searchParams.get("source") ?? "all"
  const demoScenarioId = req.nextUrl.searchParams.get("demoScenarioId")
  const tenantId = req.nextUrl.searchParams.get("tenantId") ?? "default"

  let amlModels: ReturnType<typeof amlModelToMarketplace>[] = []

  if ((source === "all" || source === "azureml") && isAmlConfigured()) {
    try {
      const containers = await listAmlModels()
      const versionLists = await Promise.allSettled(
        containers.slice(0, 50).map((c) => listAmlModelVersions(c.name))
      )
      for (const result of versionLists) {
        if (result.status === "fulfilled") {
          // Take the latest version of each model
          const sorted = result.value.sort((a, b) =>
            (b.createdTime ?? "").localeCompare(a.createdTime ?? "")
          )
          if (sorted[0]) amlModels.push(amlModelToMarketplace(sorted[0]))
        }
      }
    } catch (err) {
      console.warn("[api/models] AML sync failed:", err)
    }
  }

  const demoModels = await listDemoPublishedModels(demoScenarioId, tenantId)

  const combined =
    source === "azureml"
      ? amlModels
      : source === "static"
      ? staticModels
      : [...demoModels, ...staticModels, ...amlModels]

  return NextResponse.json(
    {
      models: combined,
      meta: {
        total: combined.length,
        static: staticModels.length,
        demo: demoModels.length,
        azureml: amlModels.length,
        amlConfigured: isAmlConfigured(),
      },
    },
    {
      headers: { "Cache-Control": demoModels.length > 0 ? "no-store" : "public, s-maxage=120, stale-while-revalidate=30" },
    }
  )
}

/**
 * POST /api/models
 *
 * Registers a custom model in the Azure ML workspace.
 * Also adds it to the AI Asset Marketplace catalog as a "byom" (bring-your-own-model) entry.
 *
 * Body: RegisterModelInput JSON
 */
export async function POST(req: NextRequest) {
  if (!isAmlConfigured()) {
    return NextResponse.json(
      {
        error: "Azure ML workspace not configured",
        hint: "Set AZURE_SUBSCRIPTION_ID, AZURE_ML_RESOURCE_GROUP, and AZURE_ML_WORKSPACE environment variables.",
      },
      { status: 503 }
    )
  }

  let input: RegisterModelInput
  try {
    input = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // Basic validation
  const required: (keyof RegisterModelInput)[] = ["name", "version", "description", "modelUri", "framework", "taskType"]
  for (const field of required) {
    if (!input[field]) {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
    }
  }

  try {
    const registered = await registerAmlModel(input)
    const marketplaceEntry = amlModelToMarketplace(registered)

    return NextResponse.json(
      {
        success: true,
        model: registered,
        marketplaceEntry,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error("[api/models] Registration failed:", err)
    return NextResponse.json(
      { error: "Model registration failed", detail: String(err) },
      { status: 500 }
    )
  }
}
