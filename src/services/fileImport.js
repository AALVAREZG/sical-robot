
const path = require('path');
const XLSX = require('xlsx');
//const fs = require('fs');
const fs = require('fs').promises; //added in moment to  create pattern manager
const { spawn } = require('child_process');


const CAJARURAL_FILENAME = 'CRURAL';
const CAJARURAL_EXTENSION = '.XLSX';
const CAIXABANK_FILENAME = 'CAIXABANK';
const CAIXABANK_EXTENSION = '.XLS';
const BBVA_FILENAME = 'BBVA';
const BBVA_EXTENSION = '.XLSX';
const SANTANDER_FILENAME = 'SANTANDER';
const SANTANDER_EXTENSION = '.XLSX';
const UNICAJA_FILENAME = 'UNICAJA';
const UNICAJA_EXTENSION = '.XLS'

// Exported main function
async function processFile(filePath, db) {
  const fileExtension = path.extname(filePath).toUpperCase();
  const filename = path.parse(path.basename(filePath).toUpperCase()).name;
  let records = [];
  console.log('filename: ', filename, '    fileExtension: ' ,fileExtension)
  if (fileExtension === CAJARURAL_EXTENSION && filename.startsWith(CAJARURAL_FILENAME)) { 
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    let caja = '203_CRURAL - 0727';
    console.log('filename: ', filename)
    if (filename.endsWith('8923')) { //CUENTA SECUNDARIA
      caja = '239_CRURAL_MUR_8923';
    } 
    const rawRecords = XLSX.utils.sheet_to_json(sheet, { 
      range: 4, 
      header: ['FECHA', 'FVALOR', 'CONCEPTO', 'IMPORTE', 'SALDO', 'NUM_APUNTE'] ,
      // Convert dates to JS Date objects
      raw: false
      
  });
    console.log(rawRecords)
    // Process records and check if they exist in database
    records = await checkExistingRecords(processCRuralRecords(rawRecords, caja), db);

  } else if (fileExtension === CAIXABANK_EXTENSION && filename.startsWith(CAIXABANK_FILENAME)) { 
    const workbook = XLSX.readFile(filePath, {
      cellDates: true,
      dateNF: 'dd-mm-yyyy',
      raw: false
    });
    const firstSheetName  = workbook.SheetNames[0];
    const firstSheet  = workbook.Sheets[firstSheetName];
    
    let caja = '200_CAIXABNK - 2064'
    

    if (filename.endsWith('3616')) { //CUENTA SECUNDARIA
      caja = '204_CAIXABNK_REC_3616';
    }
    const rawRecords = XLSX.utils.sheet_to_json(firstSheet, { 
      range: 3, 
      header: ['FECHA', 'FVALOR', 'CONCEPTO', 'CONCEPTOADIC', 'IMPORTE', 'SALDO']  
  });
   
    // Process records and check if they exist in database
    console.log('records: ', rawRecords[0])
    records = await checkExistingRecords(processCaixaBnkRecords(rawRecords, caja), db);
    

  } else if (fileExtension === UNICAJA_EXTENSION && filename.startsWith(UNICAJA_FILENAME)) {
    
    // Read the workbook with full options
    const workbook = XLSX.readFile(filePath, {
      cellDates: true,
      cellNF: true,
      cellStyles: true
    });
    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const firstSheet = workbook.Sheets[firstSheetName];
  
    // Log basic info about the sheet
    console.log('Sheet name:', firstSheetName);
    
    // Determine which account we're working with
    let accountInfo = {};
    
    // Extract account number (in cell C6)
    if (firstSheet['C6'] && firstSheet['C6'].v) {
      accountInfo.accountNumber = firstSheet['C6'].v;
    }
    
    // Extract account description (in cell C7)
    if (firstSheet['C7'] && firstSheet['C7'].v) {
      accountInfo.description = firstSheet['C7'].v;
    }
    
    // Extract balance date and amount (in cells A8 and C8)
    if (firstSheet['A8'] && firstSheet['A8'].v && firstSheet['C8'] && firstSheet['C8'].v) {
      accountInfo.balanceDate = firstSheet['A8'].v.replace('Saldo a fecha ', '');
      accountInfo.balance = firstSheet['C8'].v;
    }
  
    // Set the account type based on the filename (as in your original code)
    let caja = '238_UNICAJA_(PP2022)-8476';
    if (filename.endsWith('8822')) {
      caja = '240_UNICAJA_(PP2023)-8822';
    }
    accountInfo.accountType = caja;
  
    // Extract transactions starting from row 10 (which is range 9)
    // The header row is at row 10 (range 9)
    let rawRecords = [];
    try {
      // First pass with default headers - this gets the headers properly
      const headerRow = XLSX.utils.sheet_to_json(firstSheet, {
        range: 9,
        header: 1
      })[0];
    
    // The actual transactions start at row 11 (range 10)
    // We use the header option to specify the column names
    rawRecords = XLSX.utils.sheet_to_json(firstSheet, {
      range: 10,
      header: ['FECHA', 'FVALOR', 'CONCEPTO', 'IMPORTE', 'DIVISA', 
        'SALDO', 'DIVISASALDO', 'NUM_MOV', 'OFICINA', 'CATEGORyY', 
        'RETURN_CODE', 'RETURN_CONCEPT'
      ],
      // Convert dates to JS Date objects
      raw: false,
      dateNF: 'yyyy-mm-dd'
      });
    } catch (error) {
      console.error('Error extracting transactions:', error);
    }
   
    // Process records and check if they exist in database
    console.log('records: ', rawRecords[0])
    records = await checkExistingRecords(processUnicajaRecords(rawRecords, caja), db);
    

  } else if (fileExtension === BBVA_EXTENSION && filename.startsWith(BBVA_FILENAME)) { 
    const workbook = XLSX.readFile(filePath, {
      cellDates: true,
      dateNF: 'dd-mm-yyyy',
      raw: false
    });
    const firstSheetName  = workbook.SheetNames[0];
    const firstSheet  = workbook.Sheets[firstSheetName];
    
    let caja = '207_BBVA - 0342'
    
    if (filename.endsWith('9994')) { //CUENTA SECUNDARIA
      caja = '233_BBVA_PCONTIGO_9994';
    } 
    const rawRecords = XLSX.utils.sheet_to_json(firstSheet, { 
      range: 16, 
      //header: ['COL_VOID_1', 'COL_VOID_2', 'FECHA', 'FVALOR', 'CUENTA', 'CODIGO', 'CONCEPTO', 'BENEFIARIO_ORDENANTE', 'OBSERVACIONES', 'IMPORTE', 'SALDO']  
      header: ['COL_VOID_1', 'COL_VOID_2', 'FECHA', 'FVALOR', 'CODIGO', 'CONCEPTO', 'BENEFIARIO_ORDENANTE', 'OBSERVACIONES', 'IMPORTE', 'SALDO']  
    });
    
    // console.log('rawRecords: ', rawRecords[0]);
    // Process records and check if they exist in database
    records = await checkExistingRecords(processBBVARecords(rawRecords, caja), db);
  } else if (fileExtension === SANTANDER_EXTENSION && filename.startsWith(SANTANDER_FILENAME)) { 
    const workbook = XLSX.readFile(filePath, {
      cellDates: true,
      dateNF: 'dd-mm-yyyy',
      raw: false
    });
    const firstSheetName  = workbook.SheetNames[0];
    const firstSheet  = workbook.Sheets[firstSheetName];
    
    let caja = '201_SANTANDER - 2932'
    
    if (filename.endsWith('9994')) { //CUENTA SECUNDARIA
      caja = '20X_SANTANDER_RECAUDA_XX';
    } 
    const rawRecords = XLSX.utils.sheet_to_json(firstSheet, { 
      range: 8, 
      //header: ['COL_VOID_1', 'COL_VOID_2', 'FECHA', 'FVALOR', 'CUENTA', 'CODIGO', 'CONCEPTO', 'BENEFIARIO_ORDENANTE', 'OBSERVACIONES', 'IMPORTE', 'SALDO']  
      header: ['FECHA', 'FVALOR', 'CONCEPTO', 'IMPORTE', 'DIVISA', 'SALDO', 'DIVISA_SALDO', 'CODIGO']  
  });
    //console.log('rawRecords: ', rawRecords[0])
    // Process records and check if they exist in database
    records = await checkExistingRecords(processSantanderRecords(rawRecords, caja), db);
  }
    return records;
};

function processBBVARecords(records, caja) {
  try {
    const importTimestamp = new Date().toISOString();
    
    const processedRecords = records.map((record, index) => {
      // Calculate a "natural key" that includes:
      // 1. The transaction date
      // 2. The bank's transaction ID or reference (if available)
      // 3. The balance (as a tiebreaker)
      // 4. Import timestamp + index (as a final tiebreaker)
      
      const transactionDate = normalizeBBVADate(record.FECHA);
      const amount = parseFloat(record.IMPORTE);
      const balance = parseFloat(record.SALDO);
      const importIndex = String(index).padStart(6, '0');
      
      // Store all components separately for flexible sorting
      return {
        caja: caja,
        fecha: record.FECHA,
        normalized_date: transactionDate,
        concepto: record.CONCEPTO + ' | ' + record.OBSERVACIONES + ' | ' + (record.BENEFIARIO_ORDENANTE || 'N/D'),
        importe: record.IMPORTE,
        saldo: record.SALDO,
        num_apunte: 0,
        idx: index,
        // Optional composite key for quick sorting
        sort_key: `${transactionDate}_${importTimestamp}_${String(999999 - index).padStart(6, '0')}`
      };
    });
    
    return processedRecords;
  } catch (error) {
    console.error('Error processing BBVA records:', error);
    return error;
  }
}

function processCRuralRecords(records, caja) {
  try {
    const importTimestamp = new Date().toISOString();
    
    const processedRecords = records.map((record, index) => {
    const transactionDate = normalizeCRuralDate(record.FECHA);
    const amount = parseFloat(record.IMPORTE);
    const balance = parseFloat(record.SALDO);
    const importIndex = String(index).padStart(6, '0');
      
    return {
      caja: caja,
      fecha: normalizeCruralRawDate(record.FECHA),
      normalized_date: transactionDate,
      concepto: record.CONCEPTO,
      importe: parseSpanishNumber(record.IMPORTE),
      saldo: parseSpanishNumber(record.SALDO),
      num_apunte: record.NUM_APUNTE || 0,
      idx: index,
      // Composite key for sorting
      sort_key: `${transactionDate}_${importTimestamp}_${String(999999 - index).padStart(6, '0')}`
    };
    });
    
    return processedRecords;
  } catch (error) {
    console.error('Error processing CRURAL records:', error);
    return error;
  }
}

function processCaixaBnkRecords(records, caja) {
  try {
    const importTimestamp = new Date().toISOString();
    
    const processedRecords = records.map((record, index) => {
      const transactionDate = normalizeCaixaBankDate(record.FECHA);
      const amount = parseFloat(record.IMPORTE);
      const balance = parseFloat(record.SALDO);
      const importIndex = String(index).padStart(6, '0');
      
      return {
        caja: caja,
        fecha: record.FECHA.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: '2-digit', 
          day: '2-digit',
        }),
        normalized_date: transactionDate,
        concepto: record.CONCEPTO + ' | ' + (record.CONCEPTOADIC || ''),
        importe: record.IMPORTE,
        saldo: record.SALDO,
        num_apunte: 0,
        idx: index,
        // Composite key for sorting
        sort_key: `${transactionDate}_${importTimestamp}_${String(999999 - index).padStart(6, '0')}`
      };
    });
    
    return processedRecords;
  } catch (error) {
    console.error('Error processing CAIXABANK records:', error);
    return error;
  }
}

function processSantanderRecords(records, caja) {
  try {
    const importTimestamp = new Date().toISOString();
    
    const processedRecords = records.map((record, index) => {
    const transactionDate = normalizeSantanderDate(record.FECHA);
    const amount = parseFloat(record.IMPORTE);
    const balance = parseFloat(record.SALDO);
    const importIndex = String(index).padStart(6, '0');
      
    return {
        caja: caja,
        fecha: record.FECHA,
        normalized_date: transactionDate,
        concepto: record.CONCEPTO,
        importe: record.IMPORTE,
        saldo: record.SALDO,
        num_apunte: 0,
        idx: index,
        // Composite key for sorting
        sort_key: `${transactionDate}_${importTimestamp}_${String(999999 - index).padStart(6, '0')}`
      };
    });
    
    return processedRecords;
  } catch (error) {
    console.error('Error processing SANTANDER records:', error);
    return error;
  }
}

function processUnicajaRecords(records, caja) {
  try {
    const importTimestamp = new Date().toISOString();
    
    const processedRecords = records.map((record, index) => {
      const transactionDate = normalizeUnicajaDate(record.FECHA);
      const amount = parseFloat(record.IMPORTE);
      const balance = parseFloat(record.SALDO);
      const importIndex = String(index).padStart(6, '0');
      
      return {
        caja: caja,
        fecha: record.FECHA,
        normalized_date: transactionDate,
        concepto: record.CONCEPTO + ' | ',
        importe: parseSpanishNumber(record.IMPORTE),
        saldo: parseSpanishNumber(record.SALDO),
        num_apunte: record.NUM_MOV || 0,
        idx: index,
        // Composite key for sorting
        sort_key: `${transactionDate}_${importTimestamp}_${String(999999 - index).padStart(6, '0')}`
      };
    });
    
    return processedRecords;
  } catch (error) {
    console.error('Error processing UNICAJA records:', error);
    return error;
  }
}



function parseSpanishNumber(str) {
  if (!str || typeof str !== 'string') return null;
  //console.log('str', str)
  // Remove all dots (thousand separators)
  const withoutThousands = str.replace(/\,/g, '');
  //console.log('withoutThousands', withoutThousands)
  
  // Replace comma with dot for decimal separator
  const withDot = withoutThousands.replace(',', '.');
  //console.log('withDot', withDot)
  
  // Parse as float
  const num = parseFloat(withDot);
  
  return isNaN(num) ? null : num;
}


function normalizeUnicajaDate(date) { 
  //date is a string in format dd / mm / yyyy
  const [day, month, year] = date.split('/');
  let _s_date = `${year}-${month}-${day}`;
  const d = new Date(_s_date);
  return  d.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit'
  }).replace(/\//g, '-');
}




function normalizeBBVADate(date) { 
  //date is a string in format dd / mm / yyyy
  const [day, month, year] = date.split('/');
  let _s_date = `${year}-${month}-${day}`;
  const d = new Date(_s_date);
  return  d.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit'
  }).replace(/\//g, '-');
}


function normalizeSantanderDate(date) { 
  //date is a string in format dd / mm / yyyy
  const [day, month, year] = date.split('/');
  let _s_date = `${year}-${month}-${day}`;
  const d = new Date(_s_date);
  return  d.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit'
  }).replace(/\//g, '-');
}





function normalizeCaixaBankDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}


function normalizeCRuralDate(date) {
  // date is now a string in format dd-mmm-yy (e.g., "30-may-25")
  const [day, monthName, year] = date.split('-');
  
  // Map Spanish/English month names to numbers
  const monthMap = {
    'ene': '01', 'jan': '01', 'enero': '01', 'january': '01',
    'feb': '02', 'febrero': '02', 'february': '02',
    'mar': '03', 'marzo': '03', 'march': '03',
    'abr': '04', 'abril': '04', 'april': '04', 'apr': '04',
    'may': '05', 'mayo': '05',
    'jun': '06', 'junio': '06', 'june': '06',
    'jul': '07', 'julio': '07', 'july': '07',
    'ago': '08', 'agosto': '08', 'august': '08', 'aug': '08',
    'sep': '09', 'septiembre': '09', 'september': '09',
    'oct': '10', 'octubre': '10', 'october': '10',
    'nov': '11', 'noviembre': '11', 'november': '11',
    'dic': '12', 'diciembre': '12', 'december': '12', 'dec': '12'
  };
  
  const month = monthMap[monthName.toLowerCase()];
  if (!month) {
    throw new Error(`Unknown month: ${monthName}`);
  }
  
  // Convert 2-digit year to 4-digit (assuming 20xx for years 00-99)
  const fullYear = year.length === 2 ? `20${year}` : year;
  
  const d = new Date(`${fullYear}-${month}-${day.padStart(2, '0')}`);
  
  return d.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function normalizeCruralRawDate(date) {
  // date is now a string in format dd-mmm-yy (e.g., "30-may-25")
  const [day, monthName, year] = date.split('-');
  
  // Map Spanish/English month names to numbers
  const monthMap = {
    'ene': '01', 'jan': '01', 'enero': '01', 'january': '01',
    'feb': '02', 'febrero': '02', 'february': '02',
    'mar': '03', 'marzo': '03', 'march': '03',
    'abr': '04', 'abril': '04', 'april': '04', 'apr': '04',
    'may': '05', 'mayo': '05',
    'jun': '06', 'junio': '06', 'june': '06',
    'jul': '07', 'julio': '07', 'july': '07',
    'ago': '08', 'agosto': '08', 'august': '08', 'aug': '08',
    'sep': '09', 'septiembre': '09', 'september': '09',
    'oct': '10', 'octubre': '10', 'october': '10',
    'nov': '11', 'noviembre': '11', 'november': '11',
    'dic': '12', 'diciembre': '12', 'december': '12', 'dec': '12'
  };
  
  const month = monthMap[monthName.toLowerCase()];
  if (!month) {
    throw new Error(`Unknown month: ${monthName}`);
  }
  
  // Convert 2-digit year to 4-digit (assuming 20xx for years 00-99)
  const fullYear = year.length === 2 ? `20${year}` : year;
  
  const d = new Date(`${fullYear}-${month}-${day.padStart(2, '0')}`);
  
  return  d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit'
  });
}

function normalizeCRuralDate_old(date) { 
  //date is a string in format d|dd / m|mm / yyyy
  const [day, month, year] = date.split('/');
  let _s_date = `${year}-${month}-${day}`;
  const d = new Date(_s_date);
  return  d.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit'
  }).replace(/\//g, '-');
}

function normalizeCruralRawDate_old(date){
  const [day, month, year] = date.split('/');
  let _s_date = `${year}-${month}-${day}`;
  const d = new Date(_s_date);
  return  d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit'
  });
}

async function checkExistingRecords(records, db) {
  // Check if records already exist in database based on hash.
  const processedRecords = [];
  
  for (const record of records) {
      // Generate hash for comparison
      const hash = db.generateHash(record);
      
      // Check if record exists
      const exists = await db.checkRecordExists(hash);
      
      processedRecords.push({
          ...record,
          alreadyInDatabase: exists
      });
  }
  
  return processedRecords;
}

// Export the functionality
module.exports = {
    processFile,
    // Export other functions that might be needed externally
    //processBBVARecords,
    //processCRuralRecords,s
    // etc.
  };

