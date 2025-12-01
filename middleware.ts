// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_PROTECTED_PATHS = [
  '/api/dashboard',
  '/api/tasks',
  '/api/budgets',
  '/api/Kanban',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = getToken(request);

  // Só protege rotas da API
  const isProtectedApi = API_PROTECTED_PATHS.some(path => pathname.startsWith(path));

  if (isProtectedApi) {
    if (!token || !(await isTokenValid(token))) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Se estiver logado e tentar acessar /login → vai pro Kanban
  if (pathname === '/login' && token && (await isTokenValid(token))) {
    return NextResponse.redirect(new URL('/Kanban', request.url));
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
    const res = await fetch(`${process.env.NESTJS_API_URL}/auth/verify-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.valid === true;
  } catch {
    return false;
  }
}

export const config = {
  matcher: ['/login', '/api/:path*'],
};