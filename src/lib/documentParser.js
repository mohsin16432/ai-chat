/**
 * Dynamic client-side parsing utility for plain-text, CSV, JSON, and PDF documents.
 */

// Dynamically load PDF.js UMD build from CDN via script tag (import() doesn't
// work with UMD — the library attaches to window.pdfjsLib, not module exports).
async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.onload = () => {
      if (window.pdfjsLib) resolve(window.pdfjsLib);
      else reject(new Error('PDF.js loaded but window.pdfjsLib not found'));
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js from CDN'));
    document.head.appendChild(script);
  });
}

async function parsePdf(file) {
  const pdfjsLib = await loadPdfJs();
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

// Minimal ZIP reader for .docx (OOXML) text extraction without external deps.
// A .docx is a ZIP archive; the text content lives in word/document.xml as
// <w:t> nodes inside <w:p> paragraphs. We decompress with the browser's
// built-in DecompressionStream('deflate-raw').
async function parseDocx(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  const dv = new DataView(buf.buffer);

  // Find End of Central Directory Record (EOCD) by scanning backwards.
  const eocdSig = 0x06054b50;
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (dv.getUint32(i, true) === eocdSig) { eocdOffset = i; break; }
  }
  if (eocdOffset < 0) throw new Error('Invalid .docx: ZIP EOCD not found');

  const cdCount = dv.getUint16(eocdOffset + 10, true);
  const cdOffset = dv.getUint32(eocdOffset + 16, true);

  // Walk the Central Directory to find word/document.xml.
  const cdSig = 0x02014b50;
  let entry = null;
  let cursor = cdOffset;
  for (let i = 0; i < cdCount; i++) {
    if (dv.getUint32(cursor, true) !== cdSig) break;
    const compMethod = dv.getUint16(cursor + 10, true);
    const compSize = dv.getUint32(cursor + 20, true);
    const nameLen = dv.getUint16(cursor + 28, true);
    const extraLen = dv.getUint16(cursor + 30, true);
    const commentLen = dv.getUint16(cursor + 32, true);
    const localOffset = dv.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(buf.subarray(cursor + 46, cursor + 46 + nameLen));
    if (name === 'word/document.xml') {
      entry = { compMethod, compSize, localOffset };
      break;
    }
    cursor += 46 + nameLen + extraLen + commentLen;
  }
  if (!entry) throw new Error('Invalid .docx: word/document.xml not found in archive');

  // Read the local file header to find where compressed data begins.
  const localSig = 0x04034b50;
  if (dv.getUint32(entry.localOffset, true) !== localSig) throw new Error('Invalid .docx: local header mismatch');
  const localNameLen = dv.getUint16(entry.localOffset + 26, true);
  const localExtraLen = dv.getUint16(entry.localOffset + 28, true);
  const dataStart = entry.localOffset + 30 + localNameLen + localExtraLen;
  const compressed = buf.subarray(dataStart, dataStart + entry.compSize);

  // Decompress (method 8 = DEFLATE, method 0 = stored/no compression).
  let xmlText;
  if (entry.compMethod === 0) {
    xmlText = new TextDecoder().decode(compressed);
  } else if (entry.compMethod === 8) {
    if (typeof DecompressionStream === 'undefined') throw new Error('DecompressionStream not supported in this browser');
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();
    writer.write(compressed);
    writer.close();
    const chunks = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const decompressed = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0));
    let off = 0;
    for (const c of chunks) { decompressed.set(c, off); off += c.length; }
    xmlText = new TextDecoder().decode(decompressed);
  } else {
    throw new Error(`Unsupported ZIP compression method: ${entry.compMethod}`);
  }

  // Extract text from <w:p> paragraphs and <w:t> text runs.
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const paragraphs = doc.getElementsByTagName('w:p');
  let extractedText = '';
  for (const p of paragraphs) {
    const runs = p.getElementsByTagName('w:t');
    for (const t of runs) {
      extractedText += t.textContent;
    }
    // Handle tab characters
    const tabs = p.getElementsByTagName('w:tab');
    if (tabs.length > 0) extractedText += '\t';
    // Handle line breaks
    const breaks = p.getElementsByTagName('w:br');
    if (breaks.length > 0) extractedText += '\n';
    extractedText += '\n';
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

  if (filename.endsWith('.docx')) {
    return await parseDocx(file);
  }

  if (filename.endsWith('.doc')) {
    throw new Error('Legacy .doc format is not supported. Please convert the file to .docx format and try again.');
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