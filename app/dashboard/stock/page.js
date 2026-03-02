'use client'

import { useState, useMemo } from 'react'
import { useDashboard } from '@/contexts/DashboardContext'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import {
  User,
  Search,
  Loader2,
  Package,
  History,
  Undo2,
  AlertTriangle,
  IndianRupee,
  ListOrdered,
  Clock,
  SlidersHorizontal,
  RefreshCw,
  UserX,
  Calendar,
  MapPin,
  IdCard,
  Phone,
  Globe,
} from 'lucide-react'
import { toast } from 'sonner'

function formatIssuedAt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

function formatAuditDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'waived', label: 'Waived' },
  { value: 'pending', label: 'Pending' },
]

// --------------- Issue Item (POS) Tab ---------------
function IssueItemTab({ session }) {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVolunteer, setSelectedVolunteer] = useState(null)
  const [selectedItemId, setSelectedItemId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [lengthMeters, setLengthMeters] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [issuing, setIssuing] = useState(false)
  const [historySheetOpen, setHistorySheetOpen] = useState(false)

  const { data: itemsData } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: async () => {
      const res = await fetch('/api/admin/inventory/items', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch items')
      return res.json()
    },
    enabled: !!session,
  })

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['inventory-volunteers-search', searchQuery],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/inventory/volunteers/search?q=${encodeURIComponent(searchQuery)}`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      )
      if (!res.ok) throw new Error('Search failed')
      return res.json()
    },
    enabled: !!session && searchQuery.trim().length >= 1,
  })

  const { data: volunteerLogs } = useQuery({
    queryKey: ['inventory-volunteer-logs', selectedVolunteer?.user_id],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/inventory/volunteers/${selectedVolunteer.user_id}/logs`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      )
      if (!res.ok) return { hasIssued: false }
      return res.json()
    },
    enabled: !!session && !!selectedVolunteer?.user_id,
  })

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['inventory-volunteer-history', selectedVolunteer?.user_id],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/inventory/volunteers/${selectedVolunteer.user_id}/history`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      )
      if (!res.ok) return { data: [] }
      return res.json()
    },
    enabled: !!session && !!selectedVolunteer?.user_id && historySheetOpen,
  })
  const historyList = historyData?.data ?? []

  const availableItems = useMemo(() => {
    const list = itemsData?.data || []
    return list.filter((i) => (Number(i.current_quantity) || 0) > 0)
  }, [itemsData])

  const selectedItem = useMemo(
    () => availableItems.find((i) => i.id === selectedItemId),
    [availableItems, selectedItemId]
  )

  const unitType = selectedItem?.unit_type || 'piece'
  const isPiece = unitType === 'piece'
  const quantityValue = isPiece ? (quantity || 0) : parseFloat(lengthMeters) || 0
  const unitPrice = Number(selectedItem?.unit_price) || 0
  const totalCost = Math.round(quantityValue * unitPrice * 100) / 100

  const handleIssue = async () => {
    if (!selectedVolunteer || !selectedItemId) {
      toast.error('Select a volunteer and an item')
      return
    }
    if (quantityValue <= 0) {
      toast.error(isPiece ? 'Enter quantity (≥ 1)' : 'Enter length (e.g. 2.5)')
      return
    }

    setIssuing(true)
    try {
      const res = await fetch('/api/admin/inventory/issue', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          volunteer_id: selectedVolunteer.user_id,
          item_id: selectedItemId,
          quantity_issued: quantityValue,
          payment_method: paymentMethod,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(`Issued to ${selectedVolunteer.full_name}`)
        queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
        queryClient.invalidateQueries({ queryKey: ['inventory-logs'] })
        queryClient.invalidateQueries({ queryKey: ['inventory-volunteer-logs', selectedVolunteer.user_id] })
        setSelectedVolunteer(null)
        setSelectedItemId('')
        setQuantity(1)
        setLengthMeters('')
        setPaymentMethod('cash')
        setSearchQuery('')
      } else {
        toast.error(data.error || 'Failed to issue')
      }
    } catch {
      toast.error('Network error')
    }
    setIssuing(false)
  }

  const hasPreviousIssued = volunteerLogs?.hasIssued === true

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <Label className="text-sm font-medium">Search by Phone or Member ID</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Phone number or Member ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
          </div>

          {selectedVolunteer ? (
            <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/8 via-background to-primary/5 shadow-sm">
              <div className="border-b bg-primary/10 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{selectedVolunteer.full_name || '--'}</p>
                      </div>
                    </div>
                    {hasPreviousIssued && (
                      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] gap-1 shrink-0">
                        <AlertTriangle className="h-3 w-3" />
                        Previous issues
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground h-8"
                      onClick={() => setHistorySheetOpen(true)}
                    >
                      <ListOrdered className="h-3.5 w-3.5 mr-1" />
                      History
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => { setSelectedVolunteer(null); setSearchQuery('') }}>
                      Change
                    </Button>
                  </div>
                </div>
              </div>
              <CardContent className="p-4 pt-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="flex items-start gap-3">
                    <IdCard className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Member ID</p>
                      <p className="text-sm font-medium text-foreground truncate">{selectedVolunteer.member_id || '--'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Number</p>
                      <p className="text-sm font-medium text-foreground truncate">{selectedVolunteer.phone || '--'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Gender</p>
                      <p className="text-sm font-medium text-foreground truncate">{selectedVolunteer.gender || '--'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Age</p>
                      <p className="text-sm font-medium text-foreground">{selectedVolunteer.age != null && selectedVolunteer.age !== '' ? String(selectedVolunteer.age) : '--'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Department</p>
                      <p className="text-sm font-medium text-foreground truncate">{selectedVolunteer.department || '--'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Globe className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Region</p>
                      <p className="text-sm font-medium text-foreground truncate">{selectedVolunteer.region || '--'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {searching && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!searching && searchQuery.trim().length >= 1 && searchResults?.data?.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <UserX className="h-12 w-12 text-muted-foreground/70 mb-3 shrink-0" />
                    <p className="text-sm font-medium text-muted-foreground">
                      No volunteer found matching &lsquo;{searchQuery.trim()}&rsquo;.
                    </p>
                    <p className="text-xs text-muted-foreground/80 mt-1">
                      Check the Member ID or Phone Number and try again.
                    </p>
                  </CardContent>
                </Card>
              )}
              {!searching && searchQuery.trim().length >= 1 && searchResults?.data?.length > 0 && (
                <div className="border rounded-lg divide-y max-h-[320px] overflow-y-auto">
                  {searchResults.data.map((vol) => (
                    <button
                      key={vol.user_id}
                      type="button"
                      onClick={() => { setSelectedVolunteer(vol); setSearchQuery('') }}
                      className="w-full text-left p-3 hover:bg-muted/60 transition-colors flex items-start gap-3 rounded-none first:rounded-t-lg last:rounded-b-lg focus:bg-muted/50 focus:outline-none focus:ring-0"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex flex-wrap items-center gap-2 gap-y-0">
                          <p className="text-sm font-semibold text-foreground truncate">{vol.full_name || '--'}</p>
                          {vol.member_id && (
                            <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
                              {vol.member_id}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span>Age: {vol.age != null && vol.age !== '' ? String(vol.age) : '--'}</span>
                          <span>Gender: {vol.gender || '--'}</span>
                          <span className="truncate" title={vol.department}>Department: {vol.department || '--'}</span>
                          <span className="truncate" title={vol.region}>Region: {vol.region || '--'}</span>
                        </div>
                        {vol.phone && (
                          <p className="text-[11px] text-muted-foreground mt-1 truncate">Contact: {vol.phone}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-sm font-medium">Item</Label>
          <select
            value={selectedItemId}
            onChange={(e) => {
              setSelectedItemId(e.target.value)
              setQuantity(1)
              setLengthMeters('')
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Select an item...</option>
            {availableItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.item_name}
                {item.variant ? ` (${item.variant})` : ''} — {Number(item.current_quantity)} available
              </option>
            ))}
          </select>

          {selectedItem && (
            <>
              {isPiece ? (
                <div>
                  <Label className="text-xs text-muted-foreground">Quantity (pieces)</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="h-10 mt-1"
                  />
                </div>
              ) : (
                <div>
                  <Label className="text-xs text-muted-foreground">Length (meters)</Label>
                  <Input
                    type="number"
                    min={0.1}
                    step={0.1}
                    placeholder="e.g. 2.5"
                    value={lengthMeters}
                    onChange={(e) => setLengthMeters(e.target.value)}
                    className="h-10 mt-1"
                  />
                </div>
              )}

              {quantityValue > 0 && (
                <Alert className="border-green-200 bg-green-50 text-green-900 [&>svg]:text-green-600">
                  <IndianRupee className="h-4 w-4" />
                  <AlertDescription className="font-semibold">
                    Amount to Collect: ₹{totalCost.toFixed(2)}
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label className="text-sm font-medium mb-2 block">Payment method</Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  className="grid grid-cols-2 gap-2"
                >
                  {PAYMENT_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt.value} id={`pay-${opt.value}`} />
                      <Label htmlFor={`pay-${opt.value}`} className="text-sm font-normal cursor-pointer">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <Button
                className="w-full h-11 font-medium"
                disabled={issuing || quantityValue <= 0}
                onClick={handleIssue}
              >
                {issuing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Issue'
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Sheet open={historySheetOpen} onOpenChange={setHistorySheetOpen}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Issuance History</SheetTitle>
            {selectedVolunteer && (
              <p className="text-sm text-muted-foreground">{selectedVolunteer.full_name}</p>
            )}
          </SheetHeader>
          <div className="mt-4 rounded-md border overflow-hidden">
            {historyLoading ? (
              <div className="p-4 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : historyList.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No issuance history</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyList.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {log.item_name}
                        {log.variant ? ` (${log.variant})` : ''}
                      </TableCell>
                      <TableCell className="text-right">{log.quantity_issued}</TableCell>
                      <TableCell className="text-right">₹{Number(log.amount_due || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatIssuedAt(log.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={log.status === 'issued' ? 'default' : 'secondary'} className="text-[10px]">
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// --------------- Warehouse & Logs Tab ---------------
function WarehouseTab({ session, canManageStock }) {
  const queryClient = useQueryClient()
  const [undoDialogLog, setUndoDialogLog] = useState(null)
  const [adjustItem, setAdjustItem] = useState(null)
  const [adjustType, setAdjustType] = useState('add')
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustNotes, setAdjustNotes] = useState('')
  const [auditItem, setAuditItem] = useState(null)

  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: async () => {
      const res = await fetch('/api/admin/inventory/items', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch items')
      return res.json()
    },
    enabled: !!session,
  })

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['inventory-logs'],
    queryFn: async () => {
      const res = await fetch('/api/admin/inventory/logs?limit=50', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch logs')
      return res.json()
    },
    enabled: !!session,
  })

  const { data: auditData, isLoading: auditLoading, refetch: refetchAudit, isFetching: auditFetching } = useQuery({
    queryKey: ['inventory-audit', auditItem?.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/inventory/audit?item_id=${encodeURIComponent(auditItem.id)}`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      )
      if (!res.ok) throw new Error('Failed to fetch audit history')
      return res.json()
    },
    enabled: !!session && !!auditItem?.id,
  })

  const rawItems = itemsData?.data || []
  const sortedItems = useMemo(() => {
    return [...rawItems].sort((a, b) => {
      const typeOrder = (a.unit_type || 'piece') === 'piece' ? 0 : 1
      const typeOrderB = (b.unit_type || 'piece') === 'piece' ? 0 : 1
      if (typeOrder !== typeOrderB) return typeOrder - typeOrderB
      const nameA = (a.item_name || '').toLowerCase()
      const nameB = (b.item_name || '').toLowerCase()
      if (nameA !== nameB) return nameA.localeCompare(nameB)
      return (a.variant || '').localeCompare(b.variant || '')
    })
  }, [rawItems])
  const pieceItems = useMemo(() => sortedItems.filter((i) => (i.unit_type || 'piece') === 'piece'), [sortedItems])
  const meterItems = useMemo(() => sortedItems.filter((i) => i.unit_type === 'meter'), [sortedItems])

  const logs = logsData?.data || []
  const auditLogs = auditData?.data ?? []

  const undoMutation = useMutation({
    mutationFn: async (logId) => {
      const res = await fetch('/api/admin/inventory/undo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ log_id: logId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Undo failed')
      return { logId, log: logs.find((l) => l.id === logId) }
    },
    onMutate: async (logId) => {
      const log = logs.find((l) => l.id === logId)
      if (!log) return {}
      await queryClient.cancelQueries({ queryKey: ['inventory-logs'] })
      await queryClient.cancelQueries({ queryKey: ['inventory-items'] })
      const prevLogs = queryClient.getQueryData(['inventory-logs'])
      const prevItems = queryClient.getQueryData(['inventory-items'])
      queryClient.setQueryData(['inventory-logs'], (old) => ({
        ...old,
        data: (old?.data || []).filter((l) => l.id !== logId),
      }))
      const itemId = log.item_id
      const qty = Number(log.quantity_issued) || 0
      queryClient.setQueryData(['inventory-items'], (old) => ({
        ...old,
        data: (old?.data || []).map((i) =>
          i.id === itemId ? { ...i, current_quantity: (Number(i.current_quantity) || 0) + qty } : i
        ),
      }))
      setUndoDialogLog(null)
      return { prevLogs, prevItems }
    },
    onSuccess: () => toast.success('Undone'),
    onError: (err, _logId, context) => {
      if (context?.prevLogs) queryClient.setQueryData(['inventory-logs'], context.prevLogs)
      if (context?.prevItems) queryClient.setQueryData(['inventory-items'], context.prevItems)
      toast.error(err.message || 'Undo failed')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-logs'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
    },
  })

  const adjustMutation = useMutation({
    mutationFn: async ({ item_id, quantity_added, notes }) => {
      const res = await fetch('/api/admin/inventory/adjust', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ item_id, quantity_added, notes }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Update failed')
      return { item_id, quantity_added, new_total: data.new_total }
    },
    onMutate: async ({ item_id, quantity_added }) => {
      const qty = Number(quantity_added) || 0
      if (qty === 0) return {}
      await queryClient.cancelQueries({ queryKey: ['inventory-items'] })
      const prevItems = queryClient.getQueryData(['inventory-items'])
      queryClient.setQueryData(['inventory-items'], (old) => ({
        ...old,
        data: (old?.data || []).map((i) =>
          i.id === item_id ? { ...i, current_quantity: (Number(i.current_quantity) || 0) + qty } : i
        ),
      }))
      setAdjustItem(null)
      setAdjustType('add')
      setAdjustQty('')
      setAdjustNotes('')
      return { prevItems }
    },
    onSuccess: () => toast.success('Stock updated'),
    onError: (err, _vars, context) => {
      if (context?.prevItems) queryClient.setQueryData(['inventory-items'], context.prevItems)
      toast.error(err.message || 'Update failed')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
    },
  })

  const handleUndoConfirm = (log) => {
    if (!log) return
    undoMutation.mutate(log.id)
  }

  const handleAdjustSubmit = () => {
    const raw = Number(adjustQty)
    if (!adjustItem || !(raw > 0)) return
    const quantity_added = adjustType === 'reduce' ? -raw : raw
    adjustMutation.mutate({
      item_id: adjustItem.id,
      quantity_added,
      notes: adjustNotes.trim() || undefined,
    })
  }

  const paymentBadgeVariant = (method) => {
    if (method === 'cash' || method === 'upi') return 'default'
    if (method === 'pending') return 'secondary'
    return 'outline'
  }

  const paymentBadgeClass = (method) => {
    if (method === 'cash' || method === 'upi') return 'bg-green-100 text-green-800 border-green-200'
    if (method === 'pending') return 'bg-amber-100 text-amber-800 border-amber-200'
    return 'bg-muted text-muted-foreground'
  }

  const renderStockTable = (rows, emptyMessage = 'No inventory items') => (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Variant</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            {canManageStock && <TableHead className="w-[100px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={canManageStock ? 5 : 4} className="text-center text-muted-foreground py-8">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.item_name}</TableCell>
                <TableCell>{row.variant || '—'}</TableCell>
                <TableCell className="text-right">₹{Number(row.unit_price || 0).toFixed(2)}</TableCell>
                <TableCell className="text-right">{Number(row.current_quantity) || 0}</TableCell>
                {canManageStock && (
                  <TableCell>
                    <TooltipProvider>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => setAuditItem(row)}
                              aria-label="View stock adjustment history"
                            >
                              <Clock className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>History</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => { setAdjustItem(row); setAdjustType('add'); setAdjustQty(''); setAdjustNotes('') }}
                              aria-label="Adjust stock"
                            >
                              <SlidersHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Adjust Stock</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3">Current stock</h3>
        {itemsLoading ? (
          <Skeleton className="h-32 w-full rounded-lg" />
        ) : sortedItems.length === 0 ? (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  {canManageStock && <TableHead className="w-[100px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={canManageStock ? 5 : 4} className="text-center text-muted-foreground py-8">
                    No inventory items
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="space-y-6">
            {pieceItems.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Apparel (Pieces)</h4>
                <p className="text-xs text-muted-foreground mb-2">T-shirts, caps, and other countable items</p>
                {renderStockTable(pieceItems)}
              </div>
            )}
            {meterItems.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Materials (Meters)</h4>
                <p className="text-xs text-muted-foreground mb-2">Cloth and other items measured in meters</p>
                {renderStockTable(meterItems)}
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Recent issuances</h3>
        {logsLoading ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Volunteer</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Date</TableHead>
                  {canManageStock && <TableHead className="w-[80px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManageStock ? 7 : 6} className="text-center text-muted-foreground py-8">
                      No recent issuances
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{log.profiles_core?.full_name || '—'}</p>
                          {log.profiles_core?.member_id && (
                            <p className="text-[10px] text-muted-foreground">{log.profiles_core.member_id}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.inventory_items?.item_name || '—'}
                        {log.inventory_items?.variant ? ` (${log.inventory_items.variant})` : ''}
                      </TableCell>
                      <TableCell className="text-right">{log.quantity_issued}</TableCell>
                      <TableCell className="text-right">₹{Number(log.amount_due || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={paymentBadgeVariant(log.payment_method)} className={paymentBadgeClass(log.payment_method)}>
                          {log.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatIssuedAt(log.created_at)}
                      </TableCell>
                      {canManageStock && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            disabled={undoMutation.isPending}
                            onClick={() => setUndoDialogLog(log)}
                          >
                            {undoMutation.isPending && undoDialogLog?.id === log.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Undo2 className="h-3 w-3" />
                            )}
                            Undo
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AlertDialog open={!!undoDialogLog} onOpenChange={(open) => !open && setUndoDialogLog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Un-issue this item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to un-issue this item? This will mark the log as undone and return the quantity to the warehouse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleUndoConfirm(undoDialogLog)}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!adjustItem} onOpenChange={(open) => !open && setAdjustItem(null)}>
        <DialogContent className="sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            {adjustItem && (
              <p className="text-sm text-muted-foreground">
                {adjustItem.item_name}
                {adjustItem.variant ? ` (${adjustItem.variant})` : ''}
              </p>
            )}
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-sm font-medium">Adjustment type</Label>
              <RadioGroup
                value={adjustType}
                onValueChange={setAdjustType}
                className="grid grid-cols-2 gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="add" id="adjust-type-add" />
                  <Label htmlFor="adjust-type-add" className="font-normal cursor-pointer text-sm">
                    Add Stock
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="reduce" id="adjust-type-reduce" />
                  <Label htmlFor="adjust-type-reduce" className="font-normal cursor-pointer text-sm">
                    Reduce Stock
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-[10px] text-muted-foreground">
                {adjustType === 'add' ? 'New shipments received' : 'Damaged, lost, or audited out'}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="adjust-qty">Quantity</Label>
              <Input
                id="adjust-qty"
                type="number"
                min={0.01}
                step={1}
                placeholder="e.g. 10"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Enter a positive number. It will be {adjustType === 'reduce' ? 'subtracted from' : 'added to'} current stock.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="adjust-notes">Notes (optional)</Label>
              <Input
                id="adjust-notes"
                placeholder={adjustType === 'add' ? 'e.g. Received from Vendor X' : 'e.g. Damaged in storage'}
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustItem(null)}>Cancel</Button>
            <Button
              disabled={!(Number(adjustQty) > 0) || adjustMutation.isPending}
              onClick={handleAdjustSubmit}
            >
              {adjustMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : adjustType === 'reduce' ? 'Reduce Stock' : 'Add Stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!auditItem} onOpenChange={(open) => !open && setAuditItem(null)}>
        <SheetContent side="right" className="w-full max-w-lg overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between gap-2 pr-8">
              <SheetTitle className="flex-1 truncate">
                {auditItem
                  ? `${auditItem.item_name}${auditItem.variant ? ` (${auditItem.variant})` : ''} – Stock Adjustment History`
                  : 'Stock Adjustment History'}
              </SheetTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => refetchAudit()}
                      disabled={auditFetching}
                      aria-label="Refresh audit history"
                    >
                      <RefreshCw className={`h-4 w-4 ${auditFetching ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Get latest audits</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </SheetHeader>
          <div className="mt-4">
            {auditLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                No manual stock adjustments recorded yet.
              </p>
            ) : (
              <div className="space-y-4">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-lg border bg-card p-3 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        {formatAuditDate(log.created_at)}
                      </span>
                      <Badge
                        className={
                          Number(log.quantity_added) >= 0
                            ? 'bg-green-600 hover:bg-green-600 text-white font-medium'
                            : 'bg-red-600 hover:bg-red-600 text-white font-medium'
                        }
                      >
                        {Number(log.quantity_added) >= 0 ? '+' : ''}{Number(log.quantity_added)}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span>
                        <span className="text-muted-foreground">New total:</span>{' '}
                        <span className="font-medium">{Number(log.new_total)}</span>
                      </span>
                      <span>
                        <span className="text-muted-foreground">Adjusted by:</span>{' '}
                        <span className="font-medium">{log.profiles_core?.full_name ?? '—'}</span>
                      </span>
                    </div>
                    {log.notes && log.notes.trim() !== '' && (
                      <p className="text-xs text-muted-foreground pt-1 border-t mt-2">
                        {log.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// --------------- Page ---------------
export default function StockPage() {
  const { session, role, accessibleModules } = useDashboard()
  const [activeTab, setActiveTab] = useState('issue')
  const canManageStock = role === 'admin' || (Array.isArray(accessibleModules) && accessibleModules.includes('stock_manage'))

  return (
    <div className="p-4 pb-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold">Stock & POS</h2>
        <p className="text-xs text-muted-foreground">
          Issue items to volunteers and manage warehouse
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="issue" className="gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Issue Item
          </TabsTrigger>
          <TabsTrigger value="warehouse" className="gap-1.5">
            <History className="h-3.5 w-3.5" />
            Warehouse
          </TabsTrigger>
        </TabsList>

        <TabsContent value="issue" className="mt-0">
          <IssueItemTab session={session} />
        </TabsContent>
        <TabsContent value="warehouse" className="mt-0">
          <WarehouseTab session={session} canManageStock={canManageStock} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
