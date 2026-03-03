'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Legacy route: redirect to /dashboard/volunteers (Volunteers tab).
 */
export default function SewadarsRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/volunteers')
  }, [router])
  return null
}
