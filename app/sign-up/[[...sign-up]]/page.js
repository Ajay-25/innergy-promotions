'use client'

import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <SignUp signUpFallbackRedirectUrl="/dashboard" signInFallbackRedirectUrl="/sign-in" />
    </div>
  )
}
