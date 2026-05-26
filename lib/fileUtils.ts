import * as mammoth from 'mammoth';
import * as xlsx from 'xlsx';

export async function readFileContent(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  
  try {
    if (fileName.endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value || '';
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = xlsx.read(arrayBuffer, { type: 'array' });
      let text = '';
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        text += `--- Sheet: ${sheetName} ---\n`;
        text += xlsx.utils.sheet_to_csv(sheet);
        text += '\n\n';
      }
      return text.trim();
    }
    
    // Default fallback to text.
    return await file.text();
  } catch (error) {
    console.error(`Error reading file ${file.name}:`, error);
    return `Error reading file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}
