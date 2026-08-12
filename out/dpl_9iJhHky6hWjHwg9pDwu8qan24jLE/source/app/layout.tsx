import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Providers from './providers';
import './globals.css';
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
export const metadata: Metadata = {
  title: 'Agente de Promociones',
  description: 'Gestión de campañas promocionales por WhatsApp para proveedores',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
