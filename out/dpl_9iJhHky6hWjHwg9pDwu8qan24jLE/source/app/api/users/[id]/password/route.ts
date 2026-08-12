import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, esAdmin, esAdminPrimario } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/password';
import { n8nFetch, obtenerUsuarios } from '@/lib/n8n';

const DIAS_ESPERA_CAMBIO_PASSWORD = 30;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const miRol = (session.user as any).rol;
  const miId = (session.user as any).id;
  const esUnoMismo = String(miId) === String(params.id);

  try {
    const { password, currentPassword } = await req.json();

    if (!password) {
      return NextResponse.json({ error: 'La contraseña es obligatoria.' }, { status: 400 });
    }

    const usuarios = await obtenerUsuarios();
    const objetivo = usuarios.find((u: any) => String(u.id) === String(params.id));
    if (!objetivo) {
      return NextResponse.json({ error: 'El usuario no existe.' }, { status: 404 });
    }

    if (esUnoMismo) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Ingresa tu contraseña actual.' }, { status: 400 });
      }
      const actualOk = verifyPassword(currentPassword, objetivo.password_hash || '');
      if (!actualOk) {
        return NextResponse.json({ error: 'La contraseña actual no es correcta.' }, { status: 400 });
      }

      if (objetivo.password_changed_at) {
        const ultimoCambio = new Date(objetivo.password_changed_at).getTime();
        if (!Number.isNaN(ultimoCambio)) {
          const diasTranscurridos = (Date.now() - ultimoCambio) / (1000 * 60 * 60 * 24);
          if (diasTranscurridos < DIAS_ESPERA_CAMBIO_PASSWORD) {
            const diasRestantes = Math.ceil(DIAS_ESPERA_CAMBIO_PASSWORD - diasTranscurridos);
            return NextResponse.json(
              {
                error: `Ya cambiaste tu contraseña recientemente. Debes esperar ${diasRestantes} día${
                  diasRestantes === 1 ? '' : 's'
                } más para volver a cambiarla.`,
              },
              { status: 400 }
            );
          }
        }
      }
    } else {
      if (!esAdmin(miRol)) {
        return NextResponse.json(
          { error: 'Solo un administrador puede cambiar la contraseña de otro usuario.' },
          { status: 403 }
        );
      }
      if (objetivo.rol === 'admin_primario') {
        return NextResponse.json(
          { error: 'La contraseña de un Administrador Primario solo puede cambiarla esa misma cuenta.' },
          { status: 403 }
        );
      }
      if (objetivo.rol === 'admin' && !esAdminPrimario(miRol)) {
        return NextResponse.json(
          { error: 'Solo un Administrador Primario puede cambiar la contraseña de otro Administrador.' },
          { status: 403 }
        );
      }
    }

    const password_hash = hashPassword(password);

    const data = await n8nFetch('promociones/usuarios/actualizar-contrasena', {
      method: 'POST',
      body: { id: params.id, password_hash },
    });

    return NextResponse.json({ ...data, esPropiaCuenta: esUnoMismo });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
