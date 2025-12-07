/**
 * View Layer - Layer 2
 * Creates view representations for formula visualization
 * Handles transposes and duplicates for display
 * Does NOT handle computation - only visual representation
 */
import { writable, derived, get } from 'svelte/store';
import { baseMatrices, getMatrixArray } from './entityStore';
import { parseFormula } from './formulaParser';

// Current formula
export const formula = writable('S*K*S');
export const parsedFormula = writable(null);

// Update parsed formula when formula changes
formula.subscribe(f => {
  const parsed = parseFormula(f);
  parsedFormula.set(parsed.error ? null : parsed);
});

/**
 * View matrix structure:
 * {
 *   id: string,           // unique ID for this view instance
 *   baseName: string,     // name of base matrix this refers to
 *   displayName: string,  // name to display (e.g., "S^T")
 *   isTransposed: boolean,
 *   rows: number,         // view dimensions (may be swapped if transposed)
 *   cols: number,
 *   getData: () => array  // function to get current data
 * }
 */

/**
 * Create a view matrix from a base matrix
 */
function createViewMatrix(baseName, isTransposed, instanceIndex) {
  const matrices = get(baseMatrices);
  const baseMatrix = matrices.get(baseName);
  
  if (!baseMatrix) {
    return null;
  }
  
  const id = `${baseName}_${isTransposed ? 'T' : ''}${instanceIndex > 0 ? instanceIndex : ''}`;
  const displayName = baseName + (isTransposed ? '^T' : '');
  
  return {
    id,
    baseName,
    displayName,
    isTransposed,
    rows: isTransposed ? baseMatrix.cols : baseMatrix.rows,
    cols: isTransposed ? baseMatrix.rows : baseMatrix.cols,
    getData: () => {
      const data = getMatrixArray(baseName);
      if (!data) return null;
      
      if (isTransposed) {
        // Transpose the data
        const transposed = [];
        for (let j = 0; j < data[0].length; j++) {
          const row = [];
          for (let i = 0; i < data.length; i++) {
            const cell = data[i][j];
            row.push({ ...cell, row: j, col: i });
          }
          transposed.push(row);
        }
        return transposed;
      }
      
      return data;
    }
  };
}

/**
 * Parse AST and create view matrices for the formula
 */
function createViewMatricesFromAST(ast, usedNames = new Map()) {
  if (!ast) return [];
  
  if (ast.type === 'variable') {
    const name = ast.name;
    const count = usedNames.get(name) || 0;
    usedNames.set(name, count + 1);
    
    return [createViewMatrix(name, false, count)];
  }
  
  if (ast.type === 'transpose') {
    const name = ast.operand.name;
    const count = usedNames.get(name) || 0;
    usedNames.set(name, count + 1);
    
    return [createViewMatrix(name, true, count)];
  }
  
  if (ast.type === 'multiply') {
    const leftViews = createViewMatricesFromAST(ast.left, usedNames);
    const rightViews = createViewMatricesFromAST(ast.right, usedNames);
    return [...leftViews, ...rightViews];
  }
  
  return [];
}

/**
 * Derived store: view matrices arranged according to formula
 */
export const formulaViewMatrices = derived(
  [parsedFormula, baseMatrices],
  ([$parsedFormula, $baseMatrices]) => {
    if (!$parsedFormula || !$parsedFormula.ast) {
      return [];
    }
    
    const views = createViewMatricesFromAST($parsedFormula.ast);
    return views.filter(v => v !== null);
  }
);

/**
 * Get expected output dimensions based on formula
 */
export function getOutputDimensions() {
  const parsed = get(parsedFormula);
  if (!parsed || !parsed.ast) {
    return { rows: 5, cols: 5 };
  }
  
  const views = get(formulaViewMatrices);
  if (views.length === 0) {
    return { rows: 5, cols: 5 };
  }
  
  // For matrix multiplication A*B, result is A.rows x B.cols
  // For chain A*B*C, result is A.rows x C.cols
  const firstMatrix = views[0];
  const lastMatrix = views[views.length - 1];
  
  return {
    rows: firstMatrix.rows,
    cols: lastMatrix.cols
  };
}

/**
 * Validate formula dimensions
 */
export function validateFormulaDimensions() {
  const views = get(formulaViewMatrices);
  
  for (let i = 0; i < views.length - 1; i++) {
    const current = views[i];
    const next = views[i + 1];
    
    if (current.cols !== next.rows) {
      return {
        valid: false,
        error: `Dimension mismatch: ${current.displayName} (${current.rows}x${current.cols}) cannot multiply ${next.displayName} (${next.rows}x${next.cols})`
      };
    }
  }
  
  return { valid: true };
}
