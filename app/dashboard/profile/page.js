'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDashboard } from '@/contexts/DashboardContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FormField, FieldGroup } from '@/components/dashboard/form-fields'
import {
  Loader2,
  Save,
  Shield,
  MapPin,
  Heart,
  Briefcase,
  FileText,
  Package,
  CheckCircle2,
  BarChart3,
  Phone,
  UserCog,
  Pencil,
  Download,
  Share2,
  Calendar,
  User,
  QrCode,
  Mail,
  CalendarDays,
  Hash,
  Map,
  HeartHandshake,
  IdCard,
  Shirt,
  CalendarPlus,
  Clock,
  Activity,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { PROFILE_TABS, groupBySection } from '@/lib/field-configs'

const sectionIcons = {
  'Permanent Address': <MapPin className="h-3.5 w-3.5 text-orange-500" />,
  'Communication Address': <MapPin className="h-3.5 w-3.5 text-blue-500" />,
  'Department & Region': <Shield className="h-3.5 w-3.5 text-teal-500" />,
  'Initiation': <Heart className="h-3.5 w-3.5 text-red-500" />,
  'Duty Areas - Permanent': <MapPin className="h-3.5 w-3.5 text-green-500" />,
  'Duty Areas - Current': <MapPin className="h-3.5 w-3.5 text-cyan-500" />,
  'Qualification': <FileText className="h-3.5 w-3.5 text-indigo-500" />,
  'Profession': <Briefcase className="h-3.5 w-3.5 text-amber-500" />,
  'I-Card & Uniform': <Package className="h-3.5 w-3.5 text-purple-500" />,
  'Orientation': <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  'Status': <BarChart3 className="h-3.5 w-3.5 text-blue-500" />,
  'Digital & Apps': <Phone className="h-3.5 w-3.5 text-pink-500" />,
  'Preferences': <Heart className="h-3.5 w-3.5 text-rose-500" />,
  'Data Metadata': <FileText className="h-3.5 w-3.5 text-gray-500" />,
  'ID Proof': <FileText className="h-3.5 w-3.5 text-blue-500" />,
  'Admin': <UserCog className="h-3.5 w-3.5 text-red-500" />,
}

function getInitials(name) {
  if (!name || typeof name !== 'string') return '?'
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'
}

function useSheetSide() {
  const [side, setSide] = useState('right')
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    setSide(mq.matches ? 'bottom' : 'right')
    const fn = () => setSide(mq.matches ? 'bottom' : 'right')
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return side
}

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const { session, role, profileCore, profileData, profileLoading, refreshProfile } = useDashboard()
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [formData, setFormData] = useState({})
  const [saving, setSaving] = useState(false)
  const [QRCode, setQRCode] = useState(null)
  const sheetSide = useSheetSide()

  const isAdmin = role === 'admin'

  useEffect(() => {
    import('react-qr-code').then((mod) => setQRCode(() => mod.default || mod))
  }, [])

  useEffect(() => {
    if (profileCore || profileData) {
      setFormData({
        ...(profileData || {}),
        member_id: profileCore?.member_id || '',
        first_name: profileCore?.first_name || '',
        middle_name: profileCore?.middle_name || '',
        last_name: profileCore?.last_name || '',
        full_name: profileCore?.full_name || '',
      })
    }
  }, [profileCore, profileData])

  const handleChange = useCallback((key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSave = async () => {
    const previousData = queryClient.getQueryData(['my-profile'])
    const {
      member_id,
      first_name,
      middle_name,
      last_name,
      full_name,
      id,
      user_id,
      created_at,
      updated_at,
      ...dataFields
    } = formData
    const computedFullName =
      [first_name, middle_name, last_name].filter(Boolean).join(' ') || full_name
    const optimisticCore = {
      ...(profileCore || {}),
      member_id: member_id ?? profileCore?.member_id,
      first_name: first_name ?? profileCore?.first_name,
      middle_name: middle_name ?? profileCore?.middle_name,
      last_name: last_name ?? profileCore?.last_name,
      full_name: computedFullName,
    }
    const optimisticData = { ...(profileData || {}), ...dataFields }

    queryClient.setQueryData(['my-profile'], { core: optimisticCore, data: optimisticData })
    setEditSheetOpen(false)
    setSaving(true)

    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          core: { member_id, first_name, middle_name, last_name, full_name: computedFullName },
          data: dataFields,
        }),
      })
      if (res.ok) {
        toast.success('Profile updated')
        refreshProfile()
      } else {
        queryClient.setQueryData(['my-profile'], previousData)
        toast.error('Failed to update profile')
      }
    } catch {
      queryClient.setQueryData(['my-profile'], previousData)
      toast.error('Failed to update profile')
    }
    setSaving(false)
  }

  const handleDownloadQR = useCallback(() => {
    const container = document.getElementById('profile-qr')
    if (!container) {
      toast.error('QR not ready')
      return
    }
    const canvas = container.querySelector('canvas')
    const svg = container.querySelector('svg')
    if (canvas) {
      const link = document.createElement('a')
      link.download = 'my-ya-qr.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
      return
    }
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg)
      const img = new Image()
      img.onload = () => {
        const c = document.createElement('canvas')
        c.width = img.width
        c.height = img.height
        const ctx = c.getContext('2d')
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, c.width, c.height)
        ctx.drawImage(img, 0, 0)
        const link = document.createElement('a')
        link.download = 'my-ya-qr.png'
        link.href = c.toDataURL('image/png')
        link.click()
      }
      img.onerror = () => toast.error('Download failed')
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
      return
    }
    toast.error('QR not ready')
  }, [])

  const handleShareQR = useCallback(async () => {
    if (!navigator.share) {
      toast.info('Sharing not supported on this device')
      return
    }
    const container = document.getElementById('profile-qr')
    if (!container) {
      toast.error('QR not ready')
      return
    }
    const canvas = container.querySelector('canvas')
    const svg = container.querySelector('svg')
    const getPngBlob = (cb) => {
      if (canvas) {
        canvas.toBlob(cb, 'image/png')
        return
      }
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg)
        const img = new Image()
        img.onload = () => {
          const c = document.createElement('canvas')
          c.width = img.width
          c.height = img.height
          const ctx = c.getContext('2d')
          ctx.fillStyle = 'white'
          ctx.fillRect(0, 0, c.width, c.height)
          ctx.drawImage(img, 0, 0)
          c.toBlob(cb, 'image/png')
        }
        img.onerror = () => toast.error('Share failed')
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
        return
      }
      cb(null)
    }
    getPngBlob(async (blob) => {
      if (!blob) {
        toast.error('QR not ready')
        return
      }
      try {
        const f = new File([blob], 'my-ya-qr.png', { type: 'image/png' })
        await navigator.share({ title: 'My YA QR', files: [f] })
        toast.success('Shared')
      } catch (e) {
        if (e.name !== 'AbortError') toast.error('Share failed')
      }
    })
  }, [])

  const core = profileCore || {}
  const data = profileData || {}

  if (profileLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="p-4 pb-6">
      {/* Digital ID Header Card */}
      <Card className="relative overflow-hidden border-2 shadow-sm">
        <CardHeader className="pb-3 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-14 w-14 shrink-0 border-2 border-background shadow">
                <AvatarFallback className="bg-primary/15 text-primary text-lg font-semibold">
                  {getInitials(core.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-foreground truncate">
                  {core.full_name || '--'}
                </h2>
                {core.member_id && (
                  <Badge variant="secondary" className="font-mono mt-1">
                    {core.member_id}
                  </Badge>
                )}
                {data.department && (
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {data.department}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setEditSheetOpen(true)}
              aria-label="Edit profile"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Tabbed content */}
      <Tabs defaultValue="personal" className="w-full mt-4">
        <TabsList className="grid w-full grid-cols-3 h-10">
          <TabsTrigger value="personal" className="gap-1.5 text-xs">
            <User className="h-3.5 w-3.5" />
            Personal Info
          </TabsTrigger>
          <TabsTrigger value="sewa" className="gap-1.5 text-xs">
            <MapPin className="h-3.5 w-3.5" />
            Department Details
          </TabsTrigger>
          <TabsTrigger value="qr" className="gap-1.5 text-xs">
            <QrCode className="h-3.5 w-3.5" />
            My QR
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">First Name</p>
                    <p className="text-sm font-medium">{core.first_name || '--'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Last Name</p>
                    <p className="text-sm font-medium">{core.last_name || '--'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Contact Number</p>
                    <p className="text-sm font-medium">{data.contact_number || '--'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Email</p>
                    <p className="text-sm font-medium">{data.email_id || '--'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Gender</p>
                    <p className="text-sm font-medium">{data.gender || '--'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CalendarDays className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Date of Birth</p>
                    <p className="text-sm font-medium">{data.date_of_birth || '--'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Hash className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Age</p>
                    <p className="text-sm font-medium">{data.age != null && data.age !== '' ? String(data.age) : '--'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 md:col-span-2">
                  <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Address</p>
                    <p className="text-sm font-medium break-words">{data.permanent_address || '--'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sewa" className="mt-4">
          <Card>
            <CardContent className="pt-4 pb-4 space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                  Department Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Department</p>
                      <p className="text-sm font-medium">{data.department || '--'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Map className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Region</p>
                      <p className="text-sm font-medium">{data.region || '--'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <HeartHandshake className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Primary Duty (Current)</p>
                      <p className="text-sm font-medium">{data.primary_duty_current || '--'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Briefcase className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Primary Duty (Permanent)</p>
                      <p className="text-sm font-medium">{data.primary_duty_permanent || '--'}</p>
                    </div>
                  </div>
                </div>
              </section>
              <Separator className="my-4" />
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                  YA Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <IdCard className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Permanent I-Card Status</p>
                      <p className="text-sm font-medium">{data.permanent_icard_status || '--'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shirt className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Uniform</p>
                      <p className="text-sm font-medium">{data.uniform || '--'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CalendarPlus className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Date of Joining / Orientation</p>
                      <p className="text-sm font-medium">{data.date_of_joining || '--'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Years of Membership</p>
                      <p className="text-sm font-medium">{data.years_of_membership != null && data.years_of_membership !== '' ? String(data.years_of_membership) : '--'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Activity className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Status</p>
                      <p className="text-sm font-medium">{data.active_status || '--'}</p>
                    </div>
                  </div>
                </div>
              </section>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qr" className="mt-4">
          <Card>
            <CardContent className="flex flex-col items-center py-8">
              <div id="profile-qr" className="bg-white p-4 rounded-xl shadow-inner">
                {QRCode && session?.user?.id ? (
                  <QRCode value={session.user.id} size={220} level="H" />
                ) : (
                  <div className="w-[220px] h-[220px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-3 text-center">
                Show this for identification
              </p>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={handleDownloadQR} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
                <Button variant="outline" size="sm" onClick={handleShareQR} className="gap-1.5">
                  <Share2 className="h-3.5 w-3.5" />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Sheet (slide-over) */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent
          side={sheetSide}
          className={
            sheetSide === 'bottom'
              ? 'h-[90vh] overflow-y-auto rounded-t-2xl'
              : 'w-full max-w-lg overflow-y-auto sm:max-w-xl'
          }
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Edit Profile</SheetTitle>
          </SheetHeader>
          <div className="pb-24">
            <Tabs defaultValue="personal" className="w-full">
              <div className="overflow-x-auto -mx-2 px-2 pb-1">
                <TabsList className="inline-flex w-auto min-w-full h-9">
                  {PROFILE_TABS.map((tab) => (
                    <TabsTrigger key={tab.id} value={tab.id} className="text-[11px] px-2.5 whitespace-nowrap">
                      {tab.label}
                    </TabsTrigger>
                  ))}
                  {isAdmin && (
                    <TabsTrigger value="sensitive" className="text-[11px] px-2.5 whitespace-nowrap">
                      Admin
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>
              {PROFILE_TABS.map((tab) => {
                const sections = groupBySection(tab.fields)
                const hasSections = Object.keys(sections).some((s) => s !== 'General')
                return (
                  <TabsContent key={tab.id} value={tab.id} className="mt-0 space-y-4">
                    {hasSections ? (
                      Object.entries(sections).map(([section, fields]) => (
                        <FieldGroup
                          key={section}
                          title={section}
                          icon={sectionIcons[section] || null}
                          fields={fields}
                          formData={formData}
                          onChange={handleChange}
                        />
                      ))
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {tab.fields.map((f) => (
                          <FormField
                            key={f.key}
                            field={f}
                            value={formData[f.key]}
                            onChange={handleChange}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                )
              })}
              {isAdmin && (
                <TabsContent value="sensitive" className="mt-0">
                  <Card>
                    <CardContent className="py-6 text-center">
                      <Shield className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Sensitive data is view-only here. Use the Volunteers list to manage sensitive fields.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
            <Button
              className="w-full h-12 font-medium"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
