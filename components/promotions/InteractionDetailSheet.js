'use client'

import Link from 'next/link'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { User, Phone, MapPin, FileText, Calendar } from 'lucide-react'

/**
 * Format ISO timestamp for display (date + time).
 */
function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/**
 * Side panel showing full interaction metadata. Used from Promotions Recent Interactions table.
 */
export function InteractionDetailSheet({ interaction, open, onClose }) {
  if (!interaction) return null

  const isGoldenMember = interaction.interaction_type === 'Golden Member'
  const typeLabel = isGoldenMember ? 'Golden Member' : 'Standard'
  const profileHref = interaction.golden_member_id
    ? `/dashboard/golden-members/${interaction.golden_member_id}`
    : '/dashboard/golden-members'

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="shrink-0 px-6 pt-6 pb-4 border-b text-left">
          <SheetTitle className="text-xl font-bold pr-8">Interaction Details</SheetTitle>
          <div className="mt-2">
            <Badge
              className={isGoldenMember ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-muted text-muted-foreground'}
            >
              {typeLabel}
            </Badge>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              Timestamp
            </h4>
            <p className="text-sm text-foreground">{formatDateTime(interaction.created_at)}</p>
          </section>

          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              Citizen
            </h4>
            <div className="space-y-1.5 text-sm">
              <p>
                <span className="text-muted-foreground">Name:</span>{' '}
                <span className="text-foreground">{interaction.citizen_name || '—'}</span>
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground shrink-0">Phone:</span>
                <a
                  href={interaction.contact_number ? `tel:${interaction.contact_number}` : undefined}
                  className="text-foreground hover:underline"
                >
                  {interaction.contact_number || '—'}
                </a>
              </div>
              {interaction.citizen_zone && (
                <div className="flex items-center gap-2 flex-wrap">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground shrink-0">Zone:</span>
                  <span className="text-foreground">{interaction.citizen_zone}</span>
                </div>
              )}
              {interaction.email_used && (
                <p>
                  <span className="text-muted-foreground">Email:</span>{' '}
                  <span className="text-foreground break-all">{interaction.email_used}</span>
                </p>
              )}
            </div>
          </section>

          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              Volunteer (Author)
            </h4>
            <p className="text-sm text-foreground">{interaction.sewadar_name || '—'}</p>
          </section>

          {(interaction.app_status || interaction.tech_issue_notes) && (
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                Remarks &amp; Status
              </h4>
              <div className="space-y-2 text-sm">
                {interaction.app_status && (
                  <p>
                    <span className="text-muted-foreground">App status:</span>{' '}
                    <Badge variant="secondary" className="font-normal">
                      {interaction.app_status}
                    </Badge>
                  </p>
                )}
                {interaction.tech_issue_notes && (
                  <div>
                    <span className="text-muted-foreground block mb-1">Notes:</span>
                    <p className="text-foreground whitespace-pre-wrap break-words rounded-md border bg-muted/30 p-3">
                      {interaction.tech_issue_notes}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          <div className="pt-4 border-t">
            <Button asChild variant="default" className="w-full gap-2">
              <Link href={profileHref}>
                Go to Golden Member Profile
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {interaction.golden_member_id
                ? 'Opens this citizen in the CRM.'
                : 'Opens the Golden Members directory to search.'}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
