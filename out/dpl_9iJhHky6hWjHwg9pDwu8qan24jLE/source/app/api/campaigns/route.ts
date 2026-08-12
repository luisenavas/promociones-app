import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { n8nFetch } from '@/lib/n8n';
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const data = await n8nFetch('promociones/campanas', { method: 'GET' });
    const campanas = Array.isArray(data) ? data : data ? [data] : [];
    return NextResponse.json(campanas);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.nombre || !body.imagen_url || !body.texto_mensaje) {
      return NextResponse.json(
        { error: 'Nombre, imagen y texto del mensaje son obligatorios.' },
        { status: 400 }
      );
    }
    if (!Array.isArray(body.proveedores_ids) || body.proveedores_ids.length === 0) {
      return NextResponse.json({ error: 'Debes seleccionar al menos un proveedor.' }, { status: 400 });
    }
    if (!body.enviar_inmediato && !body.fecha_hora_envio) {
      return NextResponse.json(
        { error: 'Debes indicar la fecha y hora de envío, o marcar envío inmediato.' },
        { status: 400 }
      );
    }
    const data = await n8nFetch('promociones/campanas', { method: 'POST', body });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
