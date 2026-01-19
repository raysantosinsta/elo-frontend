// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 1. Defina as rotas VISUAIS que precisam de login (Páginas do Next.js)
const PROTECTED_ROUTES = [
  '/Kanban',
  '/tasks',
  '/kanban-flow',
  '/chats',
  '/agenda',
  '/professionals/report',
  '/tasks/report',
  '/product/report',
  '/empresas',
  '/route-planner',
  '/driver',
];

// 2. Defina as rotas que são PÚBLICAS
// ADICIONADO: '/reset-password' (Para o link do email funcionar)
// ADICIONADO: '/password/forgot' (Caso decida usar página em vez de modal no futuro)
const PUBLIC_ROUTES = [
  '/login', 
  '/reset-password', 
  '/password/forgot'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Recupera o token
  const token = getToken(request);

  // --- Lógica 1: Redirecionamento de usuário JÁ LOGADO ---
  // Se o cara JÁ TEM token válido e tenta entrar no Login ou Register, manda pro Kanban
  if ((pathname === '/login' || pathname === '/register') && token) {
     const isValid = await isTokenValid(token);
     if (isValid) {
       return NextResponse.redirect(new URL('/Kanban', request.url));
     }
  }

  // --- Lógica 2: Proteção de Rotas ---
  
  // Verifica se o caminho atual é uma rota protegida
  const isProtectedRoute = PROTECTED_ROUTES.some(path => pathname.startsWith(path));

  // Verifica se é uma rota pública (para garantir que não bloqueie reset de senha)
  const isPublicRoute = PUBLIC_ROUTES.some(path => pathname.startsWith(path));

  // Se for protegida E não tiver token (ou token inválido)
  if (isProtectedRoute && !isPublicRoute) {
    if (!token || !(await isTokenValid(token))) {
      const loginUrl = new URL('/login', request.url);
      // Salva onde ele queria ir pra redirecionar depois do login
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}


function getToken(request: NextRequest): string | null {
  const cookie = request.cookies.get('access_token')?.value;
  if (cookie) return cookie;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.substring(7);

  return null;
}

async function isTokenValid(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_NESTJS_API_URL}/auth/verify-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // Envia o token no body conforme ajustamos antes
      body: JSON.stringify({ token: token }),
    });

    if (!res.ok) {
      // Ignora erro se for só token expirado, apenas retorna false
      return false;
    }
    const data = await res.json();
    return data.valid === true;
  } catch (error) {
    console.error("Middleware Fetch Error:", error);
    return false;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};