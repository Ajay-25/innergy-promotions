/**
 * Shared constants for Zone (Golden Member & Volunteer registration) and demographics.
 */

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

export const GENDER_OPTIONS = ['Male', 'Female', 'Other']

/** Regex: exactly 10 digits (for Indian mobile after +91). */
export const MOBILE_10_DIGIT_REGEX = /^[6-9]\d{9}$/
