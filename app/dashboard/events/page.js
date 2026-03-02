'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Calendar, MapPin, Users, Clock, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getEvents, createEvent } from '@/app/actions/events'

const INITIAL_FORM_DATA = {
  title: '',
  module_type: 'Module 1',
  event_date: '',
  timing: '',
  venue: '',
  trainers: '',
  support: '',
}

function getModuleBadgeClass(moduleType) {
  if (moduleType === 'Module 1') return 'bg-blue-500/15 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-800'
  if (moduleType === 'Module 2') return 'bg-purple-500/15 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-800'
  return 'bg-green-500/15 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-800'
}

const today = new Date().toISOString().slice(0, 10)

export default function EventsPage() {
  const [events, setEvents] = useState([])
  const [filter, setFilter] = useState('upcoming')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    const res = await getEvents()
    if (res.data) setEvents(res.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const filteredEvents = events.filter((e) => {
    const isUpcoming = e.event_date >= today
    return filter === 'upcoming' ? isUpcoming : !isUpcoming
  })

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    const res = await createEvent({
      title: formData.title,
      module_type: formData.module_type || 'Module 1',
      event_date: formData.event_date,
      timing: formData.timing,
      venue: formData.venue,
      trainer_ids: [],
      support_sewadar_ids: [],
    })
    setSubmitting(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    setFormData(INITIAL_FORM_DATA)
    setDialogOpen(false)
    toast.success('Event created successfully')
    loadEvents()
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-semibold">Training Events</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === 'upcoming' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('upcoming')}
        >
          Upcoming
        </Button>
        <Button
          variant={filter === 'past' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('past')}
        >
          Past
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEvents.map((event) => (
          <Link key={event.id} href={`/dashboard/events/${event.id}`}>
            <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{event.title}</CardTitle>
                  <Badge className={getModuleBadgeClass(event.module_type)}>
                    {event.module_type}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {event.venue}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" />
                  {event.event_date}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0" />
                  {event.timing}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4 shrink-0" />
                    {(event.trainer_ids ?? []).length} trainer{(event.trainer_ids ?? []).length !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4 shrink-0" />
                    {(event.support_sewadar_ids ?? []).length} support
                  </span>
                </div>
                <Button variant="secondary" size="sm" className="mt-2 w-full" asChild>
                  <span>View Details</span>
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>Add a new training event.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Event title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="module_type">Module Type</Label>
              <Select
                value={formData.module_type}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, module_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select module type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Module 1">Module 1</SelectItem>
                  <SelectItem value="Module 2">Module 2</SelectItem>
                  <SelectItem value="Both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_date">Event Date</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, event_date: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timing">Timing</Label>
                <Input
                  id="timing"
                  value={formData.timing}
                  onChange={(e) => setFormData((prev) => ({ ...prev, timing: e.target.value }))}
                  placeholder="10:00 AM - 1:00 PM"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                value={formData.venue}
                onChange={(e) => setFormData((prev) => ({ ...prev, venue: e.target.value }))}
                placeholder="Venue address"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trainers">Trainers (comma-separated)</Label>
              <Input
                id="trainers"
                value={formData.trainers}
                onChange={(e) => setFormData((prev) => ({ ...prev, trainers: e.target.value }))}
                placeholder="Rajesh Kumar, Neha Gupta"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support">Support Sewadars (comma-separated)</Label>
              <Input
                id="support"
                value={formData.support}
                onChange={(e) => setFormData((prev) => ({ ...prev, support: e.target.value }))}
                placeholder="Priya Sharma, Amit Singh"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Event'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
