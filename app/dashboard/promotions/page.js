'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useDashboard } from '@/contexts/DashboardContext'
import { getPromotions, logStandardPromotion, registerGoldenMember } from '@/app/actions/interactions'
import { getSewadars } from '@/app/actions/admin'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Plus, Smartphone, Download, Star, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

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
const LANGUAGE_OPTIONS = ['Hindi', 'English']

const INITIAL_FORM = {
  app_status: '',
  citizen_name: '',
  contact_number: '',
  email_used: '',
  tech_issue_notes: '',
  gm_full_name: '',
  gm_phone: '',
  gm_email: '',
  gm_city_center: '',
  gm_zone: '',
  gm_dob: '',
  gm_language: '',
  gm_remarks: '',
}

export default function PromotionsPage() {
  const { user, hasPermission } = useDashboard()
  const canViewAll = hasPermission('promotions:view') || hasPermission('system:manage_access')
  const canProxyAttribution = hasPermission('system:manage_access')

  const [promotions, setPromotions] = useState([])
  const [sewadars, setSewadars] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isGoldenMember, setIsGoldenMember] = useState(true)
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [attributionSewadarId, setAttributionSewadarId] = useState('__me__')

  const fetchSewadars = useCallback(async () => {
    const res = await getSewadars()
    if (res.data) setSewadars(res.data)
  }, [])

  const fetchPromotions = useCallback(async () => {
    setLoading(true)
    const result = await getPromotions()
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    setPromotions(result.data || [])
  }, [])

  useEffect(() => {
    fetchPromotions()
  }, [fetchPromotions])
  useEffect(() => {
    if (canProxyAttribution) fetchSewadars()
  }, [canProxyAttribution, fetchSewadars])

  const totalCount = promotions.length
  const newInstallCount = promotions.filter((p) => p.app_status === 'New Installation').length
  const goldenMemberCount = promotions.filter((p) => p.interaction_type === 'Golden Member').length

  const handleToggleGoldenMember = (value) => {
    setIsGoldenMember(value)
    setFormData((prev) => ({ ...INITIAL_FORM }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const clerkUserEmail = user?.email
    const clerkUserName = user?.user_metadata?.full_name || ''
    if (!clerkUserEmail) {
      toast.error('You must be signed in to log an interaction.')
      return
    }

    setSubmitting(true)
    const sewadarId = attributionSewadarId && attributionSewadarId !== '__me__' ? attributionSewadarId : undefined
    if (isGoldenMember) {
      const result = await registerGoldenMember({
        clerkUserEmail,
        clerkUserName,
        full_name: formData.gm_full_name,
        contact_no: formData.gm_phone,
        innergy_email: formData.gm_email,
        city_center: formData.gm_city_center,
        zone: formData.gm_zone,
        dob: formData.gm_dob,
        preferred_language: formData.gm_language,
        remarks: formData.gm_remarks,
        sewadar_id: sewadarId,
      })
      setSubmitting(false)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Golden Member Registered', { description: `${formData.gm_full_name} added as Golden Member.` })
    } else {
      if (!formData.app_status) {
        setSubmitting(false)
        return
      }
      const result = await logStandardPromotion({
        clerkUserEmail,
        clerkUserName,
        app_status: formData.app_status,
        citizen_name: formData.citizen_name,
        contact_number: formData.contact_number,
        email_used: formData.email_used,
        tech_issue_notes: formData.tech_issue_notes,
        sewadar_id: sewadarId,
      })
      setSubmitting(false)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Interaction logged successfully')
    }

    setFormData(INITIAL_FORM)
    setIsGoldenMember(false)
    setDialogOpen(false)
    fetchPromotions()
  }

  const handleDialogOpenChange = (open) => {
    setDialogOpen(open)
    if (open) {
      setFormData(INITIAL_FORM)
      setIsGoldenMember(true)
    } else {
      setFormData(INITIAL_FORM)
      setIsGoldenMember(false)
    }
  }

  const set = (field) => (e) => setFormData((prev) => ({ ...prev, [field]: e.target.value }))
  const setVal = (field) => (v) => setFormData((prev) => ({ ...prev, [field]: v }))

  if (loading && promotions.length === 0) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">App Promotions</h1>
        <Button
          onClick={() => {
            setFormData(INITIAL_FORM)
            setIsGoldenMember(true)
            setDialogOpen(true)
          }}
          size="sm"
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Log Interaction
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Installations</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{newInstallCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Golden Members</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{goldenMemberCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Recent Interactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Sewadar</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tech Issues</TableHead>
                  {canViewAll && <TableHead>Registered By</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canViewAll ? 8 : 7} className="text-center text-muted-foreground py-8">
                      No interactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  promotions.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs whitespace-nowrap">{p.created_at}</TableCell>
                      <TableCell>
                        {p.interaction_type === 'Golden Member' ? (
                          <Badge className="bg-amber-100 text-amber-800 whitespace-nowrap">Golden Member</Badge>
                        ) : (
                          <Badge variant="outline" className="whitespace-nowrap">Standard</Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{p.sewadar_name}</TableCell>
                      <TableCell className="font-medium">{p.citizen_name || '--'}</TableCell>
                      <TableCell>{p.contact_number || '--'}</TableCell>
                      <TableCell>
                        {p.interaction_type === 'Golden Member' ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : p.app_status === 'New Installation' ? (
                          <Badge className="bg-green-100 text-green-800 whitespace-nowrap">New Install</Badge>
                        ) : (
                          <Badge variant="secondary" className="whitespace-nowrap">Already Installed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-xs">
                        {p.tech_issue_notes || '--'}
                      </TableCell>
                      {canViewAll && (
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {p.registered_by_name}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Interaction</DialogTitle>
            <DialogDescription>
              {canProxyAttribution ? 'Record a citizen interaction. Optionally attribute to another sewadar.' : 'Record a citizen interaction. You are logged as the sewadar.'}
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
            <Separator />

            <div className="space-y-2">
              <Label>Is the citizen 50+ years old? (Golden Member)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={isGoldenMember ? 'default' : 'outline'}
                  className="w-full"
                  onClick={() => handleToggleGoldenMember(true)}
                >
                  Yes — Golden Member
                </Button>
                <Button
                  type="button"
                  variant={!isGoldenMember ? 'default' : 'outline'}
                  className="w-full"
                  onClick={() => handleToggleGoldenMember(false)}
                >
                  No
                </Button>
              </div>
            </div>

            <Separator />

            {isGoldenMember ? (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Register this citizen as a Golden Member (50+ years old). Full CRM profile will be created.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="gm_full_name">Full Name</Label>
                    <Input id="gm_full_name" value={formData.gm_full_name} onChange={set('gm_full_name')} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gm_phone">Phone</Label>
                    <Input id="gm_phone" type="tel" value={formData.gm_phone} onChange={set('gm_phone')} required />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="gm_email">Innergy Email</Label>
                    <Input id="gm_email" type="email" value={formData.gm_email} onChange={set('gm_email')} className="w-full" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gm_city_center">City Center</Label>
                    <Input id="gm_city_center" value={formData.gm_city_center} onChange={set('gm_city_center')} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Zone</Label>
                    <Select value={formData.gm_zone} onValueChange={setVal('gm_zone')}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {ZONE_OPTIONS.map((z) => (
                          <SelectItem key={z} value={z}>{z}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gm_dob">Date of Birth</Label>
                    <Input id="gm_dob" type="date" value={formData.gm_dob} onChange={set('gm_dob')} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select value={formData.gm_language} onValueChange={setVal('gm_language')}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {LANGUAGE_OPTIONS.map((l) => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="gm_remarks">Remarks</Label>
                    <Textarea id="gm_remarks" value={formData.gm_remarks} onChange={set('gm_remarks')} rows={2} />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>App Status</Label>
                  <Select value={formData.app_status} onValueChange={setVal('app_status')}>
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New Installation">New Installation</SelectItem>
                      <SelectItem value="Already Installed">Already Installed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="citizen_name">Citizen Name</Label>
                  <Input id="citizen_name" value={formData.citizen_name} onChange={set('citizen_name')} placeholder="Enter name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_number">Contact Number</Label>
                  <Input id="contact_number" value={formData.contact_number} onChange={set('contact_number')} placeholder="Enter number" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email_used">Email</Label>
                  <Input id="email_used" type="email" value={formData.email_used} onChange={set('email_used')} placeholder="Enter email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tech_issue_notes">Tech Issue Notes</Label>
                  <Textarea id="tech_issue_notes" value={formData.tech_issue_notes} onChange={set('tech_issue_notes')} placeholder="Any technical issues encountered" rows={2} />
                </div>
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isGoldenMember ? 'Register Golden Member' : 'Submit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
