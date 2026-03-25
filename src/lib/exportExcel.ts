import * as XLSX from 'xlsx';
import { useAppStore } from '../store';

export const exportToExcel = (state: any) => {
  const wb = XLSX.utils.book_new();

  // Pedidos Sheet
  const requestsData = state.requests.map((req: any) => ({
    'ID Pedido': req.id,
    'Data': req.date,
    'Número': req.number,
    'Data de Upload': req.uploadDate,
  }));
  const wsRequests = XLSX.utils.json_to_sheet(requestsData);
  XLSX.utils.book_append_sheet(wb, wsRequests, 'Pedidos');

  // Itens Sheet
  const itemsData = state.items.map((item: any) => {
    const request = state.requests.find((r: any) => r.id === item.requestId);
    return {
      'ID Item': item.id,
      'ID Pedido': item.requestId,
      'Número Pedido': request?.number || 'N/A',
      'Secção': item.section,
      'Quantidade': item.quantity,
      'Descrição': item.description,
      'Cor do Cone': item.coneColor,
      'Observações': item.observations,
    };
  });
  const wsItems = XLSX.utils.json_to_sheet(itemsData);
  XLSX.utils.book_append_sheet(wb, wsItems, 'Itens');

  // Entradas Sheet
  const deliveriesData = state.deliveries.map((delivery: any) => {
    const item = state.items.find((i: any) => i.id === delivery.itemId);
    const request = state.requests.find((r: any) => r.id === item?.requestId);
    return {
      'ID Entrada': delivery.id,
      'ID Item': delivery.itemId,
      'Número Pedido': request?.number || 'N/A',
      'Descrição Item': item?.description || 'N/A',
      'Quantidade Entregue': delivery.quantity,
      'Data de Registo': delivery.date,
      'Guia de Remessa': delivery.deliveryNote || '',
      'Data da Guia': delivery.deliveryDate || '',
      'Observações': delivery.observations || '',
    };
  });
  const wsDeliveries = XLSX.utils.json_to_sheet(deliveriesData);
  XLSX.utils.book_append_sheet(wb, wsDeliveries, 'Entradas');

  // Stock / Faltas Sheet
  const stockData = state.items.map((item: any) => {
    const request = state.requests.find((r: any) => r.id === item.requestId);
    const delivered = state.deliveries
      .filter((d: any) => d.itemId === item.id)
      .reduce((sum: number, d: any) => sum + Number(d.quantity || 0), 0);
    const pending = Number(item.quantity || 0) - delivered;
    
    return {
      'Número Pedido': request?.number || 'N/A',
      'Data Pedido': request?.date || 'N/A',
      'Secção': item.section,
      'Descrição': item.description,
      'Cor do Cone': item.coneColor,
      'Quantidade Pedida': Number(item.quantity || 0),
      'Quantidade Entregue': delivered,
      'Quantidade em Falta': pending,
      'Estado': pending <= 0 ? 'Concluído' : pending < Number(item.quantity || 0) ? 'Parcial' : 'Pendente'
    };
  });
  const wsStock = XLSX.utils.json_to_sheet(stockData);
  XLSX.utils.book_append_sheet(wb, wsStock, 'Stock e Faltas');

  // Generate Excel file
  XLSX.writeFile(wb, `Exportacao_Gestao_Fios_${new Date().toISOString().split('T')[0]}.xlsx`);
};
