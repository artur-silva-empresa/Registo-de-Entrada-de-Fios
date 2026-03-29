import React, { useState, useEffect, useRef } from 'react';
import { Save, Database, AlertCircle, CheckCircle2, Download, Upload } from 'lucide-react';
import { useAppStore } from '../store';

export function Settings() {
  const { state, importData } = useAppStore();
  const [dbPath, setDbPath] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingFromPath, setIsImportingFromPath] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.sqliteDbPath) {
          setDbPath(data.sqliteDbPath);
        }
      })
      .catch(err => console.error('Failed to load settings:', err));
  }, []);

  const handleImportFromPath = async () => {
    if (!dbPath) {
      alert('Por favor, defina e guarde o caminho do ficheiro SQLite primeiro.');
      return;
    }

    setIsImportingFromPath(true);
    try {
      const res = await fetch('/api/data');
      if (!res.ok) {
        throw new Error('Falha ao carregar dados do caminho configurado.');
      }
      
      const { data } = await res.json();
      if (!data) {
        throw new Error('O ficheiro SQLite está vazio ou não existe no caminho configurado.');
      }

      importData(data);
      alert('Base de dados importada com sucesso do caminho configurado!');
    } catch (error: any) {
      console.error('Import from path error:', error);
      alert(`Erro: ${error.message}`);
    } finally {
      setIsImportingFromPath(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    setErrorMessage('');

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: dbPath }),
      });

      if (!res.ok) throw new Error('Falha ao guardar configurações');

      setSaveStatus('success');
      
      // Trigger a sync immediately if path is set
      if (dbPath) {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state),
        });
      }

      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error: any) {
      setSaveStatus('error');
      setErrorMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBrowse = async () => {
    try {
      const res = await fetch('/api/browse');
      const data = await res.json();
      if (data.path) {
        setDbPath(data.path);
        // Save automatically after browsing
        const saveRes = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: data.path }),
        });
        if (saveRes.ok) {
          setSaveStatus('success');
          setTimeout(() => setSaveStatus('idle'), 3000);
        }
      }
    } catch (error) {
      console.error('Browse error:', error);
      alert('Não foi possível abrir o seletor de ficheiros. Certifique-se de que está a usar o executável.');
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });

      if (!res.ok) throw new Error('Falha ao exportar base de dados');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'BaseDados.sqlite';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Erro ao exportar a base de dados.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: buffer
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao importar base de dados');
      }

      const { data } = await res.json();
      importData(data);
      alert('Base de dados importada com sucesso!');
    } catch (error: any) {
      console.error('Import error:', error);
      alert(`Erro: ${error.message}`);
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Configurações</h1>
        <p className="text-slate-500 mt-2">Gira as configurações da aplicação e base de dados.</p>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Base de Dados SQLite</h2>
          </div>
          
          <p className="text-sm text-slate-600 mb-6">
            Configure o caminho na sua rede local onde o ficheiro SQLite será guardado automaticamente.
            <br />
            <span className="text-amber-600 font-medium">Nota:</span> O caminho deve ser acessível pelo servidor onde a aplicação está alojada (ex: <code className="bg-amber-50 px-1 py-0.5 rounded">C:\Dados\fios.sqlite</code> ou <code className="bg-amber-50 px-1 py-0.5 rounded">\\SERVIDOR\Partilha\fios.sqlite</code>).
          </p>

          <div className="space-y-4 max-w-2xl">
            <div>
              <label htmlFor="dbPath" className="block text-sm font-medium text-slate-700 mb-1">
                Caminho do Ficheiro SQLite
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="dbPath"
                  value={dbPath}
                  onChange={(e) => setDbPath(e.target.value)}
                  placeholder="Ex: C:\Dados\fios.sqlite"
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                <button
                  onClick={handleBrowse}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors border border-slate-300"
                >
                  Procurar...
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'A guardar...' : 'Guardar Caminho'}
              </button>

              <button
                onClick={handleImportFromPath}
                disabled={isImportingFromPath || !dbPath}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Database className="w-4 h-4" />
                {isImportingFromPath ? 'A carregar...' : 'Carregar do Caminho'}
              </button>

              {saveStatus === 'success' && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Guardado com sucesso
                </span>
              )}

              {saveStatus === 'error' && (
                <span className="flex items-center gap-1.5 text-sm text-red-600 font-medium">
                  <AlertCircle className="w-4 h-4" />
                  {errorMessage}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Importação e Exportação Manual</h3>
          <p className="text-sm text-slate-600 mb-4">
            Pode importar uma base de dados SQLite existente ou descarregar a atual para o seu computador.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors disabled:opacity-50 shadow-sm"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'A exportar...' : 'Exportar Base de Dados SQLite'}
            </button>
            
            <input 
              type="file" 
              accept=".sqlite,.db" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImport} 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors disabled:opacity-50 shadow-sm"
            >
              <Upload className="w-4 h-4" />
              {isImporting ? 'A importar...' : 'Importar Base de Dados SQLite'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
