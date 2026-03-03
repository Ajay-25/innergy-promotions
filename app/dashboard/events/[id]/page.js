'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Calendar, MapPin, Clock, Users, Camera, Upload, Loader2, UserPlus, Phone, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { getEvent, getEventFullAttendanceList, setEventAttendanceStatus } from '@/app/actions/events'
import { upsertGoldenMember } from '@/app/actions/golden-members'
import { GoldenMemberForm } from '@/components/forms/GoldenMemberForm'
import { Switch } from '@/components/ui/switch'

const FILTER_CHIPS = [
  { value: 'all', label: 'All' },
  { value: 'confirmed', label: 'Confirmed (Interested)' },
  { value: 'present', label: 'Present' },
  { value: 'not_called', label: 'Not Called' },
]

function getModuleBadgeClass(moduleType) {
  if (moduleType === 'Module 1') return 'bg-blue-500/15 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-800'
  if (moduleType === 'Module 2') return 'bg-purple-500/15 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-800'
  return 'bg-green-500/15 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-800'
}

function CallStatusBadge({ status }) {
  const v = { pending: 'secondary', called: 'outline', no_answer: 'outline', interested: 'default', not_interested: 'destructive' }[status] || 'secondary'
  const label = status === 'interested' ? 'Confirmed' : (status?.replace(/_/g, ' ') ?? 'Pending')
  return <Badge variant={v}>{label}</Badge>
}

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id
  const [event, setEvent] = useState(null)
  const [fullList, setFullList] = useState([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [walkInSheetOpen, setWalkInSheetOpen] = useState(false)
  const [walkInSubmitting, setWalkInSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    if (!eventId) return
    setLoading(true)
    const [evRes, listRes] = await Promise.all([
      getEvent(eventId),
      getEventFullAttendanceList(eventId),
    ])
    if (evRes.data) setEvent(evRes.data)
    if (listRes.data) setFullList(listRes.data)
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredList = useMemo(() => {
    const q = search.toLowerCase().trim()
    return fullList.filter((row) => {
      const matchSearch = !q ||
        (row.name && row.name.toLowerCase().includes(q)) ||
        (row.phone && row.phone.includes(q))
      let matchFilter = true
      if (filter === 'confirmed') matchFilter = row.call_status === 'interested'
      if (filter === 'present') matchFilter = row.attendance_status === 'Present'
      if (filter === 'not_called') matchFilter = row.call_status === 'pending'
      return matchSearch && matchFilter
    })
  }, [fullList, search, filter])

  async function handleAttendanceToggle(memberId, checked) {
    setTogglingId(memberId)
    const status = checked ? 'Present' : 'Absent'
    const result = await setEventAttendanceStatus(eventId, memberId, status)
    setTogglingId(null)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success(checked ? 'Marked Present' : 'Marked Absent')
    loadData()
  }

  function handleUploadPhoto() {
    toast.info('Photo upload coming soon')
  }

  async function handleRegisterWalkIn(data) {
    setWalkInSubmitting(true)
    const result = await upsertGoldenMember(data, eventId)
    setWalkInSubmitting(false)
    if (result?.error) return { error: result.error }
    toast.success('Member registered and marked Present')
    loadData()
    return {}
  }

  if (loading && !event) {
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
            <span><strong>Trainers:</strong> {(event.trainer_ids ?? []).length} assigned</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 shrink-0" />
            <span><strong>Support Volunteers:</strong> {(event.support_sewadar_ids ?? []).length} assigned</span>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-2">Golden Member Attendance</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Full CRM list for this event. Toggle Present to mark attendance.
        </p>
        <Separator className="mb-4" />

        <div className="flex flex-wrap gap-3 items-center mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTER_CHIPS.map((chip) => (
              <Button
                key={chip.value}
                variant={filter === chip.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(chip.value)}
              >
                {chip.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Call Status</TableHead>
                <TableHead className="w-[100px]">Present</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    {fullList.length === 0 ? 'No Golden Members in CRM yet.' : 'No members match your filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredList.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.phone}</TableCell>
                    <TableCell>
                      <CallStatusBadge status={row.call_status} />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={row.attendance_status === 'Present'}
                        onCheckedChange={(checked) => handleAttendanceToggle(row.id, checked)}
                        disabled={togglingId === row.id}
                      />
                      {togglingId === row.id && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setWalkInSheetOpen(true)} className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            Register Walk-in
          </Button>
          <Button variant="outline" onClick={() => router.push(`/dashboard/events/${eventId}/outreach`)} className="gap-1.5">
            <Phone className="h-4 w-4" />
            Outreach (Calling)
          </Button>
        </div>
      </div>

      <Sheet open={walkInSheetOpen} onOpenChange={setWalkInSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Register Walk-in</SheetTitle>
          </SheetHeader>
          <div className="pt-4">
            <GoldenMemberForm
              onSubmit={handleRegisterWalkIn}
              onSuccess={() => setWalkInSheetOpen(false)}
              isSubmitting={walkInSubmitting}
              submitLabel="Register & Mark Present"
            />
          </div>
        </SheetContent>
      </Sheet>

      <div>
        <h2 className="text-lg font-semibold mb-2">Event Photos</h2>
        <Separator className="mb-4" />
        <div className="flex flex-col items-center justify-center aspect-video rounded-lg bg-muted border border-dashed p-6">
          <Camera className="h-12 w-12 text-muted-foreground mb-2" />
          <span className="text-sm text-muted-foreground text-center">Photo upload coming soon</span>
        </div>
        <Button variant="outline" className="mt-4" onClick={handleUploadPhoto}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Photo
        </Button>
      </div>
    </div>
  )
}
