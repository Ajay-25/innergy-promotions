'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const ZONE_OPTIONS = [
  'Zone-1(Delhi)',
  'Zone-2(Punjab)',
  'Zone-3(Haryana)',
  'Zone-4(Madhya Pradesh)',
  'Zone-5(Uttar Pradesh)',
  'Zone-6(Uttar Pradesh)',
  'Zone-7(Rajasthan)',
  'Zone-8(Maharashtra)',
  'Zone-9(South-Orissa/Hyderabad/Bengaluru/etc.)',
  'Zone-10(Bihar)',
  'Zone-11(Uttar Pradesh)',
  'Zone-12(Gujarat)',
]

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say']

const schema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  phone: z.string().min(1, 'Phone is required').trim(),
  gender: z.string().optional(),
  zone: z.string().optional(),
  center: z.string().optional(),
  address: z.string().optional(),
})

export function getGoldenMemberFormDefaults(overrides = {}) {
  return {
    name: '',
    phone: '',
    gender: '',
    zone: '',
    center: '',
    address: '',
    ...overrides,
  }
}

/**
 * Shared form for registering/updating a Golden Member. Use inside a page, Dialog, or Sheet.
 * @param {Object} props
 * @param {(data: { name, phone, gender?, zone?, center?, address? }) => Promise<{ error?: string }>} props.onSubmit - async submit handler; return { error: '...' } on failure
 * @param {() => void} [props.onSuccess] - called after successful submit (e.g. close sheet, refresh list)
 * @param {Object} [props.defaultValues] - initial values
 * @param {boolean} [props.isSubmitting] - external loading state
 * @param {string} [props.submitLabel] - button label, default "Register"
 */
export function RegisterGoldenMemberForm({
  onSubmit,
  onSuccess,
  defaultValues,
  isSubmitting = false,
  submitLabel = 'Register',
}) {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: getGoldenMemberFormDefaults(defaultValues),
  })

  async function handleSubmit(values) {
    const result = await onSubmit({
      name: values.name,
      phone: values.phone,
      gender: values.gender || undefined,
      zone: values.zone || undefined,
      center: values.center || undefined,
      address: values.address || undefined,
    })
    if (result?.error) {
      form.setError('root', { message: result.error })
      return
    }
    form.reset(getGoldenMemberFormDefaults())
    onSuccess?.()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="Phone number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <Select value={field.value || ''} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {GENDER_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="zone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Zone</FormLabel>
              <Select value={field.value || ''} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ZONE_OPTIONS.map((z) => (
                    <SelectItem key={z} value={z}>
                      {z}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="center"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Center</FormLabel>
              <FormControl>
                <Input placeholder="Center name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea placeholder="Address" rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.errors.root && (
          <p className="text-sm font-medium text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </form>
    </Form>
  )
}
