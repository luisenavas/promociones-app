'use client';

import { useEffect, useState } from 'react';
import type { Campana } from '@/lib/n8n';

export const TIPOS_CLASIFICACION = [
  { value: 'zona', label: 'Zona' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'tipo_cliente', label: 'Tipo de cliente' },
];

export type Clasificacion = { tipo: string; carpeta: string };

export type ResumenEnvio = {
  totalDestinatarios: number;
  porZona: { zona: string; cantidad: number }[];
  enviarInmediato: boolean;
};

export default function ClasificacionCampanaModal({
  open,
  valorInicial,
  guardando,
  resumenEnvio,
  advertenciaEstado,
  onCancelar,
  onConfirmar,
}: {
  open: boolean;
  valorInicial?: Clasificacion | null;
  guardando?: boolean;
  resumenEnvio?: ResumenEnvio;
  advertenciaEstado?: string;
  onCancelar: () => void;
  onConfirmar: (valor: Clasificacion) => void;
}) {
  const [tipo, setTipo] = useState('');
  const [carpetasPorTipo, setCarpetasPorTipo] = useState<Record<string, string[]>>({});
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState('');
  const [carpetaNueva, setCarpetaNueva] = useState('');
  const [cargandoCarpetas, setCargandoCarpetas] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTipo(valorInicial?.tipo || '');
    setCarpetaSeleccionada(valorInicial?.carpeta || '');
    setCarpetaNueva('');

    setCargandoCarpetas(true);
    fetch('/api/campaigns')
      .then((res) => res.json())
      .then((data: Campana[]) => {
        if (!Array.isArray(data)) return;
        const mapa: Record<string, Set<string>> = {};
        for (const c of data) {
          if (!c.clasificacion_tipo || !c.clasificacion_carpeta) continue;
          if (!mapa[c.clasificacion_tipo]) mapa[c.clasificacion_tipo] = new Set();
          mapa[c.clasificacion_tipo].add(c.clasificacion_carpeta);
        }
        const resultado: Record<string, string[]> = {};
        for (const t of Object.keys(mapa)) resultado[t] = Array.from(mapa[t]).sort();
        setCarpetasPorTipo(resultado);
      })
      .catch(() => {})
      .finally(() => setCargandoCarpetas(false));
  }, [open, valorInicial]);

  if (!open) return null;

  const carpetasDisponibles = tipo ? carpetasPorTipo[tipo] || [] : [];
  const carpetaFinal = carpetaNueva.trim() || carpetaSeleccionada;
  const puedeConfirmar = !!tipo && !!carpetaFinal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Confirmar campaña</h2>
        <p className="mt-1 text-sm text-slate-500">
          Revisa el resumen y elige cómo quieres organizar esta campaña antes de guardarla.
        </p>

        {resumenEnvio && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-700">
              {resumenEnvio.totalDestinatarios} destinatario{resumenEnvio.totalDestinatarios === 1 ? '' : 's'}
            </p>
            {resumenEnvio.porZona.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-slate-500">
                {resumenEnvio.porZona.map((z) => (
                  <li key={z.zona}>
                    {z.zona}: {z.cantidad}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {resumenEnvio?.enviarInmediato && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            ⚠️ Esto enviará el mensaje <strong>ahora mismo</strong> a {resumenEnvio.totalDestinatarios}{' '}
            destinatario{resumenEnvio.totalDestinatarios === 1 ? '' : 's'}.
          </p>
        )}

        {advertenciaEstado && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            ⚠️ {advertenciaEstado}
          </p>
        )}

        <div className="mt-5">
          <label className="label">¿Cómo deseas clasificarla?</label>
          <div className="flex flex-wrap gap-2">
            {TIPOS_CLASIFICACION.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setTipo(t.value);
                  setCarpetaSeleccionada('');
                  setCarpetaNueva('');
                }}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  tipo === t.value
                    ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tipo && (
          <div className="mt-4">
            <label className="label">Carpeta</label>
            {cargandoCarpetas ? (
              <p className="text-sm text-slate-400">Cargando carpetas...</p>
            ) : carpetasDisponibles.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {carpetasDisponibles.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCarpetaSeleccionada(c);
                      setCarpetaNueva('');
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      carpetaSeleccionada === c && !carpetaNueva.trim()
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mb-3 text-sm text-slate-400">Todavía no hay carpetas para este tipo.</p>
            )}
            <input
              className="input"
              placeholder="O crea una carpeta nueva..."
              value={carpetaNueva}
              onChange={(e) => {
                setCarpetaNueva(e.target.value);
                if (e.target.value.trim()) setCarpetaSeleccionada('');
              }}
            />
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={!puedeConfirmar || guardando}
            onClick={() => onConfirmar({ tipo, carpeta: carpetaFinal })}
            className={resumenEnvio?.enviarInmediato ? 'btn-danger' : 'btn-primary'}
          >
            {guardando
              ? 'Guardando...'
              : resumenEnvio?.enviarInmediato
              ? 'Confirmar y enviar ahora'
              : 'Confirmar y guardar campaña'}
          </button>
          <button type="button" onClick={onCancelar} className="btn-secondary" disabled={guardando}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
