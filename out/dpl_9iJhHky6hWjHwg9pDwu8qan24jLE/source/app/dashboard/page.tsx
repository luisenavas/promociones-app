'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Campana } from '@/lib/n8n';

const estadoLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  activa: 'Activa',
  enviada: 'Enviada',
  finalizada: 'Finalizada',
};

export default function DashboardPage() {
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  async function cargarCampanas() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/campaigns');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar campañas');
      setCampanas(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarCampanas();
  }, []);

  async function eliminarCampana(id: string | number) {
    if (!confirm('¿Seguro que quieres eliminar esta campaña?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar');
      }
      setCampanas((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Campañas</h1>
          <p className="mt-1 text-sm text-slate-500">
            {loading
              ? 'Cargando...'
              : `${campanas.length} campaña${campanas.length === 1 ? '' : 's'} en total`}
          </p>
        </div>
        <Link href="/dashboard/campaigns/new" className="btn-primary">
          <span className="text-base leading-none">+</span> Nueva campaña
        </Link>
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-20 animate-pulse bg-slate-50" />
          ))}
        </div>
      )}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!loading && !error && campanas.length === 0 && (
        <div className="card flex flex-col items-center gap-2 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-xl text-brand-600">
            +
          </span>
          <p className="font-medium text-slate-700">Todavía no has creado ninguna campaña</p>
          <p className="text-sm text-slate-500">Crea tu primera campaña para empezar a enviar promociones.</p>
          <Link href="/dashboard/campaigns/new" className="btn-primary mt-2">
            Crear campaña
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {campanas.map((c) => {
          let proveedoresCount = 0;
          try {
            proveedoresCount = JSON.parse(c.proveedores_ids || '[]').length;
          } catch {
            proveedoresCount = 0;
          }

          return (
            <div
              key={c.id}
              className="card flex items-center justify-between gap-4 hover:shadow-softHover"
            >
              <div className="flex min-w-0 items-center gap-4">
                {c.imagen_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.imagen_url}
                    alt={c.nombre}
                    className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">
                    Sin imagen
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{c.nombre}</p>
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {proveedoresCount} proveedor{proveedoresCount === 1 ? '' : 'es'} ·{' '}
                    {c.enviar_inmediato ? 'Envío inmediato' : new Date(c.fecha_hora_envio).toLocaleString('es-CO')}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={`badge ${
                    c.estado === 'enviada' || c.estado === 'finalizada'
                      ? 'bg-green-100 text-green-700'
                      : c.estado === 'activa'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {estadoLabels[c.estado] || c.estado}
                </span>
                <Link
                  href={`/dashboard/campaigns/${c.id}/edit`}
                  className="text-sm font-medium text-brand-600 transition hover:text-brand-700"
                >
                  Editar
                </Link>
                <button
                  onClick={() => eliminarCampana(c.id)}
                  disabled={deletingId === c.id}
                  className="text-sm font-medium text-red-600 transition hover:text-red-700 disabled:opacity-50"
                >
                  {deletingId === c.id ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
