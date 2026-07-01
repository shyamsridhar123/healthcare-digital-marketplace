import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { AssistantWidget } from '@/components/assistant/assistant-widget'
import './globals.css'

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: 'Nebula-X by Deloitte | AI Marketplace for Professional Services',
  description: 'Nebula-X by Deloitte — a governed AI marketplace and orchestration platform for professional services. Audit-grade agents, tax-certified models, and governance-first workflows. Intelligence, governed.',
  generator: 'Nebula-X',
  icons: {
    icon: { url: '/icon.svg', type: 'image/svg+xml' },
    apple: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
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
