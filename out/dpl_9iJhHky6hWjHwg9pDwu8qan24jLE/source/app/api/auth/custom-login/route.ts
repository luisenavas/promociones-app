import { NextRequest, NextResponse } from 'next/server';
import { encode } from 'next-auth/jwt';
import { verificarCredenciales, SESION_RECORDADA_SEGUNDOS, SESION_DEFAULT_SEGUNDOS } from '@/lib/auth';
export async function POST(req: NextRequest) {
  try {
    const { email, password, remember } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Correo y contraseña son obligatorios.' }, { status: 400 });
    }
    const usuario = await verificarCredenciales(email, password);
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Falta configurar NEXTAUTH_SECRET en el servidor.' }, { status: 500 });
    }
    const maxAge = remember ? SESION_RECORDADA_SEGUNDOS : SESION_DEFAULT_SEGUNDOS;
    const token = await encode({
      token: {
        sub: String(usuario.id),
        id: String(usuario.id),
        name: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
      secret,
      maxAge,
    });
    const useSecureCookies =
      (process.env.NEXTAUTH_URL || '').startsWith('https://') || process.env.NODE_ENV === 'production';
    const cookieName = useSecureCookies ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
    const response = NextResponse.json({ success: true });
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: useSecureCookies,
      sameSite: 'lax',
      path: '/',
      ...(remember ? { maxAge: SESION_RECORDADA_SEGUNDOS } : {}),
    });
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al iniciar sesión.' }, { status: 401 });
  }
}
