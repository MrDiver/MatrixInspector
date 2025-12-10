/**
 * Formula parser for matrix expressions
 * Supports: matrix multiplication (*), transpose (^T), subscripts (_0, _1, etc.)
 * Extended: comma-separated formulas, assignments (K_1 = ...), braces in subscripts
 * and symbolic subscripts (n, n+1) for iterative definitions.
 */

/**
 * Parse a matrix formula string
 * @param {string} formula - e.g. "S*K*S" or "A*A^T" or "P_0^T * K_0 * P_0"
 * @returns {Object} - { variables: Set, operations: Array, ast: Object }
 */
export function parseFormula(formula) {
  if (!formula || formula.trim() === '') {
    return { mode: 'simple', variables: new Set(), operations: [], ast: null, error: null };
  }

  // Detect iterative mode if there is an assignment or multiple comma-separated parts
  const isIterative = formula.includes('=') || formula.includes(',');
  if (isIterative) {
    return parseIterativeFormula(formula);
  }

  // Fallback: simple single expression
  return parseSingleExpression(formula);
}

function parseSingleExpression(formula) {
  try {
    const cleaned = formula.replace(/\s+/g, '');
    const { tokens, operations, variables } = tokenizeExpression(cleaned);
    const ast = buildAST(tokens, operations);

    return {
      mode: 'simple',
      variables,
      operations,
      tokens,
      ast,
      error: null,
      raw: formula
    };
  } catch (error) {
    return {
      mode: 'simple',
      variables: new Set(),
      operations: [],
      tokens: [],
      ast: null,
      error: error.message,
      raw: formula
    };
  }
}

function parseIterativeFormula(formula) {
  const parts = formula.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { mode: 'iterative', segments: [], baseCases: [], recurrence: null, constants: [], explicitVariables: new Set(), error: 'No formulas provided', raw: formula };
  }

  const baseCases = [];
  const constants = [];
  let recurrence = null;
  const explicitVariables = new Set();
  let error = null;

  for (const part of parts) {
    // Assignment form: LHS = RHS
    if (part.includes('=')) {
      const [lhsRaw, rhsRaw] = part.split('=').map(s => s.trim());
      if (!lhsRaw || !rhsRaw) {
        error = 'Invalid assignment';
        break;
      }

      const lhsToken = parseSingleMatrixToken(lhsRaw);
      if (!lhsToken) {
        error = `Invalid left-hand side: ${lhsRaw}`;
        break;
      }

      const { tokens, operations, variables } = tokenizeExpression(rhsRaw.replace(/\s+/g, ''));
      const ast = buildAST(tokens, operations);

      // Track explicit numeric matrices
      variables.forEach(v => {
        const match = v.match(/^([A-Z][a-z]*_)(\d+)$/);
        if (match) explicitVariables.add(v);
      });

      const target = normalizeSubscript(lhsToken);
      if (target.subscriptType === 'symbolic') {
        // This is the recurrence definition (e.g., K_{n+1})
        recurrence = {
          target,
          ast,
          tokens,
          raw: part
        };
      } else {
        baseCases.push({ target, ast, tokens, raw: part });
        if (target.subscriptType === 'number') {
          explicitVariables.add(`${target.baseName}_${target.subscript}`);
        }
      }
    } else {
      // Constant matrix reference without assignment (e.g., P_1)
      const singleToken = parseSingleMatrixToken(part);
      if (!singleToken) {
        error = `Invalid matrix token: ${part}`;
        break;
      }
      const normalized = normalizeSubscript(singleToken);
      if (normalized.subscriptType !== 'number') {
        error = 'Standalone matrices must have numeric subscripts';
        break;
      }
      constants.push({ token: normalized, raw: part });
      explicitVariables.add(`${normalized.baseName}_${normalized.subscript}`);
    }
  }

  return {
    mode: 'iterative',
    baseCases,
    recurrence,
    constants,
    explicitVariables,
    error,
    raw: formula
  };
}

function tokenizeExpression(cleaned) {
  // Matches: A, A^T, A_0, A_0^T, A_{n}, A_{n+1}, A_n, A_{12}
  const matrixPattern = /([A-Z][a-z]*)(?:_(\{[^}]+\}|[A-Za-z0-9+]+))?(\^T)?/g;
  const variables = new Set();
  const operations = [];
  const tokens = [];

  let match;
  let lastEnd = 0;

  while ((match = matrixPattern.exec(cleaned)) !== null) {
    const [fullMatch, name, subscriptRaw, transpose] = match;
    const start = match.index;

    if (start > lastEnd) {
      const operator = cleaned.substring(lastEnd, start);
      if (operator && operator !== '*') {
        throw new Error(`Unsupported operator: ${operator}`);
      }
      if (operator === '*') {
        operations.push({ type: 'multiply', position: lastEnd });
      }
    }

    const normalized = normalizeSubscript({ baseName: name, subscript: subscriptRaw || null, transpose: !!transpose });
    const tokenName = normalized.subscriptType === 'number'
      ? `${normalized.baseName}_${normalized.subscript}`
      : normalized.baseName;

    variables.add(tokenName);

    tokens.push({
      type: 'matrix',
      name: tokenName,
      baseName: normalized.baseName,
      subscript: normalized.subscript,
      subscriptType: normalized.subscriptType,
      transpose: normalized.transpose,
      position: start
    });

    lastEnd = start + fullMatch.length;
  }

  return { tokens, operations, variables };
}

function normalizeSubscript(token) {
  const sub = token.subscript;
  if (!sub) {
    return { baseName: token.baseName, subscript: null, subscriptType: 'none', transpose: token.transpose };
  }

  // Remove braces if present
  const cleaned = sub.startsWith('{') && sub.endsWith('}') ? sub.slice(1, -1) : sub;

  if (/^\d+$/.test(cleaned)) {
    return { baseName: token.baseName, subscript: Number(cleaned), subscriptType: 'number', transpose: token.transpose };
  }
  if (cleaned === 'n') {
    return { baseName: token.baseName, subscript: 'n', subscriptType: 'symbolic', transpose: token.transpose };
  }
  if (cleaned === 'n+1') {
    return { baseName: token.baseName, subscript: 'n+1', subscriptType: 'symbolic', transpose: token.transpose };
  }

  // Fallback: treat as plain string symbolic
  return { baseName: token.baseName, subscript: cleaned, subscriptType: 'symbolic', transpose: token.transpose };
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
  if (token.subscript !== null && token.subscript !== undefined && token.subscript !== 'none') {
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
  if (!parsed) return [];

  if (parsed.mode === 'iterative') {
    return Array.from(parsed.explicitVariables || []).sort();
  }

  if (!parsed.variables) return [];
  return Array.from(parsed.variables).sort();
}

/**
 * Get all matrix references including transposes
 */
export function getAllMatrixReferences(parsed) {
  if (!parsed) return [];

  const tokens = [];
  if (parsed.mode === 'iterative') {
    parsed.baseCases?.forEach(def => tokens.push(...(def.tokens || [])));
    if (parsed.recurrence) tokens.push(...(parsed.recurrence.tokens || []));
  } else if (parsed.tokens) {
    tokens.push(...parsed.tokens);
  }

  return tokens.map(token => ({
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
  
  if (parsed.mode === 'iterative') {
    // In iterative mode require at least one base case or recurrence
    const hasContent = (parsed.baseCases && parsed.baseCases.length > 0) || parsed.recurrence;
    if (!hasContent) {
      return { valid: false, error: 'No matrices found in formula' };
    }
    return { valid: true, error: null };
  }

  if (!parsed.variables || parsed.variables.size === 0) {
    return { valid: false, error: 'No matrices found in formula' };
  }
  
  return { valid: true, error: null };
}

function parseSingleMatrixToken(raw) {
  const match = raw.trim().match(/^([A-Z][a-z]*)(?:_(\{[^}]+\}|[A-Za-z0-9+]+))?(\^T)?$/);
  if (!match) return null;
  const [, baseName, subscript, transpose] = match;
  return {
    baseName,
    subscript: subscript || null,
    transpose: !!transpose
  };
}
