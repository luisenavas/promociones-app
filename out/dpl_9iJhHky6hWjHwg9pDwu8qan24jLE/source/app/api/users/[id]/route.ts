import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, DOMINIO_PERMITIDO, esAdmin, esAdminPrimario, esCuentaProtegida } from '@/lib/auth';
import { n8nFetch, obtenerUsuarios } from '@/lib/n8n';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const miRol = (session.user as any).rol;
  const miId = (session.user as any).id;
  const esUnoMismo = String(miId) === String(params.id);
  if (!esAdmin(miRol)) {
    return NextResponse.json({ error: 'Solo un administrador puede editar usuarios.' }, { status: 403 });
  }

  try {
    const { nombre, email, rol, vendedor_asignado } = await req.json();

    if (!nombre || !email) {
      return NextResponse.json({ error: 'Nombre y correo son obligatorios.' }, { status: 400 });
    }

    const emailNormalizado = String(email).toLowerCase().trim();
    if (!emailNormalizado.endsWith(DOMINIO_PERMITIDO)) {
      return NextResponse.json(
        { error: `Solo se permiten cuentas con correo ${DOMINIO_PERMITIDO}.` },
        { status: 400 }
      );
    }

    const usuarios = await obtenerUsuarios();
    const objetivo = usuarios.find((u: any) => String(u.id) === String(params.id));
    if (!objetivo) {
      return NextResponse.json({ error: 'El usuario no existe.' }, { status: 404 });
    }

    const esAdminPrimarioYo = esAdminPrimario(miRol);

    if (!esUnoMismo) {
      if (objetivo.rol === 'admin_primario') {
        return NextResponse.json(
          { error: 'La cuenta de un Administrador Primario solo puede editarla esa misma cuenta.' },
          { status: 403 }
        );
      }
      if (objetivo.rol === 'admin' && !esAdminPrimarioYo) {
        return NextResponse.json(
          { error: 'Solo un Administrador Primario puede editar la cuenta de otro Administrador.' },
          { status: 403 }
        );
      }
    }

    if (rol === 'admin_primario' && !esAdminPrimarioYo) {
      return NextResponse.json(
        { error: 'Solo un Administrador Primario puede asignar el rol de Administrador Primario.' },
        { status: 403 }
      );
    }

    let rolFinal = rol === 'admin_primario' || rol === 'admin' ? rol : 'empleado';

    if (esCuentaProtegida(objetivo.email)) {
      rolFinal = objetivo.rol;
    }

    if (objetivo.rol === 'admin_primario' && rolFinal !== 'admin_primario') {
      const totalPrimarios = usuarios.filter((u: any) => u.rol === 'admin_primario').length;
      if (totalPrimarios <= 1) {
        return NextResponse.json(
          { error: 'No puedes quitarle el rol de Administrador Primario al último que queda.' },
          { status: 400 }
        );
      }
    }

    const data = await n8nFetch('promociones/usuarios/actualizar-perfil', {
      method: 'POST',
      body: { id: params.id, nombre, email: emailNormalizado, rol: rolFinal, vendedor_asignado: vendedor_asignado || '' },
    });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al actualizar el usuario.' }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const miRol = (session.user as any).rol;
  const miId = (session.user as any).id;
  if (!esAdmin(miRol)) {
    return NextResponse.json({ error: 'Solo un administrador puede eliminar usuarios.' }, { status: 403 });
  }

  if (String(miId) === String(params.id)) {
    return NextResponse.json(
      { error: 'No puedes eliminar tu propia cuenta mientras tienes la sesión iniciada.' },
      { status: 400 }
    );
  }

  try {
    const usuarios = await obtenerUsuarios();
    const objetivo = usuarios.find((u: any) => String(u.id) === String(params.id));
    if (!objetivo) {
      return NextResponse.json({ error: 'El usuario no existe.' }, { status: 404 });
    }

    if (esCuentaProtegida(objetivo.email)) {
      return NextResponse.json(
        { error: 'Esta cuenta está protegida y no puede eliminarse.' },
        { status: 403 }
      );
    }

    if (objetivo.rol === 'admin_primario') {
      if (!esAdminPrimario(miRol)) {
        return NextResponse.json(
          { error: 'Solo un Administrador Primario puede eliminar a otro Administrador Primario.' },
          { status: 403 }
        );
      }
      const totalPrimarios = usuarios.filter((u: any) => u.rol === 'admin_primario').length;
      if (totalPrimarios <= 1) {
        return NextResponse.json(
          { error: 'No puedes eliminar al último Administrador Primario: la app se quedaría sin acceso administrativo.' },
          { status: 400 }
        );
      }
    }

    const data = await n8nFetch('promociones/usuarios/eliminar', {
      method: 'POST',
      body: { id: params.id },
    });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
