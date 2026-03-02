'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  User,
  Users,
  Smartphone,
  Calendar,
  ShieldCheck,
} from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'

const NAV_ITEMS = [
  {
    label: 'Profile',
    href: '/dashboard/profile',
    icon: User,
    requiredPermission: null,
  },
  {
    label: 'Volunteers',
    href: '/dashboard/sewadars',
    icon: Users,
    requiredPermission: 'sewadars:view',
  },
  {
    label: 'Promotions',
    href: '/dashboard/promotions',
    icon: Smartphone,
    requiredPermission: 'promotions:view',
  },
  {
    label: 'Events',
    href: '/dashboard/events',
    icon: Calendar,
    requiredPermission: 'events:view',
  },
  {
    label: 'Access',
    href: '/dashboard/admin/access',
    icon: ShieldCheck,
    requiredPermission: 'system:manage_access',
  },
]

export function BottomNav() {
  const pathname = usePathname()
  const { hasPermission } = useDashboard()

  const visibleItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      if (!item.requiredPermission) return true
      return hasPermission(item.requiredPermission)
    })
  }, [hasPermission])

  if (visibleItems.length === 0) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
      <div className="max-w-2xl mx-auto">
        <div className="flex overflow-x-auto no-scrollbar">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + '/')

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 min-w-[4.5rem] flex-1 transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] font-medium leading-none">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
