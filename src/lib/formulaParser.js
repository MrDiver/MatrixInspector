/**
 * Formula parser for matrix expressions
 * Supports: matrix multiplication (*), transpose (^T), subscripts (_0, _1, etc.)
 */

/**
 * Parse a matrix formula string
 * @param {string} formula - e.g. "S*K*S" or "A*A^T" or "P_0^T * K_0 * P_0"
 * @returns {Object} - { variables: Set, operations: Array, ast: Object }
 */
export function parseFormula(formula) {
  if (!formula || formula.trim() === '') {
    return { variables: new Set(), operations: [], ast: null, error: null };
  }

  try {
    // Remove whitespace
    const cleaned = formula.replace(/\s+/g, '');
    
    // Extract all matrix references (with optional subscript and transpose)
    // Matches: A, A^T, A_0, A_0^T, etc.
    const matrixPattern = /([A-Z][a-z]*)(?:_(\d+))?(\^T)?/g;
    const variables = new Set();
    const operations = [];
    
    let match;
    let lastEnd = 0;
    const tokens = [];
    
    // Tokenize the formula
    while ((match = matrixPattern.exec(cleaned)) !== null) {
      const [fullMatch, name, subscript, transpose] = match;
      const start = match.index;
      
      // Check for operator between tokens
      if (start > lastEnd) {
        const operator = cleaned.substring(lastEnd, start);
        if (operator && operator !== '*') {
          throw new Error(`Unsupported operator: ${operator}`);
        }
        if (operator === '*') {
          operations.push({ type: 'multiply', position: lastEnd });
        }
      }
      
      // Build variable name with subscript
      const baseName = subscript ? `${name}_${subscript}` : name;
      variables.add(baseName);
      
      // Add token
      tokens.push({
        type: 'matrix',
        name: baseName,
        baseName: name,
        subscript: subscript || null,
        transpose: !!transpose,
        position: start
      });
      
      lastEnd = start + fullMatch.length;
    }
    
    // Build AST (abstract syntax tree)
    const ast = buildAST(tokens, operations);
    
    return {
      variables,
      operations,
      tokens,
      ast,
      error: null,
      raw: formula
    };
  } catch (error) {
    return {
      variables: new Set(),
      operations: [],
      tokens: [],
      ast: null,
      error: error.message,
      raw: formula
    };
  }
}

/**
 * Build Abstract Syntax Tree from tokens
 */
function buildAST(tokens, operations) {
  if (tokens.length === 0) return null;
  if (tokens.length === 1) return tokens[0];
  
  // For now, build a simple left-to-right multiplication tree
  let ast = tokens[0];
  
  for (let i = 1; i < tokens.length; i++) {
    ast = {
      type: 'multiply',
      left: ast,
      right: tokens[i]
    };
  }
  
  return ast;
}

/**
 * Get display name for a matrix (e.g., "A", "A^T", "P_0", "P_0^T")
 */
export function getDisplayName(token) {
  if (!token) return '';
  
  let name = token.baseName || token.name;
  if (token.subscript) {
    name += `_${token.subscript}`;
  }
  if (token.transpose) {
    name += '^T';
  }
  return name;
}

/**
 * Get all unique base matrices needed (no transposes)
 */
export function getBaseMatrices(parsed) {
  if (!parsed || !parsed.variables) return [];
  
  return Array.from(parsed.variables).sort();
}

/**
 * Get all matrix references including transposes
 */
export function getAllMatrixReferences(parsed) {
  if (!parsed || !parsed.tokens) return [];
  
  return parsed.tokens.map(token => ({
    name: token.name,
    displayName: getDisplayName(token),
    transpose: token.transpose,
    editable: !token.transpose
  }));
}

/**
 * Validate formula
 */
export function validateFormula(formula) {
  const parsed = parseFormula(formula);
  
  if (parsed.error) {
    return { valid: false, error: parsed.error };
  }
  
  if (parsed.variables.size === 0) {
    return { valid: false, error: 'No matrices found in formula' };
  }
  
  return { valid: true, error: null };
}
