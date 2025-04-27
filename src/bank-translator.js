// bank-translator.js - Enhanced pattern matching
// Add these imports to the top of bank-translator.js
const { networkInterfaces } = require('os');
const path = require('path');
const fs = require('fs').promises;
const Papa = require('papaparse');
// Define a patterns storage file path
const PATTERNS_STORAGE_FILE = path.join(__dirname, 'data', 'transaction-patterns.json');
const transactionPatterns = []
// Helper functions

/**
 * Search for a term in column 3 of CSV and return the corresponding column 1 value
 * @param {string} searchTerm - The term to search for in column 3
 * @returns {Promise<string|null>} - The matching column 1 value or null if not found
 */
async function findIdByName(searchTerm) {
  try {
    // Path to the CSV file
    const csvPath = path.join(__dirname, 'data', 'records', 'terceros.csv');
    
    // Read the file
    const fileContent = await fs.readFile(csvPath, 'utf8');
    
    // Parse the CSV
    const results = Papa.parse(fileContent, {
      header: false,
      skipEmptyLines: true
    });
    
    // Search for the term in column 3 (index 2)
    const matchingRow = results.data.find(row => {
      // Case insensitive search and trim whitespace
      return row[3] && row[3].trim().toLowerCase() === searchTerm.trim().toLowerCase();
    });
    
    // Return the column 1 value (index 0) if found, otherwise null
    return matchingRow ? matchingRow[1] : null;
    
  } catch (error) {
    console.error('Error searching in CSV:', error);
    return null;
  }
}
/**
 * Remove all non-alphanumeric characters from a string
 * @param {string} str - The input string
 * @returns {string} - The string with non-alphanumeric characters removed
 */
 
function removeNonAlphanumeric(str) {
  return str.replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Search for a term in column 3 of CSV and return all matching results
 * @param {string} searchTerm - The term to search for in column 3
 * @returns {Promise<Array>} - Array of matching {id, name} objects
 */
async function findMatchingTerceros(searchTerm) {
  try {
    // Path to the CSV file
    const csvPath = path.join(__dirname, 'data', 'records', 'terceros.csv');
    
    // Read the file
    const fileContent = await fs.readFile(csvPath, 'utf8');
    
    // Parse the CSV
    const results = Papa.parse(fileContent, {
      header: false,
      skipEmptyLines: true
    });
    
    // Search for matches in column 3 (index 2)
    const matchingRows = results.data.filter(row => {
      return row[3] && row[3].trim().toLowerCase().includes(searchTerm.trim().toLowerCase());
    });
    
    // Format results
    return matchingRows.map(row => ({
      id: row[1], // Column 1 (ID)
      name: row[3]  // Column 3 (Name)
    }));
    
  } catch (error) {
    console.error('Error searching findMatchingTerceros in CSV:', error);
    return [];
  }
}

function formatearFecha(fechaISO) {
  const fecha = new Date(fechaISO);
  return `${fecha.getDate().toString().padStart(2, '0')}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}-${fecha.getFullYear()}`;
}

function limpiarFecha(fecha) {
  // Remove any non-numeric characters from the date
  console.log('Limpiando fecha:', fecha);
  rawDate = fecha.replace(/\D/g, '');
  console.log('Fecha limpia:', rawDate);
  return rawDate;
  
  
}

function obtenerMes(fechaISO) {
  const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  const fecha = new Date(fechaISO);
  return meses[fecha.getMonth()];
}

function getMes(fechaDDMMYYYY) {
  const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  
  // Parse ddmmYYYY format
  const day = fechaDDMMYYYY.substring(0, 2);
  const month = fechaDDMMYYYY.substring(2, 4);
  const year = fechaDDMMYYYY.substring(4, 8);
  
  // JavaScript months are 0-indexed, so subtract 1 from the parsed month
  const monthIndex = parseInt(month, 10) - 1;
  
  return meses[monthIndex];
}
// Enhanced pattern-based translator with all fields
function translateBankOperation(bankData) {
  const [caja, fecha, concepto, importe] = bankData;
  rawDate = limpiarFecha(fecha);
  rawCaja = caja.split('_')[0];
  console.log('Translating bank operation:', bankData);
  console.log('translateBankOperation. Existing patterns:', transactionPatterns.length);
  let rawData = [rawCaja, rawDate, concepto, importe];
  // Try to match with enhanced pattern matching
  for (const pattern of transactionPatterns) {
    if (pattern.matcher(rawData)) {
      console.log('Found matching pattern');
      return {data: pattern.generator(rawData), description: pattern.description, patternId: pattern.patternId};
    }
  }
  
  // If no pattern matches, use fallback
  console.log('No matching pattern found, using fallback generator');
  return createFallbackResult(rawData);
}

// Updated Fallback function with logic based on amount sign
function createFallbackResult(bankData) {
  const [caja, fecha, concepto, importe] = bankData;

  const importeNumerico = parseFloat(importe);
  const isPositive = importeNumerico >= 0;
  console.log("find id...", findIdByName(concepto))
  const dateISOString = new Date().toISOString(); function removeNonAlphanumeric(str) {
    return str.replace(/[^a-zA-Z0-9]/g, '');
  };
  const startIndex = Math.floor((concepto.length - 5) / 2);
  const middle6 = removeNonAlphanumeric(concepto).slice(startIndex, startIndex + 6);
  const normalizedImporte = String(importe).replace(/,/g, '');
  
  // Different processing based on sign
  if (isPositive) {
    // Positive amount - generate Arqueo
    return {
      data: {
        id_task: caja+'_'+fecha+'_'+normalizedImporte+'_'+ middle6,
        creation_date: dateISOString,
        num_operaciones: 1,
        liquido_operaciones: importe,
        operaciones: [
          {
            tipo: "arqueo",
            detalle: {
              fecha: fecha,
              caja: caja,
              tercero: "43000000M",
              naturaleza: "4",
              final: [
                { partida: "399", IMPORTE_PARTIDA: importe },
                { partida: "Total", IMPORTE_PARTIDA: 0.0 }
              ],
              texto_sical: [{ 
                tcargo: `TRANSF N/F: ${concepto}`, 
                ado: "" 
              }]
            }
          }
        ]
      },
      description: "Auto-generated Arqueo for positive amount"
    };
  } else {
    // Negative amount - generate Ado220
    const absImporte = Math.abs(importeNumerico);
    return {
      data: {
        id_task: caja+'_'+fecha+'_'+normalizedImporte+'_'+ middle6,
        creation_date: dateISOString,
        num_operaciones: 1,
        liquido_operaciones: importe,
        operaciones: [
          {
            tipo: "ado220",
            detalle: {
              fecha: fecha,
              expediente: "",
              tercero: "43000000M",
              fpago: "10",
              tpago: "10",
              caja: caja,
              texto: "C/Cta.: " + concepto.substring(0, 40),
              aplicaciones: [{
                funcional: "999", 
                economica: "999",
                gfa: null, 
                importe: absImporte,
                cuenta: "9999"
              }]
            }
          }
        ]
      },
      description: "Auto-generated Ado220 for negative amount"
    };
  }
}


/**
 * Apply a specific pattern by ID
 * @param {string} patternId - The ID of the pattern to apply
 * @param {Array} bankData - The bank data array [caja, fecha, concepto, importe]
 * @returns {Object} Result of applying the pattern
 */
async function applySpecificPattern(patternId, bankData) {
  console.log(`Applying specific pattern ${patternId} to bank data:`, bankData);
  const [caja, fecha, concepto, importe] = bankData;
  rawDate = limpiarFecha(fecha);
  rawCaja = caja.split('_')[0];
  let rawBankData = [rawCaja, rawDate, concepto, importe];
  console.log('Translating bank operation, raw data:', rawBankData);
  
  
  // Extract index from pattern ID (assuming format pattern_X)
  const patternIndex = parseInt(patternId.split('_')[1]);
  
  if (isNaN(patternIndex) || patternIndex < 0 || patternIndex >= transactionPatterns.length) {
    console.error(`Invalid pattern ID: ${patternId}`);
    throw new Error('Pattern not found');
  }
  
  // Get the specific pattern
  const pattern = transactionPatterns[patternIndex];
  
  // Check if the pattern matches the bank data
  try {
    const matches = pattern.matcher(bankData);
    if (!matches) {
      console.warn(`Pattern ${patternId} does not match the bank data`);
      // Still apply it as requested
    }
    
    // Apply the generator function
    
    const generatedData = pattern.generator(rawBankData);
    
    return {
      data: generatedData,
      description: pattern.description || `Pattern ${patternIndex}`,
      patternId: patternId
    };
  } catch (error) {
    console.error(`Error applying pattern ${patternId}:`, error);
    throw error;
  }
}


// Enhanced function to create a new pattern from example data
// Don't implement this function.
// This is just a placeholder for demonstration purposes. It's very
// difficult to create a generic function that can handle all possible
// pattern recognition scenarios. Its better to create patterns manually 
// based on rules of specifics use cases.
function createPatternFromExample_example(inputData, outputData, description) {
  // Your custom pattern recognition logic here
  // This is just a placeholder
  return {
    description: description || "Auto-generated pattern",
    matcher: (data) => {
      // Your custom matching logic here
      return true; // Placeholder
    },
    generator: (data) => {
      // Your custom data generation logic here
      return outputData; // Placeholder
    }
  };
}

// Function to save all patterns to file
async function savePatterns() {
  try {
    // Create a serializable version of the patterns
    // Functions can't be directly serialized to JSON, so we store them as strings
   
   const serializablePatterns = transactionPatterns.map(pattern => ({
    description: pattern.description || "Unnamed pattern", // Include description
    matcherFunction: pattern.matcher.toString(),
    generatorFunction: pattern.generator.toString()
  }));
    
    // Ensure the directory exists
    const dir = path.dirname(PATTERNS_STORAGE_FILE);
    await fs.mkdir(dir, { recursive: true });
    
    // Write to file
    await fs.writeFile(
      PATTERNS_STORAGE_FILE, 
      JSON.stringify(serializablePatterns, null, 2)
    );
    
    console.log('Patterns saved successfully to:', PATTERNS_STORAGE_FILE);
    return true;
  } catch (error) {
    console.error('Error saving patterns:', error);
    return false;
  }
}

// Function to load patterns from file
async function loadPatterns() {
  try {
    // Check if patterns file exists
    try {
      await fs.access(PATTERNS_STORAGE_FILE);
    } catch (error) {
      console.log('No saved patterns file found. Using default patterns.');
      return false;
    }
    console.log('Trying to load patterns from: ', PATTERNS_STORAGE_FILE);
    // Read and parse the file
    const data = await fs.readFile(PATTERNS_STORAGE_FILE, 'utf-8');
    const serializedPatterns = JSON.parse(data);
    
     // Convert the serialized functions back to actual functions
     const loadedPatterns = serializedPatterns.map(serialized => {
      // Create new function objects from the stored strings
      const matcherFn = new Function(
        'return ' + serialized.matcherFunction
      )();
      
      const generatorFn = new Function(
        'return ' + serialized.generatorFunction
      )();
      
      return {
        description: serialized.description || "Unnamed pattern", // Include description
        matcher: matcherFn,
        generator: generatorFn
      };
    });
    
    // Replace the current patterns with loaded ones
    // Clear the current array and add all loaded patterns
    transactionPatterns.length = 0;
    loadedPatterns.forEach(pattern => transactionPatterns.push(pattern));
    
    console.log('Loaded', transactionPatterns.length, 'patterns from storage');
    return true;
  } catch (error) {
    console.error('Error loading patterns:', error);
    return false;
  }
}

// In bank-translator.js

// Initialize patterns from file directly in the main process
async function initializePatterns() {
  try {
    console.log("Loading patterns from file...");
    // Read the patterns file directly using fs
    // This works in the main process without needing window.electronAPI
    const PATTERNS_FILE_PATH = path.join(__dirname, 'data', 'transaction-patterns.json');
    
    // Check if file exists
    try {
      await fs.access(PATTERNS_FILE_PATH);
    } catch (error) {
      console.log('No saved patterns file found. Using default patterns.');
      return false;
    }
    
    // Read and parse the file
    const data = await fs.readFile(PATTERNS_FILE_PATH, 'utf-8');
    const serializedPatterns = JSON.parse(data);
    
    // Clear existing patterns
    transactionPatterns.length = 0;
    
    // Convert the serialized functions back to actual functions
    serializedPatterns.forEach(pattern => {
      // Create new function objects from the stored strings
      const matcherFn = new Function('return ' + pattern.matcherFunction)();
      const generatorFn = new Function('return ' + pattern.generatorFunction)();
      
      transactionPatterns.push({
        description: pattern.description,
        matcher: matcherFn,
        generator: generatorFn
      });
    });
    
    console.log(`Loaded ${transactionPatterns.length} patterns from storage`);
    return true;
  } catch (error) {
    console.error('Error loading patterns:', error);
    return false;
  }
}

// Initialize patterns on startup
async function initializePatterns_OLD() {
  // Try to load saved patterns, if any
  console.log("try to load saved patterns...")
  const loaded = await loadPatterns();
  
  // If no patterns were loaded, make sure we have the default patterns
  if (!loaded && transactionPatterns.length === 0) {
    // Add default patterns here if needed
    console.log('Setting up default patterns');
    // You can call a function to set up default patterns here
  }
}

// Add a new pattern and save to storage
async function addPattern_(newPattern) {
  // Check if a similar pattern already exists
  const existingPatternIndex = transactionPatterns.findIndex(p => 
    p.matcher.toString() === newPattern.matcher.toString()
  );
  
  if (existingPatternIndex >= 0) {
    // Update existing pattern
    console.log('Updating existing pattern at index:', existingPatternIndex);
    transactionPatterns[existingPatternIndex] = newPattern;
  } else {
    // Add new pattern (before the fallback/default pattern)
    console.log('Adding new pattern');
    // Ensure it's added before any catch-all patterns
    const fallbackIndex = transactionPatterns.findIndex(p => 
      p.matcher.toString().includes('return true;')
    );
    
    if (fallbackIndex >= 0) {
      // Insert before the fallback pattern
      transactionPatterns.splice(fallbackIndex, 0, newPattern);
    } else {
      // Or just add to the end if no fallback found
      transactionPatterns.push(newPattern);
    }
  }
  
  // Save the updated patterns
  await savePatterns();
  console.log('Pattern added successfully, total patterns:', transactionPatterns.length);
  return true;
}

// Add these functions to your bank-translator.js file

/**
 * Get all available patterns
 * @returns {Array} Array of pattern objects
 */
async function getAvailablePatterns() {
  console.log("Getting available patterns...");
  
  // Return the patterns with IDs
  const patternsWithIds = transactionPatterns.map((pattern, index) => ({
    id: `pattern_${index}`,
    description: pattern.description || `Pattern ${index}`,
    matcherFunction: pattern.matcher.toString(),
    generator: pattern.generator
  }));
  
  return patternsWithIds;
}




// Export all the functions and variables
module.exports = {
  //transactionPatterns,
  formatearFecha,
  obtenerMes,
  translateBankOperation,
  createFallbackResult,
  // New exports
  savePatterns,
  loadPatterns,
  initializePatterns,
  findIdByName,
  findMatchingTerceros,
  
  // Pattern selection functions
  getAvailablePatterns,
  applySpecificPattern
};
