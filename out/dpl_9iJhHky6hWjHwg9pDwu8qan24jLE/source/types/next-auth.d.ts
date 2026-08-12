import 'next-auth';
declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      rol?: 'admin_primario' | 'admin' | 'empleado';
    };
  }
}
