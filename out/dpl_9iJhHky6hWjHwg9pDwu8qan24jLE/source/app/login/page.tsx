'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/custom-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Correo o contraseña incorrectos.');
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-bold text-white shadow-soft">
            AP
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Agente de Promociones</h1>
          <p className="mt-1 text-sm text-slate-500">Inicia sesión para gestionar tus campañas.</p>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Correo electrónico</label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="tu.nombre@compumax.com"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Recordarme por 30 días en este dispositivo
            </label>
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          ¿No tienes cuenta? Pídele acceso a tu administrador.
        </p>
      </div>
    </div>
  );
}
