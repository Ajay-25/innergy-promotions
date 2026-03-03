'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDashboard } from '@/contexts/DashboardContext'
import { getSewadarById, updateVolunteerProfile } from '@/app/actions/admin'
import { ZONE_OPTIONS, GENDER_OPTIONS, QUALIFICATION_OPTIONS, PROFESSION_OPTIONS } from '@/lib/constants'
import { Loader2, Pencil, Phone, Mail, MapPin, User } from 'lucide-react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const PHONE_PREFIX = '+91'
const SEWA_TYPE_OPTIONS = ['Trainer', 'Promotion', 'Both']

function formatDate(d) {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getInitials(name) {
  if (!name || typeof name !== 'string') return '?'
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

/**
 * Volunteer detail sheet: view mode + edit mode when user has sewadars:edit.
 * Fetches volunteer by id when open; prevents close on outside click when editing.
 */
export function VolunteerDetailSheet({ volunteerId, open, onClose, onSuccess }) {
  const { hasPermission } = useDashboard()
  const canEdit = hasPermission('sewadars:edit') || hasPermission('system:manage_access')

  const [volunteer, setVolunteer] = useState(null)
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    phoneDigits: '',
    gender: '',
    dob: '',
    address: '',
    zone: '',
    center: '',
    qualification: '',
    qualification_other: '',
    profession: '',
    profession_other: '',
    sewa_type: 'Promotion',
  })

  const loadVolunteer = useCallback(async () => {
    if (!volunteerId || !open) return
    setLoading(true)
    const result = await getSewadarById(volunteerId)
    setLoading(false)
    if (result.error) {
      toast.error(result.error === 'Not found' ? 'Volunteer not found' : result.error)
      onClose?.()
      return
    }
    const v = result.data
    setVolunteer(v)
    setEditMode(false)
    const phoneNum = (v.phone || '').replace(/\D/g, '').slice(-10)
    setEditForm({
      full_name: v.full_name || '',
      phone: v.phone || '',
      phoneDigits: phoneNum,
      gender: v.gender || '',
      dob: v.dob || '',
      address: v.address || '',
      zone: v.zone || '',
      center: v.center || '',
      qualification: v.qualification || '',
      qualification_other: v.qualification_other || '',
      profession: v.profession || '',
      profession_other: v.profession_other || '',
      sewa_type: v.sewa_type || 'Promotion',
    })
  }, [volunteerId, open, onClose])

  useEffect(() => {
    if (open && volunteerId) loadVolunteer()
  }, [open, volunteerId, loadVolunteer])

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const phone = editForm.phoneDigits.trim()
      ? `${PHONE_PREFIX}${editForm.phoneDigits.replace(/\D/g, '').slice(0, 10)}`
      : ''
    const result = await updateVolunteerProfile(volunteerId, {
      full_name: editForm.full_name.trim(),
      phone,
      gender: editForm.gender || undefined,
      dob: editForm.dob || undefined,
      address: editForm.address.trim() || undefined,
      zone: editForm.zone || undefined,
      center: editForm.center.trim() || undefined,
      qualification: editForm.qualification || undefined,
      qualification_other: editForm.qualification === 'Other' ? editForm.qualification_other : undefined,
      profession: editForm.profession || undefined,
      profession_other: editForm.profession === 'Other' ? editForm.profession_other : undefined,
      sewa_type: editForm.sewa_type,
    })
    setSubmitting(false)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('Profile updated')
    setEditMode(false)
    loadVolunteer()
    onSuccess?.()
  }

  const handleClose = (isOpen) => {
    if (!isOpen) onClose?.()
  }

  const preventCloseOutside = editMode ? (e) => e.preventDefault() : undefined

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col p-0 gap-0"
        onInteractOutside={preventCloseOutside}
        onPointerDownOutside={preventCloseOutside}
      >
        <SheetHeader className="shrink-0 px-6 pt-6 pb-4 border-b text-left">
          <div className="flex items-start gap-3 pr-8">
            {loading ? (
              <Loader2 className="h-14 w-14 animate-spin text-muted-foreground" />
            ) : (
              <Avatar className="h-14 w-14 shrink-0 border-2 border-background">
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {getInitials(volunteer?.full_name)}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-xl font-bold truncate">
                {loading ? 'Loading…' : volunteer?.full_name || volunteer?.email || 'Volunteer'}
              </SheetTitle>
            </div>
          </div>
          {volunteer && !loading && (
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">Phone:</span>
                <a
                  href={volunteer.phone ? `tel:${volunteer.phone}` : undefined}
                  className={volunteer.phone ? 'text-foreground hover:underline truncate' : 'text-muted-foreground'}
                >
                  {volunteer.phone || '—'}
                </a>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground shrink-0">Email:</span>
                <span className="text-foreground truncate" title={volunteer.email || ''}>
                  {volunteer.email || '—'}
                </span>
              </div>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && volunteer && (
            <>
              {canEdit && (
                <div className="flex justify-end">
                  <Button
                    variant={editMode ? 'secondary' : 'outline'}
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setEditMode((prev) => !prev)}
                  >
                    <Pencil className="h-4 w-4" />
                    {editMode ? 'Cancel' : 'Edit Profile'}
                  </Button>
                </div>
              )}

              {editMode ? (
                <form onSubmit={handleEditSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground border-b pb-1">Personal</h4>
                    <div className="space-y-2">
                      <Label htmlFor="edit-full_name">Full Name</Label>
                      <Input
                        id="edit-full_name"
                        value={editForm.full_name}
                        onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mobile Number</Label>
                      <div className="flex rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                        <span className="inline-flex items-center px-3 text-muted-foreground border-r text-sm">
                          {PHONE_PREFIX}
                        </span>
                        <Input
                          type="tel"
                          inputMode="numeric"
                          placeholder="10-digit number"
                          value={editForm.phoneDigits}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              phoneDigits: e.target.value.replace(/\D/g, '').slice(0, 10),
                            }))
                          }
                          className="border-0 focus-visible:ring-0 rounded-l-none"
                          maxLength={10}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select
                        value={editForm.gender || ''}
                        onValueChange={(v) => setEditForm((f) => ({ ...f, gender: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          {GENDER_OPTIONS.map((g) => (
                            <SelectItem key={g} value={g}>
                              {g}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-dob">Date of Birth</Label>
                      <Input
                        id="edit-dob"
                        type="date"
                        value={editForm.dob}
                        onChange={(e) => setEditForm((f) => ({ ...f, dob: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-address">Address</Label>
                      <Input
                        id="edit-address"
                        value={editForm.address}
                        onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                        placeholder="Address"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Qualification</Label>
                      <Select
                        value={editForm.qualification || ''}
                        onValueChange={(v) => setEditForm((f) => ({ ...f, qualification: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select qualification" />
                        </SelectTrigger>
                        <SelectContent>
                          {QUALIFICATION_OPTIONS.map((q) => (
                            <SelectItem key={q} value={q}>{q}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {editForm.qualification === 'Other' && (
                      <div className="space-y-2">
                        <Label htmlFor="edit-qualification_other">Specify qualification</Label>
                        <Input
                          id="edit-qualification_other"
                          value={editForm.qualification_other}
                          onChange={(e) => setEditForm((f) => ({ ...f, qualification_other: e.target.value }))}
                          placeholder="Specify"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Profession</Label>
                      <Select
                        value={editForm.profession || ''}
                        onValueChange={(v) => setEditForm((f) => ({ ...f, profession: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select profession" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROFESSION_OPTIONS.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {editForm.profession === 'Other' && (
                      <div className="space-y-2">
                        <Label htmlFor="edit-profession_other">Specify profession</Label>
                        <Input
                          id="edit-profession_other"
                          value={editForm.profession_other}
                          onChange={(e) => setEditForm((f) => ({ ...f, profession_other: e.target.value }))}
                          placeholder="Specify"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground border-b pb-1">Organizational</h4>
                    <div className="space-y-2">
                      <Label>Zone</Label>
                      <Select
                        value={editForm.zone || ''}
                        onValueChange={(v) => setEditForm((f) => ({ ...f, zone: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select zone" />
                        </SelectTrigger>
                        <SelectContent>
                          {ZONE_OPTIONS.map((z) => (
                            <SelectItem key={z} value={z}>
                              {z}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-center">Center</Label>
                      <Input
                        id="edit-center"
                        value={editForm.center}
                        onChange={(e) => setEditForm((f) => ({ ...f, center: e.target.value }))}
                        placeholder="Center name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sewa Type</Label>
                      <Select
                        value={editForm.sewa_type}
                        onValueChange={(v) => setEditForm((f) => ({ ...f, sewa_type: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SEWA_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setEditMode(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Save changes
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <section>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      Organizational
                    </h4>
                    <div className="space-y-1.5 text-sm">
                      <p>
                        <span className="text-muted-foreground">Zone:</span>{' '}
                        <span className="text-foreground">{volunteer.zone || '—'}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Center:</span>{' '}
                        <span className="text-foreground">{volunteer.center || '—'}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Sewa Type:</span>{' '}
                        <span className="text-foreground">{volunteer.sewa_type || '—'}</span>
                      </p>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                      <User className="h-3.5 w-3.5" />
                      Personal
                    </h4>
                    <div className="space-y-1.5 text-sm">
                      <p>
                        <span className="text-muted-foreground">Gender:</span>{' '}
                        <span className="text-foreground">{volunteer.gender || '—'}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">DOB:</span>{' '}
                        <span className="text-foreground">{formatDate(volunteer.dob)}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Qualification:</span>{' '}
                        <span className="text-foreground">
                          {volunteer.qualification === 'Other' && volunteer.qualification_other
                            ? volunteer.qualification_other
                            : (volunteer.qualification || '—')}
                        </span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Profession:</span>{' '}
                        <span className="text-foreground">
                          {volunteer.profession === 'Other' && volunteer.profession_other
                            ? volunteer.profession_other
                            : (volunteer.profession || '—')}
                        </span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Address:</span>{' '}
                        <span className="text-foreground">{volunteer.address || '—'}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Joined:</span>{' '}
                        <span className="text-foreground">{formatDate(volunteer.created_at)}</span>
                      </p>
                    </div>
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
