'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useDashboard } from '@/contexts/DashboardContext'
import { getGoldenMembers, registerGoldenMember } from '@/app/actions/interactions'
import { getSewadars } from '@/app/actions/admin'
import { Plus, Search, Users, Globe, Heart, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const ZONE_OPTIONS = [
  'Zone-1(Delhi)',
  'Zone-2(Punjab)',
  'Zone-3(Haryana)',
  'Zone-4(Madhya Pradesh)',
  'Zone-5(Uttar Pradesh)',
  'Zone-6(Uttar Pradesh)',
  'Zone-7(Rajasthan)',
  'Zone-8(Maharashtra)',
  'Zone-9(South-Orissa/Hyderabad/Bengaluru/etc.)',
  'Zone-10(Bihar)',
  'Zone-11(Uttar Pradesh)',
  'Zone-12(Gujarat)',
]
const ZONES = ['All', ...ZONE_OPTIONS]
const LANGUAGES = ['All', 'Hindi', 'English']
const LANGUAGE_OPTIONS = ['Hindi', 'English']

const INITIAL_FORM = {
  full_name: '',
  contact_no: '',
  innergy_email: '',
  city_center: '',
  zone: '',
  dob: '',
  preferred_language: '',
  remarks: '',
}

export default function GoldenMembersPage() {
  const { user, hasPermission } = useDashboard()
  const canViewAll = hasPermission('golden_members:view') || hasPermission('system:manage_access')
  const canProxyAttribution = hasPermission('system:manage_access')

  const [members, setMembers] = useState([])
  const [sewadars, setSewadars] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [attributionSewadarId, setAttributionSewadarId] = useState('__me__')
  const [search, setSearch] = useState('')
  const [zoneFilter, setZoneFilter] = useState('All')
  const [langFilter, setLangFilter] = useState('All')

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
        m.full_name.toLowerCase().includes(q) ||
        (m.contact_no && m.contact_no.includes(q)) ||
        (m.innergy_email && m.innergy_email.toLowerCase().includes(q))
      const matchZone = zoneFilter === 'All' || m.zone === zoneFilter
      const matchLang = langFilter === 'All' || m.preferred_language === langFilter
      return matchSearch && matchZone && matchLang
    })
  }, [members, search, zoneFilter, langFilter])

  const totalMembers = members.length
  const hindiCount = members.filter((m) => m.preferred_language === 'Hindi').length
  const englishCount = members.filter((m) => m.preferred_language === 'English').length

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const clerkUserEmail = user?.email
    const clerkUserName = user?.user_metadata?.full_name || ''
    if (!clerkUserEmail) {
      toast.error('You must be signed in to register a golden member.')
      return
    }

    setSubmitting(true)
    const result = await registerGoldenMember({
      clerkUserEmail,
      clerkUserName,
      full_name: formData.full_name,
      contact_no: formData.contact_no,
      innergy_email: formData.innergy_email,
      city_center: formData.city_center,
      zone: formData.zone,
      dob: formData.dob,
      preferred_language: formData.preferred_language,
      remarks: formData.remarks,
      sewadar_id: attributionSewadarId && attributionSewadarId !== '__me__' ? attributionSewadarId : undefined,
    })
    setSubmitting(false)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    setFormData(INITIAL_FORM)
    setDialogOpen(false)
    toast.success('Golden member registered successfully')
    fetchMembers()
  }

  const truncate = (str, len = 30) => {
    if (!str) return '--'
    return str.length > len ? `${str.slice(0, len)}...` : str
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
          Register Golden Member
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalMembers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hindi Speakers</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{hindiCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">English Speakers</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{englishCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Zone" />
          </SelectTrigger>
          <SelectContent>
            {ZONES.map((z) => (
              <SelectItem key={z} value={z}>{z}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={langFilter} onValueChange={setLangFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
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
              <TableHead>Email</TableHead>
              <TableHead>Center</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>DOB</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Remarks</TableHead>
              {canViewAll && <TableHead>Registered By</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canViewAll ? 9 : 8} className="text-center text-muted-foreground py-8">
                  No members found.
                </TableCell>
              </TableRow>
            ) : (
              filteredMembers.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium whitespace-nowrap">{m.full_name}</TableCell>
                  <TableCell>{m.contact_no}</TableCell>
                  <TableCell>{m.innergy_email || '--'}</TableCell>
                  <TableCell>{m.city_center}</TableCell>
                  <TableCell>{m.zone}</TableCell>
                  <TableCell className="whitespace-nowrap">{m.dob}</TableCell>
                  <TableCell>
                    <Badge variant={m.preferred_language === 'Hindi' ? 'default' : 'secondary'}>
                      {m.preferred_language}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">{truncate(m.remarks)}</TableCell>
                  {canViewAll && (
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {m.registered_by_name}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register Golden Member</DialogTitle>
            <DialogDescription>
              {canProxyAttribution ? 'Add a new golden member. Optionally attribute to another sewadar.' : 'Add a new golden member to the CRM.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {canProxyAttribution && (
              <div className="space-y-2">
                <Label>Attribute to (Sewadar)</Label>
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
            <div className="space-y-2">
              <Label htmlFor="gm_full_name">Full Name</Label>
              <Input id="gm_full_name" value={formData.full_name} onChange={(e) => handleFormChange('full_name', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gm_contact_no">Phone</Label>
              <Input id="gm_contact_no" value={formData.contact_no} onChange={(e) => handleFormChange('contact_no', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gm_innergy_email">Innergy Email</Label>
              <Input id="gm_innergy_email" type="email" value={formData.innergy_email} onChange={(e) => handleFormChange('innergy_email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gm_city_center">City Center</Label>
              <Input id="gm_city_center" value={formData.city_center} onChange={(e) => handleFormChange('city_center', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Zone</Label>
              <Select value={formData.zone} onValueChange={(v) => handleFormChange('zone', v)}>
                <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
                <SelectContent>
                  {ZONE_OPTIONS.map((z) => (
                    <SelectItem key={z} value={z}>{z}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gm_dob">DOB</Label>
              <Input id="gm_dob" type="date" value={formData.dob} onChange={(e) => handleFormChange('dob', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Preferred Language</Label>
              <Select value={formData.preferred_language} onValueChange={(v) => handleFormChange('preferred_language', v)}>
                <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gm_remarks">Remarks</Label>
              <Textarea id="gm_remarks" value={formData.remarks} onChange={(e) => handleFormChange('remarks', e.target.value)} rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Register
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
