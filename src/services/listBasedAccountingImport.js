// src/services/listBasedAccountingImport.js

const fs = require('fs').promises;
const XLSX = require('xlsx');
const path = require('path');

/**
 * Process special XLS file for account 207 with list-based operations
 * @param {string} filePath - Path to the Excel file
 * @returns {Object} Processed records grouped by lists and independent operations
 */
async function processListBasedAccountingFile(filePath) {
    try {
        // Read the Excel file
        const workbook = XLSX.readFile(filePath, {
            type: 'binary',
            cellDates: true,
            cellNF: false,
            cellText: false
        });
        
        // Get the first worksheet
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Convert to JSON
        const data = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '',
            blankrows: false
        });
        
        // Process the data
        return identifyAndGroupLists(data);
    } catch (error) {
        console.error('Error processing list-based accounting file:', error);
        throw error;
    }
}

/**
 * Identify and group operations by list numbers
 * @param {Array} rows - Excel rows
 * @returns {Object} Grouped operations
 */
function identifyAndGroupLists(rows) {
    const result = {
        lists: {},            // Operations grouped by list number
        independent: [],      // Independent operations (no list)
        unrecognized: []      // Rows that couldn't be properly processed
    };
    
    let currentListNumber = null;
    let isParsingListItems = false;
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Skip empty rows
        if (!row.length || !row.some(cell => cell !== '')) {
            continue;
        }
        
        // Convert row to string to check for "Número de Lista" text
        const rowText = row.join(' ');
        
        // Check if this row contains list number information
        const listMatch = rowText.match(/Número de Lista:\s*(\d+)/i);
        
        if (listMatch) {
            // Found a new list
            currentListNumber = parseInt(listMatch[1], 10);
            isParsingListItems = currentListNumber > 0; // Only parse if list number is valid
            
            if (isParsingListItems && !result.lists[currentListNumber]) {
                result.lists[currentListNumber] = {
                    listNumber: currentListNumber,
                    totalAmount: 0,
                    date: extractDateFromContext(rows, i),
                    operations: []
                };
            }
            continue;
        }
        
        // If we're inside a valid list, try to parse operations
        if (isParsingListItems) {
            const operation = parseOperationRow(row);
            if (operation) {
                result.lists[currentListNumber].operations.push(operation);
                result.lists[currentListNumber].totalAmount += operation.amount;
            }
        } else {
            // Try to parse as independent operation
            const operation = parseIndependentOperationRow(row);
            if (operation) {
                result.independent.push(operation);
            } else if (isLikelyOperationRow(row)) {
                // If it looks like an operation but couldn't be parsed properly
                result.unrecognized.push({
                    rowIndex: i,
                    content: row
                });
            }
        }
    }
    
    return result;
}

/**
 * Attempts to extract date information from surrounding context
 */
function extractDateFromContext(rows, currentIndex) {
    // Look for date patterns in nearby rows (up to 5 rows before or after)
    for (let i = Math.max(0, currentIndex - 5); i < Math.min(rows.length, currentIndex + 5); i++) {
        if (i === currentIndex) continue;
        
        const rowText = rows[i].join(' ');
        const dateMatch = rowText.match(/(\d{2}\/\d{2}\/\d{4})/);
        if (dateMatch) {
            return dateMatch[1];
        }
    }
    return null;
}

/**
 * Parse a row that appears to be an operation within a list
 */
function parseOperationRow(row) {
    // Implementation depends on exact format, but generally looking for:
    // - An operation code/reference
    // - Description
    // - Amount
    // - Date (if available)
    
    // This is a simplified example - adjust based on actual format
    if (row.length >= 3) {
        // Look for numeric values that could be amounts
        const amountCell = row.find(cell => typeof cell === 'number' || 
            (typeof cell === 'string' && /^-?\d+(\.\d+)?$/.test(cell.trim())));
        
        if (amountCell) {
            const amount = typeof amountCell === 'number' ? 
                amountCell : parseFloat(amountCell.replace(',', '.'));
            
            // Get the description (usually the first non-empty text cell)
            const description = row.find(cell => 
                typeof cell === 'string' && 
                cell.trim() !== '' && 
                !/^-?\d+(\.\d+)?$/.test(cell.trim())
            ) || '';
            
            return {
                description: description.trim(),
                amount: amount,
                reference: extractReference(row),
                date: extractDate(row),
                raw: row
            };
        }
    }
    
    return null;
}

/**
 * Parse a row that appears to be an independent operation (not part of a list)
 */
function parseIndependentOperationRow(row) {
    // Similar to parseOperationRow but with criteria specific to independent operations
    // This implementation will depend on the actual format
    
    // For example, independent operations might have a different structure
    // or specific markers that identify them
    return parseOperationRow(row); // For now, use the same logic
}

/**
 * Extract reference information from a row
 */
function extractReference(row) {
    // Look for patterns that resemble references
    // This is highly dependent on the actual format
    
    for (const cell of row) {
        if (typeof cell === 'string') {
            // Look for reference patterns like "REF: 12345" or similar
            const refMatch = cell.match(/REF[:\s]+([A-Z0-9]+)/i);
            if (refMatch) {
                return refMatch[1];
            }
            
            // Also look for other common reference formats
            const numericRef = cell.match(/^\d{4,}$/);
            if (numericRef) {
                return cell;
            }
        }
    }
    
    return null;
}

/**
 * Extract date information from a row
 */
function extractDate(row) {
    for (const cell of row) {
        // If the cell is already a date object
        if (cell instanceof Date) {
            return formatDate(cell);
        }
        
        // If it's a string that looks like a date
        if (typeof cell === 'string') {
            const dateMatch = cell.match(/(\d{1,2}\/\d{1,2}\/\d{4})|(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
                return dateMatch[0];
            }
        }
    }
    
    return null;
}

/**
 * Format a date object to string (YYYY-MM-DD)
 */
function formatDate(date) {
    if (!date) return null;
    
    if (date instanceof Date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    
    return date;
}

/**
 * Check if a row is likely to be an operation based on its content
 */
function isLikelyOperationRow(row) {
    // This is a heuristic function to determine if a row looks like it might be an operation
    
    // Check if there's at least one numeric value (potential amount)
    const hasNumeric = row.some(cell => typeof cell === 'number' || 
        (typeof cell === 'string' && /^-?\d+(\.\d+)?$/.test(cell.trim())));
    
    // Check if there's text that doesn't look like a header
    const hasText = row.some(cell => 
        typeof cell === 'string' && 
        cell.trim().length > 3 && 
        !/^(total|subtotal|importe|fecha|concepto|número)/i.test(cell.trim()));
    
    return hasNumeric && hasText;
}

/**
 * Match accounting records to list groups
 * @param {Array} accountingRecords - Records from the text file
 * @param {Object} listGroups - Grouped operations from XLS file
 * @returns {Object} Matched records
 */
function matchAccountingRecordsToLists(accountingRecords, listGroups) {
    const result = {
        matched: {}, // Records matched to lists by list number
        unmatched: [] // Records that couldn't be matched to any list
    };
    
    // Initialize the matched structure
    Object.keys(listGroups.lists).forEach(listNumber => {
        result.matched[listNumber] = {
            listInfo: listGroups.lists[listNumber],
            accountingRecords: []
        };
    });
    
    // Try to match each accounting record to a list
    for (const record of accountingRecords) {
        let matched = false;
        
        // First, try to match by reference number if available
        if (record.reference) {
            for (const listNumber in listGroups.lists) {
                const list = listGroups.lists[listNumber];
                
                // Check if any operation in this list has a matching reference
                const matchingOp = list.operations.find(op => 
                    op.reference && op.reference === record.reference);
                
                if (matchingOp) {
                    result.matched[listNumber].accountingRecords.push(record);
                    matched = true;
                    break;
                }
            }
        }
        
        // If not matched by reference, try matching by amount and description
        if (!matched) {
            for (const listNumber in listGroups.lists) {
                const list = listGroups.lists[listNumber];
                
                // Check if any operation in this list has a matching amount and similar description
                const matchingOp = list.operations.find(op => 
                    Math.abs(op.amount - record.amount) < 0.01 && // Match amounts within 0.01
                    descriptionSimilarity(op.description, record.description) > 0.6); // 60% similarity threshold
                
                if (matchingOp) {
                    result.matched[listNumber].accountingRecords.push(record);
                    matched = true;
                    break;
                }
            }
        }
        
        // If still not matched, try matching by date and amount
        if (!matched) {
            for (const listNumber in listGroups.lists) {
                const list = listGroups.lists[listNumber];
                
                // Check if the list date matches and an operation has a matching amount
                if (list.date && list.date === record.transactionDate) {
                    const matchingOp = list.operations.find(op => 
                        Math.abs(op.amount - record.amount) < 0.01);
                    
                    if (matchingOp) {
                        result.matched[listNumber].accountingRecords.push(record);
                        matched = true;
                        break;
                    }
                }
            }
        }
        
        // If no match found, add to unmatched
        if (!matched) {
            result.unmatched.push(record);
        }
    }
    
    return result;
}

/**
 * Calculate similarity between two description strings
 * @returns {number} Similarity score between 0 and 1
 */
function descriptionSimilarity(desc1, desc2) {
    if (!desc1 || !desc2) return 0;
    
    // Normalize strings: lowercase, remove special chars, split into words
    const normalize = (str) => str.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    
    const words1 = normalize(desc1);
    const words2 = normalize(desc2);
    
    // Count words in common
    const common = words1.filter(word => words2.includes(word)).length;
    
    // Return Jaccard similarity
    return common / (words1.length + words2.length - common);
}

module.exports = {
    processListBasedAccountingFile,
    matchAccountingRecordsToLists
};