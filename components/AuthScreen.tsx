import React, { useState } from 'react';
import { AVAILABLE_COUNTRIES } from '../constants';
import { User } from '../types';
import { loginUser, registerUser, saveSession } from '../services/authService';

interface Props {
  mode: 'LOGIN' | 'REGISTER';
  onSuccess: (user: User) => void;
  onBack: () => void;
}

export const AuthScreen: React.FC<Props> = ({ mode, onSuccess, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [countryCode, setCountryCode] = useState(AVAILABLE_COUNTRIES[0].code);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'REGISTER') {
      const result = registerUser({ username, password, countryCode });
      if (result.success) {
        // Auto login after register
        const loginResult = loginUser(username, password);
        if (loginResult.success && loginResult.user) {
          saveSession(loginResult.user);
          onSuccess(loginResult.user);
        }
      } else {
        setError(result.message);
      }
    } else {
      const result = loginUser(username, password);
      if (result.success && result.user) {
        saveSession(result.user);
        onSuccess(result.user);
      } else {
        setError(result.message);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 px-4">
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700">
        <button 
          onClick={onBack}
          className="mb-6 text-gray-500 hover:text-white flex items-center gap-2 transition"
        >
          ← Volver
        </button>
        
        <h2 className="text-3xl font-bold text-white mb-6 text-center">
          {mode === 'LOGIN' ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </h2>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Usuario</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {mode === 'REGISTER' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Tu Bandera</label>
              <div className="relative">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-12 pr-4 py-3 text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {AVAILABLE_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <img
                    src={`https://flagcdn.com/w40/${countryCode}.png`}
                    alt="Flag"
                    className="h-5 w-8 object-cover rounded"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold py-4 rounded-lg shadow-lg transform transition hover:scale-[1.02]"
          >
            {mode === 'LOGIN' ? 'Entrar' : 'Registrarse'}
          </button>
        </form>
      </div>
    </div>
  );
};