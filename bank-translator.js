// bank-translator.js - Enhanced pattern matching
// Add these imports to the top of bank-translator.js
const { networkInterfaces } = require('os');
const path = require('path');
const fs = require('fs').promises;

// Define a patterns storage file path
const PATTERNS_STORAGE_FILE = path.join(__dirname, 'data', 'transaction-patterns.json');
const transactionPatterns = []
// Helper functions
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

// Enhanced pattern-based translator with all fields
function translateBankOperation(bankData) {
  const [caja, fecha, concepto, importe] = bankData;
  rawDate = limpiarFecha(fecha);
  rawCaja = caja.split('_')[0];
  console.log('Translating bank operation:', bankData);
  console.log('Existing patterns:', transactionPatterns.length);
  let rawData = [rawCaja, rawDate, concepto, importe];
  // Try to match with enhanced pattern matching
  for (const pattern of transactionPatterns) {
    if (pattern.matcher(rawData)) {
      console.log('Found matching pattern');
      return {data: pattern.generator(rawData), description: pattern.description};
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
  
  // Different processing based on sign
  if (isPositive) {
    // Positive amount - generate Arqueo
    return {
      data: {
        num_operaciones: 1,
        liquido_operaciones: importeNumerico,
        operaciones: [
          {
            tipo: "arqueo",
            detalle: {
              fecha: fecha,
              caja: caja,
              tercero: "43000000M",
              naturaleza: "4",
              final: [
                { partida: "399", IMPORTE_PARTIDA: importeNumerico },
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
        num_operaciones: 1,
        liquido_operaciones: importeNumerico,
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

// Initialize patterns on startup
async function initializePatterns() {
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
  initializePatterns
};
