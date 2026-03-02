'use client'

import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <SignIn signInFallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/sign-up" />
    </div>
  )
}
