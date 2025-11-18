// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PATHS = ['/dashboard', '/tasks', '/budgets', '/Kanban']
const API_PROTECTED_PATHS = ['/api/dashboard', '/api/tasks', '/api/budgets', '/api/Kanban']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = getToken(request)

  console.log('🛡️ Middleware - Path:', pathname, 'Token exists:', !!token)

  // =================================================================
  // 1. Se já está logado e tenta entrar no /login → vai pro Kanban
  // =================================================================
  if (pathname === '/login') {
    if (token && (await isTokenValid(token))) {
      console.log('🛡️ Usuário logado tentando acessar /login, redirecionando para /Kanban')
      return NextResponse.redirect(new URL('/Kanban', request.url))
    }
    return NextResponse.next()
  }

  // =================================================================
  // 2. Rotas protegidas (páginas)
  // =================================================================
  const isProtectedPage = PROTECTED_PATHS.some(path => pathname.startsWith(path))
  if (isProtectedPage) {
    console.log('🛡️ Rota protegida detectada:', pathname)
    
    if (!token) {
      console.log('🛡️ Token não encontrado, redirecionando para login')
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (!(await isTokenValid(token))) {
      console.log('🛡️ Token inválido, redirecionando para login')
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    console.log('🛡️ Token válido, acesso permitido')
    return NextResponse.next()
  }

  // =================================================================
  // 3. Rotas protegidas da API
  // =================================================================
  const isProtectedApi = API_PROTECTED_PATHS.some(path => pathname.startsWith(path))
  if (isProtectedApi) {
    console.log('🛡️ API protegida detectada:', pathname)
    
    if (!token) {
      console.log('🛡️ API: Token não encontrado')
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    if (!(await isTokenValid(token))) {
      console.log('🛡️ API: Token inválido')
      return NextResponse.json({ message: 'Token inválido' }, { status: 401 })
    }

    console.log('🛡️ API: Token válido, acesso permitido')
    return NextResponse.next()
  }

  // Tudo liberado (signup, páginas públicas, etc.)
  console.log('🛡️ Rota pública, acesso liberado')
  return NextResponse.next()
}

// =====================================================================
// Funções auxiliares
// =====================================================================
function getToken(request: NextRequest): string | null {
  // 1. Primeiro tenta pegar do cookie
  const cookieToken = request.cookies.get('access_token')?.value
  if (cookieToken) {
    console.log('🛡️ Token encontrado no cookie')
    return cookieToken
  }

  // 2. Depois tenta do header Authorization (chamadas API)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    console.log('🛡️ Token encontrado no header Authorization')
    return authHeader.substring(7)
  }

  console.log('🛡️ Nenhum token encontrado')
  return null
}

async function isTokenValid(token: string): Promise<boolean> {
  try {
    console.log('🛡️ Validando token...')
    
    const response = await fetch(`${process.env.NESTJS_API_URL}/auth/verify-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    
    const isValid = response.ok
    console.log('🛡️ Token válido?', isValid)
    
    return isValid
  } catch (error) {
    console.error('🛡️ Erro ao validar token:', error)
    return false
  }
}

// =====================================================================
// Configuração do matcher
// =====================================================================
export const config = {
  matcher: [
    '/login',
    '/signup',
    '/dashboard/:path*',
    '/tasks/:path*',
    '/budgets/:path*',
    '/Kanban/:path*',
    '/api/dashboard/:path*',
    '/api/tasks/:path*',
    '/api/budgets/:path*',
    '/api/Kanban/:path*',
  ],
}