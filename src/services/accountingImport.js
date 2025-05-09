// accountingImport.js
const fs = require('fs').promises;

/**
 * Parse an accounting file in the specific format
 * @param {string} filePath - Path to the accounting file
 * @returns {Array} Array of parsed accounting records
 */
async function processAccountingFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim() !== '');
        
        const records = [];
        
        for (const line of lines) {
            try {
                if (line.length < 50) continue; // Skip short lines
                
                // Fixed positions for the first few fields
                const idSociedad = line.substring(0, 2).trim();
                const accountCode = line.substring(5, 8).trim();
                const transactionType = line.substring(17, 19).trim();
                const transactionDate = line.substring(22, 30).trim();
                const valueDate = line.substring(32, 41).trim();
                
                // Find reference field (starts with a sequence of zeros)
                let descriptionStart = 42;
                let refStartPos = 72;
                
                               
                const description = line.substring(descriptionStart, refStartPos).trim();
                
                // Reference field has two parts:
                // - Check number (first 10 characters)
                // - Account task ID (next 9 characters)
                const reference = line.substring(refStartPos, refStartPos + 19).trim();
                const checkNumber = line.substring(refStartPos, refStartPos + 10).trim();
                const accountTaskId = line.substring(refStartPos + 10, refStartPos + 19).trim();
                
                // Amount field follows the reference (20 characters)
                const amountStartPos = 92;
                const amountEndPos = 112;
                const amountStr = line.substring(amountStartPos, amountEndPos).trim();
                
                
                // Entity ID follows the amount (9 characters)
                const entityIdStartPos = 112;
                const entityIdEndPos = entityIdStartPos + 9;
                const entityId = line.substring(entityIdStartPos, entityIdEndPos).trim();
                
                // Entity name is the rest until the last character
                const entityNameStartPos = entityIdEndPos;
                const entityNameEndPos = 142;
                const entityName = line.substring(entityNameStartPos, entityNameEndPos).trim();
                
                // Debit/credit indicator is the last character
                const debitCredit = line.substring(142,143);
                const amount = parseAmount(amountStr, debitCredit);
                // Generate a unique ID for the record
                const id = generateAccountingRecordId(accountCode, transactionDate, accountTaskId, amount);
                
                records.push({
                  id,
                  accountCode,
                  transactionType,
                  transactionDate: formatDate(transactionDate),
                  valueDate: formatDate(valueDate),
                  description,
                  reference,                // Keep original full reference for compatibility
                  checkNumber,              // Add the separated check number
                  accountTaskId,            // Add the separated account task ID
                  amount,
                  entityId,
                  entityName,
                  debitCredit,
                  insertionDate: new Date().toISOString(),
                  relatedBankMovementId: null
              });
            } catch (error) {
                console.error('Error parsing line:', line, error);
            }
        }
        
        return records;
    } catch (error) {
        console.error('Error processing accounting file:', error);
        throw error;
    }
}

/**
 * Parse amount string from the file format to a number with appropriate sign
 * @param {string} amountStr - The amount string from the file
 * @param {string} debitCredit - The debit/credit indicator ('-' or '+')
 * @returns {number} The signed amount value
 */
function parseAmount(amountStr, debitCredit) {
    // Remove leading zeros and convert comma to dot for decimal
    const cleanedAmount = amountStr.replace(/^0+/, '').replace(',', '.');
    // Parse as float
    const value = parseFloat(cleanedAmount || 0);
    // Apply sign based on debit/credit indicator
    
    //console.log("Converting amount: ", value, debitCredit, 'return: ', debitCredit === '-' ? -value : value)
    return debitCredit === '-' ? -value : value;
}

/**
 * Format date from YYYYMMDD to YYYY-MM-DD
 */
function formatDate(dateStr) {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    
    return `${year}-${month}-${day}`;
}

/**
 * Generate a unique ID for an accounting record
 */
function generateAccountingRecordId(accountCode, date, reference, amount) {
    const data = `${accountCode}_${date}_${reference}_${amount}`;
    // Simple hash function for demo purposes
    // In production, use a proper hash function or crypto module
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return `acc_${Math.abs(hash).toString(16)}`;
}

module.exports = {
    processAccountingFile
};