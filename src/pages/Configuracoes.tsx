import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Database, Save, CheckCircle2, AlertCircle } from 'lucide-react';

export function Configuracoes() {
  const { fetchState } = useAppStore();
  const [dbPath, setDbPath] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.dbPath) setDbPath(data.dbPath);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbPath })
      });
      const data = await res.json();
      
      if (data.success) {
        setSaved(true);
        await fetchState();
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(data.error || 'Erro ao configurar a base de dados.');
      }
    } catch (e) {
      setError('Erro de ligação ao servidor local.');
    }
  };

  if (isLoading) return null;

  return (
    <div className="space-y-8 max-w-2xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Configurações</h1>
        <p className="text-slate-500 mt-2">Configure o caminho para o ficheiro da base de dados SQLite na rede local.</p>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Database className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Ficheiro de Base de Dados</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Caminho do Ficheiro SQLite
            </label>
            <input
              type="text"
              value={dbPath}
              onChange={(e) => setDbPath(e.target.value)}
              placeholder="Ex: Z:\partilha\dados.sqlite ou \\servidor\partilha\dados.sqlite"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-slate-500 mt-2">
              Insira o caminho completo para o ficheiro SQLite no servidor ou rede local. 
              Todos os utilizadores devem ter este caminho configurado no servidor local que está a correr a aplicação.
              Se o ficheiro não existir, será criado automaticamente.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!dbPath.trim()}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Guardar Configuração
          </button>

          {saved && (
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium mt-4 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              Configuração guardada e base de dados ligada com sucesso!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
