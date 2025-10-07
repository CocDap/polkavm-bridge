import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { ChainInitNotification } from '@/components/chain-init-notification'
import { Providers } from "./providers";
import './globals.css'

export const metadata: Metadata = {
  title: 'PolkaVM DevTool',
  description: 'Bridge Your Tokens to PolkaVM Asset Hub',
  generator: 'polkavm-tool',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Providers>
          <ChainInitNotification />
          {children}
          <Toaster />
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
