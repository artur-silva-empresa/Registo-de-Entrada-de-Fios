import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Search, Filter, ArrowUpDown, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { exportToExcel } from '../lib/excel';

export function Stock() {
  const { state } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'delivered'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const handleExport = () => {
    exportToExcel(state.requests, state.items, state.deliveries);
  };

  // Aggregate items by description, section, and unit
  const aggregatedStock = state.items.reduce((acc, item) => {
    const sectionDisplay = item.section.toLowerCase().includes('tecelagem') ? 'Tecelagem' :
                           item.section.toLowerCase().includes('tinturaria') ? 'Tinturaria' : 
                           item.section.toLowerCase().includes('urdir') ? 'Urdir' : 'Outros';
    
    const unitDisplay = item.unit || 'Kg';
    const key = `${item.description}-${sectionDisplay}-${unitDisplay}`;
    if (!acc[key]) {
      acc[key] = {
        id: key,
        description: item.description,
        section: sectionDisplay,
        unit: unitDisplay,
        requested: 0,
        delivered: 0,
        pending: 0,
        items: []
      };
    }
    
    const delivered = state.deliveries.filter(d => d.itemId === item.id).reduce((sum, d) => sum + Number(d.quantity || 0), 0);
    const pending = Number(item.quantity || 0) - delivered;
    
    acc[key].requested += Number(item.quantity || 0);
    acc[key].delivered += delivered;
    acc[key].pending += pending;
    
    const request = state.requests.find(r => r.id === item.requestId);
    acc[key].items.push({
      ...item,
      requestNumber: request?.number || 'N/A',
      pending,
      delivered
    });
    
    return acc;
  }, {} as Record<string, { id: string; description: string; section: string; unit: string; requested: number; delivered: number; pending: number; items: any[] }>);

  const stockList = (Object.values(aggregatedStock) as Array<{ id: string; description: string; section: string; unit: string; requested: number; delivered: number; pending: number; items: any[] }>).filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.section.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filter === 'pending') return item.pending > 0;
    if (filter === 'delivered') return item.pending <= 0;
    return true;
  });

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Stock / Faltas</h1>
          <p className="text-slate-500 mt-2">Visualize o estado global dos fios solicitados e entregues.</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
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
              placeholder="Pesquisar por descrição ou destino..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-full sm:w-auto bg-white border border-slate-300 text-slate-700 py-2 px-4 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
            >
              <option value="all">Todos os Fios</option>
              <option value="pending">Com Faltas (Pendentes)</option>
              <option value="delivered">Totalmente Entregues</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-500 uppercase bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="font-semibold border-r border-slate-200 p-0 w-0">
                  <div className="px-6 py-4 resize-x overflow-auto min-w-[300px] w-[600px]">Descrição do Fio</div>
                </th>
                <th className="font-semibold border-r border-slate-200 p-0 w-0">
                  <div className="px-6 py-4 resize-x overflow-auto min-w-[120px]">Destino</div>
                </th>
                <th className="font-semibold text-right border-r border-slate-200 p-0 w-0">
                  <div className="px-6 py-4 resize-x overflow-auto min-w-[120px]">Solicitado</div>
                </th>
                <th className="font-semibold text-right border-r border-slate-200 p-0 w-0">
                  <div className="px-6 py-4 resize-x overflow-auto min-w-[120px]">Entregue</div>
                </th>
                <th className="font-semibold text-right border-r border-slate-200 p-0 w-0">
                  <div className="px-6 py-4 resize-x overflow-auto min-w-[120px]">Em Falta</div>
                </th>
                <th className="font-semibold text-center border-r border-slate-200 p-0 w-0">
                  <div className="px-6 py-4 min-w-[120px]">Estado</div>
                </th>
                <th className="p-0 w-full"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {stockList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Nenhum fio encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                stockList.map((item) => {
                  const isExpanded = expandedRows.has(item.id);
                  return (
                    <React.Fragment key={item.id}>
                      <tr 
                        className="bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => toggleRow(item.id)}
                      >
                        <td className="px-6 py-4 font-medium text-slate-900 break-words whitespace-normal min-w-[300px]" title={item.description}>
                          <div className="flex items-start gap-2">
                            <div className="mt-1">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              )}
                            </div>
                            <span>{item.description}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.section === 'Tecelagem' ? 'bg-indigo-100 text-indigo-800' :
                            item.section === 'Tinturaria' ? 'bg-fuchsia-100 text-fuchsia-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {item.section}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-slate-700">
                          {item.requested.toLocaleString('pt-PT')} {item.unit}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-emerald-600">
                          {item.delivered.toLocaleString('pt-PT')} {item.unit}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-amber-600">
                          {item.pending > 0 ? item.pending.toLocaleString('pt-PT') : '0'} {item.pending > 0 ? item.unit : ''}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {item.pending <= 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              Completo
                            </span>
                          ) : item.delivered > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Parcial
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              Pendente
                            </span>
                          )}
                        </td>
                        <td></td>
                      </tr>
                      {isExpanded && item.items.map((subItem, idx) => (
                        <tr key={`${item.id}-sub-${idx}`} className="bg-slate-50/80 border-t-0">
                          <td className="px-6 py-3 pl-12 text-sm text-slate-600">
                            Pedido {subItem.requestNumber}
                            {subItem.coneColor && <span className="ml-2 text-xs text-slate-400">(Cor: {subItem.coneColor})</span>}
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-500">{subItem.section}</td>
                          <td className="px-6 py-3 text-right text-sm text-slate-600">{Number(subItem.quantity).toLocaleString('pt-PT')} {subItem.unit || 'Kg'}</td>
                          <td className="px-6 py-3 text-right text-sm text-emerald-600">{subItem.delivered.toLocaleString('pt-PT')} {subItem.unit || 'Kg'}</td>
                          <td className="px-6 py-3 text-right text-sm font-medium text-amber-600">{subItem.pending > 0 ? subItem.pending.toLocaleString('pt-PT') : '0'} {subItem.pending > 0 ? (subItem.unit || 'Kg') : ''}</td>
                          <td className="px-6 py-3 text-center">
                            {subItem.pending <= 0 ? (
                              <span className="text-xs text-emerald-600 font-medium">Completo</span>
                            ) : subItem.delivered > 0 ? (
                              <span className="text-xs text-blue-600 font-medium">Parcial</span>
                            ) : (
                              <span className="text-xs text-amber-600 font-medium">Pendente</span>
                            )}
                          </td>
                          <td></td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
