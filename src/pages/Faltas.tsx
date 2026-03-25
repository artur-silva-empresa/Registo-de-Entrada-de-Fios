import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Search, Filter, Download, AlertCircle } from 'lucide-react';
import { exportToExcel } from '../lib/excel';

export function Faltas() {
  const { state } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSection, setFilterSection] = useState<'all' | 'Tinturaria' | 'Tecelagem' | 'Urdir'>('all');

  // Filter items that have pending quantity
  const pendingItems = state.items.map(item => {
    const request = state.requests.find(r => r.id === item.requestId);
    const delivered = state.deliveries
      .filter(d => d.itemId === item.id)
      .reduce((sum, d) => sum + Number(d.quantity || 0), 0);
    const pending = Number(item.quantity || 0) - delivered;

    return {
      ...item,
      requestNumber: request?.number || 'N/A',
      requestDate: request?.date || 'N/A',
      delivered,
      pending
    };
  }).filter(item => item.pending > 0);

  const filteredItems = pendingItems.filter(item => {
    const sectionDisplay = item.section.toLowerCase().includes('tecelagem') ? 'Tecelagem' :
                           item.section.toLowerCase().includes('tinturaria') ? 'Tinturaria' : 
                           item.section.toLowerCase().includes('urdir') ? 'Urdir' : 'Outros';
                           
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.section.toLowerCase().includes(searchTerm.toLowerCase());
                          
    const matchesFilter = filterSection === 'all' || sectionDisplay === filterSection;
    
    return matchesSearch && matchesFilter;
  });

  const handleExport = () => {
    // We only want to export the filtered pending items
    // The exportToExcel function takes the raw items, so we need to map our filtered items back to the original format
    const itemsToExport = state.items.filter(item => filteredItems.some(fi => fi.id === item.id));
    exportToExcel(state.requests, itemsToExport, state.deliveries);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-amber-500" />
            Relatório de Faltas
          </h1>
          <p className="text-slate-500 mt-2">Lista detalhada de todos os fios com quantidade pendente de entrega.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={filteredItems.length === 0}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          Exportar Excel
        </button>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por pedido, descrição ou destino..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value as any)}
              className="w-full sm:w-auto bg-white border border-slate-300 text-slate-700 py-2 px-4 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
            >
              <option value="all">Todos os Destinos</option>
              <option value="Tinturaria">Tinturaria</option>
              <option value="Tecelagem">Tecelagem</option>
              <option value="Urdir">Urdir</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-500 uppercase bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Pedido</th>
                <th className="px-6 py-4 font-semibold">Descrição do Fio</th>
                <th className="px-6 py-4 font-semibold">Destino</th>
                <th className="px-6 py-4 font-semibold text-right">Solicitado</th>
                <th className="px-6 py-4 font-semibold text-right">Entregue</th>
                <th className="px-6 py-4 font-semibold text-right">Em Falta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Nenhum fio em falta encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{item.requestNumber}</div>
                      <div className="text-xs text-slate-500">{item.requestDate}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{item.description}</div>
                      {item.coneColor && (
                        <div className="text-xs text-slate-500 mt-1">Cor: {item.coneColor}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.section.toLowerCase().includes('tecelagem') ? 'bg-indigo-100 text-indigo-800' :
                        item.section.toLowerCase().includes('tinturaria') ? 'bg-fuchsia-100 text-fuchsia-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {item.section}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-700">
                      {Number(item.quantity).toLocaleString('pt-PT')} {item.unit || 'Kg'}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-emerald-600">
                      {item.delivered.toLocaleString('pt-PT')} {item.unit || 'Kg'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-amber-600">
                      {item.pending.toLocaleString('pt-PT')} {item.unit || 'Kg'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
