/**
 * Dynamic client-side parsing utility for plain-text, CSV, JSON, and PDF documents.
 */

// Dynamically load PDF.js client library from CDN
async function parsePdf(file) {
  const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js');
  // Configure worker route dynamically
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let extractedText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    extractedText += strings.join(' ') + '\n';
  }
  return extractedText.trim();
}

// Convert raw comma-separated lists into structured markdown tables
function parseCsv(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length === 0) return '';

  const tableRows = lines.map(line => {
    // Basic CSV splitting (handling quoted values can be added if needed)
    const columns = line.split(',').map(col => col.trim().replace(/^["']|["']$/g, ''));
    return `| ${columns.join(' | ')} |`;
  });

  // Create alignment row separator
  const headerColsCount = lines[0].split(',').length;
  const separatorRow = `| ${Array(headerColsCount).fill('---').join(' | ')} |`;

  // Inject separator right under headers line
  tableRows.splice(1, 0, separatorRow);
  return tableRows.join('\n');
}

/**
 * Parses any supported document into structural plain text context.
 */
export async function parseDocument(file) {
  const filename = file.name.toLowerCase();
  
  if (filename.endsWith('.pdf')) {
    return await parsePdf(file);
  }
  
  const text = await file.text();
  
  if (filename.endsWith('.csv')) {
    return parseCsv(text);
  }
  
  if (filename.endsWith('.json')) {
    try {
      // Beautify raw JSON blocks to make them highly readable for the LLM
      const obj = JSON.parse(text);
      return JSON.stringify(obj, null, 2);
    } catch {
      return text;
    }
  }

  // Default fallback for txt and code files
  return text;
}