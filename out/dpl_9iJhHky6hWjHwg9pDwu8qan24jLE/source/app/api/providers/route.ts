import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { n8nFetch } from '@/lib/n8n';
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const data = await n8nFetch('promociones/proveedores', { method: 'GET' });
    const proveedores = Array.isArray(data) ? data : data ? [data] : [];
    return NextResponse.json(proveedores);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const { nombre, ciudad, departamento, telefono, tipo, cupo_credito } = await req.json();
    if (!nombre || !ciudad || !departamento || !telefono || !tipo) {
      return NextResponse.json(
        { error: 'Nombre, ciudad, departamento, teléfono y tipo son obligatorios.' },
        { status: 400 }
      );
    }
    const cupoFinal =
      cupo_credito === undefined || cupo_credito === null || cupo_credito === ''
        ? 0
        : Number(cupo_credito);
    if (Number.isNaN(cupoFinal)) {
      return NextResponse.json({ error: 'El cupo de crédito debe ser un número.' }, { status: 400 });
    }
    const data = await n8nFetch('promociones/proveedores/crear', {
      method: 'POST',
      body: { nombre, ciudad, departamento, telefono, tipo, cupo_credito: cupoFinal },
    });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al crear el contacto.' }, { status: 400 });
  }
}
