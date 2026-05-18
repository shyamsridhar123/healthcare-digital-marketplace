"use client"

import { type ReactNode, useEffect, useState } from "react"
import {
  PublicClientApplication,
  EventType,
  type AuthenticationResult,
} from "@azure/msal-browser"
import { MsalProvider } from "@azure/msal-react"
import { buildMsalConfig } from "@/lib/auth/msal-config"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [instance, setInstance] = useState<PublicClientApplication | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)

  if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") {
    return <>{children}</>
  }

  useEffect(() => {
    // Fetch client ID + tenant ID from the server API route at runtime.
    // This avoids baking them in as NEXT_PUBLIC_ build-time vars, so the
    // same Docker image works across environments.
    fetch("/api/auth-config")
      .then((res) => {
        if (!res.ok) throw new Error(`auth-config returned ${res.status}`);
        return res.json();
      })
      .then(async ({ clientId, tenantId }: { clientId: string; tenantId: string }) => {
        const inst = new PublicClientApplication(buildMsalConfig(clientId, tenantId))
        await inst.initialize()

        // Restore active account from cache
        const accounts = inst.getAllAccounts()
        if (accounts.length > 0) inst.setActiveAccount(accounts[0])

        // Keep active account in sync after login
        inst.addEventCallback((event) => {
          if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
            const payload = event.payload as AuthenticationResult
            inst.setActiveAccount(payload.account)
          }
        })

        setInstance(inst)
      })
      .catch((err) => {
        console.error("[AuthProvider] MSAL init failed:", err)
        setConfigError(err instanceof Error ? err.message : "MSAL configuration failed")
      })
  }, [])

  if (configError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-6">
        <div className="max-w-lg rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <h1 className="text-lg font-semibold text-foreground">Authentication is not configured</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The app could not load a valid Entra client ID and tenant ID, so sign-in was not started.
          </p>
          <p className="mt-4 rounded-lg bg-secondary px-3 py-2 text-left font-mono text-xs text-muted-foreground">
            Set AZURE_CLIENT_ID and AZURE_TENANT_ID, or run local demos with NEXT_PUBLIC_AUTH_DISABLED=true.
          </p>
        </div>
      </div>
    )
  }

  if (!instance) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  return <MsalProvider instance={instance}>{children}</MsalProvider>
}
