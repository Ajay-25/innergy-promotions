'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDashboard } from '@/contexts/DashboardContext'
import { getMyProfile, updateMyProfile } from '@/app/actions/profile'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save, Pencil, Phone, Mail, User, Calendar, MapPin, Lock } from 'lucide-react'
import { toast } from 'sonner'

const GENDER_OPTIONS = ['Male', 'Female', 'Other']

function getInitials(name) {
  if (!name || typeof name !== 'string') return '?'
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

function formatPhone(value) {
  if (!value) return ''
  const v = String(value).replace(/\D/g, '')
  if (v.length <= 10) return v
  return v.slice(0, 10)
}

export default function ProfilePage() {
  const { refreshProfile } = useDashboard()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    gender: '',
    dob: '',
    address: '',
  })

  const loadProfile = useCallback(async () => {
    setLoading(true)
    const res = await getMyProfile()
    setLoading(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    const p = res.profile || {}
    setProfile(p)
    setForm({
      name: p.name || '',
      phone: p.phone ? (p.phone.startsWith('+91') ? p.phone.slice(3).trim() : p.phone.replace(/\D/g, '').slice(-10)) : '',
      gender: p.gender || '',
      dob: p.dob ? (typeof p.dob === 'string' ? p.dob.slice(0, 10) : String(p.dob).slice(0, 10)) : '',
      address: p.address || '',
    })
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleSave = async () => {
    setSaving(true)
    const phoneFormatted = form.phone ? `+91${formatPhone(form.phone)}` : ''
    const res = await updateMyProfile({
      name: form.name,
      phone: phoneFormatted,
      gender: form.gender || undefined,
      dob: form.dob || undefined,
      address: form.address,
    })
    setSaving(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success('Profile updated')
    setEditing(false)
    loadProfile()
    refreshProfile()
  }

  const handleCancel = () => {
    setForm({
      name: profile?.name || '',
      phone: profile?.phone ? (profile.phone.startsWith('+91') ? profile.phone.slice(3).trim() : profile.phone.replace(/\D/g, '').slice(-10)) : '',
      gender: profile?.gender || '',
      dob: profile?.dob ? (typeof profile.dob === 'string' ? profile.dob.slice(0, 10) : String(profile.dob).slice(0, 10)) : '',
      address: profile?.address || '',
    })
    setEditing(false)
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const displayPhone = profile?.phone ? (profile.phone.startsWith('+91') ? profile.phone : `+91 ${profile.phone.replace(/\D/g, '')}`) : '—'

  return (
    <div className="p-4 pb-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-14 w-14 shrink-0 border-2 border-background">
                <AvatarFallback className="bg-primary/15 text-primary text-lg font-semibold">
                  {getInitials(profile?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-foreground truncate">
                  {profile?.name || '—'}
                </h2>
                <p className="text-sm text-muted-foreground truncate">{profile?.email || '—'}</p>
              </div>
            </div>
            {!editing ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              Name
            </Label>
            {editing ? (
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
              />
            ) : (
              <p className="text-foreground">{profile?.name || '—'}</p>
            )}
          </div>

          {/* Contact Number */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              Contact Number
            </Label>
            {editing ? (
              <div className="flex rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <span className="inline-flex items-center px-3 text-muted-foreground border-r text-sm">+91</span>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: formatPhone(e.target.value) }))}
                  placeholder="10-digit number"
                  className="border-0 focus-visible:ring-0 rounded-l-none"
                  maxLength={10}
                />
              </div>
            ) : (
              <p className="text-foreground">{displayPhone}</p>
            )}
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              Email
              <Lock className="h-3.5 w-3.5 text-muted-foreground/70" title="Read-only" />
            </Label>
            <p className="text-foreground flex items-center gap-2">
              {profile?.email || '—'}
            </p>
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">Gender</Label>
            {editing ? (
              <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-foreground">{profile?.gender || '—'}</p>
            )}
          </div>

          {/* DOB */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Date of Birth
            </Label>
            {editing ? (
              <Input
                type="date"
                value={form.dob}
                onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
              />
            ) : (
              <p className="text-foreground">
                {profile?.dob ? new Date(profile.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              </p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              Address
            </Label>
            {editing ? (
              <Textarea
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Address"
                rows={3}
                className="resize-none"
              />
            ) : (
              <p className="text-foreground whitespace-pre-wrap">{profile?.address || '—'}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
