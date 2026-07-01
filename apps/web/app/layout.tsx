import type { Metadata } from 'next'
import { Open_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { AssistantWidget } from '@/components/assistant/assistant-widget'
import './globals.css'

const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-open-sans", display: "swap", weight: ["400", "600", "700", "800"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-marketplace-web-dev.victoriousmeadow-936c3d3b.eastus2.azurecontainerapps.io'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Nebula-X — Deloitte AI Management Platform',
  description: 'Nebula-X — Deloitte\'s AI Management Platform. The governed platform for the firm\'s AI: agents, MCP tools, models, and skills across every org and workspace, on a multi-provider gateway with agent identity, content safety, and FinOps showback. Self-service AI, fully governed.',
  applicationName: 'Nebula-X',
  generator: 'Nebula-X',
  openGraph: {
    type: 'website',
    siteName: 'Nebula-X',
    title: 'Nebula-X — Deloitte AI Management Platform',
    description: 'The governed platform for the firm\'s AI. Self-service AI, fully governed.',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nebula-X — Deloitte AI Management Platform',
    description: 'The governed platform for the firm\'s AI. Self-service AI, fully governed.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={openSans.variable}>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange storageKey="theme-preference">
          <AuthProvider>
            <AuthGuard>
              {children}
              <AssistantWidget />
            </AuthGuard>
          </AuthProvider>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
