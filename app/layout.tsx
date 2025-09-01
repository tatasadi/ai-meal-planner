import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "react-hot-toast"
import { CriticalErrorBoundary } from "@/components/error/error-boundary"
import { AuthProvider } from "@/components/auth/auth-provider"
import { Header } from "@/components/layout/header"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "AI Meal Planner",
  description: "Create personalized meal plans based on your health data",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="min-h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-full`}
      >
        <AuthProvider>
          <CriticalErrorBoundary>
            <Header />
            {children}
          </CriticalErrorBoundary>
        </AuthProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
