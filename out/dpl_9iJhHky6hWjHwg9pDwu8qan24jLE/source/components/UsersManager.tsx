'use client';

import { Fragment, useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import EyeToggleButton from './EyeToggleButton';
import ConfirmDialog from './ConfirmDialog';

type Rol = 'admin_primario' | 'admin' | 'empleado';

type Usuario = {
  id: string | number;
  nombre: string;
  email: string;
  rol: Rol;
  vendedor_asignado?: string;
};
const VENDEDORES = [
  'Ricardo Alejandro Castro Pinzon',
  'Silvia Catalina Suarez Vega',
  'Jenny Maricela Pico Crespo',
  'Vanessa Gomez Cortes',
  'Andres Fernando Gutierrez Parra',
  'Maria Fernanda Gomez Cortes',
  'Dayana Patricia Barrera Escamilla',
  'Jesus Leonardo Gelvis Becerra',
  'Mauricio Navas Almeida',
  'Leonardo Fabio Monroy Cadena',
  'Cynthia Paola Cantero Perez',
  'Jonatan Efren David Noguera Poveda',
];

const CORREOS_PROTEGIDOS = ['mauricio.navas@compumax.com', 'luis.navas@compumax.com'];
function esCuentaProtegida(email: string) {
  return CORREOS_PROTEGIDOS.includes(email.toLowerCase().trim());
}

const ROL_LABELS: Record<Rol, string> = {
  admin_primario: 'Administrador Primario',
  admin: 'Administrador',
  empleado: 'Empleado',
};

const ROL_BADGE_CLASSES: Record<Rol, string> = {
  admin_primario: 'bg-amber-100 text-amber-800',
  admin: 'bg-brand-50 text-brand-700',
  empleado: 'bg-slate-100 text-slate-700',
};

const ROL_AVATAR_CLASSES: Record<Rol, string> = {
  admin_primario: 'bg-gradient-to-br from-amber-400 to-amber-600',
  admin: 'bg-gradient-to-br from-brand-500 to-brand-700',
  empleado: 'bg-gradient-to-br from-slate-400 to-slate-600',
};

function iniciales(nombre: string) {
  return (
    nombre
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

export default function UsersManager() {
  const { data: session } = useSession();
  const miId = (session?.user as any)?.id;
  const miRol = (session?.user as any)?.rol as Rol | undefined;
  const soyAdminPrimario = miRol === 'admin_primario';

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [rol, setRol] = useState<Rol>('empleado');
  const [vendedorAsignado, setVendedorAsignado] = useState('');
  const [creando, setCreando] = useState(false);
  const [formError, setFormError] = useState('');

  const [editandoId, setEditandoId] = useState<string | number | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRol, setEditRol] = useState<Rol>('empleado');
  const [editVendedorAsignado, setEditVendedorAsignado] = useState('');
  const [editError, setEditError] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const [cambiandoPasswordId, setCambiandoPasswordId] = useState<string | number | null>(null);
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [verNuevaPassword, setVerNuevaPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [guardandoPassword, setGuardandoPassword] = useState(false);

  function puedeRestablecerPassword(u: Usuario) {
    if (String(u.id) === String(miId)) return false;
    if (u.rol === 'admin_primario') return false;
    if (u.rol === 'admin') return soyAdminPrimario;
    return true;
  }

  function puedeEditar(u: Usuario) {
    if (String(u.id) === String(miId)) return true;
    if (u.rol === 'admin_primario') return false;
    if (u.rol === 'admin') return soyAdminPrimario;
    return true;
  }

  const [eliminandoId, setEliminandoId] = useState<string | number | null>(null);
  const [accionError, setAccionError] = useState('');

  const [mostrarFormCrear, setMostrarFormCrear] = useState(false);
  const [confirmAccion, setConfirmAccion] = useState<{ title: string; message: string; danger?: boolean; run: () => void } | null>(
    null
  );

  async function cargarUsuarios() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar usuarios');
      setUsuarios(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarUsuarios();
  }, []);

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!email.toLowerCase().trim().endsWith('@compumax.com')) {
      setFormError('Solo se permiten cuentas con correo @compumax.com.');
      return;
    }

    setCreando(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, password, rol, vendedor_asignado: vendedorAsignado }),
      });  
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear el usuario.');

      setNombre('');
      setEmail('');
      setPassword('');
      setVerPassword(false);
      setRol('empleado');
      setVendedorAsignado('');
      setMostrarFormCrear(false);
      await cargarUsuarios();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setCreando(false);
    }
  }

  function cancelarCrear() {
    setMostrarFormCrear(false);
    setFormError('');
    setNombre('');
    setEmail('');
    setPassword('');
    setVerPassword(false);
    setRol('empleado');
    setVendedorAsignado('');
  }

  function iniciarEdicion(u: Usuario) {
    setAccionError('');
    setEditandoId(u.id);
    setEditNombre(u.nombre);
    setEditEmail(u.email);
    setEditRol(u.rol);
    setEditVendedorAsignado(u.vendedor_asignado || '');
    setEditError('');
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setEditError('');
  }

  function handleGuardarEdicion(u: Usuario) {
    setEditError('');

    if (!editEmail.toLowerCase().trim().endsWith('@compumax.com')) {
      setEditError('Solo se permiten cuentas con correo @compumax.com.');
      return;
    }

    setConfirmAccion({
      title: 'Guardar cambios',
      message: `¿Deseas guardar los cambios del perfil de "${u.nombre}"?`,
      run: () => ejecutarGuardarEdicion(u),
    });
  }

  async function ejecutarGuardarEdicion(u: Usuario) {
    setGuardandoEdicion(true);
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: editNombre, email: editEmail, rol: editRol, vendedor_asignado: editVendedorAsignado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar el usuario.');

      setEditandoId(null);
      await cargarUsuarios();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setGuardandoEdicion(false);
    }
  }

  function iniciarCambioPassword(u: Usuario) {
    setAccionError('');
    setCambiandoPasswordId(u.id);
    setNuevaPassword('');
    setVerNuevaPassword(false);
    setPasswordError('');
  }

  function cancelarCambioPassword() {
    setCambiandoPasswordId(null);
    setVerNuevaPassword(false);
    setPasswordError('');
  }

  function handleGuardarPassword(u: Usuario) {
    setPasswordError('');

    if (!nuevaPassword) {
      setPasswordError('Ingresa la nueva contraseña.');
      return;
    }

    setConfirmAccion({
      title: 'Restablecer contraseña',
      message: `¿Deseas continuar? Se restablecerá la contraseña de "${u.nombre}".`,
      danger: true,
      run: () => ejecutarGuardarPassword(u),
    });
  }

  async function ejecutarGuardarPassword(u: Usuario) {
    setGuardandoPassword(true);
    try {
      const res = await fetch(`/api/users/${u.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: nuevaPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar la contraseña.');

      setCambiandoPasswordId(null);
      setNuevaPassword('');
      setVerNuevaPassword(false);
      await cargarUsuarios();
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setGuardandoPassword(false);
    }
  }

  function handleEliminar(u: Usuario) {
    setAccionError('');

    const esPropia = String(u.id) === String(miId);
    if (esPropia) {
      setAccionError('No puedes eliminar tu propia cuenta mientras tienes la sesión iniciada.');
      return;
    }

    if (esCuentaProtegida(u.email)) {
      setAccionError('Esta cuenta está protegida y no puede eliminarse.');
      return;
    }

    setConfirmAccion({
      title: 'Eliminar usuario',
      message: `¿Deseas continuar? Se eliminará permanentemente la cuenta de "${u.nombre}" (${u.email}).`,
      danger: true,
      run: () => ejecutarEliminar(u),
    });
  }

  async function ejecutarEliminar(u: Usuario) {
    setEliminandoId(u.id);
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar el usuario.');

      await cargarUsuarios();
    } catch (err: any) {
      setAccionError(err.message);
    } finally {
      setEliminandoId(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Usuarios</h1>
        <p className="mt-1 text-sm text-slate-500">Administra quién tiene acceso a la aplicación y con qué rol.</p>
      </div>

      <div className="card mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Crear usuario</h2>
          {!mostrarFormCrear && (
            <button type="button" className="btn-primary text-sm" onClick={() => setMostrarFormCrear(true)}>
              <span className="text-base leading-none">+</span> Crear usuario
            </button>
          )}
        </div>

        {mostrarFormCrear && (
          <form onSubmit={handleCrear} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nombre</label>
              <input required className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div>
              <label className="label">Correo (@compumax.com)</label>
              <input
                type="email"
                required
                placeholder="nombre@compumax.com"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <div className="flex gap-2">
                <input
                  type={verPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <EyeToggleButton visible={verPassword} onToggle={() => setVerPassword((v) => !v)} />
              </div>
            </div>
            <div>
              <label className="label">Rol</label>
              <select className="input" value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
                <option value="empleado">Empleado</option>
                <option value="admin">Administrador</option>
                {soyAdminPrimario && <option value="admin_primario">Administrador Primario</option>}
              </select>
            </div>
            <div>
              <label className="label">Vendedor asignado (opcional)</label>
              <select className="input" value={vendedorAsignado} onChange={(e) => setVendedorAsignado(e.target.value)}>
                <option value="">Sin asignar</option>
                {VENDEDORES.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            {formError && <p className="sm:col-span-2 text-sm text-red-600">{formError}</p>}

            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={creando} className="btn-primary">
                {creando ? 'Creando...' : 'Crear usuario'}
              </button>
              <button type="button" className="btn-secondary" onClick={cancelarCrear}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="card overflow-hidden !p-0">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Usuarios existentes{' '}
            {!loading && !error && <span className="font-normal text-slate-400">({usuarios.length})</span>}
          </h2>
        </div>
        {loading && <p className="px-6 py-4 text-sm text-slate-500">Cargando usuarios...</p>}
        {error && <p className="px-6 py-4 text-sm text-red-600">{error}</p>}
        {accionError && (
          <p className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {accionError}
          </p>
        )}
        {!loading && !error && (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-6 py-2.5 font-medium">Usuario</th>
                <th className="px-2 py-2.5 font-medium">Rol</th>
                <th className="px-2 py-2.5 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <Fragment key={u.id}>
                  <tr className="border-t border-slate-100 align-top transition hover:bg-slate-50/60">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`avatar ${ROL_AVATAR_CLASSES[u.rol]}`}>{iniciales(u.nombre)}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">
                            {u.nombre}
                            {String(u.id) === String(miId) && (
                              <span className="ml-1.5 text-xs font-normal text-slate-400">(tú)</span>
                            )}
                          </p>
                          <p className="truncate text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <span className={`badge ${ROL_BADGE_CLASSES[u.rol]}`}>{ROL_LABELS[u.rol] || u.rol}</span>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-wrap gap-2">
                        {puedeEditar(u) && (
                          <button
                            type="button"
                            className="btn-secondary text-xs"
                            onClick={() => iniciarEdicion(u)}
                          >
                            Editar
                          </button>
                        )}
                        {puedeRestablecerPassword(u) && (
                          <button
                            type="button"
                            className="btn-secondary text-xs"
                            onClick={() => iniciarCambioPassword(u)}
                          >
                            Restablecer contraseña
                          </button>
                        )}
                        {!esCuentaProtegida(u.email) && (
                          <button
                            type="button"
                            className="btn-danger text-xs"
                            disabled={eliminandoId === u.id}
                            onClick={() => handleEliminar(u)}
                          >
                            {eliminandoId === u.id ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {editandoId === u.id && (
                    <tr className="border-t border-slate-100 bg-slate-50">
                      <td colSpan={3} className="px-6 py-4">
                        <div className="grid gap-3 sm:grid-cols-4">
                          <div>
                            <label className="label">Nombre</label>
                            <input
                              className="input"
                              value={editNombre}
                              onChange={(e) => setEditNombre(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="label">Correo (@compumax.com)</label>
                            <input
                              type="email"
                              className="input"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="label">Rol</label>
                            <select
                              className="input"
                              value={editRol}
                              disabled={esCuentaProtegida(u.email)}
                              onChange={(e) => setEditRol(e.target.value as Rol)}
                            >
                              <option value="empleado">Empleado</option>
                              <option value="admin">Administrador</option>
                              {soyAdminPrimario && <option value="admin_primario">Administrador Primario</option>}
                            </select>
                            {esCuentaProtegida(u.email) && (
                              <p className="mt-1 text-xs text-slate-400">
                                El rol de esta cuenta está protegido y no puede cambiarse.
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                            <label className="label">Vendedor asignado</label>
                            <select className="input" value={editVendedorAsignado} onChange={(e) => setEditVendedorAsignado(e.target.value)}>
                              <option value="">Sin asignar</option>
                              {VENDEDORES.map((v) => (
                                <option key={v} value={v}>{v}</option>
                              ))}
                            </select>
                          </div>
                        {editError && <p className="mt-2 text-sm text-red-600">{editError}</p>}
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            className="btn-primary text-xs"
                            disabled={guardandoEdicion}
                            onClick={() => handleGuardarEdicion(u)}
                          >
                            {guardandoEdicion ? 'Guardando...' : 'Guardar cambios'}
                          </button>
                          <button type="button" className="btn-secondary text-xs" onClick={cancelarEdicion}>
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {cambiandoPasswordId === u.id && (
                    <tr className="border-t border-slate-100 bg-slate-50">
                      <td colSpan={3} className="px-6 py-4">
                        <div className="max-w-sm">
                          <label className="label">Nueva contraseña</label>
                          <div className="flex gap-2">
                            <input
                              type={verNuevaPassword ? 'text' : 'password'}
                              className="input"
                              autoComplete="new-password"
                              value={nuevaPassword}
                              onChange={(e) => setNuevaPassword(e.target.value)}
                            />
                            <EyeToggleButton
                              visible={verNuevaPassword}
                              onToggle={() => setVerNuevaPassword((v) => !v)}
                            />
                          </div>
                        </div>
                        {passwordError && <p className="mt-2 text-sm text-red-600">{passwordError}</p>}
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            className="btn-primary text-xs"
                            disabled={guardandoPassword}
                            onClick={() => handleGuardarPassword(u)}
                          >
                            {guardandoPassword ? 'Guardando...' : 'Guardar contraseña'}
                          </button>
                          <button type="button" className="btn-secondary text-xs" onClick={cancelarCambioPassword}>
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmAccion}
        title={confirmAccion?.title || ''}
        message={confirmAccion?.message || ''}
        danger={confirmAccion?.danger}
        loading={guardandoEdicion || guardandoPassword || !!eliminandoId}
        onConfirm={() => {
          confirmAccion?.run();
          setConfirmAccion(null);
        }}
        onCancel={() => setConfirmAccion(null)}
      />
    </div>
  );
}
