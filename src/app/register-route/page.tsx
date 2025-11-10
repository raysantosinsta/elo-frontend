// pages/register-route.tsx
'use client';

import { useState } from 'react';
import axios from 'axios';

export default function RegisterRoute() {
  const [form, setForm] = useState({
    origin: '',
    destination: '',
    plannedTime: '',
    date: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação simples
    if (!form.origin || !form.destination || !form.plannedTime || !form.date) {
      alert('Preencha todos os campos!');
      return;
    }

    const payload = {
      ...form,
      createdBy: { id: 'user-123', name: 'João Silva' },
    };

    setLoading(true);
    setSuccess(false);

    try {
      const res = await axios.post('http://localhost:3002/routes', payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      setSuccess(true);
      alert(`Rota criada com sucesso! ID: ${res.data.id}`);
      
      // Limpa o formulário
      setForm({ origin: '', destination: '', plannedTime: '', date: '' });
    } catch (err: any) {
      console.error('Erro ao criar rota:', err.response?.data || err);
      alert(
        'Erro ao salvar rota: ' +
          (err.response?.data?.message || err.message || 'Tente novamente.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Registrar Rota Planejada
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Origem
          </label>
          <input
            type="text"
            placeholder="Ex: Rua Palmeiras, 1070"
            value={form.origin}
            onChange={(e) => setForm({ ...form, origin: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Destino
          </label>
          <input
            type="text"
            placeholder="Ex: Rua Canudo, 1111"
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tempo Estimado
          </label>
          <input
            type="text"
            placeholder="Ex: 4h30min ou 5h"
            value={form.plannedTime}
            onChange={(e) => setForm({ ...form, plannedTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data da Rota
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-md font-medium transition-all ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : success
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
              Salvando...
            </span>
          ) : success ? (
            'Rota Registrada!'
          ) : (
            'Registrar Rota'
          )}
        </button>
      </form>

      {success && (
        <p className="mt-4 text-center text-green-600 font-medium">
          Rota salva com sucesso!
        </p>
      )}
    </div>
  );
}