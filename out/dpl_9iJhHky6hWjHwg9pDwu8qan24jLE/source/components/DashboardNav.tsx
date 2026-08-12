'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
export default function DashboardNav({
  userName,
  rol,
}: {
  userName: string;
  rol?: 'admin_primario' | 'admin' | 'empleado';
}) {
  const pathname = usePathname();
  const esAdmin = rol === 'admin_primario' || rol === 'admin';
  const links = [
    { href: '/dashboard', label: 'Campañas' },
    { href: '/dashboard/campaigns/new', label: 'Nueva campaña' },
    ...(esAdmin ? [{ href: '/dashboard/users', label: 'Usuarios' }] : []),
    { href: '/dashboard/perfil', label: 'Mi cuenta' },
  ];
  const iniciales = userName
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-sm">
              AP
            </span>
            <span className="hidden text-base font-semibold tracking-tight text-slate-900 sm:inline">
              Agente de Promociones
            </span>
          </Link>
          <nav className="flex gap-1">
            {links.map((link) => {
              const activo = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    activo ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2.5 sm:flex">
            <span className="avatar bg-gradient-to-br from-slate-500 to-slate-700">{iniciales || '·'}</span>
            <span className="text-sm font-medium text-slate-600">{userName}</span>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="btn-secondary text-xs">
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
