'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useDashboard } from '@/contexts/DashboardContext'
import { getGoldenMembers } from '@/app/actions/interactions'
import { upsertGoldenMember } from '@/app/actions/golden-members'
import { getSewadars } from '@/app/actions/admin'
import { GoldenMemberForm, ZONE_OPTIONS } from '@/components/forms/GoldenMemberForm'
import { GoldenMemberDetailSheet } from '@/components/crm/GoldenMemberDetailSheet'
import { Plus, Search, Users, Loader2, PanelRightOpen } from 'lucide-react'
import { toast } from 'sonner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ZONES = ['All', ...ZONE_OPTIONS]

export default function GoldenMembersPage() {
  const { user, hasPermission } = useDashboard()
  const canViewAll = hasPermission('golden_members:view') || hasPermission('system:manage_access')
  const canProxyAttribution = hasPermission('system:manage_access')

  const [members, setMembers] = useState([])
  const [sewadars, setSewadars] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailMemberId, setDetailMemberId] = useState(null)
  const [attributionSewadarId, setAttributionSewadarId] = useState('__me__')
  const [search, setSearch] = useState('')
  const [zoneFilter, setZoneFilter] = useState('All')

  const fetchSewadars = useCallback(async () => {
    const res = await getSewadars()
    if (res.data) setSewadars(res.data)
  }, [])

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    const result = await getGoldenMembers()
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    setMembers(result.data || [])
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])
  useEffect(() => {
    if (canProxyAttribution) fetchSewadars()
  }, [canProxyAttribution, fetchSewadars])

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase().trim()
    return members.filter((m) => {
      const matchSearch = !q ||
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.phone && m.phone.includes(q))
      const matchZone = zoneFilter === 'All' || m.zone === zoneFilter
      return matchSearch && matchZone
    })
  }, [members, search, zoneFilter])

  const handleSubmit = async (data) => {
    if (!user?.email) {
      toast.error('You must be signed in to register a golden member.')
      return { error: 'Unauthorized' }
    }
    setSubmitting(true)
    const payload = {
      ...data,
      sewadar_id: canProxyAttribution && attributionSewadarId && attributionSewadarId !== '__me__' ? attributionSewadarId : undefined,
    }
    const result = await upsertGoldenMember(payload)
    setSubmitting(false)
    if (result?.error) return { error: result.error }
    toast.success('Golden member saved')
    fetchMembers()
    return {}
  }

  const openDetail = (id) => {
    setDetailMemberId(id)
  }

  const closeDetail = () => {
    setDetailMemberId(null)
  }

  if (loading && members.length === 0) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg font-bold">Golden Members CRM</h1>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Register Member
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{members.length}</p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Zone" />
          </SelectTrigger>
          <SelectContent>
            {ZONES.map((z) => (
              <SelectItem key={z} value={z}>{z}</SelectItem>
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
              <TableHead className="w-10" aria-label="Open detail" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12">
                  {members.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <p className="font-medium">No Golden Members registered yet</p>
                      <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-1.5">
                        <Plus className="h-4 w-4" />
                        Register Member
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No members match your filters.</p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredMembers.map((m) => (
                <TableRow
                  key={m.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openDetail(m.id)}
                >
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.phone}</TableCell>
                  <TableCell>{m.zone || '—'}</TableCell>
                  <TableCell className="w-10 p-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => openDetail(m.id)}
                      className="inline-flex items-center justify-center rounded-md hover:bg-muted p-1.5 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      aria-label="Open member detail"
                    >
                      <PanelRightOpen className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <GoldenMemberDetailSheet
        memberId={detailMemberId}
        open={!!detailMemberId}
        onClose={closeDetail}
        onSuccess={fetchMembers}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register Golden Member</DialogTitle>
            <DialogDescription>
              {canProxyAttribution ? 'Add or update a golden member. Optionally attribute to another volunteer.' : 'Add or update a golden member in the CRM.'}
            </DialogDescription>
          </DialogHeader>
          {canProxyAttribution && (
            <div className="space-y-2">
              <Label>Attribute to (Volunteer)</Label>
              <Select value={attributionSewadarId} onValueChange={setAttributionSewadarId}>
                <SelectTrigger><SelectValue placeholder="Me (logged-in user)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__me__">Me (logged-in user)</SelectItem>
                  {sewadars.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name || s.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <GoldenMemberForm
            onSubmit={handleSubmit}
            onSuccess={() => setDialogOpen(false)}
            isSubmitting={submitting}
            submitLabel="Save"
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
