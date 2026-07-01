"use client"

import { type ReactNode } from "react"
import { useIsAuthenticated, useMsal } from "@azure/msal-react"
import { InteractionStatus } from "@azure/msal-browser"
import { loginRequest } from "@/lib/auth/msal-config"
import { NebulaLogo } from "@/components/ui/nebula-logo"

/**
 * Wraps protected routes — redirects unauthenticated users to Microsoft sign-in.
 * Place this inside <AuthProvider> in the root layout.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  // Demo/E2E bypass — set NEXT_PUBLIC_AUTH_DISABLED=true to skip Entra sign-in.
  if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") {
    return <>{children}</>
  }

  const { instance, inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()

  // MSAL is mid-flight (processing the redirect callback, etc.)
  if (inProgress !== InteractionStatus.None) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <p className="text-sm text-muted-foreground">Signing in…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-8 bg-background">
        {/* Logo */}
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent-light)] shadow-lg shadow-[var(--primary)]/20">
          <NebulaLogo className="h-11 w-11 text-[#0C0C0C]" />
        </div>

        {/* Heading */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Nebula-X <span className="text-[var(--primary)]">by Deloitte</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The governed AI marketplace for professional services — sign in with your Microsoft account to continue
          </p>
        </div>

        {/* Sign-in button */}
        <button
          onClick={() => instance.loginRedirect(loginRequest).catch(console.error)}
          className="flex items-center gap-3 rounded-xl border border-border bg-secondary px-8 py-3.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-secondary/80 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          {/* Microsoft "M" logo mark */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 21 21"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
          Sign in with Microsoft
        </button>

        <p className="text-xs text-muted-foreground/60">
          Secured by Microsoft Entra ID
        </p>
      </div>
    )
  }

  return <>{children}</>
}
