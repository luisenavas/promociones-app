'use client';

export default function WhatsAppPreview({ imagenUrl, texto }: { imagenUrl: string; texto: string }) {
  const hora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <p className="label">Vista previa del mensaje</p>
      <div
        className="max-w-xs rounded-xl p-3"
        style={{
          backgroundColor: '#e5ddd5',
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.4), rgba(255,255,255,0.4))',
        }}
      >
        <div className="overflow-hidden rounded-lg bg-white shadow-sm">
          {imagenUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagenUrl} alt="Vista previa" className="max-h-56 w-full object-cover" />
          ) : (
            <div className="flex h-40 w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
              Sin imagen todavía
            </div>
          )}
          <div className="px-2.5 py-2">
            <p className="whitespace-pre-wrap break-words text-[13px] leading-snug text-slate-800">
              {texto || <span className="text-slate-400">El texto del mensaje aparecerá aquí...</span>}
            </p>
            <p className="mt-1 text-right text-[11px] text-slate-400">{hora}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
