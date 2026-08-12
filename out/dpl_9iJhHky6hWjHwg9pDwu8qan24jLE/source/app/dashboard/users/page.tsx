import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions, esAdmin } from '@/lib/auth';
import UsersManager from '@/components/UsersManager';
export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (!esAdmin((session.user as any).rol)) redirect('/dashboard');
  return <UsersManager />;
}
