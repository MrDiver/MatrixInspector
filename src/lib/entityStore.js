/**
 * Entity Store - Layer 1
 * Stores only base matrices (user-paintable matrices)
 * Each matrix has its own dimensions and painted cells
 * No computation logic - pure data storage
 */
import { writable, get } from 'svelte/store';

/**
 * Matrix entity structure:
 * {
 *   name: string,
 *   rows: number,
 *   cols: number,
 *   cells: Map<string, {value: number, color: string}>  // key: "row,col"
 * }
 */

// Store all base matrices
export const baseMatrices = writable(new Map());

/**
 * Create a new base matrix
 */
export function createMatrix(name, rows = 5, cols = 5) {
  baseMatrices.update(matrices => {
    matrices.set(name, {
      name,
      rows,
      cols,
      cells: new Map()
    });
    return matrices;
  });
}

/**
 * Delete a base matrix
 */
export function deleteMatrix(name) {
  baseMatrices.update(matrices => {
    matrices.delete(name);
    return matrices;
  });
}

/**
 * Update matrix dimensions
 */
export function setMatrixDimensions(name, rows, cols) {
  baseMatrices.update(matrices => {
    const matrix = matrices.get(name);
    if (!matrix) return matrices;
    
    matrix.rows = rows;
    matrix.cols = cols;
    
    // Remove cells that are now out of bounds
    const cellsToDelete = [];
    for (const [key, _] of matrix.cells) {
      const [r, c] = key.split(',').map(Number);
      if (r >= rows || c >= cols) {
        cellsToDelete.push(key);
      }
    }
    cellsToDelete.forEach(key => matrix.cells.delete(key));
    
    return matrices;
  });
}

/**
 * Set a cell value in a base matrix
 */
export function setCell(matrixName, row, col, value, color) {
  baseMatrices.update(matrices => {
    const matrix = matrices.get(matrixName);
    if (!matrix) return matrices;
    
    const key = `${row},${col}`;
    if (value === 0) {
      matrix.cells.delete(key);
    } else {
      matrix.cells.set(key, { value, color });
    }
    
    return matrices;
  });
}

/**
 * Get a cell value from a base matrix
 */
export function getCell(matrixName, row, col) {
  const matrices = get(baseMatrices);
  const matrix = matrices.get(matrixName);
  if (!matrix) return null;
  
  const key = `${row},${col}`;
  return matrix.cells.get(key) || { value: 0, color: null };
}

/**
 * Clear all cells in a matrix
 */
export function clearMatrix(matrixName) {
  baseMatrices.update(matrices => {
    const matrix = matrices.get(matrixName);
    if (!matrix) return matrices;
    
    matrix.cells.clear();
    return matrices;
  });
}

/**
 * Get matrix as 2D array for rendering
 */
export function getMatrixArray(matrixName) {
  const matrices = get(baseMatrices);
  const matrix = matrices.get(matrixName);
  if (!matrix) return null;
  
  const result = [];
  for (let i = 0; i < matrix.rows; i++) {
    const row = [];
    for (let j = 0; j < matrix.cols; j++) {
      const key = `${i},${j}`;
      const cell = matrix.cells.get(key);
      row.push(cell ? { ...cell, row: i, col: j } : { value: 0, color: null, row: i, col: j });
    }
    result.push(row);
  }
  return result;
}

/**
 * Initialize matrices from formula variables
 */
export function initializeFromFormula(variableNames) {
  baseMatrices.update(matrices => {
    const newMatrices = new Map();
    
    // Keep existing matrices that are still in the formula
    for (const name of variableNames) {
      if (matrices.has(name)) {
        newMatrices.set(name, matrices.get(name));
      } else {
        // Create new matrix with default dimensions
        newMatrices.set(name, {
          name,
          rows: 5,
          cols: 5,
          cells: new Map()
        });
      }
    }
    
    return newMatrices;
  });
}

/**
 * Export matrices to JSON (for save functionality)
 */
export function exportMatrices() {
  const matrices = get(baseMatrices);
  const data = {};
  
  for (const [name, matrix] of matrices) {
    data[name] = {
      rows: matrix.rows,
      cols: matrix.cols,
      cells: Array.from(matrix.cells.entries()).map(([key, cell]) => {
        const [row, col] = key.split(',').map(Number);
        return { row, col, value: cell.value, color: cell.color };
      })
    };
  }
  
  return data;
}

/**
 * Import matrices from JSON (for load functionality)
 */
export function importMatrices(data) {
  baseMatrices.update(matrices => {
    const newMatrices = new Map();
    
    for (const [name, matrixData] of Object.entries(data)) {
      const cells = new Map();
      matrixData.cells.forEach(cell => {
        const key = `${cell.row},${cell.col}`;
        cells.set(key, { value: cell.value, color: cell.color });
      });
      
      newMatrices.set(name, {
        name,
        rows: matrixData.rows,
        cols: matrixData.cols,
        cells
      });
    }
    
    return newMatrices;
  });
}
