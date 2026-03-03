'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDashboard } from '@/contexts/DashboardContext'
import { getGoldenMemberById } from '@/app/actions/golden-members'
import { upsertGoldenMember } from '@/app/actions/golden-members'
import { GoldenMemberForm, getGoldenMemberFormDefaults } from '@/components/forms/GoldenMemberForm'
import { Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm">{value || '—'}</span>
    </div>
  )
}

/**
 * Slide-over sheet for viewing and editing a Golden Member.
 * View mode: read-only layout of all fields.
 * Edit mode: GoldenMemberForm (includes Profession/Qualification "Other" conditional fields).
 * Edit toggle only shown when user has golden_members:edit.
 */
export function GoldenMemberDetailSheet({ memberId, open, onClose, onSuccess }) {
  const { hasPermission } = useDashboard()
  const canEdit = hasPermission('golden_members:edit') || hasPermission('system:manage_access')

  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadMember = useCallback(async () => {
    if (!memberId || !open) return
    setLoading(true)
    const result = await getGoldenMemberById(memberId)
    setLoading(false)
    if (result.error) {
      toast.error(result.error === 'Not found' ? 'Member not found' : result.error)
      onClose?.()
      return
    }
    setMember(result.data)
    setEditMode(false)
  }, [memberId, open, onClose])

  useEffect(() => {
    if (open && memberId) loadMember()
  }, [open, memberId, loadMember])

  const handleEditSubmit = async (data) => {
    setSubmitting(true)
    const result = await upsertGoldenMember(data)
    setSubmitting(false)
    if (result?.error) return { error: result.error }
    toast.success('Profile updated')
    setEditMode(false)
    onClose?.()
    onSuccess?.()
    return {}
  }

  const handleClose = (isOpen) => {
    if (!isOpen) onClose?.()
  }

  const formDefaultValues = member
    ? getGoldenMemberFormDefaults({
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
    : getGoldenMemberFormDefaults()

  const preventCloseOutside = editMode
    ? (e) => e.preventDefault()
    : undefined

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col p-0 gap-0"
        onInteractOutside={preventCloseOutside}
        onPointerDownOutside={preventCloseOutside}
      >
        <SheetHeader className="shrink-0 px-6 pt-6 pb-4 border-b text-left">
          <SheetTitle className="text-xl font-bold truncate pr-8">
            {loading ? 'Loading…' : member?.name ?? 'Golden Member'}
          </SheetTitle>
          {member && !loading && (
            <p className="text-sm text-muted-foreground font-normal">{member.phone}</p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && member && (
            <>
              {canEdit && (
                <div className="flex justify-end mb-4">
                  <Button
                    variant={editMode ? 'secondary' : 'outline'}
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setEditMode((e) => !e)}
                  >
                    <Pencil className="h-4 w-4" />
                    {editMode ? 'Cancel' : 'Edit Profile'}
                  </Button>
                </div>
              )}

              {editMode ? (
                <GoldenMemberForm
                  onSubmit={handleEditSubmit}
                  onSuccess={() => {
                    setEditMode(false)
                    onClose?.()
                    onSuccess?.()
                  }}
                  defaultValues={formDefaultValues}
                  isSubmitting={submitting}
                  submitLabel="Save changes"
                />
              ) : (
                <div className="space-y-1">
                  <DetailRow label="Innergy Email" value={member.innergy_email} />
                  <DetailRow label="Gender" value={member.gender} />
                  <DetailRow label="Preferred Language" value={member.preferred_language} />
                  <DetailRow label="Date of Birth" value={member.dob} />
                  <DetailRow label="Zone" value={member.zone} />
                  <DetailRow label="Center" value={member.center} />
                  <DetailRow label="Address" value={member.address} />
                  <DetailRow label="Remarks" value={member.remarks} />
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
