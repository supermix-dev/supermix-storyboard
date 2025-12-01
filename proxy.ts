import { hasAdminAccess, hasAppAccess } from '@/lib/auth';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isAdminRoute = createRouteMatcher(['/admin(.*)']);

const isPublicAPIRoute = createRouteMatcher(['/no-access(.*)']);

export default clerkMiddleware(async (auth, req) => {
  // Allow public access only to webhook routes
  if (isPublicAPIRoute(req)) {
    return;
  }

  const authInfo = await auth();
  const userId: string | null = authInfo?.userId ?? null;
  const appAccess: boolean = hasAppAccess(authInfo, userId);

  if (appAccess === false) {
    return NextResponse.redirect(new URL('/no-access', req.url));
  }

  // Check for admin routes and restrict access to admin users only
  if (isAdminRoute(req) && !hasAdminAccess(authInfo)) {
    return NextResponse.redirect(new URL('/no-access', req.url));
  }

  return;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
