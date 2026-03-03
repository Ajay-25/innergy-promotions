'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDashboard } from '@/contexts/DashboardContext'
import { getGoldenMemberById } from '@/app/actions/golden-members'
import { upsertGoldenMember } from '@/app/actions/golden-members'
import { GoldenMemberForm, getGoldenMemberFormDefaults } from '@/components/forms/GoldenMemberForm'
import { ArrowLeft, Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm">{value || '—'}</span>
    </div>
  )
}

export default function GoldenMemberDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id
  const { hasPermission } = useDashboard()
  const canEdit = hasPermission('golden_members:edit') || hasPermission('system:manage_access')

  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadMember = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const result = await getGoldenMemberById(id)
    setLoading(false)
    if (result.error) {
      toast.error(result.error === 'Not found' ? 'Member not found' : result.error)
      if (result.error === 'Not found') router.push('/dashboard/golden-members')
      return
    }
    setMember(result.data)
  }, [id, router])

  useEffect(() => {
    loadMember()
  }, [loadMember])

  const handleEditSubmit = async (data) => {
    setSubmitting(true)
    const result = await upsertGoldenMember(data)
    setSubmitting(false)
    if (result?.error) return { error: result.error }
    toast.success('Profile updated')
    setEditOpen(false)
    loadMember()
    return {}
  }

  if (loading && !member) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!member) {
    return null
  }

  const formDefaultValues = getGoldenMemberFormDefaults({
    name: member.name,
    phone: member.phone,
    innergy_email: member.innergy_email,
    gender: member.gender,
    preferred_language: member.preferred_language,
    zone: member.zone,
    center: member.center,
    dob: member.dob,
    address: member.address,
    remarks: member.remarks,
  })

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/golden-members" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to directory
          </Link>
        </Button>
        {canEdit && (
          <Button size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{member.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{member.phone}</p>
        </CardHeader>
        <CardContent className="space-y-1">
          <Separator className="mb-2" />
          <DetailRow label="Innergy Email" value={member.innergy_email} />
          <DetailRow label="Gender" value={member.gender} />
          <DetailRow label="Preferred Language" value={member.preferred_language} />
          <DetailRow label="Date of Birth" value={member.dob} />
          <DetailRow label="Zone" value={member.zone} />
          <DetailRow label="Center" value={member.center} />
          <DetailRow label="Address" value={member.address} />
          <DetailRow label="Remarks" value={member.remarks} />
        </CardContent>
      </Card>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Golden Member</SheetTitle>
          </SheetHeader>
          <div className="pt-4">
            <GoldenMemberForm
              onSubmit={handleEditSubmit}
              onSuccess={() => setEditOpen(false)}
              defaultValues={formDefaultValues}
              isSubmitting={submitting}
              submitLabel="Save changes"
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
