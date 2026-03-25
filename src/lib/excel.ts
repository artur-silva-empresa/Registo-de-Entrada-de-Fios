import * as XLSX from 'xlsx';
import { Request, RequestItem, Delivery } from '../store';

export type ParsedRequest = {
  number: string;
  date: string;
  items: {
    section: string;
    quantity: number;
    unit?: string;
    description: string;
    coneColor: string;
    observations: string;
  }[];
};

export const exportToExcel = (requests: Request[], items: RequestItem[], deliveries: Delivery[]) => {
  const exportData: any[] = [];

  items.forEach(item => {
    const request = requests.find(r => r.id === item.requestId);
    const itemDeliveries = deliveries.filter(d => d.itemId === item.id);
    
    // Sort deliveries chronologically to calculate running pending amounts
    itemDeliveries.sort((a, b) => {
      const dateA = new Date(a.deliveryDate || a.date).getTime();
      const dateB = new Date(b.deliveryDate || b.date).getTime();
      return dateA - dateB;
    });

    const deliveredTotal = itemDeliveries.reduce((sum, d) => sum + Number(d.quantity || 0), 0);
    const finalPending = Number(item.quantity || 0) - deliveredTotal;

    if (itemDeliveries.length === 0) {
      exportData.push({
        'Número do pedido': request?.number || 'N/A',
        'Descrição de Fio': item.description,
        'Destino': item.section,
        'Solicitado': `${Number(item.quantity || 0)} ${item.unit || 'Kg'}`,
        'Em falta': finalPending > 0 ? `${finalPending} ${item.unit || 'Kg'}` : '0',
        'Estado': 'Pendente',
        'Quantidade entregue': '0',
        'Guia de Remessa': '',
        'Data da entrega': '',
        'Observações': ''
      });
    } else {
      let runningDelivered = 0;
      itemDeliveries.forEach(d => {
        runningDelivered += Number(d.quantity || 0);
        const pendingAtDelivery = Number(item.quantity || 0) - runningDelivered;
        
        let rowStatus = 'Pendente';
        if (pendingAtDelivery <= 0) rowStatus = 'Completo';
        else if (runningDelivered > 0) rowStatus = 'Parcial';

        const date = new Date(d.deliveryDate || d.date).toLocaleDateString('pt-PT');
        exportData.push({
          'Número do pedido': request?.number || 'N/A',
          'Descrição de Fio': item.description,
          'Destino': item.section,
          'Solicitado': `${Number(item.quantity || 0)} ${item.unit || 'Kg'}`,
          'Em falta': pendingAtDelivery > 0 ? `${pendingAtDelivery} ${item.unit || 'Kg'}` : '0',
          'Estado': rowStatus,
          'Quantidade entregue': `${d.quantity} ${item.unit || 'Kg'}`,
          'Guia de Remessa': d.deliveryNote || '',
          'Data da entrega': date,
          'Observações': d.observations || ''
        });
      });
    }
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  // Set column widths
  const wscols = [
    { wch: 15 }, // Número do pedido
    { wch: 40 }, // Descrição de Fio
    { wch: 15 }, // Destino
    { wch: 12 }, // Solicitado
    { wch: 12 }, // Em falta
    { wch: 12 }, // Estado
    { wch: 20 }, // Quantidade entregue
    { wch: 20 }, // Guia de Remessa
    { wch: 15 }, // Data da entrega
    { wch: 40 }  // Observações
  ];
  worksheet['!cols'] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock');
  
  XLSX.writeFile(workbook, 'Exportacao_Stock.xlsx');
};

export const parseExcel = async (file: File): Promise<ParsedRequest> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'dd/mm/yyyy' }) as any[][];

        // Try to get request number from F1
        const f1Cell = worksheet['F1'];
        let requestNumber = f1Cell ? String(f1Cell.w || f1Cell.v).trim() : '';
        let requestDate = '';
        let currentSection = '';
        const items = [];

        let inTable = false;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          // Try to find request number
          if (!requestNumber) {
            const rowStr = row.join(' ').trim();
            const reqMatch = rowStr.match(/Solicitação de entrega diária de fio\s*(.+)/i);
            if (reqMatch) {
              requestNumber = reqMatch[1].trim();
            }
          }

          // Try to find date
          if (!requestDate) {
             const rowStr = row.join(' ').trim();
             const dateMatch = rowStr.match(/DATA\s*-\s*(.+)/i);
             if (dateMatch) {
               let extractedDate = dateMatch[1].trim();
               // Remove "DE:????" or similar artifacts
               extractedDate = extractedDate.replace(/DE:.*/i, '').trim();
               requestDate = extractedDate;
             } else if (rowStr.toLowerCase().includes('data')) {
               // Look for a date pattern in the same row if it contains 'data'
               const genericDateMatch = rowStr.match(/(\d{2}\/\d{2}\/\d{4})/);
               if (genericDateMatch) {
                 requestDate = genericDateMatch[1];
               }
             }
          }

          // Detect table start
          if (!inTable) {
            if (row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('cor de cone'))) {
              inTable = true;
              continue;
            }
          }

          if (inTable) {
            const col0 = row[0];
            const col1 = row[1];
            const col2 = row[2];
            const col3 = row[3];

            // If col0 has a number, it's an item
            if (col0 !== undefined && col0 !== null && col0 !== '') {
              const quantity = parseFloat(col0);
              if (!isNaN(quantity)) {
                let description = col1 ? String(col1).trim() : '';
                let unit = 'Kg'; // Default unit
                const col0Str = String(col0).trim().toLowerCase();

                // Check if unit is in col0 (e.g., "700 Kilos")
                if (col0Str.includes('kilo') || col0Str.includes('quilo') || col0Str.includes('kg')) {
                  unit = 'Kg';
                } else if (col0Str.includes('palete')) {
                  unit = 'Paletes';
                } else if (col0Str.includes('bobine')) {
                  unit = 'Bobines';
                } else if (col0Str.includes('caixa')) {
                  unit = 'Caixas';
                } else {
                  // Extract unit from description
                  const lowerDesc = description.toLowerCase();
                  if (lowerDesc.startsWith('kilos de ') || lowerDesc.startsWith('quilos de ') || lowerDesc.startsWith('kg de ') || lowerDesc.startsWith('kilos ') || lowerDesc.startsWith('quilos ') || lowerDesc.startsWith('kg ')) {
                    unit = 'Kg';
                    description = description.replace(/^(kilos|quilos|kg)(\s+de)?\s+/i, '');
                  } else if (lowerDesc.startsWith('paletes de ') || lowerDesc.startsWith('palete de ') || lowerDesc.startsWith('paletes ') || lowerDesc.startsWith('palete ')) {
                    unit = 'Paletes';
                    description = description.replace(/^paletes?(\s+de)?\s+/i, '');
                  } else if (lowerDesc.startsWith('bobines de ') || lowerDesc.startsWith('bobine de ') || lowerDesc.startsWith('bobines ') || lowerDesc.startsWith('bobine ')) {
                    unit = 'Bobines';
                    description = description.replace(/^bobines?(\s+de)?\s+/i, '');
                  } else if (lowerDesc.startsWith('caixas de ') || lowerDesc.startsWith('caixa de ') || lowerDesc.startsWith('caixas ') || lowerDesc.startsWith('caixa ')) {
                    unit = 'Caixas';
                    description = description.replace(/^caixas?(\s+de)?\s+/i, '');
                  }
                }

                items.push({
                  section: currentSection || 'Geral',
                  quantity: quantity,
                  unit: unit,
                  description: description,
                  coneColor: col2 ? String(col2).trim() : '',
                  observations: col3 ? String(col3).trim() : '',
                });
              }
            } else if ((col0 === undefined || col0 === null || col0 === '') && col1 && typeof col1 === 'string' && col1.trim() !== '') {
              // Check if col1 is actually an item with quantity and description combined
              const col1Str = col1.trim();
              const match = col1Str.match(/^([\d.,]+)\s*(kilos?|quilos?|kg|paletes?|bobines?|caixas?)(\s+de)?\s+(.+)/i);
              if (match) {
                const quantity = parseFloat(match[1].replace(',', '.'));
                let unitStr = match[2].toLowerCase();
                let unit = 'Kg';
                if (unitStr.includes('palete')) unit = 'Paletes';
                else if (unitStr.includes('bobine')) unit = 'Bobines';
                else if (unitStr.includes('caixa')) unit = 'Caixas';
                
                items.push({
                  section: currentSection || 'Geral',
                  quantity: quantity,
                  unit: unit,
                  description: match[4].trim(),
                  coneColor: col2 ? String(col2).trim() : '',
                  observations: col3 ? String(col3).trim() : '',
                });
                continue;
              }

              // Otherwise it's a section header
              currentSection = col1.trim();
              continue;
            }
          }
        }

        const allowedSections = ['tecelagem', 'tinturaria', 'urdir'];
        const filteredItems = items.filter(item => {
          const sectionLower = item.section.toLowerCase();
          return allowedSections.some(allowed => sectionLower.includes(allowed));
        });

        resolve({ number: requestNumber || 'N/A', date: requestDate || 'N/A', items: filteredItems });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
