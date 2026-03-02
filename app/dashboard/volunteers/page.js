'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useDashboard } from '@/contexts/DashboardContext'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FormField, FieldGroup } from '@/components/dashboard/form-fields'
import {
  User,
  Users,
  Search,
  Loader2,
  Save,
  Phone,
  MapPin,
  Package,
  Pencil,
  Mail,
  CalendarDays,
  Hash,
  Map,
  HeartHandshake,
  Briefcase,
  IdCard,
  Shirt,
  CalendarPlus,
  Clock,
  Activity,
  Shield,
  Heart,
  FileText,
  CheckCircle2,
  BarChart3,
  UserCog,
  ArrowLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { PROFILE_TABS, DEPARTMENT_FIELDS, groupBySection } from '@/lib/field-configs'

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
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
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

const PAGE_SIZE = 20
const DEBOUNCE_MS = 300

/**
 * List API response shape (GET /api/admin/volunteers) - smart fetch: core + explicit profiles_data for list + sheet.
 * @typedef {Object} VolunteerSheetData
 * @property {string} [contact_number]
 * @property {string} [email_id]
 * @property {string} [gender]
 * @property {string} [date_of_birth]
 * @property {string} [age]
 * @property {string} [permanent_address]
 * @property {string} [department]
 * @property {string} [region]
 * @property {string} [primary_duty_current]
 * @property {string} [primary_duty_permanent]
 * @property {string} [permanent_icard_status]
 * @property {string} [uniform]
 * @property {string} [date_of_joining]
 * @property {string} [years_of_membership]
 * @property {string} [active_status]
 */
/**
 * @typedef {Object} VolunteerListItem
 * @property {string} id
 * @property {string} user_id
 * @property {string} [full_name]
 * @property {string} [member_id]
 * @property {string} [photo_url]
 * @property {string} [role]
 * @property {VolunteerSheetData | null} [profiles_data]
 */

function useDebouncedValue(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debouncedValue
}

// --------------- Master list ---------------
function VolunteerMasterList({ session, onSelectVolunteer, canEdit }) {
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(0)
  const debouncedSearch = useDebouncedValue(searchInput, DEBOUNCE_MS)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['volunteers', debouncedSearch, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        search: debouncedSearch,
        page: page.toString(),
        pageSize: PAGE_SIZE.toString(),
      })
      const res = await fetch(`/api/admin/volunteers?${params}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch volunteers')
      return res.json()
    },
    enabled: !!session,
  })

  const totalPages = data ? Math.ceil((data.total || 0) / PAGE_SIZE) : 0
  const volunteers = data?.data ?? []
  const showLoading = isLoading || (isFetching && volunteers.length === 0)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0 bg-background border-b pb-3 pt-1 px-1 -mx-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Name or Member ID..."
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setPage(0) }}
            className="pl-10 h-11"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">{data?.total ?? '—'} volunteers</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pt-3 space-y-2">
        {showLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-3">
              <CardContent className="p-0">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-11 w-11 rounded-full shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex justify-between gap-2">
                      <Skeleton className="h-4 flex-1 max-w-32" />
                      <Skeleton className="h-5 w-14 shrink-0" />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Skeleton className="h-5 w-12 rounded-md" />
                      <Skeleton className="h-5 w-20 rounded-md" />
                      <Skeleton className="h-5 w-14 rounded-md" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : volunteers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No volunteers found</p>
            </CardContent>
          </Card>
        ) : (
          volunteers.map((vol) => {
            const pd = Array.isArray(vol.profiles_data) ? vol.profiles_data[0] : vol.profiles_data
            const gender = pd?.gender || '--'
            const center = pd?.department || '--'
            const zone = pd?.region || '--'
            const pillClass = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[11px] font-medium'
            return (
              <Card
                key={vol.id}
                className="p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => onSelectVolunteer(vol)}
              >
                <CardContent className="p-0">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-11 w-11 shrink-0">
                      <AvatarImage src={vol.photo_url} alt={vol.full_name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(vol.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <span className="font-semibold text-[15px] truncate">
                          {vol.full_name || 'Unnamed'}
                        </span>
                        {vol.member_id && (
                          <Badge variant="secondary" className="flex-shrink-0 text-[10px] font-mono">
                            {vol.member_id}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={pillClass}>
                          <User className="h-3 w-3 shrink-0" />
                          {gender}
                        </span>
                        <span className={`${pillClass} max-w-[120px] truncate`} title={center}>
                          <MapPin className="h-3 w-3 shrink-0" />
                          {center}
                        </span>
                        <span className={pillClass}>
                          <Map className="h-3 w-3 shrink-0" />
                          {zone}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="shrink-0 bg-background border-t py-3 flex items-center justify-between px-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

/** Normalize list item or API detail to { core, data } for the sheet. Handles Supabase returning profiles_data as object or single-element array. */
function toSheetVolunteer(selected) {
  if (!selected) return null
  const data = Array.isArray(selected.profiles_data) ? selected.profiles_data[0] : selected.profiles_data
  const { profiles_data: _pd, ...core } = selected
  return { core: core || {}, data: data || {} }
}

// --------------- Detail Sheet (zero-fetch: data from selectedVolunteer, instant open) ---------------
function VolunteerDetailSheet({
  selectedVolunteer,
  open,
  onClose,
  session,
  canEdit,
  setSelectedVolunteer,
  queryClient,
}) {
  const sheetSide = useSheetSide()
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('personal')
  const [formData, setFormData] = useState({})
  const [saving, setSaving] = useState(false)

  const volunteer = useMemo(
    () => (open && selectedVolunteer ? toSheetVolunteer(selectedVolunteer) : null),
    [open, selectedVolunteer]
  )

  // Reset edit mode when sheet closes so next volunteer opens in read-only view
  useEffect(() => {
    if (!open) setIsEditing(false)
  }, [open])

  useEffect(() => {
    if (volunteer?.core || volunteer?.data) {
      setFormData({
        ...(volunteer.data || {}),
        user_id: volunteer.core?.user_id ?? '',
        member_id: volunteer.core?.member_id ?? '',
        first_name: volunteer.core?.first_name ?? '',
        middle_name: volunteer.core?.middle_name ?? '',
        last_name: volunteer.core?.last_name ?? '',
        full_name: volunteer.core?.full_name ?? '',
      })
    }
  }, [volunteer])

  const handleChange = useCallback((key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSave = useCallback(async () => {
    const previous = selectedVolunteer
    const targetUserId =
      volunteer?.core?.user_id ?? selectedVolunteer?.user_id ?? formData.user_id
    if (!targetUserId) {
      console.warn(
        '[VolunteerDetailSheet] Missing target_user_id: volunteer.core.user_id and selectedVolunteer.user_id are missing. Cannot save.'
      )
      toast.error('Cannot save: volunteer user ID is missing.')
      return
    }
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
      ...(volunteer?.core || {}),
      member_id: member_id ?? volunteer?.core?.member_id,
      first_name: first_name ?? volunteer?.core?.first_name,
      middle_name: middle_name ?? volunteer?.core?.middle_name,
      last_name: last_name ?? volunteer?.core?.last_name,
      full_name: computedFullName,
    }
    const optimisticData = { ...(volunteer?.data || {}), ...dataFields }
    const optimisticDetail = {
      ...volunteer,
      core: optimisticCore,
      data: optimisticData,
    }

    const optimisticListItem = { ...optimisticCore, profiles_data: optimisticData }
    setSelectedVolunteer(optimisticListItem)
    queryClient.setQueriesData({ queryKey: ['volunteers'] }, (old) => {
      if (!old?.data) return old
      return {
        ...old,
        data: old.data.map((v) =>
          (v.user_id ?? v.id) === targetUserId
            ? { ...v, full_name: optimisticCore.full_name, member_id: optimisticCore.member_id, photo_url: optimisticCore.photo_url ?? v.photo_url, profiles_data: optimisticData }
            : v
        ),
      }
    })
    setIsEditing(false)
    setSaving(true)

    try {
      const res = await fetch('/api/admin/volunteer-update', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_user_id: targetUserId,
          core: { member_id, first_name, middle_name, last_name, full_name: computedFullName },
          data: dataFields,
        }),
      })
      if (res.ok) {
        toast.success('Changes saved')
      } else {
        const err = await res.json().catch(() => ({}))
        setSelectedVolunteer(previous)
        queryClient.invalidateQueries({ queryKey: ['volunteers'] })
        toast.error(err.error || 'Save failed')
      }
    } catch {
      setSelectedVolunteer(previous)
      queryClient.invalidateQueries({ queryKey: ['volunteers'] })
      toast.error('Save failed')
    }
    setSaving(false)
  }, [formData, session, queryClient, volunteer, selectedVolunteer, setSelectedVolunteer])

  const displayName = volunteer?.core?.full_name || formData.full_name || 'Volunteer'
  const core = volunteer?.core ?? {}
  const data = volunteer?.data ?? {}
  const showContent = !!volunteer

  const sheetContentClass =
    sheetSide === 'bottom'
      ? 'h-[90vh] overflow-hidden flex flex-col rounded-t-2xl p-0'
      : 'w-full max-w-lg overflow-hidden flex flex-col sm:max-w-xl p-0'

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setSelectedVolunteer(null)
          setIsEditing(false)
          setActiveTab('personal')
          onClose()
        }
      }}
    >
      <SheetContent
        side={sheetSide}
        className={`${sheetContentClass} [&>button.absolute]:hidden`}
        onPointerDownOutside={(e) => isEditing && e.preventDefault()}
        onInteractOutside={(e) => isEditing && e.preventDefault()}
      >
        {isEditing ? (
          <>
            <SheetHeader className="px-4 pt-4 pb-2 border-b shrink-0 text-left">
              <SheetTitle>Edit Volunteer: {displayName}</SheetTitle>
            </SheetHeader>
            <div className="flex-1 flex flex-col min-h-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <div className="sticky top-0 z-10 bg-background border-b shrink-0 px-4 pt-2 pb-2 -mx-4 px-4">
                  <div className="overflow-x-auto -mx-2 px-2">
                    <TabsList className="inline-flex w-auto min-w-full h-9">
                      {PROFILE_TABS.map((tab) => (
                        <TabsTrigger
                          key={tab.id}
                          value={tab.id}
                          className="text-[11px] px-2.5 whitespace-nowrap"
                        >
                          {tab.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3 pb-24 min-h-0">
                  {PROFILE_TABS.map((tab) => {
                    const sections = groupBySection(tab.fields)
                    const hasSections = Object.keys(sections).some((s) => s !== 'General')
                    return (
                      <TabsContent key={tab.id} value={tab.id} className="mt-0 space-y-4 data-[state=inactive]:hidden">
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
                </div>
              </Tabs>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1 font-medium"
                onClick={() => {
                  setActiveTab('personal')
                  setIsEditing(false)
                }}
              >
                Cancel
              </Button>
              <Button
                className="h-12 flex-1 font-medium"
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
          </>
        ) : showContent ? (
          <>
            <SheetHeader
              className={`relative px-4 pt-4 pb-3 border-b shrink-0 text-left ${sheetSide === 'right' && canEdit ? 'pr-20' : 'pr-12'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar className="h-14 w-14 shrink-0 border-2 border-background shadow">
                    <AvatarImage src={volunteer?.core?.photo_url} alt={displayName} />
                    <AvatarFallback className="bg-primary/15 text-primary text-lg font-semibold">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <SheetTitle className="text-xl font-bold text-foreground truncate">
                      {core.full_name || '--'}
                    </SheetTitle>
                    {core.member_id && (
                      <Badge variant="secondary" className="font-mono mt-1">
                        {core.member_id}
                      </Badge>
                    )}
                  </div>
                </div>
                {canEdit && (
                  sheetSide === 'right' ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="absolute right-12 top-4 z-10 h-9 w-9 shrink-0 bg-background"
                      onClick={() => setIsEditing(true)}
                      aria-label="Edit volunteer"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setIsEditing(true)}
                      aria-label="Edit volunteer"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )
                )}
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-10 mb-4">
                    <TabsTrigger value="personal" className="gap-1.5 text-xs">
                      <User className="h-3.5 w-3.5" />
                      Personal Info
                    </TabsTrigger>
                    <TabsTrigger value="sewa" className="gap-1.5 text-xs">
                      <MapPin className="h-3.5 w-3.5" />
                      Department Details
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="personal" className="mt-0">
                    <Card>
                      <CardContent className="pt-4 pb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <User className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
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

                  <TabsContent value="sewa" className="mt-0">
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
                </Tabs>
            </div>
            <div className="shrink-0 px-4 pb-4 pt-2 border-t bg-background">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  setSelectedVolunteer(null)
                  setActiveTab('personal')
                  onClose()
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

// --------------- Page ---------------
export default function VolunteersPage() {
  const { session, role, accessibleModules } = useDashboard()
  const queryClient = useQueryClient()
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  /** @type {[VolunteerListItem | { core: object, data: object } | null, React.Dispatch<React.SetStateAction<VolunteerListItem | { core: object, data: object } | null>>]} */
  const [selectedVolunteer, setSelectedVolunteer] = useState(null)

  const modules = accessibleModules ?? []
  const canEdit =
    role === 'admin' ||
    (Array.isArray(modules) &&
      (modules.includes('profile_edit') || modules.includes('directory:edit') || modules.includes('directory_edit')))

  const handleSelect = useCallback((vol) => {
    setSelectedVolunteer(vol)
    setIsSheetOpen(true)
  }, [])

  const handleCloseSheet = useCallback(() => {
    setIsSheetOpen(false)
    setSelectedVolunteer(null)
  }, [])

  return (
    <div className="p-4 pb-6 flex flex-col">
      <div className="shrink-0 mb-3">
        <h2 className="text-lg font-bold">Volunteers</h2>
        <p className="text-xs text-muted-foreground">
          Search and view volunteer profiles
        </p>
      </div>

      <div className="flex flex-col max-h-[calc(100vh-14rem)] min-h-[320px]">
        <VolunteerMasterList
          session={session}
          onSelectVolunteer={handleSelect}
          canEdit={canEdit}
        />
      </div>

      <VolunteerDetailSheet
        selectedVolunteer={selectedVolunteer}
        open={isSheetOpen}
        onClose={handleCloseSheet}
        session={session}
        canEdit={canEdit}
        setSelectedVolunteer={setSelectedVolunteer}
        queryClient={queryClient}
      />
    </div>
  )
}
