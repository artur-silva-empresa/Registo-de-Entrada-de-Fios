import React from 'react';
import { useAppStore } from '../store';
import { Package, AlertCircle, CheckCircle2, TrendingUp, Download, Info } from 'lucide-react';
import initSqlJs from 'sql.js';

const SQL_WASM_URL = '/sql-wasm.wasm';

export function Dashboard() {
  const { state, isConnected, connectToDb } = useAppStore();

  const totalRequested = state.items.reduce((acc, item) => acc + Number(item.quantity || 0), 0);
  const totalDelivered = state.deliveries.reduce((acc, d) => acc + Number(d.quantity || 0), 0);
  const totalPending = totalRequested - totalDelivered;

  const pendingItemsCount = state.items.filter(item => {
    const delivered = state.deliveries.filter(d => d.itemId === item.id).reduce((sum, d) => sum + Number(d.quantity || 0), 0);
    return delivered < Number(item.quantity || 0);
  }).length;

  const downloadInitialDb = async () => {
    const SQL = await initSqlJs({
      locateFile: () => SQL_WASM_URL,
    });
    const db = new SQL.Database();

    db.run(`
      CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY,
        date TEXT,
        number TEXT,
        uploadDate TEXT
      );

      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        requestId TEXT,
        section TEXT,
        quantity REAL,
        description TEXT,
        coneColor TEXT,
        observations TEXT,
        FOREIGN KEY(requestId) REFERENCES requests(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS deliveries (
        id TEXT PRIMARY KEY,
        itemId TEXT,
        quantity REAL,
        date TEXT,
        deliveryNote TEXT,
        deliveryDate TEXT,
        observations TEXT,
        FOREIGN KEY(itemId) REFERENCES items(id) ON DELETE CASCADE
      );
    `);

    const data = db.export();
    const blob = new Blob([data], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fios_database.db';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {!isConnected && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 rounded-full shrink-0">
              <Info className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-900">Base de Dados não ligada</h3>
              <p className="text-red-700 mt-1 max-w-xl">
                Para começar a usar a aplicação, precisa de selecionar o ficheiro SQLite localizado no servidor/rede.
                Se for a primeira vez, pode descarregar um ficheiro base vazio abaixo e colocá-lo na pasta partilhada.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={downloadInitialDb}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-red-200 text-red-700 rounded-lg font-semibold hover:bg-red-50 transition-all shadow-sm"
            >
              <Download className="w-5 h-5" />
              Criar Ficheiro Base
            </button>
            <button
              onClick={connectToDb}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all shadow-md"
            >
              Selecionar SQLite
            </button>
          </div>
        </div>
      )}

      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-2">Visão geral do estado dos pedidos e entregas de fio.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Solicitado" 
          value={totalRequested.toLocaleString('pt-PT')} 
          icon={Package} 
          color="text-blue-600" 
          bgColor="bg-blue-100" 
        />
        <StatCard 
          title="Total Entregue" 
          value={totalDelivered.toLocaleString('pt-PT')} 
          icon={CheckCircle2} 
          color="text-emerald-600" 
          bgColor="bg-emerald-100" 
        />
        <StatCard 
          title="Total em Falta" 
          value={totalPending.toLocaleString('pt-PT')} 
          icon={AlertCircle} 
          color="text-amber-600" 
          bgColor="bg-amber-100" 
        />
        <StatCard 
          title="Linhas Pendentes" 
          value={pendingItemsCount.toString()} 
          icon={TrendingUp} 
          color="text-indigo-600" 
          bgColor="bg-indigo-100" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Últimos Pedidos</h2>
          {state.requests.length === 0 ? (
            <p className="text-slate-500 text-sm">Nenhum pedido registado.</p>
          ) : (
            <div className="space-y-4">
              {state.requests.slice(0, 5).map(req => (
                <div key={req.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <p className="font-medium text-slate-900">Pedido #{req.number}</p>
                    <p className="text-xs text-slate-500">Data: {req.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">
                      {state.items.filter(i => i.requestId === req.id).length} itens
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Últimas Entradas</h2>
          {state.deliveries.length === 0 ? (
            <p className="text-slate-500 text-sm">Nenhuma entrada registada.</p>
          ) : (
            <div className="space-y-4">
              {state.deliveries.slice(0, 5).map(delivery => {
                const item = state.items.find(i => i.id === delivery.itemId);
                return (
                  <div key={delivery.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-medium text-slate-900 truncate" title={item?.description}>
                        {item?.description || 'Item desconhecido'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Guia: {delivery.deliveryNote || 'N/A'} • Data: {delivery.deliveryDate ? new Date(delivery.deliveryDate).toLocaleDateString('pt-PT') : new Date(delivery.date).toLocaleDateString('pt-PT')}
                      </p>
                      {delivery.observations && (
                        <p className="text-xs text-slate-400 mt-1 italic truncate" title={delivery.observations}>
                          Obs: {delivery.observations}
                        </p>
                      )}
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <p className="text-sm font-bold text-emerald-600">
                        +{delivery.quantity}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bgColor }: any) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex items-center gap-4">
      <div className={`p-4 rounded-full ${bgColor}`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
