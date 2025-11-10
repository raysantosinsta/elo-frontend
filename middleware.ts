// middleware.ts (mantém a proteção das rotas, mas signup fica livre)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // URLs públicas (qualquer um pode acessar)
  const publicPaths = ['/login', '/signup', '/auth/callback']
  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  // Se tentar acessar rota protegida sem estar logado
  if (!session && !isPublicPath) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Se tentar acessar login/signup já estando logado
  if (session && isPublicPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}