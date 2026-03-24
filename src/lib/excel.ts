import * as XLSX from 'xlsx';

export type ParsedRequest = {
  number: string;
  date: string;
  items: {
    section: string;
    quantity: number;
    description: string;
    coneColor: string;
    observations: string;
  }[];
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

            // If col0 is empty but col1 has text, it might be a section header
            if ((col0 === undefined || col0 === null || col0 === '') && col1 && typeof col1 === 'string' && col1.trim() !== '') {
              currentSection = col1.trim();
              continue;
            }

            // If col0 has a number, it's an item
            if (col0 !== undefined && col0 !== null && col0 !== '') {
              const quantity = parseFloat(col0);
              if (!isNaN(quantity)) {
                items.push({
                  section: currentSection || 'Geral',
                  quantity: quantity,
                  description: col1 ? String(col1).trim() : '',
                  coneColor: col2 ? String(col2).trim() : '',
                  observations: col3 ? String(col3).trim() : '',
                });
              }
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
