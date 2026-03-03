'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Phone, Search, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { getEvent } from '@/app/actions/events'
import { getEventOutreachList, logOutreachResult } from '@/app/actions/outreach'

const CALL_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'called', label: 'Called' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not Interested' },
]

const MODULE_OPTIONS = [
  { value: 'module_1', label: 'Module 1' },
  { value: 'module_2', label: 'Module 2' },
  { value: 'both', label: 'Both' },
]

function CallStatusBadge({ status }) {
  const variant = {
    pending: 'secondary',
    called: 'outline',
    no_answer: 'outline',
    interested: 'default',
    not_interested: 'destructive',
  }[status] || 'secondary'
  const label = CALL_STATUSES.find((s) => s.value === status)?.label ?? status
  return <Badge variant={variant}>{label}</Badge>
}

export default function EventOutreachPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id
  const [event, setEvent] = useState(null)
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [zoneFilter, setZoneFilter] = useState('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [saving, setSaving] = useState(false)
  const [drawerCallStatus, setDrawerCallStatus] = useState('pending')
  const [drawerAvailableModule1, setDrawerAvailableModule1] = useState(false)
  const [drawerAvailableModule2, setDrawerAvailableModule2] = useState(false)
  const [drawerNotes, setDrawerNotes] = useState('')

  const loadData = useCallback(async () => {
    if (!eventId) return null
    setLoading(true)
    const [evRes, listRes] = await Promise.all([
      getEvent(eventId),
      getEventOutreachList(eventId),
    ])
    if (evRes.data) setEvent(evRes.data)
    const nextList = listRes.data ?? []
    setList(nextList)
    setLoading(false)
    return nextList
  }, [eventId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const zoneOptions = useMemo(() => {
    const zones = [...new Set(list.map((m) => m.zone).filter(Boolean))].sort()
    return ['all', ...zones]
  }, [list])

  const filteredList = useMemo(() => {
    const q = search.toLowerCase().trim()
    return list.filter((m) => {
      const matchSearch = !q ||
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.phone && m.phone.includes(q))
      const matchStatus = statusFilter === 'all' || m.call_status === statusFilter
      const matchZone = zoneFilter === 'all' || m.zone === zoneFilter
      return matchSearch && matchStatus && matchZone
    })
  }, [list, search, statusFilter, zoneFilter])

  function openDrawer(member) {
    setSelectedMember(member)
    setDrawerCallStatus(member.call_status)
    const mod = member.training_module
    setDrawerAvailableModule1(mod === 'module_1' || mod === 'both')
    setDrawerAvailableModule2(mod === 'module_2' || mod === 'both')
    setDrawerNotes(member.notes || '')
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setSelectedMember(null)
  }

  async function handleSaveAndNext() {
    if (!selectedMember || !eventId) return
    setSaving(true)
    const result = await logOutreachResult({
      event_id: eventId,
      member_id: selectedMember.id,
      call_status: drawerCallStatus,
      available_module_1: drawerAvailableModule1,
      available_module_2: drawerAvailableModule2,
      notes: drawerNotes.trim(),
    })
    setSaving(false)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('Call logged')
    const currentIdx = filteredList.findIndex((m) => m.id === selectedMember.id)
    closeDrawer()
    const nextList = await loadData()
    const nextIdx = currentIdx >= 0 && currentIdx < filteredList.length - 1 ? currentIdx + 1 : -1
    if (nextIdx >= 0 && nextList?.length) {
      const nextId = filteredList[nextIdx]?.id
      const nextMember = nextList.find((m) => m.id === nextId)
      if (nextMember) setTimeout(() => openDrawer(nextMember), 150)
    }
  }

  if (loading && list.length === 0) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="p-4 space-y-4">
        <Button variant="ghost" onClick={() => router.push(`/dashboard/events/${eventId}`)}>
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
    <div className="p-4 space-y-4">
      <Button variant="ghost" onClick={() => router.push(`/dashboard/events/${eventId}`)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Event
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Outreach: {event.title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Call Golden Members and track availability for this event. Click a row to log a call.
          </p>
        </CardHeader>
      </Card>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Call status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {CALL_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Zone" />
          </SelectTrigger>
          <SelectContent>
            {zoneOptions.map((z) => (
              <SelectItem key={z} value={z}>{z === 'all' ? 'All zones' : z}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Call Status</TableHead>
              <TableHead>Module</TableHead>
              <TableHead className="max-w-[180px]">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {list.length === 0 ? 'No Golden Members in CRM yet.' : 'No members match your filters.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredList.map((m) => (
                <TableRow
                  key={m.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openDrawer(m)}
                >
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.phone}</TableCell>
                  <TableCell>{m.zone || '—'}</TableCell>
                  <TableCell>
                    <CallStatusBadge status={m.call_status} />
                  </TableCell>
                  <TableCell>
                    {m.training_module ? MODULE_OPTIONS.find((o) => o.value === m.training_module)?.label ?? m.training_module : '—'}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-muted-foreground">
                    {m.notes || '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={drawerOpen} onOpenChange={(open) => !open && closeDrawer()}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Log Result</SheetTitle>
            {selectedMember && (
              <p className="text-sm text-muted-foreground font-normal">
                {selectedMember.name} · {selectedMember.phone}
              </p>
            )}
          </SheetHeader>
          {selectedMember && (
            <div className="space-y-6 pt-6">
              <div className="space-y-3">
                <Label>Call Status</Label>
                <RadioGroup
                  value={drawerCallStatus}
                  onValueChange={setDrawerCallStatus}
                  className="flex flex-col gap-2"
                >
                  {CALL_STATUSES.map((s) => (
                    <div key={s.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={s.value} id={`status-${s.value}`} />
                      <Label htmlFor={`status-${s.value}`} className="font-normal cursor-pointer">
                        {s.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-3">
                <Label>Cross-Module Availability</Label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="avail-m1"
                      checked={drawerAvailableModule1}
                      onCheckedChange={(c) => setDrawerAvailableModule1(!!c)}
                    />
                    <label htmlFor="avail-m1" className="text-sm font-normal cursor-pointer">
                      Available for Module 1
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="avail-m2"
                      checked={drawerAvailableModule2}
                      onCheckedChange={(c) => setDrawerAvailableModule2(!!c)}
                    />
                    <label htmlFor="avail-m2" className="text-sm font-normal cursor-pointer">
                      Available for Module 2
                    </label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  When saved as Interested, outreach will be created for upcoming events matching the selected modules.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="e.g. Needs transport, Call back Friday"
                  value={drawerNotes}
                  onChange={(e) => setDrawerNotes(e.target.value)}
                  rows={4}
                />
              </div>
              <Button className="w-full" onClick={handleSaveAndNext} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save & Next
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
