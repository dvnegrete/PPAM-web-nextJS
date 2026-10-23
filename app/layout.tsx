import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Horarios PPAM Cuernavaca',
  description: 'Panel de turnos PPAM punto 3 de Chipitlán',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
