import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json();

    const response = await fetch(`${process.env.NESTJS_API_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'Signup failed' },
        { status: response.status }
      );
    }

    // 🔥 Cria a resposta e adiciona o cookie
    const nextResponse = NextResponse.json(data);
    
    // Salva o token no cookie também
    nextResponse.cookies.set({
      name: 'access_token',
      value: data.accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 1 dia
      path: '/',
    });

    return nextResponse;
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}