'use client';
import { useState } from 'react';
import { signOut } from 'next-auth/react';
import EyeToggleButton from './EyeToggleButton';
export default function CambiarMiPassword({ userId }: { userId: string }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verActual, setVerActual] = useState(false);
  const [verNueva, setVerNueva] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!actual) {
      setError('Ingresa tu contraseña actual.');
      return;
    }
    if (!nueva) {
      setError('Ingresa la nueva contraseña.');
      return;
    }
    if (nueva !== confirmar) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`/api/users/${userId}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: nueva, currentPassword: actual }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar la contraseña.');
      await signOut({ callbackUrl: '/login' });
    } catch (err: any) {
      setError(err.message);
      setGuardando(false);
    }
  }
  return (
    <div className="card">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Contraseña actual</label>
          <div className="flex gap-2">
            <input
              type={verActual ? 'text' : 'password'}
              className="input"
              autoComplete="current-password"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
            />
            <EyeToggleButton visible={verActual} onToggle={() => setVerActual((v) => !v)} />
          </div>
        </div>
        <div>
          <label className="label">Nueva contraseña</label>
          <div className="flex gap-2">
            <input
              type={verNueva ? 'text' : 'password'}
              className="input"
              autoComplete="new-password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
            />
            <EyeToggleButton visible={verNueva} onToggle={() => setVerNueva((v) => !v)} />
          </div>
        </div>
        <div>
          <label className="label">Confirmar nueva contraseña</label>
          <input
            type={verNueva ? 'text' : 'password'}
            className="input"
            autoComplete="new-password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={guardando} className="btn-primary w-full">
          {guardando ? 'Guardando...' : 'Cambiar contraseña'}
        </button>
        <p className="text-xs text-slate-400">
          Al cambiar tu contraseña se cerrará tu sesión y deberás iniciar sesión de nuevo con la nueva.
        </p>
      </form>
    </div>
  );
}
