import React, { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { parseExcel, exportToExcel } from '../lib/excel';
import { Upload, FileSpreadsheet, Trash2, ChevronDown, ChevronUp, FileUp, ChevronRight, PackagePlus, Download } from 'lucide-react';

export function Pedidos() {
  const { state, addRequest, deleteRequest, addDelivery } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [selectedItemForDelivery, setSelectedItemForDelivery] = useState<any>(null);
  const [deliveryQuantity, setDeliveryQuantity] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [deliveryObservations, setDeliveryObservations] = useState('');

  const handleExport = () => {
    exportToExcel(state.requests, state.items, state.deliveries);
  };

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const processFiles = async (files: File[]) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      for (const file of files) {
        const parsed = await parseExcel(file);
        if (parsed.items.length > 0) {
          await addRequest(
            { number: parsed.number, date: parsed.date },
            parsed.items
          );
        }
      }
    } catch (error) {
      console.error('Error parsing excel', error);
      setUploadError('Erro ao processar um ou mais ficheiros Excel. Verifique o formato.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(Array.from(files));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files) as File[];
    const validFiles = files.filter(
      file => file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    );
    
    if (validFiles.length > 0) {
      await processFiles(validFiles);
    }
  };

  return (
    <div 
      className={`space-y-8 min-h-[calc(100vh-8rem)] rounded-xl transition-all duration-200 ${
        isDragging ? 'bg-red-50/30 outline-dashed outline-2 outline-red-400 outline-offset-8' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pedidos de Fio</h1>
          <p className="text-slate-500 mt-2">Faça upload e gira as solicitações de entrega diária.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>
          <input
            type="file"
            accept=".xlsx, .xls"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {isUploading ? 'A processar...' : 'Upload Pedidos de Fio'}
          </button>
        </div>
      </header>

      {uploadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative">
          <span className="block sm:inline">{uploadError}</span>
          <button 
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setUploadError(null)}
          >
            <span className="text-red-500 hover:text-red-700">×</span>
          </button>
        </div>
      )}

      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl border-2 border-dashed border-red-500 m-8">
          <div className="text-center flex flex-col items-center pointer-events-none">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <FileUp className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Largue os ficheiros aqui</h2>
            <p className="text-slate-500 mt-2">Suporta múltiplos ficheiros .xlsx e .xls</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
        {state.requests.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">Nenhum pedido registado</h3>
            <p className="text-slate-500 mt-1 max-w-sm">
              Faça upload ou arraste ficheiros Excel com a solicitação de entrega diária para começar.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-6 text-red-600 font-medium hover:text-red-700"
            >
              Procurar ficheiros
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {state.requests.map((request) => {
              const requestItems = state.items.filter(i => i.requestId === request.id);
              const isExpanded = expandedRequest === request.id;

              const totalQuantity = requestItems.reduce((acc, item) => acc + Number(item.quantity || 0), 0);
              
              const completedItemsCount = requestItems.filter(item => {
                const itemDeliveries = state.deliveries.filter(d => d.itemId === item.id);
                const delivered = itemDeliveries.reduce((sum, d) => sum + Number(d.quantity || 0), 0);
                return delivered >= Number(item.quantity || 0);
              }).length;
              
              const totalItemsCount = requestItems.length;
              const rawProgress = totalItemsCount > 0 ? (completedItemsCount / totalItemsCount) * 100 : 0;
              const progressDisplay = Math.min(100, Math.round(rawProgress)).toString();
              const progressWidth = Math.min(100, Math.round(rawProgress));

              return (
                <div key={request.id} className="bg-white">
                  <div 
                    className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedRequest(isExpanded ? null : request.id)}
                  >
                    <div className="flex items-center gap-4 w-1/3">
                      <div className="p-3 bg-red-50 text-red-600 rounded-lg shrink-0">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-slate-900 truncate">
                          Solicitação {request.number}
                        </h3>
                        <p className="text-sm text-slate-500 truncate">
                          Data: {request.date.replace(/DE:.*/i, '').trim()} • Upload: {new Date(request.uploadDate).toLocaleDateString('pt-PT')}
                        </p>
                      </div>
                    </div>

                    <div className="hidden md:block flex-1 px-8">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-500 uppercase tracking-wider">Progresso</span>
                        <span className="font-bold text-slate-700">{progressDisplay}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-2.5 rounded-full transition-all duration-500 ${progressWidth === 100 ? 'bg-emerald-500' : 'bg-red-500'}`}
                          style={{ width: `${progressWidth}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 w-1/3 justify-end">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-slate-900">{requestItems.length} itens</p>
                        <p className="text-xs text-slate-500">
                          {totalQuantity.toLocaleString('pt-PT')} qtd total
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRequestToDelete(request.id);
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Apagar pedido"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-6 pb-6 bg-slate-50 border-t border-slate-100">
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 uppercase bg-slate-100">
                            <tr>
                              <th className="px-4 py-3 rounded-tl-lg">Secção</th>
                              <th className="px-4 py-3">Descrição</th>
                              <th className="px-4 py-3">Quantidade</th>
                              <th className="px-4 py-3">Quantidade Entregue</th>
                              <th className="px-4 py-3">Observações</th>
                              <th className="px-4 py-3 rounded-tr-lg w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {requestItems.map((item, idx) => {
                              const itemDeliveries = state.deliveries.filter(d => d.itemId === item.id);
                              const delivered = itemDeliveries.reduce((sum, d) => sum + Number(d.quantity || 0), 0);
                              const hasDeliveries = itemDeliveries.length > 0;
                              const isItemExpanded = expandedItems.has(item.id);
                              
                              const sortedDeliveries = [...itemDeliveries].sort((a, b) => {
                                const dateA = new Date(a.deliveryDate || a.date).getTime();
                                const dateB = new Date(b.deliveryDate || b.date).getTime();
                                return dateB - dateA; // Sort descending (newest first)
                              });
                              
                              return (
                                <React.Fragment key={item.id}>
                                  <tr 
                                    className={`bg-white ${hasDeliveries ? 'cursor-pointer hover:bg-slate-50 transition-colors' : ''}`}
                                    onClick={() => hasDeliveries && toggleItem(item.id)}
                                  >
                                    <td className="px-4 py-3 font-medium text-slate-900">
                                      <div className="flex items-center gap-2">
                                        {hasDeliveries ? (
                                          isItemExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                        ) : (
                                          <div className="w-4 h-4 flex-shrink-0" />
                                        )}
                                        {item.section}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{item.description}</td>
                                    <td className="px-4 py-3 font-bold text-slate-700">
                                      {Number(item.quantity).toLocaleString('pt-PT')} {item.unit || 'Kg'}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-emerald-600">{delivered.toLocaleString('pt-PT')}</td>
                                    <td className="px-4 py-3 text-slate-500 italic">{item.observations || '-'}</td>
                                    <td className="px-4 py-3 text-right">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedItemForDelivery(item);
                                          setDeliveryQuantity(Math.max(0, Number(item.quantity) - delivered).toString());
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                        title="Registar Entrega"
                                      >
                                        <PackagePlus className="w-5 h-5" />
                                      </button>
                                    </td>
                                  </tr>
                                  {isItemExpanded && hasDeliveries && (
                                    <tr className="bg-slate-50/50">
                                      <td colSpan={6} className="px-4 py-4">
                                        <div className="pl-6 border-l-2 border-slate-200 ml-2">
                                          <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Histórico de Entregas</h4>
                                          <div className="space-y-3">
                                            {sortedDeliveries.map((delivery) => (
                                              <div key={delivery.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                                <div className="flex items-center gap-2 min-w-[140px]">
                                                  <span className="font-bold text-emerald-600">{delivery.quantity} {item.unit || 'Kg'} entregues</span>
                                                  <span className="text-slate-400 text-xs">•</span>
                                                  <span className="text-slate-600">
                                                    {delivery.deliveryDate ? new Date(delivery.deliveryDate).toLocaleDateString('pt-PT') : new Date(delivery.date).toLocaleDateString('pt-PT')}
                                                  </span>
                                                </div>
                                                {delivery.deliveryNote && (
                                                  <div className="text-slate-600 flex items-center gap-1">
                                                    <span className="font-medium text-slate-500">Guia:</span> {delivery.deliveryNote}
                                                  </div>
                                                )}
                                                {delivery.observations && (
                                                  <div className="text-slate-600 flex items-center gap-1">
                                                    <span className="font-medium text-slate-500">Obs:</span> {delivery.observations}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {requestToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Apagar Pedido</h3>
            <p className="text-slate-500 mb-6">
              Tem a certeza que deseja apagar este pedido? Esta ação não pode ser desfeita e todos os itens associados serão removidos.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRequestToDelete(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteRequest(requestToDelete);
                  setRequestToDelete(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedItemForDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Registar Entrega</h3>
            
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-sm font-medium text-slate-900">{selectedItemForDelivery.description}</p>
              <p className="text-xs text-slate-500 mt-1">Secção: {selectedItemForDelivery.section}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Quantidade Entregue ({selectedItemForDelivery.unit || 'Kg'})
                </label>
                <input
                  type="number"
                  value={deliveryQuantity}
                  onChange={(e) => setDeliveryQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Entrega</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Guia de Remessa (Opcional)</label>
                <input
                  type="text"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Nº da guia"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações (Opcional)</label>
                <textarea
                  value={deliveryObservations}
                  onChange={(e) => setDeliveryObservations(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  rows={2}
                  placeholder="Notas adicionais"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setSelectedItemForDelivery(null);
                  setDeliveryNote('');
                  setDeliveryObservations('');
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (selectedItemForDelivery && deliveryQuantity) {
                    addDelivery(
                      selectedItemForDelivery.id,
                      Number(deliveryQuantity),
                      deliveryNote,
                      deliveryDate,
                      deliveryObservations
                    );
                    setSelectedItemForDelivery(null);
                    setDeliveryNote('');
                    setDeliveryObservations('');
                  }
                }}
                disabled={!deliveryQuantity || Number(deliveryQuantity) <= 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Registar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
