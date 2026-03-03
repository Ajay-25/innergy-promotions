'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useDashboard } from '@/contexts/DashboardContext'
import { getPromotions, logStandardPromotion } from '@/app/actions/interactions'
import { upsertGoldenMember } from '@/app/actions/golden-members'
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
import { GoldenMemberForm } from '@/components/forms/GoldenMemberForm'
import { InteractionDetailSheet } from '@/components/promotions/InteractionDetailSheet'
import { Plus, Smartphone, Download, Star, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

function formatTableDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
}

const INITIAL_FORM = {
  app_status: '',
  citizen_name: '',
  contact_number: '',
  email_used: '',
  tech_issue_notes: '',
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
  const [detailInteraction, setDetailInteraction] = useState(null)

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
    if (!clerkUserEmail) {
      toast.error('You must be signed in to log an interaction.')
      return
    }
    if (!formData.app_status) return
    setSubmitting(true)
    const sewadarId = attributionSewadarId && attributionSewadarId !== '__me__' ? attributionSewadarId : undefined
    const result = await logStandardPromotion({
      clerkUserEmail,
      clerkUserName: user?.user_metadata?.full_name || '',
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
    setFormData(INITIAL_FORM)
    setIsGoldenMember(false)
    setDialogOpen(false)
    fetchPromotions()
  }

  const handleGoldenMemberSubmit = async (data) => {
    if (!user?.email) return { error: 'You must be signed in.' }
    setSubmitting(true)
    const sewadarId = attributionSewadarId && attributionSewadarId !== '__me__' ? attributionSewadarId : undefined
    const result = await upsertGoldenMember({ ...data, sewadar_id: sewadarId })
    setSubmitting(false)
    if (result?.error) return { error: result.error }
    toast.success('Golden Member Registered', { description: `${data.name} added to CRM.` })
    return {}
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
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Date/Time</TableHead>
                  <TableHead className="whitespace-nowrap">Volunteer</TableHead>
                  <TableHead className="whitespace-nowrap">Citizen Name</TableHead>
                  <TableHead className="whitespace-nowrap">Interaction Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No interactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  promotions.map((p) => (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setDetailInteraction(p)}
                    >
                      <TableCell className="text-xs whitespace-nowrap align-top">
                        {formatTableDateTime(p.created_at)}
                      </TableCell>
                      <TableCell className="align-top" onClick={(e) => e.stopPropagation()}>
                        {p.registered_by ? (
                          <Link
                            href={`/dashboard/volunteers?volunteerId=${p.registered_by}`}
                            className="text-primary hover:underline font-medium"
                          >
                            {p.sewadar_name}
                          </Link>
                        ) : (
                          <span>{p.sewadar_name}</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top" onClick={(e) => e.stopPropagation()}>
                        {p.golden_member_id ? (
                          <Link
                            href={`/dashboard/golden-members/${p.golden_member_id}`}
                            className="text-primary hover:underline font-medium"
                          >
                            {p.citizen_name || '—'}
                          </Link>
                        ) : (
                          <Link
                            href="/dashboard/golden-members"
                            className="text-muted-foreground hover:underline"
                          >
                            {p.citizen_name || '—'}
                          </Link>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        {p.interaction_type === 'Golden Member' ? (
                          <Badge className="bg-amber-100 text-amber-800 whitespace-nowrap">Golden Member</Badge>
                        ) : (
                          <Badge variant="outline" className="whitespace-nowrap">Standard</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <InteractionDetailSheet
        interaction={detailInteraction}
        open={!!detailInteraction}
        onClose={() => setDetailInteraction(null)}
      />

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Interaction</DialogTitle>
            <DialogDescription>
              {canProxyAttribution ? 'Record a citizen interaction. Optionally attribute to another volunteer.' : 'Record a citizen interaction. You are logged as the volunteer.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {canProxyAttribution && (
              <>
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
                <Separator />
              </>
            )}

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
              <>
                <p className="text-xs text-muted-foreground">
                  Register this citizen as a Golden Member (50+ years old). Full CRM profile will be created.
                </p>
                <GoldenMemberForm
                  onSubmit={handleGoldenMemberSubmit}
                  onSuccess={() => {
                    setFormData(INITIAL_FORM)
                    setIsGoldenMember(false)
                    setDialogOpen(false)
                    fetchPromotions()
                  }}
                  isSubmitting={submitting}
                  submitLabel="Register Golden Member"
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                    Cancel
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
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
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Submit
                  </Button>
                </DialogFooter>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
