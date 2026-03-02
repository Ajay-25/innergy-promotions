'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Calendar, MapPin, Clock, Users, Camera, Upload, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { getEvent, getEventAttendance, updateEventAttendance } from '@/app/actions/events'

function getModuleBadgeClass(moduleType) {
  if (moduleType === 'Module 1') return 'bg-blue-500/15 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-800'
  if (moduleType === 'Module 2') return 'bg-purple-500/15 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-800'
  return 'bg-green-500/15 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-800'
}

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id
  const [event, setEvent] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    if (!eventId) return
    setLoading(true)
    const [evRes, attRes] = await Promise.all([
      getEvent(eventId),
      getEventAttendance(eventId),
    ])
    if (evRes.data) setEvent(evRes.data)
    if (attRes.data) setAttendance(attRes.data)
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    loadData()
  }, [loadData])

  function handleStatusChange(id, value) {
    setAttendance((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: value } : a))
    )
  }

  async function handleSaveAttendance() {
    setSaving(true)
    try {
      for (const row of attendance) {
        await updateEventAttendance(row.id, { status: row.status })
      }
      toast.success('Attendance saved')
    } catch {
      toast.error('Failed to save attendance')
    }
    setSaving(false)
  }

  function handleUploadPhoto() {
    toast.info('Photo upload coming soon')
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="p-4 space-y-6">
        <Button variant="ghost" onClick={() => router.push('/dashboard/events')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Event not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      <Button variant="ghost" onClick={() => router.push('/dashboard/events')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CardTitle className="text-xl">{event.title}</CardTitle>
            <Badge className={getModuleBadgeClass(event.module_type)}>
              {event.module_type}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              {event.event_date}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              {event.timing}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              {event.venue}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 shrink-0" />
              <span>
                <strong>Trainers:</strong> {(event.trainer_ids ?? []).length} assigned
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 shrink-0" />
              <span>
                <strong>Support Sewadars:</strong> {(event.support_sewadar_ids ?? []).length} assigned
              </span>
            </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-2">Golden Member Attendance</h2>
        <Separator className="mb-4" />
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No attendance recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                attendance.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.full_name}</TableCell>
                    <TableCell>{row.contact_no}</TableCell>
                    <TableCell>{row.module_attended ?? '—'}</TableCell>
                    <TableCell>
                      <Select
                        value={row.status}
                        onValueChange={(v) => handleStatusChange(row.id, v)}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Present">Present</SelectItem>
                          <SelectItem value="Absent">Absent</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <Button className="mt-4" onClick={handleSaveAttendance} disabled={saving || attendance.length === 0}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Attendance
        </Button>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Event Photos</h2>
        <Separator className="mb-4" />
        <div className="flex flex-col items-center justify-center aspect-video rounded-lg bg-muted border border-dashed p-6">
          <Camera className="h-12 w-12 text-muted-foreground mb-2" />
          <span className="text-sm text-muted-foreground text-center">
            Photo upload coming soon
          </span>
        </div>
        <Button variant="outline" className="mt-4" onClick={handleUploadPhoto}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Photo
        </Button>
      </div>
    </div>
  )
}
