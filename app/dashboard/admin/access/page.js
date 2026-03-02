'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useDashboard } from '@/contexts/DashboardContext'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getUnifiedAccessDirectory, updateUserAccess, registerVolunteer } from '@/app/actions/admin'
import { RegisterVolunteerModal } from '@/app/dashboard/volunteers/components/RegisterVolunteerModal'
import { PERMISSION_GROUPS, ROLE_PERMISSIONS_MAP } from '@/lib/permissions'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import {
  Search,
  Shield,
  ShieldCheck,
  Users,
  UserPlus,
  Loader2,
  Save,
  Crown,
  UserCog,
  Calendar,
  Megaphone,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Helpers ────────────────────────────────────────────────

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

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const ALL_PERMISSION_KEYS = Object.values(PERMISSION_GROUPS).flatMap((g) => g.map((p) => p.key))

const GROUP_ICONS = {
  System: Shield,
  Sewadars: Users,
  Events: Calendar,
  Promotions: Megaphone,
}

function getInitialGroupEnabledFromPermissions(permissions) {
  const perms = Array.isArray(permissions) ? permissions : []
  const out = {}
  Object.keys(PERMISSION_GROUPS).forEach((category) => {
    const keys = PERMISSION_GROUPS[category].map((p) => p.key)
    out[category] = keys.some((k) => perms.includes(k))
  })
  return out
}

/** Categorize unified directory into Pending, Core Team, Volunteers */
function categorizeUsers(users) {
  const pendingAction = users.filter((u) => !u.isSewadar)
  const coreTeam = users.filter(
    (u) => u.isSewadar && u.system_role && ['admin', 'moderator'].includes(String(u.system_role).toLowerCase())
  )
  const volunteers = users.filter(
    (u) => u.isSewadar && (!u.system_role || String(u.system_role).toLowerCase() === 'volunteer')
  )
  return { pendingAction, coreTeam, volunteers }
}

// ─── User Card (identity + role badge + CTA) ─────────────────

const ROLE_BADGE_CLASSES = {
  admin: 'shrink-0 gap-1 text-[10px] bg-red-100 text-red-800 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
  moderator: 'shrink-0 gap-1 text-[10px] bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  volunteer: 'shrink-0 gap-1 text-[10px] bg-green-100 text-green-800 border border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800',
}

function UserCard({ user, currentUserSystemRole, onManageAccess, onRegisterSewadar }) {
  const role = user.system_role ? String(user.system_role).toLowerCase() : null
  const isAdmin = role === 'admin'
  const isModerator = role === 'moderator'
  const isVolunteer = role === 'volunteer' || (user.isSewadar && !role)
  const isPending = !user.isSewadar
  const currentIsModerator = (currentUserSystemRole || '').toLowerCase() === 'moderator'
  const hierarchyLock = currentIsModerator && isAdmin
  const permissionCount = Array.isArray(user.permissions) ? user.permissions.length : 0

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-row items-center justify-between gap-4 p-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar className="h-11 w-11 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground truncate">
                  {user.full_name || 'Unnamed'}
                </span>
                {isAdmin && (
                  <Badge className={ROLE_BADGE_CLASSES.admin}>
                    <Crown className="h-3 w-3" />
                    Admin
                  </Badge>
                )}
                {isModerator && (
                  <Badge className={ROLE_BADGE_CLASSES.moderator}>
                    <ShieldCheck className="h-3 w-3" />
                    Moderator
                  </Badge>
                )}
                {isVolunteer && !isAdmin && !isModerator && (
                  <Badge className={ROLE_BADGE_CLASSES.volunteer}>
                    <Users className="h-3 w-3" />
                    Volunteer
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground truncate" title={user.email || ''}>
                {user.email || '—'}
              </p>
              {!isPending && (user.phone || user.zone) && (
                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                  {[user.phone, user.zone].filter(Boolean).join(' · ')}
                </p>
              )}
              {!isPending && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {permissionCount} Permission{permissionCount !== 1 ? 's' : ''} Assigned
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {isPending ? (
              <>
                <Button
                  size="sm"
                  className="gap-1.5 font-medium shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRegisterSewadar?.(user)
                  }}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Register Sewadar
                </Button>
                <p className="text-[10px] text-muted-foreground text-right">
                  Action required to grant access
                </p>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={hierarchyLock}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!hierarchyLock) onManageAccess?.(user)
                  }}
                >
                  <UserCog className="h-3.5 w-3.5" />
                  Manage Access
                </Button>
                <p className="text-[10px] text-muted-foreground text-right">
                  {hierarchyLock ? 'Managed by Admins only' : 'Permissions & role'}
                </p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Promote / Search Sewadar Dialog ────────────────────────

function PromoteDialog({ open, onOpenChange, staff, onSelect }) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)

  const results = useMemo(() => {
    if (!debouncedSearch.trim()) return []
    const q = debouncedSearch.toLowerCase()
    return staff.filter(
      (u) =>
        (u.full_name && String(u.full_name).toLowerCase().includes(q)) ||
        (u.email && String(u.email).toLowerCase().includes(q))
    )
  }, [staff, debouncedSearch])

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" />
            Grant Access / Promote Volunteer
          </DialogTitle>
        </DialogHeader>
        <Command className="border-t" shouldFilter={false}>
          <CommandInput
            placeholder="Search by name or email..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-72">
            {debouncedSearch.length < 2 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search
              </div>
            ) : (
              <>
                <CommandEmpty>No sewadars found.</CommandEmpty>
                <CommandGroup>
                  {results.map((u) => (
                    <CommandItem
                      key={u.id}
                      value={u.id}
                      onSelect={() => {
                        onSelect(u)
                        onOpenChange(false)
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(u.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.full_name || 'Unnamed'}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.email || '—'}
                        </p>
                      </div>
                      {(u.permissions?.length ?? 0) > 0 && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {(u.permissions ?? []).length} permission{(u.permissions ?? []).length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

// ─── Staff Master List (categorized sections + UserCards) ─────

function StaffMasterList({
  users,
  isLoading,
  currentUserSystemRole,
  onSelectUser,
  onRegisterAsSewadar,
}) {
  const [searchInput, setSearchInput] = useState('')

  const filtered = useMemo(() => {
    if (!searchInput.trim()) return users
    const q = searchInput.toLowerCase()
    return users.filter(
      (u) =>
        (u.full_name && String(u.full_name).toLowerCase().includes(q)) ||
        (u.email && String(u.email).toLowerCase().includes(q))
    )
  }, [users, searchInput])

  const { pendingAction, coreTeam, volunteers } = useMemo(
    () => categorizeUsers(filtered),
    [filtered]
  )

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-0 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filter by name or email..." className="pl-10 h-11" disabled />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const hasAny = pendingAction.length > 0 || coreTeam.length > 0 || volunteers.length > 0

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          {filtered.length} user{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pb-6">
        {!hasAny ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No users found</p>
              <p className="text-xs mt-1">Clerk users and registered sewadars appear here</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {pendingAction.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Pending Action
                </h2>
                <p className="text-xs text-muted-foreground mb-3">
                  Unlinked Clerk users — register as sewadar to grant access
                </p>
                <div className="space-y-2">
                  {pendingAction.map((u) => (
                    <UserCard
                      key={u.id}
                      user={u}
                      currentUserSystemRole={currentUserSystemRole}
                      onManageAccess={onSelectUser}
                      onRegisterSewadar={onRegisterAsSewadar}
                    />
                  ))}
                </div>
              </section>
            )}

            {coreTeam.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Core Team
                </h2>
                <p className="text-xs text-muted-foreground mb-3">
                  Admins & Moderators
                </p>
                <div className="space-y-2">
                  {coreTeam.map((u) => (
                    <UserCard
                      key={u.id}
                      user={u}
                      currentUserSystemRole={currentUserSystemRole}
                      onManageAccess={onSelectUser}
                      onRegisterSewadar={onRegisterAsSewadar}
                    />
                  ))}
                </div>
              </section>
            )}

            {volunteers.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Volunteers
                </h2>
                <p className="text-xs text-muted-foreground mb-3">
                  Registered sewadars with volunteer role
                </p>
                <div className="space-y-2">
                  {volunteers.map((u) => (
                    <UserCard
                      key={u.id}
                      user={u}
                      currentUserSystemRole={currentUserSystemRole}
                      onManageAccess={onSelectUser}
                      onRegisterSewadar={onRegisterAsSewadar}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Access Control Sheet (permissions grid or Register CTA) ─

function AccessControlSheet({
  selectedUser,
  open,
  onClose,
  queryClient,
  onRegisterAsSewadar,
  currentUserSystemRole,
}) {
  const sheetSide = useSheetSide()
  const [selectedPermissions, setSelectedPermissions] = useState([])
  const [selectedSystemRole, setSelectedSystemRole] = useState('volunteer')
  const [groupEnabled, setGroupEnabled] = useState(() => getInitialGroupEnabledFromPermissions([]))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (selectedUser) {
      const perms = Array.isArray(selectedUser.permissions) ? [...selectedUser.permissions] : []
      setSelectedPermissions(perms)
      setSelectedSystemRole((selectedUser.system_role || 'volunteer').toLowerCase())
      setGroupEnabled(getInitialGroupEnabledFromPermissions(perms))
    }
  }, [selectedUser])

  const permissionsDirty = useMemo(() => {
    if (!selectedUser || !selectedUser.isSewadar) return false
    const current = (selectedUser.permissions ?? []).slice().sort()
    const next = selectedPermissions.slice().sort()
    if (current.length !== next.length) return true
    return current.some((p, i) => p !== next[i])
  }, [selectedUser, selectedPermissions])

  const roleDirty = useMemo(() => {
    if (!selectedUser || !selectedUser.isSewadar) return false
    return (selectedUser.system_role || 'volunteer').toLowerCase() !== selectedSystemRole
  }, [selectedUser, selectedSystemRole])

  const isDirty = permissionsDirty || roleDirty
  const currentIsModerator = (currentUserSystemRole || '').toLowerCase() === 'moderator'
  const targetIsAdmin = (selectedUser?.system_role || '').toLowerCase() === 'admin'
  const hierarchyLock = currentIsModerator && targetIsAdmin

  const onRoleChange = useCallback((value) => {
    setSelectedSystemRole(value)
    const rolePerms = ROLE_PERMISSIONS_MAP[value] ?? ROLE_PERMISSIONS_MAP.volunteer ?? []
    setSelectedPermissions([...rolePerms])
    setGroupEnabled(getInitialGroupEnabledFromPermissions(rolePerms))
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

  const handleSave = useCallback(async () => {
    if (!selectedUser || !selectedUser.email || !selectedUser.isSewadar) return
    setSaving(true)
    try {
      const res = await updateUserAccess(selectedUser.email, selectedSystemRole, selectedPermissions)
      if (res.error) {
        toast.error(res.error)
        setSaving(false)
        return
      }
      toast.success(`Access updated for ${selectedUser.full_name || selectedUser.email}`)
      queryClient.invalidateQueries({ queryKey: ['access-staff'] })
      onClose()
    } catch {
      toast.error('Failed to save changes')
    }
    setSaving(false)
  }, [selectedUser, selectedPermissions, selectedSystemRole, queryClient, onClose])

  const handleRegisterClick = useCallback(() => {
    if (selectedUser && onRegisterAsSewadar) {
      onRegisterAsSewadar(selectedUser)
      onClose()
    }
  }, [selectedUser, onRegisterAsSewadar, onClose])

  const displayName = selectedUser?.full_name || 'User'
  const isSewadar = selectedUser?.isSewadar === true

  const sheetContentClass =
    sheetSide === 'bottom'
      ? 'h-[90vh] overflow-hidden flex flex-col rounded-t-2xl p-0'
      : 'w-full max-w-lg overflow-hidden flex flex-col sm:max-w-xl p-0'

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <SheetContent
        side={sheetSide}
        className={`${sheetContentClass} [&>button.absolute]:hidden`}
      >
        {selectedUser ? (
          <>
            <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0 text-left">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14 shrink-0 border-2 border-background shadow">
                  <AvatarFallback className="bg-primary/15 text-primary text-lg font-semibold">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SheetTitle className="text-xl font-bold text-foreground truncate">
                      {displayName}
                    </SheetTitle>
                    {isSewadar && (
                      <Badge variant="default" className="text-[10px]">Registered Sewadar</Badge>
                    )}
                  </div>
                  {selectedUser.email && (
                    <Badge variant="outline" className="mt-1 font-mono text-xs">
                      {selectedUser.email}
                    </Badge>
                  )}
                  {isSewadar && (selectedUser.phone || selectedUser.zone) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[selectedUser.phone, selectedUser.zone].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0 space-y-4 pb-28">
              {isSewadar ? (
                <>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      System Role
                    </p>
                    <Select
                      value={selectedSystemRole}
                      onValueChange={onRoleChange}
                      disabled={hierarchyLock || currentIsModerator}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {!currentIsModerator && (
                          <SelectItem value="admin">Admin</SelectItem>
                        )}
                        <SelectItem value="moderator">Moderator</SelectItem>
                        <SelectItem value="volunteer">Volunteer</SelectItem>
                      </SelectContent>
                    </Select>
                    {(currentIsModerator || hierarchyLock) && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {hierarchyLock ? 'Managed by Admins only.' : 'Only Admins can change system role.'}
                      </p>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Permissions
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Enable a group with the switch, then expand to select individual permissions.
                  </p>
                  <Accordion
                    type="multiple"
                    defaultValue={[]}
                    className={`w-full ${hierarchyLock ? 'pointer-events-none opacity-60' : ''}`}
                  >
                    {Object.entries(PERMISSION_GROUPS).map(([category, items]) => {
                      const groupKeys = items.map((p) => p.key)
                      const enabled = groupEnabled[category] ?? false
                      const count = groupKeys.filter((k) => selectedPermissions.includes(k)).length
                      const Icon = GROUP_ICONS[category] ?? Shield
                      return (
                        <AccordionItem
                          key={category}
                          value={category}
                          className="border rounded-lg px-3 mb-2 bg-muted/30"
                        >
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
                                disabled={hierarchyLock}
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
                                    id={`perm-${key}`}
                                    checked={selectedPermissions.includes(key)}
                                    onCheckedChange={() => togglePermission(key)}
                                    disabled={hierarchyLock || !enabled}
                                  />
                                  <label
                                    htmlFor={`perm-${key}`}
                                    className={`text-sm flex-1 ${enabled && !hierarchyLock ? 'cursor-pointer' : 'cursor-not-allowed'}`}
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
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    This user has signed in with Clerk but is not yet registered as a sewadar. Register them to assign permissions and link their account.
                  </p>
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    onClick={handleRegisterClick}
                  >
                    <UserPlus className="h-4 w-4" />
                    Register as Sewadar
                  </Button>
                </div>
              )}
            </div>

            {isSewadar ? (
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 flex-1 font-medium"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  className="h-12 flex-1 font-medium"
                  disabled={!isDirty || saving || hierarchyLock}
                  onClick={handleSave}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  ) : (
                    <Save className="h-4 w-4 mr-1.5" />
                  )}
                  Save Permissions
                </Button>
              </div>
            ) : (
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full font-medium"
                  onClick={onClose}
                >
                  Close
                </Button>
              </div>
            )}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

// ─── Page ───────────────────────────────────────────────────

export default function AccessManagementPage() {
  const { hasPermission, systemRole: currentUserSystemRole } = useDashboard()
  const queryClient = useQueryClient()
  const [selectedUser, setSelectedUser] = useState(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isPromoteOpen, setIsPromoteOpen] = useState(false)
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false)
  const [registerPrefill, setRegisterPrefill] = useState(null)
  const canManageAccess = hasPermission('system:manage_access')

  const { data, isLoading } = useQuery({
    queryKey: ['access-staff'],
    queryFn: async () => {
      const res = await getUnifiedAccessDirectory()
      if (res.error) throw new Error(res.error)
      return { data: res.data }
    },
    enabled: canManageAccess,
  })

  const staff = data?.data ?? []

  const handleSelectUser = useCallback((user) => {
    setSelectedUser(user)
    setIsSheetOpen(true)
  }, [])

  const handleCloseSheet = useCallback(() => {
    setIsSheetOpen(false)
    setSelectedUser(null)
  }, [])

  const handlePromoteSelect = useCallback((user) => {
    setSelectedUser(user)
    setIsSheetOpen(true)
  }, [])

  const handleRegisterAsSewadar = useCallback((user) => {
    setRegisterPrefill({
      email: user.email || '',
      full_name: user.full_name || '',
    })
    setRegisterDialogOpen(true)
  }, [])

  const handleRegisterSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['access-staff'] })
  }, [queryClient])

  if (!canManageAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-center px-4">
        <div>
          <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <h2 className="text-lg font-semibold mb-1">Access Denied</h2>
          <p className="text-sm text-muted-foreground">
            You need &quot;Manage Access&quot; permission to view this page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full px-4 pb-20">
      <div className="shrink-0 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Access Management</h1>
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setIsPromoteOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Grant Access</span>
            <span className="sm:hidden">Promote</span>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Unified directory: registered sewadars and Clerk users. Register users to assign permissions.
        </p>
      </div>

      <StaffMasterList
        users={staff}
        isLoading={isLoading}
        currentUserSystemRole={currentUserSystemRole}
        onSelectUser={handleSelectUser}
        onRegisterAsSewadar={handleRegisterAsSewadar}
      />

      <PromoteDialog
        open={isPromoteOpen}
        onOpenChange={setIsPromoteOpen}
        staff={staff}
        onSelect={handlePromoteSelect}
      />

      <AccessControlSheet
        selectedUser={selectedUser}
        open={isSheetOpen}
        onClose={handleCloseSheet}
        queryClient={queryClient}
        onRegisterAsSewadar={handleRegisterAsSewadar}
        currentUserSystemRole={currentUserSystemRole}
      />

      <RegisterVolunteerModal
        open={registerDialogOpen}
        onOpenChange={setRegisterDialogOpen}
        prefill={registerPrefill}
        onSuccess={handleRegisterSuccess}
      />
    </div>
  )
}
