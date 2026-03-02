'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

export function FormField({ field, value, onChange, disabled }) {
  const val = value ?? ''

  if (field.type === 'select') {
    return (
      <div className="space-y-1">
        <Label className="text-xs font-medium text-muted-foreground">
          {field.label}
        </Label>
        <select
          value={val}
          onChange={(e) => onChange(field.key, e.target.value)}
          disabled={disabled}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select...</option>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <div className="space-y-1 sm:col-span-2">
        <Label className="text-xs font-medium text-muted-foreground">
          {field.label}
        </Label>
        <textarea
          value={val}
          onChange={(e) => onChange(field.key, e.target.value)}
          disabled={disabled}
          rows={2}
          className="flex min-h-[56px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">
        {field.label}
      </Label>
      <Input
        type={field.type || 'text'}
        value={val}
        onChange={(e) => onChange(field.key, e.target.value)}
        disabled={disabled}
        className="h-9"
      />
    </div>
  )
}

export function FieldGroup({ title, icon, fields, formData, onChange, disabled }) {
  return (
    <div className="space-y-2">
      {title && (
        <div className="flex items-center gap-2 pt-2 pb-1">
          {icon}
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </h4>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {fields.map((f) => (
          <FormField
            key={f.key}
            field={f}
            value={formData[f.key]}
            onChange={onChange}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  )
}

