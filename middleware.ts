// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 1. Defina as rotas VISUAIS que precisam de login (Páginas do Next.js)
const PROTECTED_ROUTES = [
  '/Kanban',
  '/tasks', // Supondo que exista uma página meusite.com/tasks
  'kanban-flow',
  'chats',
  'agenda',
  'professionals/report',
  'tasks/report',
  'product/report',
  'empresas',
  '/route-planner',
  '/driver',
];

// 2. Defina as rotas que são PÚBLICAS (Login, Cadastro, Home pública)
// const PUBLIC_ROUTES = ['/login', '/register', '/'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Recupera o token
  const token = getToken(request);

  // Lógica 1: Se o cara tá tentando entrar numa rota protegida
  // Verifica se o caminho começa com algum dos itens da lista
  const isProtectedRoute = PROTECTED_ROUTES.some(path => pathname.startsWith(path));

  if (isProtectedRoute) {
    // Se não tem token ou token inválido -> Manda pro Login
    if (!token || !(await isTokenValid(token))) {
      const loginUrl = new URL('/login', request.url);
      // Dica: Salva onde ele queria ir pra redirecionar depois do login
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Lógica 2: Se o cara JÁ TEM token e tenta entrar no Login -> Manda pro Kanban
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
    const res = await fetch(`${process.env.NEXT_PUBLIC_NESTJS_API_URL}/auth/verify-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`, // Pode deixar, mas o importante é o body abaixo
        'Content-Type': 'application/json',
      },
      // 🚨 ADICIONE ESTA LINHA: Envia o token no formato que o DTO do Nest espera
      body: JSON.stringify({ token: token }),
    });

    if (!res.ok) {
      // Dica: Adicione esse log pra ver o erro na Vercel se continuar falhando
      console.error(`Middleware Auth Error: ${res.status}`);
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
  /* O matcher deve pegar tudo, exceto arquivos estáticos (_next, imagens, favicon).
     Assim garantimos que o middleware avalie todas as navegações.
  */
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};