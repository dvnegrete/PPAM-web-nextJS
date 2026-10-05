import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Horarios del exhibidor',
  description: 'Panel de administración de turnos del punto de exhibición',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
