import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, DOMINIO_PERMITIDO, esAdmin, esAdminPrimario } from '@/lib/auth';
import { hashPassword } from '@/lib/password';
import { n8nFetch } from '@/lib/n8n';
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const miRol = (session.user as any).rol;
  if (!esAdmin(miRol)) {
    return NextResponse.json({ error: 'Solo un administrador puede ver esta información.' }, { status: 403 });
  }
  try {
    const data = await n8nFetch('promociones/usuarios/todos', { method: 'GET' });
    let usuarios = Array.isArray(data) ? data : data ? [data] : [];
    usuarios = usuarios.map(({ password_hash, ...resto }: any) => resto);
    if (!esAdminPrimario(miRol)) {
      usuarios = usuarios.filter((u: any) => u.rol !== 'admin_primario');
    }
    return NextResponse.json(usuarios);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const miRol = (session.user as any).rol;
  if (!esAdmin(miRol)) {
    return NextResponse.json({ error: 'Solo un administrador puede crear usuarios.' }, { status: 403 });
  }
  try {
    const { nombre, email, password, rol, vendedor_asignado } = await req.json();
    if (!nombre || !email || !password) {
      return NextResponse.json({ error: 'Nombre, correo y contraseña son obligatorios.' }, { status: 400 });
    }
    const emailNormalizado = String(email).toLowerCase().trim();
    if (!emailNormalizado.endsWith(DOMINIO_PERMITIDO)) {
      return NextResponse.json(
        { error: `Solo se permiten cuentas con correo ${DOMINIO_PERMITIDO}.` },
        { status: 400 }
      );
    }
    if (rol === 'admin_primario' && !esAdminPrimario(miRol)) {
      return NextResponse.json(
        { error: 'Solo un Administrador Primario puede crear otra cuenta de Administrador Primario.' },
        { status: 403 }
      );
    }
    const rolFinal = rol === 'admin_primario' || rol === 'admin' ? rol : 'empleado';
    const password_hash = hashPassword(password);
    const data = await n8nFetch('promociones/usuarios/crear', {
      method: 'POST',
      body: { nombre, email: emailNormalizado, password_hash, rol: rolFinal, vendedor_asignado: vendedor_asignado || '' },
    });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al crear el usuario.' }, { status: 400 });
  }
}
