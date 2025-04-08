/**
 * Balance Consistency Validator
 * Checks if the balances in a list of bank transactions are consistent
 * based on the order of transactions (either ascending or descending date)
 */

class BalanceConsistencyValidator {
  /**
   * Validates balance consistency in a list of transactions
   * 
   * @param {Array} transactions - Array of transaction objects, each with at least:
   *                               - fecha: Date as string 
   *                               - importe: Transaction amount (number)
   *                               - saldo: Balance after transaction (number)
   * @returns {Object} Result object with:
   *                   - isValid: Boolean indicating if balances are consistent
   *                   - issues: Array of inconsistency descriptions
   *                   - isAscending: Boolean indicating detected date order
   */
  static validate(transactions) {
    // Cannot validate with less than 2 transactions
    if (!transactions || transactions.length < 2) {
      return { 
        isValid: true, 
        issues: [],
        isAscending: null,
        message: "Not enough transactions to validate balance consistency"
      };
    }

    // Clone and sort transactions by date to detect the direction
    const sortedByDate = [...transactions].sort((a, b) => {
      const dateA = this._parseDate(a.fecha);
      const dateB = this._parseDate(b.fecha);
      return dateA - dateB;
    });

    // Determine if the original order is ascending or descending
    const firstOriginal = this._parseDate(transactions[0].fecha);
    const firstSorted = this._parseDate(sortedByDate[0].fecha);
    const isAscending = firstOriginal.getTime() === firstSorted.getTime();

    // Create properly ordered list for validation
    // In a proper validation, we need to iterate in chronological order
    const validationList = isAscending ? [...transactions] : [...transactions].reverse();
    
    const issues = [];
    
    // Validate balance consistency
    // Starting from the oldest transaction
    for (let i = 0; i < validationList.length - 1; i++) {
      const current = validationList[i];
      const next = validationList[i + 1];
      
      // Calculate the expected balance
      const expectedNextBalance = this._roundTo2Decimals(current.saldo + next.importe);
      const actualNextBalance = this._roundTo2Decimals(next.saldo);
      
      // Check if the balances are consistent (with tolerance for floating-point errors)
      if (Math.abs(expectedNextBalance - actualNextBalance) > 0.01) {
        issues.push({
          index: isAscending ? i + 1 : transactions.length - (i + 2),
          date: next.fecha,
          expectedBalance: expectedNextBalance,
          actualBalance: actualNextBalance,
          difference: this._roundTo2Decimals(actualNextBalance - expectedNextBalance)
        });
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      isAscending,
      message: issues.length === 0 
        ? "All balances are consistent" 
        : `Found ${issues.length} inconsistencies in the transaction balances`
    };
  }

  /**
   * Helper method to parse dates from different formats
   * @private
   */
  static _parseDate(dateStr) {
    // Handle different date formats
    if (!dateStr) return new Date(0);
    
    // If it's already a Date object
    if (dateStr instanceof Date) return dateStr;
    
    try {
      // Try different date formats
      // DD/MM/YYYY format
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        return new Date(year, month - 1, day);
      }
      
      // YYYY-MM-DD format
      if (dateStr.includes('-')) {
        return new Date(dateStr);
      }
      
      // DDMMYYYY format (without separators)
      if (dateStr.length === 8 && !isNaN(dateStr)) {
        const day = dateStr.substring(0, 2);
        const month = dateStr.substring(2, 4);
        const year = dateStr.substring(4, 8);
        return new Date(year, month - 1, day);
      }
      
      // Default: try standard parsing
      return new Date(dateStr);
    } catch (e) {
      console.error(`Error parsing date: ${dateStr}`, e);
      return new Date(0);
    }
  }

  /**
   * Helper to round numbers to 2 decimal places
   * @private
   */
  static _roundTo2Decimals(num) {
    return Math.round(num * 100) / 100;
  }
}

module.exports = BalanceConsistencyValidator;
