import { NextResponse } from "next/server"

/**
 * Returns Azure AD auth config values for the browser-side MSAL client.
 * These are public values (not secrets) — everyone can see them in the
 * login redirect URL, so it is safe to expose them from a server route.
 */
export async function GET() {
  const clientId =
    process.env.AZURE_CLIENT_ID ??
    process.env.NEXT_PUBLIC_AZURE_CLIENT_ID ??
    process.env.AZURE_AD_CLIENT_ID ??
    ""
  const tenantId =
    process.env.AZURE_TENANT_ID ??
    process.env.NEXT_PUBLIC_AZURE_TENANT_ID ??
    process.env.AZURE_AD_TENANT_ID ??
    ""

  if (!clientId || !tenantId) {
    return NextResponse.json(
      { error: "Azure AD client ID or tenant ID not configured" },
      { status: 503 }
    )
  }

  return NextResponse.json({
    clientId,
    tenantId,
  })
}
