'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProviderPicker from '@/components/ProviderPicker';
import ClasificacionCampanaModal, { type Clasificacion, type ResumenEnvio } from '@/components/ClasificacionCampanaModal';
import WhatsAppPreview from '@/components/WhatsAppPreview';
import type { Proveedor } from '@/lib/n8n';

const DIAS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

export default function NewCampaignPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [texto, setTexto] = useState('');
  const [ideaBase, setIdeaBase] = useState('');
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
  const [mostrarClasificacion, setMostrarClasificacion] = useState(false);
  const [resumenEnvio, setResumenEnvio] = useState<ResumenEnvio | undefined>(undefined);
  const [proveedoresData, setProveedoresData] = useState<Proveedor[]>([]);

  useEffect(() => {
    fetch('/api/providers')
      .then((res) => res.json())
      .then((data) => setProveedoresData(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  function calcularResumenEnvio(): ResumenEnvio {
    const conteoPorZona: Record<string, number> = {};
    for (const id of proveedoresIds) {
      const prov = proveedoresData.find((p) => String(p.id) === id);
      const zona = prov?.responsable_zona?.trim() || 'Sin responsable asignado (servidor principal)';
      conteoPorZona[zona] = (conteoPorZona[zona] || 0) + 1;
    }
    return {
      totalDestinatarios: proveedoresIds.length,
      porZona: Object.entries(conteoPorZona)
        .map(([zona, cantidad]) => ({ zona, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad),
      enviarInmediato,
    };
  }

  async function handleImagenChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagenFile(file);
    setImagenPreview(URL.createObjectURL(file));
  }

  async function subirImagen(): Promise<string> {
    if (!imagenFile) throw new Error('Debes seleccionar una imagen.');
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!nombre.trim()) return setError('El nombre de la campaña es obligatorio.');
    if (!imagenFile) return setError('Debes subir una imagen.');
    if (!texto.trim()) return setError('El texto del mensaje es obligatorio.');
    if (proveedoresIds.length === 0) return setError('Debes seleccionar al menos un proveedor.');
    if (proveedoresIds.length > 30) return setError('Solo puedes enviar a un máximo de 30 proveedores por campaña.');
    if (!enviarInmediato && !fechaHoraEnvio) return setError('Indica la fecha y hora de envío, o marca envío inmediato.');
    if (repetir && diasSemana.length === 0) return setError('Selecciona al menos un día de la semana para repetir el envío.');
    if (repetir && !fechaFinalizacion) return setError('Si vas a repetir el envío, debes indicar una fecha de finalización.');

    setResumenEnvio(calcularResumenEnvio());
    setMostrarClasificacion(true);
  }

  async function crearCampana(clasificacion: Clasificacion) {
    setError('');
    setGuardando(true);
    try {
      const imagen_url = await subirImagen();

      const res = await fetch('/api/campaigns', {
        method: 'POST',
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
          clasificacion_tipo: clasificacion.tipo,
          clasificacion_carpeta: clasificacion.carpeta,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear la campaña');

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setMostrarClasificacion(false);
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Nueva campaña</h1>
        <p className="mt-1 text-sm text-slate-500">Define el mensaje, cuándo enviarlo y a quién.</p>
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
              {imagenPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagenPreview}
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

          <WhatsAppPreview imagenUrl={imagenPreview} texto={texto} />
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
            {subiendoImagen ? 'Subiendo imagen...' : guardando ? 'Guardando...' : 'Crear campaña'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>

      <ClasificacionCampanaModal
        open={mostrarClasificacion}
        guardando={guardando || subiendoImagen}
        resumenEnvio={resumenEnvio}
        onCancelar={() => setMostrarClasificacion(false)}
        onConfirmar={crearCampana}
      />
    </div>
  );
}
