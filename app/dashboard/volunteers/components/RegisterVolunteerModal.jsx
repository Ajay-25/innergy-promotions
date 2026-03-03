'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { registerVolunteer } from '@/app/actions/admin'
import { PERMISSION_GROUPS, ROLE_PERMISSIONS_MAP } from '@/lib/permissions'
import { ZONE_OPTIONS, GENDER_OPTIONS, QUALIFICATION_OPTIONS, PROFESSION_OPTIONS, MOBILE_10_DIGIT_REGEX } from '@/lib/constants'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Loader2,
  Shield,
  Users,
  Calendar,
  Megaphone,
} from 'lucide-react'
import { toast } from 'sonner'

const PHONE_PREFIX = '+91'

const GROUP_ICONS = {
  System: Shield,
  Sewadars: Users,
  Events: Calendar,
  Promotions: Megaphone,
}

function getInitialGroupEnabled(role) {
  const perms = ROLE_PERMISSIONS_MAP[role] ?? ROLE_PERMISSIONS_MAP.volunteer ?? []
  const out = {}
  Object.keys(PERMISSION_GROUPS).forEach((category) => {
    const keys = PERMISSION_GROUPS[category].map((p) => p.key)
    out[category] = keys.some((k) => perms.includes(k))
  })
  return out
}

function RegisterVolunteerModal({ open, onOpenChange, prefill, onSuccess }) {
  const [full_name, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [gender, setGender] = useState('')
  const [dob, setDob] = useState('')
  const [zone, setZone] = useState('')
  const [center, setCenter] = useState('')
  const [qualification, setQualification] = useState('')
  const [qualification_other, setQualificationOther] = useState('')
  const [profession, setProfession] = useState('')
  const [profession_other, setProfessionOther] = useState('')
  const [system_role, setSystemRole] = useState('volunteer')
  const [selectedPermissions, setSelectedPermissions] = useState(() => ROLE_PERMISSIONS_MAP.volunteer ?? [])
  const [groupEnabled, setGroupEnabled] = useState(() => getInitialGroupEnabled('volunteer'))
  const [sewa_type, setSewaType] = useState('Promotion')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && prefill) {
      setFullName(prefill.full_name || '')
      setEmail(prefill.email || '')
      setPhoneDigits('')
      setPhoneError('')
      setGender('')
      setDob('')
      setZone('')
      setCenter('')
      setQualification('')
      setQualificationOther('')
      setProfession('')
      setProfessionOther('')
      setSystemRole('volunteer')
      setSelectedPermissions(ROLE_PERMISSIONS_MAP.volunteer ?? [])
      setGroupEnabled(getInitialGroupEnabled('volunteer'))
      setSewaType('Promotion')
    }
  }, [open, prefill])

  const validatePhone = useCallback((value) => {
    if (!value.trim()) return ''
    const digits = value.replace(/\D/g, '')
    if (digits.length !== 10) return 'Enter exactly 10 digits'
    if (!MOBILE_10_DIGIT_REGEX.test(digits)) return 'Invalid Indian mobile number'
    return ''
  }, [])

  const onPhoneBlur = useCallback(() => {
    setPhoneError(validatePhone(phoneDigits))
  }, [phoneDigits, validatePhone])

  const onPhoneChange = useCallback((e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 10)
    setPhoneDigits(v)
    if (phoneError) setPhoneError(validatePhone(v))
  }, [phoneError, validatePhone])

  const onRoleChange = useCallback((value) => {
    setSystemRole(value)
    const rolePerms = ROLE_PERMISSIONS_MAP[value] ?? ROLE_PERMISSIONS_MAP.volunteer ?? []
    setSelectedPermissions([...rolePerms])
    setGroupEnabled(getInitialGroupEnabled(value))
  }, [])

  const togglePermission = useCallback((key) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    )
  }, [])

  const setGroupMaster = useCallback((category, enabled) => {
    const groupKeys = PERMISSION_GROUPS[category].map((p) => p.key)
    setGroupEnabled((prev) => ({ ...prev, [category]: enabled }))
    if (!enabled) {
      setSelectedPermissions((prev) => prev.filter((p) => !groupKeys.includes(p)))
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const phoneErr = validatePhone(phoneDigits)
    if (phoneDigits.trim() && phoneErr) {
      setPhoneError(phoneErr)
      toast.error(phoneErr)
      return
    }
    setPhoneError('')
    setSaving(true)
    const phone = phoneDigits.trim() ? `${PHONE_PREFIX}${phoneDigits.replace(/\D/g, '').slice(0, 10)}` : ''
    const res = await registerVolunteer({
      full_name,
      email,
      phone,
      gender: gender || undefined,
      dob: dob || undefined,
      zone: zone || undefined,
      center: center || undefined,
      qualification: qualification || undefined,
      qualification_other: qualification === 'Other' ? qualification_other : undefined,
      profession: profession || undefined,
      profession_other: profession === 'Other' ? profession_other : undefined,
      system_role,
      permissions: selectedPermissions,
      sewa_type,
    })
    setSaving(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success('Volunteer registered successfully')
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0 [&>button]:hidden">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>Register Volunteer</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Add demographic and organizational details. Assign role and permissions below.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-6 min-h-0">
            {/* Personal Details - Email & Mobile at top */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground border-b pb-1">Personal Details</h4>
              <div className="space-y-2">
                <Label htmlFor="reg-full_name">Name</Label>
                <Input
                  id="reg-full_name"
                  value={full_name}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-email">Email</Label>
                <Input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-phone">Phone No.</Label>
                <div className="flex rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  <span className="inline-flex items-center px-3 text-muted-foreground border-r text-sm">
                    {PHONE_PREFIX}
                  </span>
                  <Input
                    id="reg-phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="10-digit Indian mobile number"
                    value={phoneDigits}
                    onChange={onPhoneChange}
                    onBlur={onPhoneBlur}
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-l-none"
                    maxLength={10}
                  />
                </div>
                {phoneError && (
                  <p className="text-xs text-destructive">{phoneError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-dob">Date of Birth</Label>
                <Input
                  id="reg-dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  placeholder="Select date"
                />
              </div>
              <div className="space-y-2">
                <Label>Qualification</Label>
                <Select value={qualification} onValueChange={setQualification}>
                  <SelectTrigger><SelectValue placeholder="Select qualification" /></SelectTrigger>
                  <SelectContent>
                    {QUALIFICATION_OPTIONS.map((q) => (
                      <SelectItem key={q} value={q}>{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {qualification === 'Other' && (
                <div className="space-y-2">
                  <Label htmlFor="reg-qualification_other">Specify qualification</Label>
                  <Input
                    id="reg-qualification_other"
                    value={qualification_other}
                    onChange={(e) => setQualificationOther(e.target.value)}
                    placeholder="Specify qualification"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Profession</Label>
                <Select value={profession} onValueChange={setProfession}>
                  <SelectTrigger><SelectValue placeholder="Select profession" /></SelectTrigger>
                  <SelectContent>
                    {PROFESSION_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {profession === 'Other' && (
                <div className="space-y-2">
                  <Label htmlFor="reg-profession_other">Specify profession</Label>
                  <Input
                    id="reg-profession_other"
                    value={profession_other}
                    onChange={(e) => setProfessionOther(e.target.value)}
                    placeholder="Specify profession"
                  />
                </div>
              )}
            </div>

            {/* Organizational Details */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground border-b pb-1">Organizational Details</h4>
              <div className="space-y-2">
                <Label>Zone</Label>
                <Select value={zone} onValueChange={setZone}>
                  <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
                  <SelectContent>
                    {ZONE_OPTIONS.map((z) => (
                      <SelectItem key={z} value={z}>{z}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-center">Center</Label>
                <Input
                  id="reg-center"
                  value={center}
                  onChange={(e) => setCenter(e.target.value)}
                  placeholder="Center name"
                />
              </div>
              <div className="space-y-2">
                <Label>Sewa Type</Label>
                <Select value={sewa_type} onValueChange={setSewaType}>
                  <SelectTrigger><SelectValue placeholder="Select sewa type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Trainer">Trainer</SelectItem>
                    <SelectItem value="Promotion">Promotion</SelectItem>
                    <SelectItem value="Both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Role & Permissions - Accordion + Master Toggles */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground border-b pb-1">Role & Permissions</h4>
              <div className="space-y-2">
                <Label>System Role</Label>
                <Select value={system_role} onValueChange={onRoleChange}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="volunteer">Volunteer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Enable a group with the switch, then expand to select individual permissions. Role preset updates toggles and selections.
              </p>
              <Accordion type="multiple" defaultValue={[]} className="w-full">
                {Object.entries(PERMISSION_GROUPS).map(([category, items]) => {
                  const groupKeys = items.map((p) => p.key)
                  const enabled = groupEnabled[category] ?? false
                  const count = groupKeys.filter((k) => selectedPermissions.includes(k)).length
                  const Icon = GROUP_ICONS[category] ?? Shield
                  return (
                    <AccordionItem key={category} value={category} className="border rounded-lg px-3 mb-2 bg-muted/30">
                      <AccordionTrigger className="py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                        <div className="flex items-center gap-3 w-full pr-2">
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="text-sm font-medium text-left flex-1">{category}</span>
                          <span className="text-xs text-muted-foreground">
                            {count}/{groupKeys.length}
                          </span>
                          <Switch
                            checked={enabled}
                            onCheckedChange={(checked) => setGroupMaster(category, checked)}
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                          />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-3 pt-0">
                        <div className="space-y-2">
                          {items.map(({ key, label }) => (
                            <div
                              key={key}
                              className={`flex items-center gap-3 rounded-md border px-3 py-2 ${!enabled ? 'opacity-50 bg-muted/50 pointer-events-none' : ''}`}
                            >
                              <Checkbox
                                id={`reg-perm-${key}`}
                                checked={selectedPermissions.includes(key)}
                                onCheckedChange={() => togglePermission(key)}
                                disabled={!enabled}
                              />
                              <label
                                htmlFor={`reg-perm-${key}`}
                                className={`text-sm flex-1 ${enabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                              >
                                {label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t bg-background px-6 py-4 mt-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Register Volunteer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { RegisterVolunteerModal }
