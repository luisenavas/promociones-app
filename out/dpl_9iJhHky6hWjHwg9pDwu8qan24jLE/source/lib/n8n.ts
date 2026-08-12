// Server-only helper for calling the n8n backend webhooks.
// Never import this file from a client component — it carries the shared secret.
const BASE_URL = process.env.N8N_BASE_URL || '';
const API_KEY = process.env.N8N_API_KEY || '';
type N8nOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  query?: Record<string, string>;
};
export async function n8nFetch(path: string, options: N8nOptions = {}) {
  const { method = 'GET', body, query } = options;
  let url = `${BASE_URL}/${path.replace(/^\//, '')}`;
  if (query) {
    const params = new URLSearchParams(query);
    url += `?${params.toString()}`;
  }
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const message = (data && (data.error || data.message)) || `Error ${res.status} al llamar a ${path}`;
    throw new Error(message);
  }
  return data;
}
export async function obtenerUsuarios() {
  const data = await n8nFetch('promociones/usuarios/todos', { method: 'GET' });
  return Array.isArray(data) ? data : data ? [data] : [];
}
export type Proveedor = {
  id: string | number;
  identificacion: string;
  tipo: string;
  tipo_persona: string;
  nombre: string;
  ciudad: string;
  departamento: string;
  telefono_principal: string;
  telefono_whatsapp: string;
  cupo_credito: number;
  correo_contacto: string;
  responsable_zona?: string;
    tipificacion?: string;
};
export type Campana = {
  id: string | number;
  nombre: string;
  texto_mensaje: string;
  imagen_url: string;
  proveedores_ids: string;
  telefonos_destino: string;
  fecha_hora_envio: string;
  fecha_finalizacion: string | null;
  enviar_inmediato: boolean;
  dias_semana: string;
  ultimo_envio?: string | null;
  proximo_envio?: string | null;
  estado: string;
  createdAt?: string;
};
