import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import CambiarMiPassword from '@/components/CambiarMiPassword';
export default async function PerfilPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Mi cuenta</h1>
        <p className="mt-1 text-sm text-slate-500">
          {session.user?.name} · {session.user?.email}
        </p>
      </div>
      <CambiarMiPassword userId={(session.user as any).id} />
    </div>
  );
}
