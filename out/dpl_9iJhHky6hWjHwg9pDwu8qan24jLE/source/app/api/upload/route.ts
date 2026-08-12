import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { put } from '@vercel/blob';
import { authOptions } from '@/lib/auth';
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No se recibió ningún archivo.' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'El archivo debe ser una imagen.' }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: 'La imagen no puede superar 8MB.' }, { status: 400 });
  }
  try {
    const filename = `promociones/${Date.now()}-${file.name}`;
    const blob = await put(filename, file, { access: 'public' });
    return NextResponse.json({ url: blob.url });
  } catch (err: any) {
    console.error('Error subiendo a Blob:', err);
    return NextResponse.json(
      { error: err?.message || 'Error al subir la imagen. Verifica la configuración de Blob Storage.' },
      { status: 500 }
    );
  }
}
