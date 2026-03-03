'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { getMyProfile } from '@/app/actions/profile'
import { completeOnboarding, skipOnboarding } from '@/app/actions/onboarding'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, User, Phone, Calendar, MapPin } from 'lucide-react'
import { toast } from 'sonner'

const GENDER_OPTIONS = ['Male', 'Female', 'Other']

function formatPhone(value) {
  if (!value) return ''
  const v = String(value).replace(/\D/g, '')
  if (v.length <= 10) return v
  return v.slice(0, 10)
}

export default function OnboardingPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [skipping, setSkipping] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    gender: '',
    dob: '',
    address: '',
  })

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      router.replace('/sign-in')
      return
    }
    let cancelled = false
    async function load() {
      const res = await getMyProfile()
      if (cancelled) return
      setLoading(false)
      if (res.error || !res.profile) return
      const p = res.profile
      setForm({
        name: p.name || '',
        phone: p.phone ? (p.phone.startsWith('+91') ? p.phone.slice(3).trim() : p.phone.replace(/\D/g, '').slice(-10)) : '',
        gender: p.gender || '',
        dob: p.dob ? (typeof p.dob === 'string' ? p.dob.slice(0, 10) : String(p.dob).slice(0, 10)) : '',
        address: p.address || '',
      })
    }
    load()
    return () => { cancelled = true }
  }, [isLoaded, isSignedIn, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const phoneFormatted = form.phone ? `+91${formatPhone(form.phone)}` : ''
      await completeOnboarding({
        name: form.name,
        phone: phoneFormatted,
        gender: form.gender || undefined,
        dob: form.dob || undefined,
        address: form.address,
      })
    } catch (err) {
      setSubmitting(false)
      if (err?.message?.includes('NEXT_REDIRECT')) return
      toast.error(err?.message || 'Something went wrong')
    }
  }

  const handleSkip = async () => {
    setSkipping(true)
    try {
      await skipOnboarding()
    } catch (err) {
      setSkipping(false)
      if (err?.message?.includes('NEXT_REDIRECT')) return
      toast.error(err?.message || 'Something went wrong')
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isSignedIn) return null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-1 pb-2">
          <h1 className="text-xl font-bold text-foreground">
            Welcome! Let&apos;s complete your profile.
          </h1>
          <p className="text-sm text-muted-foreground">
            You can fill this now or skip and update later from your profile.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                Name
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                Contact Number
              </Label>
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
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Date of Birth
              </Label>
              <Input
                type="date"
                value={form.dob}
                onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Address
              </Label>
              <Textarea
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Address"
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save & Continue
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={skipping}
                onClick={handleSkip}
              >
                {skipping ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Skip for now
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
