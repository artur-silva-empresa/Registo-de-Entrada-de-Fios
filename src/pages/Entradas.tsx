import React, { useState } from 'react';
import { useAppStore } from '../store';
import { PackageCheck, Plus, Check, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

export function Entradas() {
  const { state, addDelivery } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSection, setFilterSection] = useState<'all' | 'Tinturaria' | 'Tecelagem' | 'Urdir'>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [deliveryQuantity, setDeliveryQuantity] = useState<string>('');
  const [deliveryNote, setDeliveryNote] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [deliveryObservations, setDeliveryObservations] = useState<string>('');
  const [showOverDeliveryModal, setShowOverDeliveryModal] = useState(false);
  const [pendingDelivery, setPendingDelivery] = useState<{ id: string, qty: number, note: string, date: string, observations: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pendingItems = state.items.filter(item => {
    const delivered = state.deliveries.filter(d => d.itemId === item.id).reduce((sum, d) => sum + Number(d.quantity || 0), 0);
    return delivered < Number(item.quantity || 0);
  });

  const filteredItems = pendingItems.filter(item => {
    const sectionDisplay = item.section.toLowerCase().includes('tecelagem') ? 'Tecelagem' :
                           item.section.toLowerCase().includes('tinturaria') ? 'Tinturaria' : 
                           item.section.toLowerCase().includes('urdir') ? 'Urdir' : 'Outros';
                           
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.section.toLowerCase().includes(searchTerm.toLowerCase());
                          
    const matchesFilter = filterSection === 'all' || sectionDisplay === filterSection;
    
    return matchesSearch && matchesFilter;
  });

  const groupedItems = filteredItems.reduce((acc, item) => {
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
        totalPending: 0,
        items: []
      };
    }
    const delivered = state.deliveries.filter(d => d.itemId === item.id).reduce((sum, d) => sum + Number(d.quantity || 0), 0);
    const pending = Number(item.quantity || 0) - delivered;
    acc[key].totalPending += pending;
    acc[key].items.push({ ...item, pending, delivered });
    return acc;
  }, {} as Record<string, any>);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!selectedItemId || !deliveryQuantity) return;

    const qty = parseFloat(deliveryQuantity);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('A quantidade inserida é inválida.');
      return;
    }

    const item = state.items.find(i => i.id === selectedItemId);
    const delivered = state.deliveries.filter(d => d.itemId === selectedItemId).reduce((sum, d) => sum + Number(d.quantity || 0), 0);
    
    if (qty > Number(item?.quantity || 0) - delivered) {
      setPendingDelivery({ id: selectedItemId, qty, note: deliveryNote, date: deliveryDate, observations: deliveryObservations });
      setShowOverDeliveryModal(true);
      return;
    }

    executeDelivery(selectedItemId, qty, deliveryNote, deliveryDate, deliveryObservations);
  };

  const executeDelivery = (id: string, qty: number, note: string, date: string, observations: string) => {
    addDelivery(id, qty, note, date, observations);
    setSelectedItemId(null);
    setDeliveryQuantity('');
    setDeliveryNote('');
    setDeliveryDate(new Date().toISOString().split('T')[0]);
    setDeliveryObservations('');
    setShowOverDeliveryModal(false);
    setPendingDelivery(null);
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Entradas (Receção)</h1>
        <p className="text-slate-500 mt-2">Registe a entrega de fios e faça o abate das faltas.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-emerald-600" />
              Fios em Falta (Pendentes)
            </h2>
            <div className="flex items-center gap-4 w-full sm:w-auto flex-wrap sm:flex-nowrap">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value as any)}
                className="w-full sm:w-auto py-2 pl-3 pr-8 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
              >
                <option value="all">Todos os Destinos</option>
                <option value="Tinturaria">Tinturaria</option>
                <option value="Tecelagem">Tecelagem</option>
                <option value="Urdir">Urdir</option>
              </select>
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
                {pendingItems.length} itens
              </span>
            </div>
          </div>

          {Object.keys(groupedItems).length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              {pendingItems.length === 0 
                ? "Não existem fios em falta no momento." 
                : "Nenhum fio encontrado com os filtros atuais."}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {Object.values(groupedItems).map((group: any) => {
                const isExpanded = expandedGroups.has(group.id);
                
                return (
                  <div key={group.id} className="bg-white">
                    <div 
                      className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between"
                      onClick={() => toggleGroup(group.id)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                        <div>
                          <h3 className="text-sm font-medium text-slate-900">{group.description}</h3>
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{group.section}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500 mb-1">Total em Falta</div>
                        <div className="text-lg font-bold text-amber-600">{group.totalPending.toLocaleString('pt-PT')} {group.unit}</div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="bg-slate-50 border-t border-slate-100 divide-y divide-slate-100 pl-8">
                        {group.items.map((item: any) => {
                          const request = state.requests.find(r => r.id === item.requestId);
                          const isSelected = selectedItemId === item.id;

                          return (
                            <div 
                              key={item.id} 
                              className={cn(
                                "p-4 hover:bg-slate-100 transition-colors cursor-pointer border-l-4",
                                isSelected ? "border-emerald-500 bg-emerald-100/50" : "border-transparent"
                              )}
                              onClick={() => {
                                setSelectedItemId(item.id);
                                setDeliveryQuantity(item.pending.toString());
                              }}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Pedido {request?.number}
                                  </span>
                                  {item.coneColor && (
                                    <div className="text-xs text-slate-600 mt-1">
                                      Cor: <strong className="text-slate-800">{item.coneColor}</strong>
                                    </div>
                                  )}
                                </div>
                                <div className="text-right ml-4">
                                  <div className="text-sm font-bold text-amber-600">{item.pending.toLocaleString('pt-PT')} {item.unit || 'Kg'} em falta</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span>Solicitado: <strong className="text-slate-700">{Number(item.quantity).toLocaleString('pt-PT')} {item.unit || 'Kg'}</strong></span>
                                <span>Entregue: <strong className="text-emerald-600">{Number(item.delivered).toLocaleString('pt-PT')} {item.unit || 'Kg'}</strong></span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Registar Entrada</h2>
            
            {!selectedItemId ? (
              <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                <p className="text-sm text-slate-500">
                  Selecione um item da lista ao lado para registar a sua entrega.
                </p>
              </div>
            ) : (
              <form onSubmit={handleDelivery} className="space-y-6">
                {(() => {
                  const item = state.items.find(i => i.id === selectedItemId);
                  const delivered = state.deliveries.filter(d => d.itemId === selectedItemId).reduce((sum, d) => sum + Number(d.quantity || 0), 0);
                  const pending = Number(item?.quantity || 0) - delivered;

                  return (
                    <>
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-sm font-medium text-slate-900 mb-1 line-clamp-2" title={item?.description}>
                          {item?.description}
                        </p>
                        <div className="flex justify-between text-xs mt-2">
                          <span className="text-slate-500">Falta entregar:</span>
                          <span className="font-bold text-amber-600">{pending.toLocaleString('pt-PT')} {item?.unit || 'Kg'}</span>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="quantity" className="block text-sm font-medium text-slate-700 mb-1">
                          Quantidade Recebida ({item?.unit || 'Kg'})
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            id="quantity"
                            step="0.01"
                            min="0.01"
                            required
                            value={deliveryQuantity}
                            onChange={(e) => setDeliveryQuantity(e.target.value)}
                            className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-3 border"
                            placeholder="Ex: 100"
                          />
                        </div>
                        {errorMsg && (
                          <p className="mt-2 text-sm text-red-600">{errorMsg}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="deliveryNote" className="block text-sm font-medium text-slate-700 mb-1">
                          Nº Guia de Remessa
                        </label>
                        <input
                          type="text"
                          id="deliveryNote"
                          required
                          value={deliveryNote}
                          onChange={(e) => setDeliveryNote(e.target.value)}
                          className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-3 border"
                          placeholder="Ex: GR-2026/001"
                        />
                      </div>

                      <div>
                        <label htmlFor="deliveryDate" className="block text-sm font-medium text-slate-700 mb-1">
                          Data da Entrega
                        </label>
                        <input
                          type="date"
                          id="deliveryDate"
                          required
                          value={deliveryDate}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                          className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-3 border"
                        />
                      </div>

                      <div>
                        <label htmlFor="deliveryObservations" className="block text-sm font-medium text-slate-700 mb-1">
                          Observações
                        </label>
                        <textarea
                          id="deliveryObservations"
                          rows={3}
                          value={deliveryObservations}
                          onChange={(e) => setDeliveryObservations(e.target.value)}
                          className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-3 border resize-none"
                          placeholder="Notas adicionais sobre a entrega..."
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedItemId(null)}
                          className="flex-1 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Confirmar
                        </button>
                      </div>
                    </>
                  );
                })()}
              </form>
            )}
          </div>
        </div>
      </div>

      {showOverDeliveryModal && pendingDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Quantidade Excedente</h3>
            <p className="text-slate-500 mb-6">
              A quantidade inserida é superior à quantidade em falta. Deseja continuar e registar esta entrega?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowOverDeliveryModal(false);
                  setPendingDelivery(null);
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => executeDelivery(pendingDelivery.id, pendingDelivery.qty, pendingDelivery.note, pendingDelivery.date, pendingDelivery.observations)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
