'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProviderPicker from '@/components/ProviderPicker';
import type { Campana } from '@/lib/n8n';

const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  activa: 'Activa',
  enviada: 'Enviada',
  finalizada: 'Finalizada',
};

const DIAS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [];
  } catch {
    return [];
  }
}

function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [campanaOriginal, setCampanaOriginal] = useState<Campana | null>(null);

  const [nombre, setNombre] = useState('');
  const [texto, setTexto] = useState('');
  const [ideaBase, setIdeaBase] = useState('');
  const [imagenActualUrl, setImagenActualUrl] = useState('');
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState('');
  const [enviarInmediato, setEnviarInmediato] = useState(false);
  const [fechaHoraEnvio, setFechaHoraEnvio] = useState('');
  const [fechaFinalizacion, setFechaFinalizacion] = useState('');
  const [repetir, setRepetir] = useState(false);
  const [diasSemana, setDiasSemana] = useState<number[]>([]);
  const [proveedoresIds, setProveedoresIds] = useState<string[]>([]);
  const [telefonos, setTelefonos] = useState<string[]>([]);

  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [sugiriendo, setSugiriendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      setErrorCarga('');
      try {
        const res = await fetch('/api/campaigns');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al cargar la campaña');
        const campana = (data as Campana[]).find((c) => String(c.id) === String(id));
        if (!campana) throw new Error('No se encontró la campaña.');

        setCampanaOriginal(campana);
        setNombre(campana.nombre || '');
        setTexto(campana.texto_mensaje || '');
        setImagenActualUrl(campana.imagen_url || '');
        setEnviarInmediato(!!campana.enviar_inmediato);
        setFechaHoraEnvio(toDatetimeLocal(campana.fecha_hora_envio));
        setFechaFinalizacion(toDatetimeLocal(campana.fecha_finalizacion));
        const dias = parseJsonArray(campana.dias_semana).map((d) => Number(d));
        setDiasSemana(dias);
        setRepetir(dias.length > 0);
        setProveedoresIds(parseJsonArray(campana.proveedores_ids));
        setTelefonos(parseJsonArray(campana.telefonos_destino));
      } catch (err: any) {
        setErrorCarga(err.message);
      } finally {
        setCargando(false);
      }
    }
    if (id) cargar();
  }, [id]);

  async function handleImagenChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagenFile(file);
    setImagenPreview(URL.createObjectURL(file));
  }

  async function subirImagen(): Promise<string> {
    if (!imagenFile) return imagenActualUrl;
    setSubiendoImagen(true);
    try {
      const formData = new FormData();
      formData.append('file', imagenFile);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al subir la imagen');
      return data.url;
    } finally {
      setSubiendoImagen(false);
    }
  }

  async function pedirSugerencia() {
    setSugiriendo(true);
    setError('');
    try {
      const res = await fetch('/api/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombreCampana: nombre, ideaBase }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar sugerencia');
      setTexto(data.suggestion);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSugiriendo(false);
    }
  }

  function toggleDia(dia: number) {
    setDiasSemana((prev) => (prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!nombre.trim()) return setError('El nombre de la campaña es obligatorio.');
    if (!imagenFile && !imagenActualUrl) return setError('Debes tener una imagen.');
    if (!texto.trim()) return setError('El texto del mensaje es obligatorio.');
    if (proveedoresIds.length === 0) return setError('Debes seleccionar al menos un proveedor.');
    if (!enviarInmediato && !fechaHoraEnvio) return setError('Indica la fecha y hora de envío, o marca envío inmediato.');
    if (repetir && diasSemana.length === 0) return setError('Selecciona al menos un día de la semana para repetir el envío.');
    if (repetir && !fechaFinalizacion) return setError('Si vas a repetir el envío, debes indicar una fecha de finalización.');

    setGuardando(true);
    try {
      const imagen_url = await subirImagen();

      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          texto_mensaje: texto,
          imagen_url,
          proveedores_ids: proveedoresIds,
          telefonos_destino: telefonos,
          enviar_inmediato: enviarInmediato,
          fecha_hora_envio: enviarInmediato ? null : new Date(fechaHoraEnvio).toISOString(),
          fecha_finalizacion: fechaFinalizacion ? new Date(fechaFinalizacion).toISOString() : null,
          dias_semana: repetir ? diasSemana : [],
          estado: campanaOriginal?.estado,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar la campaña');

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="card h-40 animate-pulse bg-slate-50" />
      </div>
    );
  }

  if (errorCarga) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorCarga}</p>
      </div>
    );
  }

  const imagenMostrada = imagenPreview || imagenActualUrl;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Editar campaña</h1>
        <p className="mt-1 text-sm text-slate-500">
          Puedes editar esta campaña sin importar su estado actual
          {campanaOriginal ? ` (${ESTADO_LABELS[campanaOriginal.estado] || campanaOriginal.estado})` : ''}.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              1
            </span>
            <h2 className="text-sm font-semibold text-slate-900">Contenido</h2>
          </div>

          <div>
            <label className="label">Nombre de la campaña *</label>
            <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>

          <div>
            <label className="label">Imagen *</label>
            <div className="flex items-center gap-4">
              {imagenMostrada ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagenMostrada}
                  alt="Vista previa"
                  className="h-20 w-20 rounded-xl object-cover ring-1 ring-slate-200"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400">
                  Sin imagen
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImagenChange}
                className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-400">Deja este campo vacío para conservar la imagen actual.</p>
          </div>

          <div>
            <label className="label">Texto del mensaje *</label>
            <textarea
              className="input"
              rows={4}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                className="input max-w-xs text-xs"
                placeholder="Idea base para la IA (opcional)"
                value={ideaBase}
                onChange={(e) => setIdeaBase(e.target.value)}
              />
              <button type="button" onClick={pedirSugerencia} disabled={sugiriendo} className="btn-secondary text-xs">
                {sugiriendo ? 'Generando...' : 'Sugerir texto con IA'}
              </button>
            </div>
          </div>
        </div>

        <div className="card space-y-5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              2
            </span>
            <h2 className="text-sm font-semibold text-slate-900">Programación</h2>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={enviarInmediato}
              onChange={(e) => setEnviarInmediato(e.target.checked)}
            />
            Enviar inmediatamente
          </label>

          {!enviarInmediato && (
            <div>
              <label className="label">Fecha y hora de envío *</label>
              <input
                type="datetime-local"
                className="input max-w-xs"
                value={fechaHoraEnvio}
                onChange={(e) => setFechaHoraEnvio(e.target.value)}
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Si repites el envío en varios días, esta fecha define la hora del día y el primer envío.
              </p>
            </div>
          )}

          <div>
            <label className="label">Fecha de finalización {repetir ? '*' : '(opcional)'}</label>
            <input
              type="datetime-local"
              className="input max-w-xs"
              value={fechaFinalizacion}
              onChange={(e) => setFechaFinalizacion(e.target.value)}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={repetir}
              onChange={(e) => setRepetir(e.target.checked)}
            />
            Repetir el envío en días específicos de la semana mientras la campaña esté activa
          </label>

          {repetir && (
            <div>
              <label className="label">Días de envío *</label>
              <div className="flex flex-wrap gap-2">
                {DIAS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDia(d.value)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      diasSemana.includes(d.value)
                        ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                El mensaje se reenviará automáticamente cada uno de estos días hasta la fecha de finalización.
              </p>
            </div>
          )}
        </div>

        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              3
            </span>
            <h2 className="text-sm font-semibold text-slate-900">Destinatarios</h2>
          </div>
          <ProviderPicker
            selectedIds={proveedoresIds}
            onChange={(ids, tels) => {
              setProveedoresIds(ids);
              setTelefonos(tels);
            }}
          />
        </div>

        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={guardando || subiendoImagen} className="btn-primary">
            {subiendoImagen ? 'Subiendo imagen...' : guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
