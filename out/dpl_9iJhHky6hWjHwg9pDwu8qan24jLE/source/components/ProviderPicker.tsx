'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Proveedor } from '@/lib/n8n';

type SortKey = 'nombre' | 'ciudad' | 'departamento' | 'cupo_credito' | 'tipo' | 'responsable_zona';

const PREFIJOS_PAIS = [
  { value: '57', label: '+57 Colombia' },
  { value: '52', label: '+52 México' },
  { value: '54', label: '+54 Argentina' },
  { value: '56', label: '+56 Chile' },
  { value: '51', label: '+51 Perú' },
  { value: '593', label: '+593 Ecuador' },
  { value: '507', label: '+507 Panamá' },
  { value: '58', label: '+58 Venezuela' },
  { value: '34', label: '+34 España' },
  { value: '1', label: '+1 Estados Unidos' },
];

export default function ProviderPicker({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[], telefonos: string[]) => void;
}) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('cupo_credito');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [mostrarFormContacto, setMostrarFormContacto] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoCiudad, setNuevoCiudad] = useState('');
  const [nuevoDepartamento, setNuevoDepartamento] = useState('');
  const [nuevoPrefijo, setNuevoPrefijo] = useState('57');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState('');
  const [nuevoCupo, setNuevoCupo] = useState('');
  const [creandoContacto, setCreandoContacto] = useState(false);
  const [contactoError, setContactoError] = useState('');

  async function cargarProveedores() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/providers');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar proveedores');
      setProveedores(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarProveedores();
  }, []);

  function limpiarFormContacto() {
    setNuevoNombre('');
    setNuevoCiudad('');
    setNuevoDepartamento('');
    setNuevoPrefijo('57');
    setNuevoTelefono('');
    setNuevoTipo('');
    setNuevoCupo('');
    setContactoError('');
  }

  function cancelarFormContacto() {
    setMostrarFormContacto(false);
    limpiarFormContacto();
  }

  async function handleCrearContacto(e: React.FormEvent) {
    e.preventDefault();
    setContactoError('');

    const telefonoLimpio = nuevoTelefono.replace(/\D/g, '');
    if (!telefonoLimpio) {
      setContactoError('Ingresa un número de teléfono válido.');
      return;
    }
    if (!nuevoTipo.trim()) {
      setContactoError('Indica el tipo de contacto.');
      return;
    }

    setCreandoContacto(true);
    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nuevoNombre,
          ciudad: nuevoCiudad,
          departamento: nuevoDepartamento,
          telefono: `${nuevoPrefijo}${telefonoLimpio}`,
          tipo: nuevoTipo,
          cupo_credito: nuevoCupo === '' ? 0 : Number(nuevoCupo),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al agregar el contacto.');

      cancelarFormContacto();
      await cargarProveedores();
    } catch (err: any) {
      setContactoError(err.message);
    } finally {
      setCreandoContacto(false);
    }
  }

  const filtrados = useMemo(() => {
    let list = proveedores;
    const terminos = search
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    if (terminos.length > 0) {
      list = list.filter((p) => {
        const campos = [
          p.nombre,
          p.ciudad,
          p.departamento,
          p.telefono_principal,
          p.telefono_whatsapp,
          p.tipo,
          p.responsable_zona,
          p.cupo_credito === undefined || p.cupo_credito === null ? '' : String(p.cupo_credito),
        ]
          .map((v) => (v ?? '').toString().toLowerCase());

        return terminos.every((termino) => campos.some((campo) => campo.includes(termino)));
      });
    }
    const sorted = [...list].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va ?? '').localeCompare(String(vb ?? ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [proveedores, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function toggleSeleccion(p: Proveedor) {
    const id = String(p.id);
    const yaSeleccionado = selectedIds.includes(id);
    const nuevosIds = yaSeleccionado ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];

    const telefonos = nuevosIds
      .map((selId) => proveedores.find((pr) => String(pr.id) === selId))
      .filter(Boolean)
      .map((pr) => pr!.telefono_whatsapp || pr!.telefono_principal)
      .filter(Boolean);

    onChange(nuevosIds, telefonos as string[]);
  }

  function seleccionarTodos() {
    const ids = filtrados.map((p) => String(p.id));
    const telefonos = filtrados.map((p) => p.telefono_whatsapp || p.telefono_principal).filter(Boolean);
    onChange(ids, telefonos as string[]);
  }

  function limpiarSeleccion() {
    onChange([], []);
  }

  const arrow = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  if (loading) return <p className="text-sm text-slate-500">Cargando proveedores...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs"
          placeholder="Buscar (combina varios con comas: bucaramanga, 0)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" onClick={seleccionarTodos} className="btn-secondary text-xs">
          Seleccionar todos (filtrados)
        </button>
        <button type="button" onClick={limpiarSeleccion} className="btn-secondary text-xs">
          Limpiar selección
        </button>
        {!mostrarFormContacto && (
          <button type="button" onClick={() => setMostrarFormContacto(true)} className="btn-secondary text-xs">
            <span className="text-base leading-none">+</span> Agregar contacto
          </button>
        )}
        <span className="ml-auto text-sm text-slate-500">
          {selectedIds.length} proveedor{selectedIds.length === 1 ? '' : 'es'} seleccionado
          {selectedIds.length === 1 ? '' : 's'}
        </span>
      </div>

      {mostrarFormContacto && (
        <form onSubmit={handleCrearContacto} className="card mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Nombre</label>
            <input
              required
              className="input"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Ciudad</label>
            <input
              required
              className="input"
              value={nuevoCiudad}
              onChange={(e) => setNuevoCiudad(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Departamento</label>
            <input
              required
              className="input"
              value={nuevoDepartamento}
              onChange={(e) => setNuevoDepartamento(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <div className="grid grid-cols-[9rem_1fr] gap-2">
              <select
                className="input"
                value={nuevoPrefijo}
                onChange={(e) => setNuevoPrefijo(e.target.value)}
              >
                {PREFIJOS_PAIS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <input
                required
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Número sin el prefijo"
                className="input"
                value={nuevoTelefono}
                onChange={(e) => setNuevoTelefono(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label">Tipo</label>
            <input
              required
              placeholder="Distribuidor, Corporativo, Prueba..."
              className="input"
              value={nuevoTipo}
              onChange={(e) => setNuevoTipo(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Cupo de crédito (opcional)</label>
            <input
              type="number"
              placeholder="0"
              className="input"
              value={nuevoCupo}
              onChange={(e) => setNuevoCupo(e.target.value)}
            />
          </div>

          {contactoError && <p className="sm:col-span-2 text-sm text-red-600">{contactoError}</p>}

          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={creandoContacto} className="btn-primary">
              {creandoContacto ? 'Agregando...' : 'Agregar contacto'}
            </button>
            <button type="button" className="btn-secondary" onClick={cancelarFormContacto}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2.5"></th>
              <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort('nombre')}>
                Nombre{arrow('nombre')}
              </th>
              <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort('ciudad')}>
                Ciudad{arrow('ciudad')}
              </th>
              <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort('departamento')}>
                Departamento{arrow('departamento')}
              </th>
              <th className="px-3 py-2">Teléfono</th>
              <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort('tipo')}>
                Tipo{arrow('tipo')}
              </th>
              <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort('cupo_credito')}>
                Cupo de crédito (deuda){arrow('cupo_credito')}
              </th>
              <th className="cursor-pointer px-3 py-2" onClick={() => toggleSort('responsable_zona')}>
                Responsable de zona{arrow('responsable_zona')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => {
              const checked = selectedIds.includes(String(p.id));
              const telefono = p.telefono_whatsapp || p.telefono_principal;
              return (
                <tr
                  key={p.id}
                  onClick={() => toggleSeleccion(p)}
                  className={`cursor-pointer border-t border-slate-100 ${
                    checked ? 'bg-brand-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={checked} readOnly />
                  </td>
                  <td className="px-3 py-2">{p.nombre}</td>
                  <td className="px-3 py-2">{p.ciudad}</td>
                  <td className="px-3 py-2">{p.departamento}</td>
                  <td className="px-3 py-2">{telefono}</td>
                  <td className="px-3 py-2">{p.tipo}</td>
                  <td className="px-3 py-2">
                    {typeof p.cupo_credito === 'number' ? p.cupo_credito.toLocaleString('es-CO') : p.cupo_credito}
                  </td>
                  <td className="px-3 py-2">{p.responsable_zona}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
