'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { DashboardProvider, useDashboard } from '@/contexts/DashboardContext'
import { getOnboardingStatus } from '@/app/actions/onboarding'
import { BottomNav } from '@/components/dashboard/BottomNav'
import { canAccessRoute } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Shield, LogOut, Loader2, AlertTriangle,
  CheckCircle2, FileText,
} from 'lucide-react'
import { toast } from 'sonner'

function SetupView({ onRetry }) {
  const [copied, setCopied] = useState(false)
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const copySQL = async () => {
    try {
      const res = await fetch('/innergy_schema.sql')
      const sql = await res.text().catch(() => '-- Run drizzle-kit generate && drizzle-kit push, or paste innergy_schema.sql in Neon Console')
      await navigator.clipboard.writeText(sql || '-- See db/schema.js and innergy_schema.sql')
      setCopied(true)
      toast.success('SQL copied!')
      setTimeout(() => setCopied(false), 3000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-2">
            <AlertTriangle className="h-7 w-7 text-amber-600" />
          </div>
          <CardTitle>Database Setup Required</CardTitle>
          <CardDescription>Complete these steps to get started</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">1</div>
              <h3 className="font-semibold text-sm">Run SQL Setup Script</h3>
            </div>
            <p className="text-xs text-muted-foreground ml-8">
              Run <strong>innergy_schema.sql</strong> in your Neon SQL console, or use <strong>drizzle-kit push</strong> from db/schema.js.
            </p>
            <div className="ml-8">
              <Button onClick={copySQL} variant="outline" size="sm" className="gap-1.5">
                {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy SQL Script'}
              </Button>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">2</div>
              <h3 className="font-semibold text-sm">Configure Clerk</h3>
            </div>
            <div className="text-xs text-muted-foreground ml-8 space-y-1">
              <p>In <strong>Clerk Dashboard &gt; Paths</strong>, set redirect URLs as needed.</p>
              <p><strong>Site URL</strong>: <code className="bg-muted px-1 rounded break-all">{siteUrl}</code></p>
              <p><strong>Sign-in redirect</strong>: <code className="bg-muted px-1 rounded break-all">{siteUrl}/dashboard</code></p>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">3</div>
              <h3 className="font-semibold text-sm">Set Admin Role</h3>
            </div>
            <p className="text-xs text-muted-foreground ml-8">In Clerk Dashboard, set user <strong>Public metadata</strong> <code className="bg-muted px-1 rounded">role: &quot;admin&quot;</code> for your account.</p>
          </div>
          <Button onClick={onRetry} className="w-full mt-4">
            I&apos;ve completed the setup — Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function PendingApprovalView() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
      <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-6">
        <h1 className="text-lg font-semibold text-foreground mb-2">Welcome!</h1>
        <p className="text-sm text-muted-foreground">
          Your account is pending approval. An administrator will assign your access shortly.
        </p>
      </div>
    </div>
  )
}

function DashboardShell({ children }) {
  const {
    user,
    role,
    permissions,
    profileCore,
    isLoading,
    needsSetup,
    handleLogout,
    handleRetrySetup,
  } = useDashboard()
  const pathname = usePathname()
  const router = useRouter()
  const lastDeniedRef = useRef('')
  const [systemRoleFromDb, setSystemRoleFromDb] = useState(null)

  useEffect(() => {
    if (isLoading || needsSetup) return

    let cancelled = false
    getOnboardingStatus()
      .then(({ shouldRedirectToOnboarding, systemRole }) => {
        if (cancelled) return
        if (shouldRedirectToOnboarding) {
          router.replace('/onboarding')
          return
        }
        setSystemRoleFromDb(systemRole)
        const userCtx = { role, permissions: permissions ?? [] }
        if (!canAccessRoute(userCtx, pathname)) {
          if (lastDeniedRef.current !== pathname) {
            lastDeniedRef.current = pathname
            toast.error('Permission Denied', {
              description: 'You don\u2019t have access to this section.',
            })
          }
          router.replace('/dashboard/profile')
        }
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [pathname, role, permissions, isLoading, needsSetup, router])

  if (systemRoleFromDb === 'pending') {
    return <PendingApprovalView />
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (needsSetup) {
    return <SetupView onRetry={handleRetrySetup} />
  }

  const isAdmin = role === 'admin'

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-none">Innergy Promotions</h1>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                {profileCore?.full_name || user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isAdmin ? 'default' : 'secondary'} className="text-[10px]">
              {role}
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      <BottomNav />
    </div>
  )
}

export default function DashboardLayout({ children }) {
  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  )
}
