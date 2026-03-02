import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isDashboardRoute = createRouteMatcher(['/dashboard(.*)'])
// /sign-in and /sign-up are public (not in the matcher above)

export default clerkMiddleware(async (auth, req) => {
  if (isDashboardRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpeg|jpg|png|gif|ico|svg|woff2?|ttf|webp)).*)',
    '/(api|trpc)(.*)',
  ],
}
