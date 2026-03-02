'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useDashboard } from '@/contexts/DashboardContext'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Search, CalendarCheck, CalendarPlus, Clock, Loader2, Phone } from 'lucide-react'
import { toast } from 'sonner'
import {
  getSewadars,
  getAttendance,
  getRoster,
  logAttendance,
  logRoster,
} from '@/app/actions/admin'
import { RegisterVolunteerModal } from '@/app/dashboard/volunteers/components/RegisterVolunteerModal'

const SEWA_AREA_OPTIONS = ['Trainer', 'Promoter', 'Both']
const AVAILABILITY_OPTIONS = ['Available', 'Tentative', 'Unavailable']

const ROLE_BADGE_CLASSES = {
  admin: 'shrink-0 text-[10px] bg-red-100 text-red-800 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
  moderator: 'shrink-0 text-[10px] bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  volunteer: 'shrink-0 text-[10px] bg-green-100 text-green-800 border border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800',
}

function getInitials(name) {
  if (!name || typeof name !== 'string') return '?'
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

function getDefaultTime() {
  const d = new Date()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10)
}

// ─── Volunteer Row Card (horizontal list item, Access-tab style) ──────────────
function VolunteerRowCard({ volunteer, onDetails, onMarkAttendance }) {
  const role = (volunteer.system_role || 'volunteer').toLowerCase()
  const roleLabel = role === 'admin' ? 'Admin' : role === 'moderator' ? 'Moderator' : 'Volunteer'
  const badgeClass = ROLE_BADGE_CLASSES[role] ?? ROLE_BADGE_CLASSES.volunteer

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-row flex-wrap items-center justify-between gap-4 p-4 sm:flex-nowrap">
          {/* Left: Identity */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar className="h-11 w-11 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {getInitials(volunteer.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground truncate">
                {volunteer.full_name || 'Unnamed'}
              </p>
              <p className="mt-0.5 hidden text-sm text-muted-foreground truncate sm:block" title={volunteer.email || ''}>
                {volunteer.email || '—'}
              </p>
            </div>
          </div>

          {/* Middle: Contact & Role */}
          <div className="flex shrink-0 flex-wrap items-center gap-3 sm:flex-nowrap">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <a href={volunteer.phone ? `tel:${volunteer.phone}` : undefined} className={volunteer.phone ? 'text-foreground hover:underline' : 'text-muted-foreground'}>
                {volunteer.phone || '—'}
              </a>
            </div>
            <Badge className={badgeClass}>{roleLabel}</Badge>
          </div>

          {/* Right: Actions */}
          <div className="flex shrink-0 items-center gap-1">
            {onMarkAttendance && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onMarkAttendance(volunteer.id)}
                title="Mark Attendance"
              >
                <CalendarCheck className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => onDetails?.(volunteer)}
            >
              Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SewadarsPage() {
  const { hasPermission } = useDashboard()
  const canViewAll = hasPermission('sewadars:view')

  const [sewadars, setSewadars] = useState([])
  const [attendance, setAttendance] = useState([])
  const [roster, setRoster] = useState([])
  const [search, setSearch] = useState('')
  const [registerOpen, setRegisterOpen] = useState(false)
  const [attendanceOpen, setAttendanceOpen] = useState(false)
  const [rosterOpen, setRosterOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [attendanceDateFilter, setAttendanceDateFilter] = useState(getTodayDateString())

  const loadData = useCallback(async () => {
    setLoading(true)
    const [sewRes, attRes, rosRes] = await Promise.all([
      getSewadars(),
      getAttendance(),
      getRoster(),
    ])
    if (sewRes.data) setSewadars(sewRes.data)
    if (attRes.data) setAttendance(attRes.data)
    if (rosRes.data) setRoster(rosRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const [attendanceForm, setAttendanceForm] = useState({
    sewadar_id: '',
    time_of_sewa: getDefaultTime(),
    sewa_area: 'Trainer',
  })

  const [rosterForm, setRosterForm] = useState({
    sewadar_id: '',
    planned_date: '',
    event_remarks: '',
    availability_status: 'Available',
  })

  const sewadarById = Object.fromEntries(sewadars.map((s) => [s.id, s]))

  const filteredSewadars = useMemo(
    () =>
      sewadars.filter(
        (s) =>
          s.full_name.toLowerCase().includes(search.toLowerCase()) ||
          (s.email && s.email.toLowerCase().includes(search.toLowerCase()))
      ),
    [sewadars, search]
  )

  const filteredAttendance = useMemo(
    () => attendance.filter((a) => a.date === attendanceDateFilter),
    [attendance, attendanceDateFilter]
  )

  const trainerCount = sewadars.filter((s) => s.sewa_type === 'Trainer' || s.sewa_type === 'Both').length
  const promoterCount = sewadars.filter((s) => s.sewa_type === 'Promoter' || s.sewa_type === 'Both').length

  const openAttendanceDialog = (sewadarId = null) => {
    setAttendanceForm({
      sewadar_id: sewadarId || '',
      time_of_sewa: getDefaultTime(),
      sewa_area: 'Trainer',
    })
    setAttendanceOpen(true)
  }

  const closeAttendanceDialog = () => {
    setAttendanceOpen(false)
  }

  const handleAttendanceSubmit = async (e) => {
    e.preventDefault()
    const sewadar = sewadarById[attendanceForm.sewadar_id]
    if (!sewadar) return
    setSubmitting(true)
    const res = await logAttendance({
      sewadar_id: attendanceForm.sewadar_id,
      date: attendanceDateFilter,
      time_of_sewa: attendanceForm.time_of_sewa,
      sewa_area: attendanceForm.sewa_area,
    })
    setSubmitting(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    setAttendanceForm({ sewadar_id: '', time_of_sewa: getDefaultTime(), sewa_area: 'Trainer' })
    closeAttendanceDialog()
    toast.success('Attendance marked successfully')
    const attRes = await getAttendance()
    if (attRes.data) setAttendance(attRes.data)
  }

  const handleRosterSubmit = async (e) => {
    e.preventDefault()
    const sewadar = sewadarById[rosterForm.sewadar_id]
    if (!sewadar || !rosterForm.planned_date) return
    setSubmitting(true)
    const res = await logRoster({
      sewadar_id: rosterForm.sewadar_id,
      planned_date: rosterForm.planned_date,
      event_remarks: rosterForm.event_remarks || '',
      availability_status: rosterForm.availability_status,
    })
    setSubmitting(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    setRosterForm({ sewadar_id: '', planned_date: '', event_remarks: '', availability_status: 'Available' })
    setRosterOpen(false)
    toast.success('Availability logged successfully')
    const rosRes = await getRoster()
    if (rosRes.data) setRoster(rosRes.data)
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg font-bold">Volunteers</h1>
        <Button onClick={() => setRegisterOpen(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Register Volunteer
        </Button>
        <RegisterVolunteerModal
          open={registerOpen}
          onOpenChange={setRegisterOpen}
          prefill={null}
          onSuccess={loadData}
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto py-2 px-3 rounded-md bg-muted/50 text-muted-foreground text-sm min-h-[2.5rem] shrink-0 no-scrollbar">
        <span className="shrink-0">Total: {sewadars.length}</span>
        <span className="shrink-0 text-muted-foreground/60" aria-hidden>|</span>
        <span className="shrink-0">Trainers: {trainerCount}</span>
        <span className="shrink-0 text-muted-foreground/60" aria-hidden>|</span>
        <span className="shrink-0">Promoters: {promoterCount}</span>
      </div>

      <Tabs defaultValue="directory" className="space-y-3">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="attendance">Daily Attendance</TabsTrigger>
          <TabsTrigger value="roster">Upcoming Roster</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-4">
          {!canViewAll ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <p className="font-medium">Restricted Access</p>
                <p className="text-sm mt-1">You do not have permission to view the volunteer directory.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {filteredSewadars.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    No volunteers match your search.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredSewadars.map((s) => (
                    <VolunteerRowCard
                      key={s.id}
                      volunteer={s}
                      onMarkAttendance={openAttendanceDialog}
                      onDetails={undefined}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="attendance-date" className="text-sm whitespace-nowrap">
                Date
              </Label>
              <Input
                id="attendance-date"
                type="date"
                value={attendanceDateFilter}
                onChange={(e) => setAttendanceDateFilter(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <Button size="sm" className="gap-1.5 w-fit" onClick={() => openAttendanceDialog()}>
              <Clock className="h-4 w-4" />
              Mark Attendance
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sewadar</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Sewa Area</TableHead>
                  <TableHead>Sewa Performed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No attendance recorded for this date.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAttendance.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.sewadar_name}</TableCell>
                      <TableCell className="text-xs">
                        {sewadarById[a.sewadar_id]?.email ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{a.date}</Badge>
                      </TableCell>
                      <TableCell>{a.time_of_sewa ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{a.sewa_area ?? '—'}</Badge>
                      </TableCell>
                      <TableCell>{a.sewa_performed}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="roster" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => setRosterOpen(true)}>
              <CalendarPlus className="h-4 w-4" />
              Log Availability
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sewadar</TableHead>
                  <TableHead>Planned Date</TableHead>
                  <TableHead>Event / Remarks</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.sewadar_name}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.planned_date}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {r.event_remarks || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={r.availability_status === 'Unavailable' ? 'destructive' : 'secondary'}
                        className={
                          r.availability_status === 'Available'
                            ? 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30'
                            : r.availability_status === 'Tentative'
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                              : undefined
                        }
                      >
                        {r.availability_status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Mark Attendance Dialog */}
      <Dialog open={attendanceOpen} onOpenChange={(open) => !open && closeAttendanceDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Attendance</DialogTitle>
            <DialogDescription>Record daily sewa attendance for a sewadar.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAttendanceSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Sewadar</Label>
              <Select
                value={attendanceForm.sewadar_id}
                onValueChange={(v) => setAttendanceForm((prev) => ({ ...prev, sewadar_id: v }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sewadar" />
                </SelectTrigger>
                <SelectContent>
                  {sewadars.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name} ({s.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time_of_sewa">Time of Sewa</Label>
              <Input
                id="time_of_sewa"
                type="time"
                value={attendanceForm.time_of_sewa}
                onChange={(e) => setAttendanceForm((prev) => ({ ...prev, time_of_sewa: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Sewa Area</Label>
              <Select
                value={attendanceForm.sewa_area}
                onValueChange={(v) => setAttendanceForm((prev) => ({ ...prev, sewa_area: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEWA_AREA_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeAttendanceDialog} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Log Availability Dialog */}
      <Dialog open={rosterOpen} onOpenChange={setRosterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Availability</DialogTitle>
            <DialogDescription>Record upcoming availability for a sewadar.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRosterSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Sewadar</Label>
              <Select
                value={rosterForm.sewadar_id}
                onValueChange={(v) => setRosterForm((prev) => ({ ...prev, sewadar_id: v }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sewadar" />
                </SelectTrigger>
                <SelectContent>
                  {sewadars.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name} ({s.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="planned_date">Upcoming Date</Label>
              <Input
                id="planned_date"
                type="date"
                value={rosterForm.planned_date}
                onChange={(e) => setRosterForm((prev) => ({ ...prev, planned_date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_remarks">Event / Remarks (Optional)</Label>
              <Input
                id="event_remarks"
                value={rosterForm.event_remarks}
                onChange={(e) => setRosterForm((prev) => ({ ...prev, event_remarks: e.target.value }))}
                placeholder="e.g. Module 1 training, general week"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={rosterForm.availability_status}
                onValueChange={(v) => setRosterForm((prev) => ({ ...prev, availability_status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABILITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRosterOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
