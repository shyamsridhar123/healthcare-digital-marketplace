import type { SVGProps } from "react"

/**
 * Original Nebula-X mark — an orbit ring with a crossing "X" and orbiting nodes.
 * Uses currentColor so it can be tinted via text color. Not affiliated with any
 * third-party trademarked logo.
 */
export function NebulaLogo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <circle cx="16" cy="16" r="11.5" stroke="currentColor" strokeWidth="1.4" opacity="0.3" />
      <path
        d="M9.5 9.5 L22.5 22.5 M22.5 9.5 L9.5 22.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="3.1" fill="currentColor" />
      <circle cx="16" cy="4.5" r="1.7" fill="currentColor" />
      <circle cx="27.5" cy="16" r="1.7" fill="currentColor" />
    </svg>
  )
}

/** Text wordmark: "Nebula-X" with an optional "by Deloitte" descriptor. */
export function NebulaWordmark({
  className,
  showByline = true,
}: {
  className?: string
  showByline?: boolean
}) {
  return (
    <span className={className}>
      <span className="font-bold tracking-tight text-foreground">Nebula-X</span>
      {showByline && (
        <span className="ml-1.5 text-xs font-medium text-[var(--primary)]">by Deloitte</span>
      )}
    </span>
  )
}
