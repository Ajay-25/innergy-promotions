'use client'

import { useState, useEffect } from 'react'
import { useDashboard } from '@/contexts/DashboardContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

export default function QRPage() {
  const { user, profileCore } = useDashboard()
  const [QRCode, setQRCode] = useState(null)

  useEffect(() => {
    import('react-qr-code').then((mod) => setQRCode(() => mod.default || mod))
  }, [])

  return (
    <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-lg">My QR Code</CardTitle>
          <CardDescription>Show this for identification</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4 pb-6">
          <div className="bg-white p-4 rounded-xl shadow-inner">
            {QRCode && user?.id ? (
              <QRCode value={user.id} size={200} level="H" />
            ) : (
              <div className="w-[200px] h-[200px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg">
              {profileCore?.full_name || 'Volunteer'}
            </p>
            {(profileCore?.email || profileCore?.member_id) && (
              <Badge variant="secondary" className="mt-1">
                {profileCore?.email ?? profileCore?.member_id}
              </Badge>
            )}
            <p className="text-xs text-muted-foreground font-mono mt-2">
              {user?.id}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
