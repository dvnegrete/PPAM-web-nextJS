'use client';

import { useState } from 'react';
import { login, saveSession, Session } from '@/lib/api';

export function LoginForm({ onLogin }: { onLogin: (session: Session) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await login(email, password);
      saveSession(session);
      onLogin(session);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'No se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 360, margin: '12vh auto', padding: '0 1rem' }}>
      <div className="tarjeta">
        <h1>Horarios del exhibidor</h1>
        <p className="tenue" style={{ marginTop: 0 }}>
          Panel de administración
        </p>

        {error && <div className="aviso error">{error}</div>}

        <form onSubmit={submit}>
          <label>
            <span>Correo</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button className="primario" type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}
