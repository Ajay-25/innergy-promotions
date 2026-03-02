'use client'

import { createContext, useContext, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useUser, useClerk } from '@clerk/nextjs'
import { syncUserPermissions } from '@/app/actions/auth'
import { hasPermission as checkPermission } from '@/lib/permissions'

const DashboardContext = createContext(null)

function mapClerkUserToContext(clerkUser) {
  if (!clerkUser) return null
  const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress ?? ''
  const permissions = Array.isArray(clerkUser.publicMetadata?.permissions)
    ? clerkUser.publicMetadata.permissions
    : []
  return {
    id: clerkUser.id,
    email: primaryEmail,
    full_name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || primaryEmail || 'User',
    photo_url: clerkUser.imageUrl ?? '',
    permissions,
  }
}

export function DashboardProvider({ children }) {
  const { user: clerkUser, isLoaded } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isLoaded || !clerkUser) return
    syncUserPermissions().catch(() => {})
  }, [isLoaded, clerkUser?.id])

  const user = useMemo(() => {
    if (!clerkUser) return null
    const permissions = Array.isArray(clerkUser.publicMetadata?.permissions)
      ? clerkUser.publicMetadata.permissions
      : []
    return {
      id: clerkUser.id,
      email: clerkUser.emailAddresses?.[0]?.emailAddress ?? '',
      user_metadata: {
        full_name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.emailAddresses?.[0]?.emailAddress || 'User',
      },
      permissions,
    }
  }, [clerkUser])

  const profileCore = useMemo(() => mapClerkUserToContext(clerkUser), [clerkUser])
  const permissions = profileCore?.permissions ?? user?.permissions ?? []
  const systemRole = (clerkUser?.publicMetadata?.role ?? 'volunteer').toLowerCase()
  const role = checkPermission(permissions, 'system:manage_access') ? 'admin' : 'standard'

  const hasPermission = useCallback(
    (requiredPermission) => checkPermission(permissions, requiredPermission),
    [permissions]
  )

  const handleLogout = useCallback(() => {
    signOut?.().then(() => router.push('/')).catch(() => router.push('/'))
  }, [router, signOut])

  const handleRetrySetup = useCallback(() => {}, [])

  const refreshProfile = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['my-profile'] })
    window.location.reload()
  }, [queryClient])

  const value = useMemo(
    () => ({
      session: user ? { user, access_token: 'clerk' } : null,
      user,
      role,
      systemRole,
      permissions,
      hasPermission,
      profileCore,
      profileData: {},
      isLoading: !isLoaded,
      profileLoading: false,
      needsSetup: false,
      handleLogout,
      handleRetrySetup,
      refreshProfile,
    }),
    [user, role, systemRole, permissions, hasPermission, profileCore, isLoaded, handleLogout, handleRetrySetup, refreshProfile]
  )

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider')
  }
  return context
}
