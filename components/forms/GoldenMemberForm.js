'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MOBILE_10_DIGIT_REGEX } from '@/lib/constants'
import { Loader2 } from 'lucide-react'
import {
  Form,
  FormControl,
  FormDescription,
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

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

const LANGUAGE_OPTIONS = ['Hindi', 'English']

const schema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  phone: z
    .string()
    .min(1, 'Phone is required')
    .trim()
    .refine(
      (val) => {
        const digits = val.replace(/\D/g, '').slice(-10)
        return digits.length === 10 && MOBILE_10_DIGIT_REGEX.test(digits)
      },
      { message: 'Enter a valid 10-digit Indian mobile number (must start with 6, 7, 8 or 9)' }
    ),
  innergy_email: z.union([z.string().email('Invalid email'), z.literal('')]).optional(),
  gender: z.string().optional(),
  preferred_language: z.string().optional(),
  zone: z.string().optional(),
  center: z.string().optional(),
  dob: z.string().optional(),
  address: z.string().optional(),
  remarks: z.string().optional(),
})

export function getGoldenMemberFormDefaults(overrides = {}) {
  return {
    name: '',
    phone: '',
    innergy_email: '',
    gender: '',
    preferred_language: 'Hindi',
    zone: '',
    center: '',
    dob: '',
    address: '',
    remarks: '',
    ...overrides,
  }
}

/**
 * Unified Golden Member form — single source of truth for CRM registration.
 * Use in CRM tab, Promotions (age 50+), and Attendance walk-in.
 */
export function GoldenMemberForm({
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
      name: values.name.trim(),
      phone: values.phone.trim(),
      innergy_email: values.innergy_email?.trim() || undefined,
      gender: values.gender || undefined,
      preferred_language: values.preferred_language || undefined,
      zone: values.zone || undefined,
      center: values.center || undefined,
      dob: values.dob || undefined,
      address: values.address?.trim() || undefined,
      remarks: values.remarks?.trim() || undefined,
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <FormLabel>Phone No.</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    placeholder="10-digit Indian mobile number (6, 7, 8 or 9)"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="innergy_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Innergy Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="email@example.com" {...field} />
              </FormControl>
              <FormDescription>
                The email used to register on the Innergy app.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="preferred_language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Language</FormLabel>
                <RadioGroup
                  value={field.value || 'Hindi'}
                  onValueChange={field.onChange}
                  className="flex gap-4 pt-2"
                >
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <div key={lang} className="flex items-center space-x-2">
                      <RadioGroupItem value={lang} id={`lang-${lang}`} />
                      <label htmlFor={`lang-${lang}`} className="text-sm font-normal cursor-pointer">
                        {lang}
                      </label>
                    </div>
                  ))}
                </RadioGroup>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <SelectItem key={z} value={z}>{z}</SelectItem>
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
        </div>

        <FormField
          control={form.control}
          name="dob"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Birth</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
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
                <Textarea placeholder="Address" rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="remarks"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Remarks</FormLabel>
              <FormControl>
                <Textarea placeholder="Additional notes" rows={3} {...field} />
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
