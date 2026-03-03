import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/onboarding'])
// /sign-in and /sign-up are public (not in the matcher above)

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpeg|jpg|png|gif|ico|svg|woff2?|ttf|webp)).*)',
    '/(api|trpc)(.*)',
  ],
}
