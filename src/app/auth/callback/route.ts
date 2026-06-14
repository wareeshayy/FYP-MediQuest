import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const type = requestUrl.searchParams.get('type')
  
  // If this is an email confirmation (signup), redirect to login page
  // The client-side page will handle the confirmation and sign out
  if (type === 'signup') {
    return NextResponse.redirect(new URL('/auth/login?verified=true', requestUrl.origin))
  }
  
  // For OAuth callbacks, redirect to dashboard
  // The session is handled client-side
  return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
}

