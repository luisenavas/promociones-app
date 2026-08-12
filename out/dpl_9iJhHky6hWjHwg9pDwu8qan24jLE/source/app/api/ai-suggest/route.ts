import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import Anthropic from '@anthropic-ai/sdk';
import { authOptions } from '@/lib/auth';
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'La sugerencia con IA no está configurada todavía (falta ANTHROPIC_API_KEY).' },
      { status: 503 }
    );
  }
  try {
    const { nombreCampana, ideaBase } = await req.json();
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Escribe un texto corto y persuasivo en español para una promoción de WhatsApp dirigida a proveedores/distribuidores de una empresa. Nombre de la campaña: "${
            nombreCampana || 'Promoción'
          }". Idea base del usuario: "${
            ideaBase || 'ninguna, propón algo genérico y atractivo'
          }". Máximo 3-4 líneas, tono cercano y profesional, sin usar hashtags ni emojis excesivos, listo para enviar directamente.`,
        },
      ],
    });
    const textBlock = message.content.find((block) => block.type === 'text');
    const suggestion = textBlock && 'text' in textBlock ? textBlock.text : '';
    return NextResponse.json({ suggestion });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al generar la sugerencia.' }, { status: 500 });
  }
}
