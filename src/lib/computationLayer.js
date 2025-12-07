/**
 * Computation Layer - Layer 3
 * Builds dependency graph from entity store data
 * Computes matrix multiplications based on formula
 * Completely separate from view layer
 */
import { writable, derived, get } from 'svelte/store';
import { baseMatrices, getCell } from './entityStore';
import { parsedFormula, getOutputDimensions } from './viewLayer';

/**
 * Dependency structure:
 * {
 *   value: number,
 *   dependencies: Set<string>  // set of "matrixName:row:col" that contribute to this value
 * }
 */

// Store for computed output matrix with dependencies
export const outputMatrix = writable(null);

/**
 * Multiply two matrices with dependency tracking
 */
function multiplyWithDependencies(leftMatrix, rightMatrix) {
  const leftRows = leftMatrix.length;
  const leftCols = leftMatrix[0].length;
  const rightCols = rightMatrix[0].length;
  
  const result = [];
  
  for (let i = 0; i < leftRows; i++) {
    const row = [];
    for (let j = 0; j < rightCols; j++) {
      let sum = 0;
      const deps = new Set();
      
      for (let k = 0; k < leftCols; k++) {
        const leftCell = leftMatrix[i][k];
        const rightCell = rightMatrix[k][j];
        
        if (leftCell.value !== 0 && rightCell.value !== 0) {
          sum += leftCell.value * rightCell.value;
          
          // Add dependencies from both cells
          if (leftCell.dependencies) {
            leftCell.dependencies.forEach(dep => deps.add(dep));
          }
          if (rightCell.dependencies) {
            rightCell.dependencies.forEach(dep => deps.add(dep));
          }
        }
      }
      
      row.push({
        value: sum,
        dependencies: deps
      });
    }
    result.push(row);
  }
  
  return result;
}

/**
 * Transpose a matrix
 */
function transposeMatrix(matrix) {
  if (!matrix || matrix.length === 0) return [];
  
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result = [];
  
  for (let j = 0; j < cols; j++) {
    const row = [];
    for (let i = 0; i < rows; i++) {
      row.push(matrix[i][j]);
    }
    result.push(row);
  }
  
  return result;
}

/**
 * Convert base matrix data to computation format
 */
function baseMatrixToComputation(matrixName) {
  const matrices = get(baseMatrices);
  const matrix = matrices.get(matrixName);
  
  if (!matrix) return null;
  
  const result = [];
  for (let i = 0; i < matrix.rows; i++) {
    const row = [];
    for (let j = 0; j < matrix.cols; j++) {
      const cell = getCell(matrixName, i, j);
      row.push({
        value: cell.value,
        dependencies: new Set([`${matrixName}:${i}:${j}`]),
        color: cell.color
      });
    }
    result.push(row);
  }
  
  return result;
}

/**
 * Evaluate formula AST and compute result
 */
function evaluateAST(ast) {
  if (!ast) return null;
  
  if (ast.type === 'variable') {
    return baseMatrixToComputation(ast.name);
  }
  
  if (ast.type === 'transpose') {
    const matrix = baseMatrixToComputation(ast.operand.name);
    return matrix ? transposeMatrix(matrix) : null;
  }
  
  if (ast.type === 'multiply') {
    const left = evaluateAST(ast.left);
    const right = evaluateAST(ast.right);
    
    if (!left || !right) return null;
    
    // Check dimension compatibility
    if (left[0].length !== right.length) {
      console.error(`Dimension mismatch: ${left.length}x${left[0].length} * ${right.length}x${right[0].length}`);
      return null;
    }
    
    return multiplyWithDependencies(left, right);
  }
  
  return null;
}

/**
 * Compute output matrix from current formula and base matrices
 */
export function computeOutput() {
  console.log('[COMPUTE] Starting computation...');
  
  const parsed = get(parsedFormula);
  if (!parsed || !parsed.ast) {
    console.log('[COMPUTE] No valid formula');
    outputMatrix.set(null);
    return;
  }
  
  const result = evaluateAST(parsed.ast);
  
  if (result) {
    console.log('[COMPUTE] Computation successful:', result.length, 'x', result[0].length);
    outputMatrix.set(result);
  } else {
    console.log('[COMPUTE] Computation failed');
    outputMatrix.set(null);
  }
}

/**
 * Auto-compute output when formula or base matrices change
 */
export const autoCompute = writable(false);

// Subscribe to changes and auto-compute if enabled
let unsubscribe = null;

export function enableAutoCompute() {
  autoCompute.set(true);
  
  if (unsubscribe) return; // Already subscribed
  
  unsubscribe = derived([parsedFormula, baseMatrices], ([$parsedFormula, $baseMatrices]) => {
    return { parsedFormula: $parsedFormula, baseMatrices: $baseMatrices };
  }).subscribe(() => {
    if (get(autoCompute)) {
      computeOutput();
    }
  });
}

export function disableAutoCompute() {
  autoCompute.set(false);
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

/**
 * Get dependencies for a specific output cell
 */
export function getOutputCellDependencies(row, col) {
  const output = get(outputMatrix);
  if (!output || !output[row] || !output[row][col]) {
    return [];
  }
  
  return Array.from(output[row][col].dependencies);
}

/**
 * Highlight dependencies for an output cell
 */
export const highlightedDependencies = writable(new Set());

export function highlightOutputCell(row, col) {
  const deps = getOutputCellDependencies(row, col);
  highlightedDependencies.set(new Set(deps));
}

export function clearHighlight() {
  highlightedDependencies.set(new Set());
}
