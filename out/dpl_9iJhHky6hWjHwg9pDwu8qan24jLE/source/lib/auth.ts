import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { n8nFetch } from './n8n';
import { verifyPassword } from './password';

export const DOMINIO_PERMITIDO = '@compumax.com';

export const CORREOS_PROTEGIDOS = ['mauricio.navas@compumax.com', 'luis.navas@compumax.com'];

export function esCuentaProtegida(email?: string | null): boolean {
  if (!email) return false;
  return CORREOS_PROTEGIDOS.includes(String(email).toLowerCase().trim());
}
export const SESION_RECORDADA_SEGUNDOS = 30 * 24 * 60 * 60;
export const SESION_DEFAULT_SEGUNDOS = 24 * 60 * 60;

export type Rol = 'admin_primario' | 'admin' | 'empleado';

export function esAdmin(rol?: string | null): boolean {
  return rol === 'admin_primario' || rol === 'admin';
}

export function esAdminPrimario(rol?: string | null): boolean {
  return rol === 'admin_primario';
}

export async function verificarCredenciales(emailInput: string, password: string) {
  const email = emailInput.toLowerCase().trim();

  if (!email.endsWith(DOMINIO_PERMITIDO)) {
    throw new Error(`Solo se permiten cuentas con correo ${DOMINIO_PERMITIDO}.`);
  }

  const result = await n8nFetch('promociones/usuarios', { query: { email } });
  const rows = Array.isArray(result) ? result : result ? [result] : [];

  if (rows.length === 0) {
    throw new Error('Correo o contraseña incorrectos.');
  }

  const usuario = rows[0];
  const passwordOk = verifyPassword(password, usuario.password_hash || '');
  if (!passwordOk) {
    throw new Error('Correo o contraseña incorrectos.');
  }

  return usuario as {
    id: string | number;
    nombre: string;
    email: string;
    password_hash: string;
    rol: Rol;
  };
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: SESION_RECORDADA_SEGUNDOS },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credenciales',
      credentials: {
        email: { label: 'Correo', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const usuario = await verificarCredenciales(credentials.email, credentials.password);

        return {
          id: String(usuario.id),
          name: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.rol = (user as any).rol;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).rol = token.rol;
      }
      return session;
    },
  },
};
