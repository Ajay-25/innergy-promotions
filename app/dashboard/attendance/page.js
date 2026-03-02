'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ClipboardCheck } from 'lucide-react'

export default function AttendancePage() {
  return (
    <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
            <ClipboardCheck className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-lg">Attendance</CardTitle>
          <CardDescription>
            Mark and track volunteer attendance for events and sewa sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            This module is coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
