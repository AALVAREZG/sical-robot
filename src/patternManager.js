// patternManager.js
let patterns = [];
let currentPatternIndex = null;
let matcherEditor = null;
let generatorEditor = null;
let hasUnsavedChanges = false;


// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initMonacoEditor();
    loadPatterns();
    setupEventListeners();
});

// Initialize Monaco Editor
function initMonacoEditor() {
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.33.0/min/vs' }});
    require(['vs/editor/editor.main'], function() {
        // Create matcher editor
        matcherEditor = monaco.editor.create(document.getElementById('matcherEditor'), {
            value: '(data) => {\n  // Pattern for matching transactions\n  const [caja, fecha, concepto, importe] = data;\n  \n  // Add your matching conditions here\n  // Return true if the transaction matches this pattern\n  return false;\n}',
            language: 'javascript',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            renderLineHighlight: 'all'
        });

        // Create generator editor
        generatorEditor = monaco.editor.create(document.getElementById('generatorEditor'), {
            value: '(data) => {\n  // Generate output for matched transactions\n  const [caja, fecha, concepto, importe] = data;\n  const dateISOString = new Date().toISOString();\n  \n  // Return template for transaction operations\n  return {\n    id_task: caja + \'_\' + fecha + \'_\' + String(importe),\n    num_operaciones: 1,\n    creation_date: dateISOString,\n    liquido_operaciones: importe,\n    operaciones: []\n  };\n}',
            language: 'javascript',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14
        });

        // Add change handlers to track unsaved changes
        matcherEditor.onDidChangeModelContent(() => { hasUnsavedChanges = true; });
        generatorEditor.onDidChangeModelContent(() => { hasUnsavedChanges = true; });
    });
}

// Set up event listeners
function setupEventListeners() {
    // Pattern list actions
    // Pattern list actions
    document.getElementById('addPatternBtn').addEventListener('click', addNewPattern);
    
    // Make sure the search input works
    const searchInput = document.getElementById('patternSearch');
    if (searchInput) {
        searchInput.addEventListener('input', filterPatterns);
    }
    
    // Make sure the pattern description input works
    const descriptionInput = document.getElementById('patternDescription');
    if (descriptionInput) {
        descriptionInput.addEventListener('input', function() {
            hasUnsavedChanges = true;
            updateCurrentPattern();
        });
    }
    document.getElementById('testPatternBtn').addEventListener('click', openTestPanel);
    document.getElementById('duplicatePatternBtn').addEventListener('click', duplicateCurrentPattern);
    document.getElementById('deletePatternBtn').addEventListener('click', deleteCurrentPattern);
    document.getElementById('saveAllBtn').addEventListener('click', saveAllPatterns);
    document.getElementById('backBtn').addEventListener('click', navigateBack);
    
    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            activateTab(e.target.dataset.tab);
        });
    });
    
    // Test panel
    document.getElementById('runTestBtn').addEventListener('click', runPatternTest);
    
    // Before unload handler
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
            return '';
        }
    });
}

// Load patterns from the main process
async function loadPatterns() {
    try {
        // In a real implementation, you would use IPC to get the patterns from the main process
        // For this example, we'll simulate the loading
        const result = await window.electronAPI.getPatterns();
        patterns = result || [];
        renderPatternList();
        
        if (patterns.length > 0) {
            selectPattern(0);
        }
        
        showToast('Patterns loaded successfully', 'success');
    } catch (error) {
        console.error('Error loading patterns:', error);
        showToast('Error loading patterns', 'error');
    }
}

// Render the pattern list
function renderPatternList() {
    const patternList = document.getElementById('patternList');
    patternList.innerHTML = '';
    
    patterns.forEach((pattern, index) => {
        const patternItem = document.createElement('div');
        patternItem.className = 'pattern-item';
        patternItem.dataset.index = index;
        
        if (currentPatternIndex === index) {
            patternItem.classList.add('active');
        }
        
        patternItem.innerHTML = `
            <div class="pattern-item-title">${pattern.description || 'Unnamed Pattern'}</div>
            <div class="pattern-item-desc">${getPatternShortDescription(pattern.matcherFunction)}</div>
        `;
        
        patternItem.addEventListener('click', () => {
            selectPattern(index);
        });
        
        patternList.appendChild(patternItem);
    });
}

// Get a short description of the pattern from the matcher function
function getPatternShortDescription(matcherFunction) {
    if (!matcherFunction) return 'No matcher function';
    
    // Extract the first condition from the matcher function
    const funcStr = matcherFunction.toString();
    const lines = funcStr.split('\n').filter(line => 
        line.trim().length > 0 && 
        !line.trim().startsWith('//') && 
        !line.trim().startsWith('const [') &&
        !line.includes('=>') &&
        !line.includes('return') &&
        line.includes('=')
    );
    
    if (lines.length > 0) {
        // Return the first non-empty, non-comment, non-destructuring line
        return lines[0].trim();
    }
    
    return 'Custom matcher function';
}

// Select a pattern
function selectPattern(index) {
    // Check for unsaved changes
    if (hasUnsavedChanges && currentPatternIndex !== null && currentPatternIndex !== index) {
        if (!confirm('You have unsaved changes. Do you want to discard them?')) {
            return;
        }
    }
    
    currentPatternIndex = index;
    hasUnsavedChanges = false;
    
    // Update pattern list UI
    document.querySelectorAll('.pattern-item').forEach(item => {
        item.classList.remove('active');
        if (parseInt(item.dataset.index) === index) {
            item.classList.add('active');
        }
    });
    
    // Get the current pattern
    const pattern = patterns[index];
    
    // Show editor container, hide placeholder
    document.getElementById('editorPlaceholder').style.display = 'none';
    document.getElementById('patternEditorContainer').style.display = 'flex';
    
    // Update editor fields
    document.getElementById('patternDescription').value = pattern.description || '';
    
    // Update Monaco editors if initialized
    if (matcherEditor && generatorEditor) {
        matcherEditor.setValue(pattern.matcherFunction || '');
        generatorEditor.setValue(pattern.generatorFunction || '');
    }
    
    // Activate the first tab
    activateTab('matcher');
}

// Activate a tab
function activateTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabId) {
            btn.classList.add('active');
        }
    });
    
    // Update panels
    document.querySelectorAll('.editor-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(`${tabId}Panel`).classList.add('active');
    
    // If the tab is 'test', make sure we update the test panel
    if (tabId === 'test') {
        updateTestPanel();
    }
}

// Update the test panel with example values
function updateTestPanel() {
    // Add any test panel initialization here
    // For example, if we want to pre-populate test inputs
    
    // You might want to parse the matcher function to extract test sample values
    const matcherFunc = matcherEditor.getValue();
    const testCaja = extractTestValue(matcherFunc, 'caja', '207_BBVA - 0342');
    const testFecha = extractTestValue(matcherFunc, 'fecha', '25052024');
    const testConcepto = extractTestValue(matcherFunc, 'concepto', 'TRANSFERENCIAS 41016796-E.I. CASARICHE');
    const testImporte = extractTestValue(matcherFunc, 'importe', '1250.00');
    
    // Set the test input values
    document.getElementById('testCaja').value = testCaja;
    document.getElementById('testFecha').value = testFecha;
    document.getElementById('testConcepto').value = testConcepto;
    document.getElementById('testImporte').value = testImporte;
    
    // Reset test results
    document.getElementById('matcherResult').textContent = 'Not tested yet';
    document.getElementById('matcherResult').className = 'result-content';
    document.getElementById('generatorOutput').textContent = 'Not tested yet';
}

// Extract test values from matcher function
function extractTestValue(matcherFunc, field, defaultValue) {
    try {
        // Look for lines that test the field
        const regex = new RegExp(`const\\s+\\w+\\s*=\\s*${field}\\s*[!=><]=\\s*['"]?([\\w\\d\\s\\-._]+)['"]?`, 'i');
        const match = matcherFunc.match(regex);
        if (match && match[1]) {
            return match[1].trim();
        }
        
        // For more complex matches
        if (field === 'concepto') {
            const testRegex = /test\(concepto\)/;
            const conceptLine = matcherFunc.split('\n').find(line => testRegex.test(line));
            if (conceptLine) {
                const patternMatch = conceptLine.match(/\/([^\/]+)\//);
                if (patternMatch && patternMatch[1]) {
                    return patternMatch[1];
                }
            }
        }
        
        return defaultValue;
    } catch (e) {
        console.error('Error extracting test value:', e);
        return defaultValue;
    }
}

// Run pattern test
function runPatternTest() {
    try {
        const caja = document.getElementById('testCaja').value;
        const fecha = document.getElementById('testFecha').value;
        const concepto = document.getElementById('testConcepto').value;
        const importe = parseFloat(document.getElementById('testImporte').value);
        
        // Create test data array
        const testData = [caja, fecha, concepto, importe];
        
        // Get the current matcher and generator functions
        const matcherFunc = new Function('return ' + matcherEditor.getValue())();
        const generatorFunc = new Function('return ' + generatorEditor.getValue())();
        
        // Test the matcher
        const matchResult = matcherFunc(testData);
        
        // Update the matcher result display
        const matcherResultElement = document.getElementById('matcherResult');
        matcherResultElement.textContent = matchResult === true ? 'MATCH ✓' : 'NO MATCH ✗';
        matcherResultElement.className = matchResult === true ? 'result-content match-success' : 'result-content match-failure';
        
        // If matcher returns true, test the generator
        let generatorOutput = 'Not applicable - pattern did not match';
        if (matchResult === true) {
            try {
                const genResult = generatorFunc(testData);
                generatorOutput = JSON.stringify(genResult, null, 2);
            } catch (e) {
                generatorOutput = 'Error in generator function: ' + e.message;
            }
        }
        
        // Update generator output display
        document.getElementById('generatorOutput').textContent = generatorOutput;
        
        // Show success toast
        showToast('Test completed', 'success');
    } catch (e) {
        console.error('Error running test:', e);
        showToast('Error running test: ' + e.message, 'error');
    }
}

// Add a new pattern
function addNewPattern() {
    // Create a new pattern with default values
    const newPattern = {
        description: 'New Pattern',
        matcherFunction: `(data) => {
  // Pattern for matching transactions
  const [caja, fecha, concepto, importe] = data;
  
  // Add your matching conditions here
  // Return true if the transaction matches this pattern
  return false;
}`,
        generatorFunction: `(data) => {
  // Generate output for matched transactions
  const [caja, fecha, concepto, importe] = data;
  const dateISOString = new Date().toISOString();
  
  // Return template for transaction operations
  return {
    id_task: caja + '_' + fecha + '_' + String(importe),
    num_operaciones: 1,
    creation_date: dateISOString,
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
            tcargo: \`TRANSF N/F \${concepto}\`, 
            ado: "" 
          }]
        }
      }
    ]
  };
}`
    };
    
    // Add the new pattern to the array
    patterns.push(newPattern);
    
    // Render the pattern list
    renderPatternList();
    
    // Select the new pattern
    selectPattern(patterns.length - 1);
    
    // Show success toast
    showToast('New pattern created', 'success');
    
    // Set focus to the description field
    document.getElementById('patternDescription').focus();
}

// Duplicate the current pattern
function duplicateCurrentPattern() {
    if (currentPatternIndex === null) return;
    
    // Get the current pattern
    const currentPattern = patterns[currentPatternIndex];
    
    // Create a copy with a modified description
    const newPattern = {
        description: `Copy of ${currentPattern.description}`,
        matcherFunction: currentPattern.matcherFunction,
        generatorFunction: currentPattern.generatorFunction
    };
    
    // Add the new pattern to the array
    patterns.push(newPattern);
    
    // Render the pattern list
    renderPatternList();
    
    // Select the new pattern
    selectPattern(patterns.length - 1);
    
    // Show success toast
    showToast('Pattern duplicated', 'success');
}

// Delete the current pattern
function deleteCurrentPattern() {
    if (currentPatternIndex === null) return;
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete the pattern "${patterns[currentPatternIndex].description}"?`)) {
        return;
    }
    
    // Remove the pattern from the array
    patterns.splice(currentPatternIndex, 1);
    
    // Render the pattern list
    renderPatternList();
    
    // Select another pattern or show placeholder
    if (patterns.length > 0) {
        selectPattern(Math.min(currentPatternIndex, patterns.length - 1));
    } else {
        currentPatternIndex = null;
        document.getElementById('editorPlaceholder').style.display = 'flex';
        document.getElementById('patternEditorContainer').style.display = 'none';
    }
    
    // Show success toast
    showToast('Pattern deleted', 'success');
}

// Update the filterPatterns function
function filterPatterns() {
    const searchInput = document.getElementById('patternSearch');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    console.log('Filtering patterns with term:', searchTerm);
    
    // Get all pattern items
    const patternItems = document.querySelectorAll('.pattern-item');
    
    // Filter items based on search term
    patternItems.forEach(item => {
        const title = item.querySelector('.pattern-item-title').textContent.toLowerCase();
        const desc = item.querySelector('.pattern-item-desc').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || desc.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Update current pattern with editor changes
function updateCurrentPattern() {
    if (currentPatternIndex === null) return;
    
    // Get updated values
    const description = document.getElementById('patternDescription').value;
    let matcherFunc = matcherEditor ? matcherEditor.getValue() : '';
    let generatorFunc = generatorEditor ? generatorEditor.getValue() : '';
    
    // Update the pattern
    patterns[currentPatternIndex].description = description;
    patterns[currentPatternIndex].matcherFunction = matcherFunc;
    patterns[currentPatternIndex].generatorFunction = generatorFunc;
    
    // Update the pattern item in the list
    const patternItems = document.querySelectorAll('.pattern-item');
    patternItems.forEach(item => {
        if (parseInt(item.dataset.index) === currentPatternIndex) {
            item.querySelector('.pattern-item-title').textContent = description || 'Unnamed Pattern';
            item.querySelector('.pattern-item-desc').textContent = getPatternShortDescription(matcherFunc);
        }
    });
}

// Save all patterns
async function saveAllPatterns() {
    try {
        // Make sure current pattern is updated
        updateCurrentPattern();
        
        // In a real implementation, you would use IPC to save the patterns to the main process
        await window.electronAPI.savePatterns(patterns);
        
        // Reset unsaved changes flag
        hasUnsavedChanges = false;
        
        // Show success toast
        showToast('All patterns saved successfully', 'success');
    } catch (error) {
        console.error('Error saving patterns:', error);
        showToast('Error saving patterns: ' + error.message, 'error');
    }
}

// Navigate back to main window
async function navigateBack() {
    // Check for unsaved changes
    if (hasUnsavedChanges) {
        if (!confirm('You have unsaved changes. Do you want to discard them?')) {
            return;
        }
    }
    
    // Use localStorage to indicate we're returning from pattern manager
    localStorage.setItem('returnFromPatternManager', 'true');
   
    window.location.href = 'index.html';
}

// Open the test panel
function openTestPanel() {
    activateTab('test');
}

// Show a toast message
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 300);
    }, 3000);
}

// Mock electronAPI for development (replace with actual IPC calls in production)
window.electronAPI = {
    getPatterns: async () => {
        // In a real implementation, this would call the main process
        // For now, return a mock array of patterns
        return [
            {
                description: "ARQUEO-TRAMITE-CATASTRO",
                matcherFunction: `(data) => {
      const [caja, fecha, concepto, importe] = data;
      
      // - Amount ranges
      const matchAmount = importe == 7;
      
      // Combine conditions as needed 
      return matchAmount;
    }`,
                generatorFunction: `(data) => {
      const [caja, fecha, concepto, importe] = data;
      const dateISOString = new Date().toISOString();
        
      return {
        id_task: caja+'_'+fecha+'_'+String(importe)+'_'+ concepto.replace(/\\s/g, "").slice(-5),
        num_operaciones: 1,
        creation_date: dateISOString,
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
                { partida: "325", IMPORTE_PARTIDA: importe },
                { partida: "Total", IMPORTE_PARTIDA: 0.0 }
              ],
              texto_sical: [{ 
                tcargo: \`TRANSF N/F \${concepto} (TRAMITE CATASTRO)\`, 
                ado: "" 
              }]
            }
          }
        ]
      };
    }`
            },
            {
                description: "ARQUEO-PLACA-VADO",
                matcherFunction: `(data) => {
      const [caja, fecha, concepto, importe] = data;
      
      // - Amount ranges
      const matchAmount = importe == 14;
      
      // Combine conditions as needed 
      return matchAmount;
    }`,
                generatorFunction: `(data) => {
      const [caja, fecha, concepto, importe] = data;
      const cajaReal = caja.split('_')[0];
      
      return {
        id_task: caja+'_'+fecha+'_'+String(importe),
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
                tcargo: \`TRANSF N/F \${concepto} (PLACA VADO)\`, 
                ado: "" 
              }]
            }
          }
        ]
      };
    }`
            }
        ];
    },
    
    savePatterns: async (patternsData) => {
        // In a real implementation, this would call the main process
        console.log('Saving patterns:', patternsData);
        return true;
    }
};