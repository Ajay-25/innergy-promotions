'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
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
import { Plus, Search, CalendarCheck, CalendarPlus, Clock, Loader2, Phone, Pencil, X } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  getSewadars,
  getAttendance,
  getRoster,
  logAttendance,
  logRoster,
  updateAttendance,
} from '@/app/actions/admin'
import { RegisterVolunteerModal } from '@/app/dashboard/volunteers/components/RegisterVolunteerModal'
import { VolunteerDetailSheet } from '@/app/dashboard/volunteers/components/VolunteerDetailSheet'

const SEWA_AREA_OPTIONS = ['Trainer', 'Promotion', 'Both']
const AVAILABILITY_OPTIONS = ['Available', 'Tentative', 'Unavailable']
const WEEKDAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_TO_SHORT = { Monday: 'M', Tuesday: 'Tu', Wednesday: 'W', Thursday: 'Th', Friday: 'F', Saturday: 'Sa' }

function formatRoutineBadge(weeklyRoutine) {
  if (!Array.isArray(weeklyRoutine) || weeklyRoutine.length === 0) return '—'
  return weeklyRoutine.map((d) => DAY_TO_SHORT[d] || d.slice(0, 2)).join(' | ')
}

function formatShortDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function getCurrentWeekStartLabel() {
  const d = new Date()
  const day = d.getDay()
  const daysToMonday = day === 0 ? 6 : day - 1
  const monday = new Date(d)
  monday.setDate(d.getDate() - daysToMonday)
  return monday.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
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

function getNextSundayDateString() {
  const d = new Date()
  const day = d.getDay()
  const daysUntilSunday = day === 0 ? 7 : 7 - day
  d.setDate(d.getDate() + daysUntilSunday)
  return d.toISOString().slice(0, 10)
}

function formatDate(d) {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Volunteer Row Card (identity left, actions right on all breakpoints) ─────
function VolunteerRowCard({ volunteer, onDetails, onMarkAttendance }) {
  return (
    <Card className="overflow-visible">
      <CardContent className="p-0">
        {/* Single row: identity (avatar + name/email/phone) left, Details + Mark Attendance right. */}
        <div className="flex flex-row flex-nowrap items-center justify-between gap-3 p-4">
          {/* Identity + contact: name, email, phone stack vertically; takes remaining space */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar className="h-11 w-11 shrink-0 flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {getInitials(volunteer.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground break-words">
                {volunteer.full_name || 'Unnamed'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground break-all sm:mt-0.5" title={volunteer.email || ''}>
                {volunteer.email || '—'}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground sm:mt-0">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <a href={volunteer.phone ? `tel:${volunteer.phone}` : undefined} className={volunteer.phone ? 'text-foreground hover:underline break-all' : 'text-muted-foreground'}>
                  {volunteer.phone || '—'}
                </a>
              </p>
            </div>
          </div>

          {/* Actions: always on the right (Details + Mark Attendance icon) */}
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

export default function VolunteersPage() {
  const { hasPermission } = useDashboard()
  const canViewAll = hasPermission('sewadars:view')
  const canMarkAttendance = hasPermission('sewadars:mark_attendance')
  const canEditAttendance = hasPermission('sewadars:edit_attendance')
  const canCreateOrEditAttendance = canMarkAttendance || canEditAttendance

  const [sewadars, setSewadars] = useState([])
  const [attendance, setAttendance] = useState([])
  const [roster, setRoster] = useState([])
  const [rosterNextSunday, setRosterNextSunday] = useState('')
  const [search, setSearch] = useState('')
  const [registerOpen, setRegisterOpen] = useState(false)
  const [attendanceOpen, setAttendanceOpen] = useState(false)
  const [rosterOpen, setRosterOpen] = useState(false)
  const searchParams = useSearchParams()
  const [detailVolunteerId, setDetailVolunteerId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const volunteerId = searchParams.get('volunteerId')
    if (volunteerId) setDetailVolunteerId(volunteerId)
  }, [searchParams])
  const [submitting, setSubmitting] = useState(false)

  const [attendanceDateFilter, setAttendanceDateFilter] = useState(getTodayDateString())
  const [currentUserSewadarId, setCurrentUserSewadarId] = useState(null)
  const [attendanceEditOpen, setAttendanceEditOpen] = useState(false)
  const [attendanceEditRecord, setAttendanceEditRecord] = useState(null)
  const [attendanceEditForm, setAttendanceEditForm] = useState({
    date: '',
    time_of_sewa: getDefaultTime(),
    sewa_area: 'Trainer',
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    const [sewRes, attRes, rosRes] = await Promise.all([
      getSewadars(),
      getAttendance(),
      getRoster(),
    ])
    if (sewRes.data) setSewadars(sewRes.data)
    if (attRes.data) setAttendance(attRes.data)
    if (attRes.current_user_sewadar_id != null) setCurrentUserSewadarId(attRes.current_user_sewadar_id)
    if (rosRes.data) setRoster(rosRes.data)
    if (rosRes.nextSunday) setRosterNextSunday(rosRes.nextSunday)
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
    specific_date: '',
    is_available_on_date: true,
    event_remarks: '',
    weekly_routine: [],
  })

  const sewadarById = Object.fromEntries(sewadars.map((s) => [s.id, s]))

  useEffect(() => {
    if (rosterOpen) {
      const nextSun = rosterNextSunday || getNextSundayDateString()
      setRosterForm((prev) => ({ ...prev, specific_date: nextSun }))
    }
  }, [rosterOpen, rosterNextSunday])

  useEffect(() => {
    if (!rosterForm.sewadar_id || !roster.length || !rosterNextSunday) return
    const entry = roster.find((r) => r.sewadar_id === rosterForm.sewadar_id)
    if (!entry) return
    const forDate = entry.specific_entries?.find((e) => e.planned_date === rosterNextSunday)
    setRosterForm((prev) => ({
      ...prev,
      specific_date: rosterNextSunday,
      is_available_on_date: forDate ? forDate.is_available_on_date : true,
      weekly_routine: Array.isArray(entry.weekly_routine) ? [...entry.weekly_routine] : [],
    }))
  }, [rosterForm.sewadar_id, roster, rosterNextSunday])

  const toggleRosterWeekday = (day) => {
    setRosterForm((prev) => {
      const next = prev.weekly_routine.includes(day)
        ? prev.weekly_routine.filter((d) => d !== day)
        : [...prev.weekly_routine, day]
      return { ...prev, weekly_routine: next }
    })
  }

  const filteredSewadars = useMemo(
    () =>
      sewadars.filter(
        (s) =>
          (s.full_name && s.full_name.toLowerCase().includes(search.toLowerCase())) ||
          (s.email && s.email.toLowerCase().includes(search.toLowerCase()))
      ),
    [sewadars, search]
  )

  const filteredAttendance = useMemo(
    () => attendance.filter((a) => a.date === attendanceDateFilter),
    [attendance, attendanceDateFilter]
  )

  const [rosterFilterConfig, setRosterFilterConfig] = useState({
    activeFilter: 'all',
    specificDay: '',
  })
  const [rosterSearch, setRosterSearch] = useState('')

  const filteredRoster = useMemo(() => {
    let list = roster

    if (rosterSearch.trim()) {
      const q = rosterSearch.toLowerCase().trim()
      list = list.filter(
        (r) =>
          (r.sewadar_name && r.sewadar_name.toLowerCase().includes(q)) ||
          (r.sewadar_id && String(r.sewadar_id).toLowerCase().includes(q))
      )
    }

    if (rosterFilterConfig.activeFilter !== 'all') {
      list = list.filter((r) => {
        const sundayEntry = r.specific_entries?.find((e) => e.planned_date === rosterNextSunday)
        switch (rosterFilterConfig.activeFilter) {
          case 'available_sunday':
            return sundayEntry != null && sundayEntry.is_available_on_date === true
          case 'unavailable_sunday':
            return sundayEntry != null && sundayEntry.is_available_on_date === false
          default:
            return true
        }
      })
    }

    if (rosterFilterConfig.specificDay) {
      list = list.filter((r) =>
        Array.isArray(r.weekly_routine) && r.weekly_routine.includes(rosterFilterConfig.specificDay)
      )
    }

    return list
  }, [roster, rosterFilterConfig, rosterNextSunday, rosterSearch])

  const trainerCount = sewadars.filter((s) => s.sewa_type === 'Trainer' || s.sewa_type === 'Both').length
  const promoterCount = sewadars.filter((s) => s.sewa_type === 'Promotion' || s.sewa_type === 'Both').length

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
    if (attRes.current_user_sewadar_id != null) setCurrentUserSewadarId(attRes.current_user_sewadar_id)
  }

  const canEditAttendanceRecord = (a) => {
    if (canEditAttendance) return true
    if (!a.marked_by || !currentUserSewadarId) return false
    return String(a.marked_by) === String(currentUserSewadarId)
  }

  const openAttendanceEdit = (a) => {
    setAttendanceEditRecord(a)
    setAttendanceEditForm({
      date: a.date || attendanceDateFilter,
      time_of_sewa: a.time_of_sewa || getDefaultTime(),
      sewa_area: a.sewa_area || 'Trainer',
    })
    setAttendanceEditOpen(true)
  }

  const closeAttendanceEdit = () => {
    setAttendanceEditOpen(false)
    setAttendanceEditRecord(null)
  }

  const handleAttendanceEditSubmit = async (e) => {
    e.preventDefault()
    if (!attendanceEditRecord) return
    setSubmitting(true)
    try {
      const res = await updateAttendance(attendanceEditRecord.id, {
        date: attendanceEditForm.date,
        time_of_sewa: attendanceEditForm.time_of_sewa,
        sewa_area: attendanceEditForm.sewa_area,
      })
      if (res.error) {
        toast.error(res.error)
        return
      }
      closeAttendanceEdit()
      toast.success('Attendance updated')
      const attRes = await getAttendance()
      if (attRes.data) setAttendance(attRes.data)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRosterSubmit = async (e) => {
    e.preventDefault()
    const sewadar = sewadarById[rosterForm.sewadar_id]
    if (!sewadar) return
    const hasSpecific = rosterForm.specific_date != null && rosterForm.specific_date !== ''
    const hasRoutine = Array.isArray(rosterForm.weekly_routine)
    if (!hasSpecific && !hasRoutine) {
      toast.error('Set at least upcoming Sunday availability or general weekdays.')
      return
    }
    setSubmitting(true)
    const res = await logRoster({
      sewadar_id: rosterForm.sewadar_id,
      specific_date: hasSpecific ? rosterForm.specific_date : undefined,
      is_available_on_date: rosterForm.is_available_on_date,
      event_remarks: rosterForm.event_remarks || '',
      weekly_routine: hasRoutine ? rosterForm.weekly_routine : undefined,
    })
    setSubmitting(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    setRosterForm({
      sewadar_id: '',
      specific_date: rosterNextSunday || '',
      is_available_on_date: true,
      event_remarks: '',
      weekly_routine: [],
    })
    setRosterOpen(false)
    toast.success('Availability saved')
    const rosRes = await getRoster()
    if (rosRes.data) setRoster(rosRes.data)
    if (rosRes.nextSunday) setRosterNextSunday(rosRes.nextSunday)
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
        <VolunteerDetailSheet
          volunteerId={detailVolunteerId}
          open={!!detailVolunteerId}
          onClose={() => setDetailVolunteerId(null)}
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
                      onMarkAttendance={canMarkAttendance ? openAttendanceDialog : undefined}
                      onDetails={(v) => setDetailVolunteerId(v?.id ?? null)}
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
            {canCreateOrEditAttendance && (
              <Button size="sm" className="gap-1.5 w-fit" onClick={() => openAttendanceDialog()}>
                <Clock className="h-4 w-4" />
                Mark Attendance
              </Button>
            )}
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Volunteer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Sewa Area</TableHead>
                  <TableHead>Sewa Performed</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
                      <TableCell className="text-right">
                        {canEditAttendanceRecord(a) ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              openAttendanceEdit(a)
                            }}
                            title="Edit attendance"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="roster" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>
                Next Sunday: <strong className="text-foreground">{rosterNextSunday ? formatShortDate(rosterNextSunday) : '—'}</strong>
              </span>
              <span className="text-muted-foreground/70">|</span>
              <span>
                Current week: <strong className="text-foreground">from {getCurrentWeekStartLabel()}</strong>
              </span>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setRosterOpen(true)}>
              <CalendarPlus className="h-4 w-4" />
              Add Availability
            </Button>
          </div>

          {/* Roster Toolbar: search (left) + filters (right) */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-[240px]">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search volunteers..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ToggleGroup
                type="single"
                value={rosterFilterConfig.activeFilter}
                onValueChange={(v) => v != null && setRosterFilterConfig((prev) => ({ ...prev, activeFilter: v }))}
                className="inline-flex rounded-md border p-0.5 bg-muted/30"
              >
                <ToggleGroupItem value="all" aria-label="All" className="px-3 text-xs data-[state=on]:bg-background">
                  All
                </ToggleGroupItem>
                <ToggleGroupItem value="available_sunday" aria-label="Available" className="px-3 text-xs data-[state=on]:bg-background">
                  Available
                </ToggleGroupItem>
                <ToggleGroupItem value="unavailable_sunday" aria-label="Unavailable" className="px-3 text-xs data-[state=on]:bg-background">
                  Unavailable
                </ToggleGroupItem>
              </ToggleGroup>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 min-w-[7rem] justify-between">
                    <span className="truncate">
                      {rosterFilterConfig.specificDay ? (
                        <>
                          Routine: {DAY_TO_SHORT[rosterFilterConfig.specificDay] ?? rosterFilterConfig.specificDay}
                          <button
                            type="button"
                            className="ml-1.5 inline-flex rounded p-0.5 hover:bg-muted"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setRosterFilterConfig((prev) => ({ ...prev, specificDay: '' }))
                            }}
                            aria-label="Clear day"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        'Routine Day'
                      )}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[8rem]">
                  {WEEKDAY_OPTIONS.map((day) => (
                    <DropdownMenuItem
                      key={day}
                      onClick={() => setRosterFilterConfig((prev) => ({ ...prev, specificDay: day }))}
                    >
                      {DAY_TO_SHORT[day]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Active filter badges (removable) */}
          {(rosterFilterConfig.activeFilter !== 'all' || rosterFilterConfig.specificDay) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {rosterFilterConfig.activeFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1 py-0.5 pl-2 pr-1 text-xs font-normal">
                  Sunday: {rosterFilterConfig.activeFilter === 'available_sunday' ? 'Available' : 'Unavailable'}
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-muted-foreground/20"
                    onClick={() => setRosterFilterConfig((prev) => ({ ...prev, activeFilter: 'all' }))}
                    aria-label="Clear"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {rosterFilterConfig.specificDay && (
                <Badge variant="secondary" className="gap-1 py-0.5 pl-2 pr-1 text-xs font-normal">
                  {rosterFilterConfig.specificDay}
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-muted-foreground/20"
                    onClick={() => setRosterFilterConfig((prev) => ({ ...prev, specificDay: '' }))}
                    aria-label="Clear"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Volunteer</TableHead>
                  <TableHead>Sunday Status</TableHead>
                  <TableHead>Routine</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No roster data yet. Add availability to see volunteers here.
                    </TableCell>
                  </TableRow>
                ) : filteredRoster.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No volunteers found for this filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRoster.map((r) => {
                    const sundayEntry = r.specific_entries?.find((e) => e.planned_date === rosterNextSunday)
                    const available = sundayEntry?.is_available_on_date
                    const sundayLabel =
                      sundayEntry == null
                        ? '—'
                        : available === true
                          ? `Available on ${formatShortDate(rosterNextSunday)}`
                          : available === false
                            ? `Unavailable on ${formatShortDate(rosterNextSunday)}`
                            : 'Not Responded'
                    return (
                      <TableRow key={r.sewadar_id}>
                        <TableCell className="font-medium">{r.sewadar_name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={available === false ? 'secondary' : 'outline'}
                            className={
                              available === true
                                ? 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30'
                                : available === null || available === undefined
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                                  : undefined
                            }
                          >
                            {sundayLabel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-muted-foreground">
                            {formatRoutineBadge(r.weekly_routine)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
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
            <DialogDescription>Record daily sewa attendance for a volunteer.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAttendanceSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Volunteer</Label>
              <Select
                value={attendanceForm.sewadar_id}
                onValueChange={(v) => setAttendanceForm((prev) => ({ ...prev, sewadar_id: v }))}
                required
                disabled={!canMarkAttendance}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select volunteer" />
                </SelectTrigger>
                <SelectContent>
                  {sewadars.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name || s.email || '—'} {s.email ? `(${s.email})` : ''}
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
              <Button type="submit" disabled={submitting || !canMarkAttendance}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Attendance Dialog */}
      <Dialog open={attendanceEditOpen} onOpenChange={(open) => !open && closeAttendanceEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Attendance</DialogTitle>
            <DialogDescription>
              {attendanceEditRecord ? (
                <>Update record for {attendanceEditRecord.sewadar_name}.</>
              ) : (
                'Update this attendance record.'
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAttendanceEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={attendanceEditForm.date}
                onChange={(e) => setAttendanceEditForm((prev) => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-time">Time of Sewa</Label>
              <Input
                id="edit-time"
                type="time"
                value={attendanceEditForm.time_of_sewa}
                onChange={(e) => setAttendanceEditForm((prev) => ({ ...prev, time_of_sewa: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Sewa Area</Label>
              <Select
                value={attendanceEditForm.sewa_area}
                onValueChange={(v) => setAttendanceEditForm((prev) => ({ ...prev, sewa_area: v }))}
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
              <Button type="button" variant="outline" onClick={closeAttendanceEdit} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Availability Dialog — Section A: upcoming Sunday; Section B: general weekdays */}
      <Dialog open={rosterOpen} onOpenChange={setRosterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Availability</DialogTitle>
            <DialogDescription>Set upcoming Sunday sewa and general weekday availability.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRosterSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Volunteer</Label>
              <Select
                value={rosterForm.sewadar_id}
                onValueChange={(v) => setRosterForm((prev) => ({ ...prev, sewadar_id: v }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select volunteer" />
                </SelectTrigger>
                <SelectContent>
                  {sewadars.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name || s.email || '—'} {s.email ? `(${s.email})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <h4 className="text-sm font-medium">Upcoming Event</h4>
              <p className="text-xs text-muted-foreground">Are you available for the upcoming Sunday sewa?</p>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  id="specific_date"
                  type="date"
                  value={rosterForm.specific_date}
                  onChange={(e) => setRosterForm((prev) => ({ ...prev, specific_date: e.target.value }))}
                  className="w-[160px]"
                />
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_available"
                    checked={rosterForm.is_available_on_date}
                    onCheckedChange={(v) => setRosterForm((prev) => ({ ...prev, is_available_on_date: v }))}
                  />
                  <Label htmlFor="is_available" className="cursor-pointer">
                    {rosterForm.is_available_on_date ? 'Yes' : 'No'}
                  </Label>
                </div>
              </div>
              <Input
                id="event_remarks"
                value={rosterForm.event_remarks}
                onChange={(e) => setRosterForm((prev) => ({ ...prev, event_remarks: e.target.value }))}
                placeholder="Remarks (optional)"
                className="max-w-sm"
              />
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <h4 className="text-sm font-medium">General Weekdays</h4>
              <p className="text-xs text-muted-foreground">When can you usually support?</p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_OPTIONS.map((day) => (
                  <Button
                    key={day}
                    type="button"
                    variant={rosterForm.weekly_routine.includes(day) ? 'default' : 'outline'}
                    size="sm"
                    className="min-w-[3rem]"
                    onClick={() => toggleRosterWeekday(day)}
                  >
                    {DAY_TO_SHORT[day]}
                  </Button>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRosterOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
