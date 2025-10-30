// patternManager.js
let patterns = [];
let currentPatternIndex = null;
let matcherEditor = null;
let generatorEditor = null;
let hasUnsavedChanges = false;
let isProgrammaticChange = false; // FIX: Flag to track programmatic vs user changes


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
            renderLineHighlight: 'all',
            // FIX: Add these options to prevent focus issues
            contextmenu: false,
            quickSuggestions: false,
            parameterHints: { enabled: false }
        });

        // Create generator editor
        generatorEditor = monaco.editor.create(document.getElementById('generatorEditor'), {
            value: '(data) => {\n  // Generate output for matched transactions\n  const [caja, fecha, concepto, importe] = data;\n  const dateISOString = new Date().toISOString();\n  \n  // Return template for transaction operations\n  return {\n    id_task: caja + \'_\' + fecha + \'_\' + String(importe),\n    num_operaciones: 1,\n    creation_date: dateISOString,\n    liquido_operaciones: importe,\n    operaciones: []\n  };\n}',
            language: 'javascript',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            // FIX: Add these options to prevent focus issues
            contextmenu: false,
            quickSuggestions: false,
            parameterHints: { enabled: false }
        });

        // FIX: Add change handlers that ignore programmatic changes
        // We use a flag to distinguish between user edits and programmatic setValue() calls
        matcherEditor.onDidChangeModelContent(() => {
            if (!isProgrammaticChange) {
                hasUnsavedChanges = true;
            }
        });

        generatorEditor.onDidChangeModelContent(() => {
            if (!isProgrammaticChange) {
                hasUnsavedChanges = true;
            }
        });

        // FIX: Add focus recovery mechanism
        setupFocusRecovery();
    });
}

// FIX: Focus recovery mechanism to prevent keyboard blocking
function setupFocusRecovery() {
    let lastFocusTime = Date.now();

    // Monitor window focus events
    window.addEventListener('focus', () => {
        lastFocusTime = Date.now();
        // Force editors to release and reacquire focus properly
        if (matcherEditor) {
            setTimeout(() => matcherEditor.layout(), 0);
        }
        if (generatorEditor) {
            setTimeout(() => generatorEditor.layout(), 0);
        }
    });

    // Monitor editor focus events
    if (matcherEditor) {
        matcherEditor.onDidFocusEditorText(() => {
            lastFocusTime = Date.now();
        });
    }
    if (generatorEditor) {
        generatorEditor.onDidFocusEditorText(() => {
            lastFocusTime = Date.now();
        });
    }

    // Periodic check for stuck focus (every 2 seconds)
    setInterval(() => {
        const timeSinceLastFocus = Date.now() - lastFocusTime;

        // If no focus events in 30 seconds and editors exist, force refresh
        if (timeSinceLastFocus > 30000) {
            console.log('Focus recovery: Refreshing editors');
            if (matcherEditor && matcherEditor.hasTextFocus()) {
                matcherEditor.layout();
            }
            if (generatorEditor && generatorEditor.hasTextFocus()) {
                generatorEditor.layout();
            }
            lastFocusTime = Date.now();
        }
    }, 2000);

    // FIX: Add escape hatch - Ctrl+Shift+R to force refresh editors
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'R') {
            e.preventDefault();
            console.log('Manual focus recovery triggered');
            if (matcherEditor) {
                matcherEditor.focus();
                matcherEditor.layout();
            }
            if (generatorEditor) {
                generatorEditor.focus();
                generatorEditor.layout();
            }
            showToast('Editors refreshed', 'success');
        }
    });
}

// Set up event listeners
function setupEventListeners() {
    // Pattern list actions - template dropdown
    const addPatternBtn = document.getElementById('addPatternBtn');
    const templateDropdown = document.getElementById('templateDropdown');

    addPatternBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = templateDropdown.style.display === 'block';
        templateDropdown.style.display = isVisible ? 'none' : 'block';
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.add-pattern-menu')) {
            templateDropdown.style.display = 'none';
        }
    });

    // Handle template selection
    document.querySelectorAll('.template-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const templateType = e.target.dataset.template;
            addNewPatternFromTemplate(templateType);
            templateDropdown.style.display = 'none';
        });
    });

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

        // Migrate existing patterns to include new metadata fields
        patterns = patterns.map(pattern => {
            if (!pattern.hasOwnProperty('isFavorite')) {
                pattern.isFavorite = false;
            }
            if (!pattern.hasOwnProperty('lastUsed')) {
                pattern.lastUsed = null;
            }
            if (!pattern.hasOwnProperty('matchCount')) {
                pattern.matchCount = 0;
            }
            if (!pattern.hasOwnProperty('createdAt')) {
                pattern.createdAt = new Date().toISOString();
            }
            return pattern;
        });

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

    // Sort patterns: favorites first, then by lastUsed or matchCount
    const sortedPatterns = [...patterns].map((pattern, originalIndex) => ({
        pattern,
        originalIndex
    })).sort((a, b) => {
        // Favorites always come first
        if (a.pattern.isFavorite && !b.pattern.isFavorite) return -1;
        if (!a.pattern.isFavorite && b.pattern.isFavorite) return 1;

        // Within favorites or non-favorites, sort by lastUsed (most recent first)
        if (a.pattern.lastUsed && b.pattern.lastUsed) {
            return new Date(b.pattern.lastUsed) - new Date(a.pattern.lastUsed);
        }
        if (a.pattern.lastUsed) return -1;
        if (b.pattern.lastUsed) return 1;

        // If no lastUsed, sort by matchCount (highest first)
        return (b.pattern.matchCount || 0) - (a.pattern.matchCount || 0);
    });

    sortedPatterns.forEach(({ pattern, originalIndex }) => {
        const patternItem = document.createElement('div');
        patternItem.className = 'pattern-item';
        patternItem.dataset.index = originalIndex;

        if (currentPatternIndex === originalIndex) {
            patternItem.classList.add('active');
        }

        // Build statistics HTML
        const stats = [];

        // Show last used or created date
        if (pattern.lastUsed) {
            const daysAgo = Math.floor((Date.now() - new Date(pattern.lastUsed)) / (1000 * 60 * 60 * 24));
            const timeText = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo}d ago`;
            stats.push(`<span class="pattern-stat">Used ${timeText}</span>`);
        } else if (pattern.createdAt) {
            const daysAgo = Math.floor((Date.now() - new Date(pattern.createdAt)) / (1000 * 60 * 60 * 24));
            const timeText = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo}d ago`;
            stats.push(`<span class="pattern-stat">Created ${timeText}</span>`);
        }

        // Show match count if > 0, otherwise show "Never used"
        if (pattern.matchCount > 0) {
            stats.push(`<span class="pattern-stat">${pattern.matchCount} matches</span>`);
        } else if (!pattern.lastUsed) {
            stats.push(`<span class="pattern-stat">Never used</span>`);
        }

        const statsHtml = stats.length > 0 ? `<div class="pattern-item-stats">${stats.join('')}</div>` : '';

        patternItem.innerHTML = `
            <div class="pattern-item-title">
                <span class="pattern-item-title-text">${pattern.description || 'Unnamed Pattern'}</span>
                <span class="pattern-star ${pattern.isFavorite ? 'favorite' : ''}" data-index="${originalIndex}"></span>
            </div>
            <div class="pattern-item-desc">${getPatternShortDescription(pattern.matcherFunction)}</div>
            ${statsHtml}
        `;

        // Handle pattern selection (but not on star click)
        patternItem.addEventListener('click', (e) => {
            // Don't select if clicking the star
            if (!e.target.classList.contains('pattern-star')) {
                selectPattern(originalIndex);
            }
        });

        // Handle star toggle
        const star = patternItem.querySelector('.pattern-star');
        star.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent pattern selection
            togglePatternFavorite(originalIndex);
        });

        patternList.appendChild(patternItem);
    });
}

// Toggle pattern favorite status
function togglePatternFavorite(index) {
    patterns[index].isFavorite = !patterns[index].isFavorite;
    hasUnsavedChanges = true;
    renderPatternList();

    // Show toast
    const status = patterns[index].isFavorite ? 'added to' : 'removed from';
    showToast(`Pattern ${status} favorites`, 'success');
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

    // FIX: Blur editors before switching to prevent focus trap
    if (matcherEditor) {
        try {
            matcherEditor.trigger('keyboard', 'editor.action.blur');
        } catch (e) {
            console.log('Could not blur matcher editor:', e);
        }
    }
    if (generatorEditor) {
        try {
            generatorEditor.trigger('keyboard', 'editor.action.blur');
        } catch (e) {
            console.log('Could not blur generator editor:', e);
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
        // FIX: Set flag before programmatic changes to prevent false "unsaved changes" detection
        isProgrammaticChange = true;

        matcherEditor.setValue(pattern.matcherFunction || '');
        generatorEditor.setValue(pattern.generatorFunction || '');

        // FIX: Reset flag after a short delay to allow change events to fire
        setTimeout(() => {
            isProgrammaticChange = false;
        }, 50);

        // FIX: Force layout refresh after setting value to prevent focus issues
        setTimeout(() => {
            if (matcherEditor) matcherEditor.layout();
            if (generatorEditor) generatorEditor.layout();
        }, 100);
    }

    // Activate the first tab
    activateTab('matcher');
}

// Activate a tab
function activateTab(tabId) {
    // FIX: Blur current editor before switching tabs
    if (matcherEditor) {
        try {
            matcherEditor.trigger('keyboard', 'editor.action.blur');
        } catch (e) {}
    }
    if (generatorEditor) {
        try {
            generatorEditor.trigger('keyboard', 'editor.action.blur');
        } catch (e) {}
    }

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

    // FIX: Force layout after tab switch
    setTimeout(() => {
        if (tabId === 'matcher' && matcherEditor) {
            matcherEditor.layout();
        } else if (tabId === 'generator' && generatorEditor) {
            generatorEditor.layout();
        }
    }, 100);

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
// Pattern templates for quick creation
const patternTemplates = {
    'blank': {
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
    operaciones: []
  };
}`
    },
    'simple-match': {
        description: 'Simple Text Match Pattern',
        matcherFunction: `(data) => {
  const [caja, fecha, concepto, importe] = data;

  // Check if concepto contains specific text
  return concepto.includes('YOUR_TEXT_HERE');
}`,
        generatorFunction: `(data) => {
  const [caja, fecha, concepto, importe] = data;
  const dateISOString = new Date().toISOString();

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
    },
    'regex-match': {
        description: 'Regex Match Pattern',
        matcherFunction: `(data) => {
  const [caja, fecha, concepto, importe] = data;

  // Use regex to match pattern
  const pattern = /YOUR_REGEX_PATTERN/i;
  return pattern.test(concepto);
}`,
        generatorFunction: `(data) => {
  const [caja, fecha, concepto, importe] = data;
  const dateISOString = new Date().toISOString();

  // Extract data from regex match
  const pattern = /YOUR_REGEX_PATTERN/i;
  const match = concepto.match(pattern);

  return {
    id_task: caja + '_' + fecha + '_' + String(importe),
    num_operaciones: 1,
    creation_date: dateISOString,
    liquido_operaciones: importe,
    operaciones: []
  };
}`
    },
    'amount-range': {
        description: 'Amount Range Pattern',
        matcherFunction: `(data) => {
  const [caja, fecha, concepto, importe] = data;

  // Match transactions within amount range
  const MIN_AMOUNT = 0;
  const MAX_AMOUNT = 1000;

  return importe >= MIN_AMOUNT && importe <= MAX_AMOUNT;
}`,
        generatorFunction: `(data) => {
  const [caja, fecha, concepto, importe] = data;
  const dateISOString = new Date().toISOString();

  return {
    id_task: caja + '_' + fecha + '_' + String(importe),
    num_operaciones: 1,
    creation_date: dateISOString,
    liquido_operaciones: importe,
    operaciones: []
  };
}`
    },
    'date-range': {
        description: 'Date Range Pattern',
        matcherFunction: `(data) => {
  const [caja, fecha, concepto, importe] = data;

  // Match transactions within date range
  // fecha format is typically DDMMYYYY
  const START_DATE = '01012024'; // DDMMYYYY
  const END_DATE = '31122024';

  return fecha >= START_DATE && fecha <= END_DATE;
}`,
        generatorFunction: `(data) => {
  const [caja, fecha, concepto, importe] = data;
  const dateISOString = new Date().toISOString();

  return {
    id_task: caja + '_' + fecha + '_' + String(importe),
    num_operaciones: 1,
    creation_date: dateISOString,
    liquido_operaciones: importe,
    operaciones: []
  };
}`
    }
};

// Add new pattern from template
function addNewPatternFromTemplate(templateType) {
    const template = patternTemplates[templateType];
    if (!template) {
        console.error('Unknown template type:', templateType);
        return;
    }

    const newPattern = {
        description: template.description,
        isFavorite: false,
        lastUsed: null,
        matchCount: 0,
        createdAt: new Date().toISOString(),
        matcherFunction: template.matcherFunction,
        generatorFunction: template.generatorFunction
    };

    // Add the new pattern to the array
    patterns.push(newPattern);

    // Render the pattern list
    renderPatternList();

    // Select the new pattern
    selectPattern(patterns.length - 1);

    // Show success toast
    showToast(`Pattern created from ${templateType} template`, 'success');

    // Set focus to the description field
    setTimeout(() => {
        document.getElementById('patternDescription').focus();
        document.getElementById('patternDescription').select();
    }, 100);
}

function addNewPattern() {
    // Create a new pattern with default values
    const newPattern = {
        description: 'New Pattern',
        isFavorite: false, // NEW: Favorite flag
        lastUsed: null, // NEW: Last used timestamp
        matchCount: 0, // NEW: Number of times matched
        createdAt: new Date().toISOString(), // NEW: Creation timestamp
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

    // Create a copy with a modified description and reset metadata
    const newPattern = {
        description: `Copy of ${currentPattern.description}`,
        isFavorite: false, // Reset favorite status for copy
        lastUsed: null,
        matchCount: 0,
        createdAt: new Date().toISOString(),
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

    // Auto-focus description field for quick editing
    setTimeout(() => {
        const descField = document.getElementById('patternDescription');
        descField.focus();
        descField.select(); // Select all text for easy replacement
    }, 100);
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
