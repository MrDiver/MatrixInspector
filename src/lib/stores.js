// Transpose state for each matrix
export const transposeState = writable({
  S_left: false,
  S_right: false,
  K: false
});

/**
 * Svelte stores for matrix inspector state
 */
import { writable, derived } from 'svelte/store';
import { DependencyGraph, computeKS, computeO } from './dependencyGraph';

// Configuration stores
export const rows = writable(5);
export const cols = writable(5);
export const symmetric = writable(false);
export const mirrorS = writable(true);
export const currentColor = writable('#46f0f0');

// Preset colors - Distinct but softer palette
export const PRESET_COLORS = [
  '#E07A5F', // Terracotta
  '#81B29A', // Sage Green
  '#F2CC8F', // Soft Gold
  '#3D5A80', // Slate Blue
  '#9D84B7', // Soft Purple
  '#E8A0BF', // Dusty Rose
  '#6DB1BF', // Ocean Blue
  '#A8C5DA', // Powder Blue
  '#F4D58D', // Mellow Yellow
  '#5A9D8C', // Sea Green
  '#D4789C', // Mauve
  '#8B6F9E'  // Amethyst
];

// Main dependency graph
export const graph = writable(new DependencyGraph());

// Highlighted elements store (Set of element IDs)
export const highlightedElements = writable(new Set());

// Python result matrix store
export const pythonMatrix = writable(null);

/**
 * Initialize matrices with given dimensions
 */
export function initializeMatrices(r, c, mirror, sym) {
  graph.update(g => {
    g.clear();
    
    // Initialize all matrices
    g.initMatrix('S_left', r, c);
    g.initMatrix('S_right', r, c);
    g.initMatrix('K', c, r);
    g.initMatrix('KS', c, c);
    g.initMatrix('O', r, r);
    
    return g;
  });
  
  // Update dimension stores
  rows.set(r);
  cols.set(c);
  mirrorS.set(mirror);
  symmetric.set(sym);
  
  // Recompute derived matrices
  recomputeAll();
}

/**
 * Toggle a matrix element (paint/unpaint)
 */
export function toggleElement(matrixName, row, col, color) {
  // Check if mirroring is enabled
  let currentMirror;
  mirrorS.subscribe(m => currentMirror = m)();
  
  // If mirroring is enabled and trying to paint S_right, ignore
  if (currentMirror && matrixName === 'S_right') {
    return;
  }
  
  graph.update(g => {
    const element = g.getElementAt(matrixName, row, col);
    if (!element) return g;
    
    // Toggle value
    const newValue = element.value ? 0 : 1;
    const newColor = newValue ? color : null;
    
    g.updateElement(matrixName, row, col, newValue, newColor);
    
    // If mirroring is enabled and this is S_left, always sync to S_right
    if (currentMirror && matrixName === 'S_left') {
      g.updateElement('S_right', row, col, newValue, newColor);
    }
    
    // If symmetric mode is enabled
    let currentSym;
    symmetric.subscribe(s => currentSym = s)();
    
    if (currentSym) {
      // Check if matrix is square and can be symmetric
      const matrixIds = g.matrices[matrixName];
      if (matrixIds) {
        const numRows = matrixIds.length;
        const numCols = matrixIds[0].length;
        
        // Only apply symmetric for square matrices and if col,row is within bounds
        if (numRows === numCols && row !== col && col < numRows && row < numCols) {
          g.updateElement(matrixName, col, row, newValue, newColor);
          
          // Also sync symmetric cell to S_right if mirroring
          if (currentMirror && matrixName === 'S_left') {
            g.updateElement('S_right', col, row, newValue, newColor);
          }
        }
      }
    }
    
    return g;
  });
  
  // Recompute derived matrices
  recomputeAll();
}

/**
 * Sync S_left to S_right when mirror is toggled on
 */
export function syncSLeftToSRight() {
  graph.update(g => {
    const sLeftIds = g.matrices['S_left'];
    const sRightIds = g.matrices['S_right'];
    
    if (!sLeftIds || !sRightIds) return g;
    
    const numRows = sLeftIds.length;
    const numCols = sLeftIds[0].length;
    
    for (let i = 0; i < numRows; i++) {
      for (let j = 0; j < numCols; j++) {
        const leftElement = g.getElementAt('S_left', i, j);
        if (leftElement) {
          g.updateElement('S_right', i, j, leftElement.value, leftElement.color);
        }
      }
    }
    
    return g;
  });
  
  recomputeAll();
}

/**
 * Generate random sparse matrix pattern
 */
export function generateRandomMatrix(matrixName, sparsity, symmetricPattern = false, color = null) {
  let r, c;
  rows.subscribe(val => r = val)();
  cols.subscribe(val => c = val)();
  
  const actualColor = color || PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
  
  // Check if mirroring is enabled
  let currentMirror;
  mirrorS.subscribe(m => currentMirror = m)();
  
  graph.update(g => {
    // Get matrix dimensions
    const matrixIds = g.matrices[matrixName];
    if (!matrixIds) return g;
    
    const numRows = matrixIds.length;
    const numCols = matrixIds[0].length;
    
    // Clear existing values in target matrix
    for (let i = 0; i < numRows; i++) {
      for (let j = 0; j < numCols; j++) {
        g.updateElement(matrixName, i, j, 0, null);
      }
    }
    
    // If mirroring and generating S_left, also clear S_right
    if (currentMirror && matrixName === 'S_left') {
      const sRightIds = g.matrices['S_right'];
      if (sRightIds) {
        for (let i = 0; i < numRows; i++) {
          for (let j = 0; j < numCols; j++) {
            g.updateElement('S_right', i, j, 0, null);
          }
        }
      }
    }
    
    // Generate random pattern
    for (let i = 0; i < numRows; i++) {
      for (let j = 0; j < numCols; j++) {
        // Skip if symmetric and already set
        if (symmetricPattern && j < i) continue;
        
        if (Math.random() < sparsity) {
          g.updateElement(matrixName, i, j, 1, actualColor);
          
          // If mirroring is enabled and this is S_left, update S_right
          if (currentMirror && matrixName === 'S_left') {
            g.updateElement('S_right', i, j, 1, actualColor);
          }
          
          // If symmetric, mirror across diagonal
          if (symmetricPattern && i !== j) {
            g.updateElement(matrixName, j, i, 1, actualColor);
            
            // Also mirror to S_right if applicable
            if (currentMirror && matrixName === 'S_left') {
              g.updateElement('S_right', j, i, 1, actualColor);
            }
          }
        }
      }
    }
    
    return g;
  });
  
  // Recompute derived matrices
  recomputeAll();
}

/**
 * Fill the main diagonal of a matrix
 */
export function fillDiagonal(matrixName, color = null) {
  const actualColor = color || PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
  let currentMirror;
  mirrorS.subscribe(m => currentMirror = m)();

  // Respect mirror lock on S_right
  if (currentMirror && matrixName === 'S_right') {
    return;
  }

  graph.update(g => {
    const matrixIds = g.matrices[matrixName];
    if (!matrixIds) return g;

    const numRows = matrixIds.length;
    const numCols = matrixIds[0].length;
    const diag = Math.min(numRows, numCols);

    for (let i = 0; i < diag; i++) {
      g.updateElement(matrixName, i, i, 1, actualColor);

      if (currentMirror && matrixName === 'S_left') {
        g.updateElement('S_right', i, i, 1, actualColor);
      }
    }

    return g;
  });

  recomputeAll();
}

/**
 * Recompute all derived matrices (KS and O)
 */
export function recomputeAll() {
  let r, c;
  rows.subscribe(val => r = val)();
  cols.subscribe(val => c = val)();
  
  graph.update(g => {
    computeKS(g, r, c);
    computeO(g, r, c);
    return g;
  });
}

/**
 * Highlight an element and its dependencies
 */
export function highlightElement(elementId) {
  graph.subscribe(g => {
    const deps = g.getAllDependencies(elementId);
    highlightedElements.set(deps);
  })();
}

/**
 * Clear all highlights
 */
export function clearHighlights() {
  highlightedElements.set(new Set());
}

/**
 * Get matrix as 2D array for rendering
 */
export function getMatrixData(matrixName) {
  return derived([graph, transposeState], ([$graph, $transposeState]) => {
    const matrixIds = $graph.matrices[matrixName];
    if (!matrixIds) return [];

    let data = matrixIds.map(row => row.map(id => $graph.getNode(id)));
    if ($transposeState[matrixName]) {
      // Transpose the 2D array
      data = data[0].map((_, colIndex) => data.map(row => row[colIndex]));
    }
    return data;
  });
}

/**
 * Get CSR representation for a matrix
 */
export function getCSRData(matrixName) {
  return derived(graph, $graph => {
    const csr = $graph.getCSRWithIds(matrixName);
    if (!csr) return null;
    
    const { row_offsets, col_indices, elementIds } = csr;
    
    // Get actual element data
    const values = elementIds.map(id => {
      const element = $graph.getNode(id);
      const deps = element.dependencies.map(depId => {
        const depElement = $graph.getNode(depId);
        return depElement?.color || '#000000';
      });
      
      // Include own color if it exists
      if (element.color) {
        return [element.color, ...deps];
      }
      
      return deps.length > 0 ? deps : ['#000000'];
    });
    
    return {
      row_offsets,
      col_indices,
      values,
      elementIds
    };
  });
}

/**
 * Export matrix data to JSON format
 */
export function exportMatrices() {
  let currentGraph;
  let currentRows, currentCols;
  let currentSymmetric, currentMirror;
  
  graph.subscribe(g => currentGraph = g)();
  rows.subscribe(r => currentRows = r)();
  cols.subscribe(c => currentCols = c)();
  symmetric.subscribe(s => currentSymmetric = s)();
  mirrorS.subscribe(m => currentMirror = m)();
  
  const matrixData = {};
  
  // Export each matrix
  ['S_left', 'K', 'S_right', 'O', 'KS'].forEach(matrixName => {
    const matrixIds = currentGraph.matrices[matrixName];
    if (!matrixIds) return;
    
    const rows = matrixIds.length;
    const cols = matrixIds[0].length;
    const data = [];
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const id = matrixIds[i][j];
        const element = currentGraph.getNode(id);
        if (element && element.value) {
          data.push({
            row: i,
            col: j,
            value: element.value,
            color: element.color
          });
        }
      }
    }
    
    matrixData[matrixName] = data;
  });
  
  return {
    version: 1,
    timestamp: new Date().toISOString(),
    dimensions: {
      rows: currentRows,
      cols: currentCols
    },
    configuration: {
      symmetric: currentSymmetric,
      mirror: currentMirror
    },
    matrices: matrixData
  };
}

/**
 * Import matrix data from JSON format
 */
export function importMatrices(jsonData) {
  try {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    
    if (!data.version || !data.dimensions || !data.matrices) {
      throw new Error('Invalid matrix data format');
    }
    
    const { rows: r, cols: c } = data.dimensions;
    const { symmetric: sym, mirror: mir } = data.configuration || {};
    
    // Initialize matrices with new dimensions
    initializeMatrices(r, c, mir || false, sym || false);
    
    // Restore matrix data
    graph.update(g => {
      ['S_left', 'K', 'S_right', 'O', 'KS'].forEach(matrixName => {
        const matrixArray = data.matrices[matrixName] || [];
        
        matrixArray.forEach(({ row, col, value, color }) => {
          g.updateElement(matrixName, row, col, value, color);
        });
      });
      
      return g;
    });
    
    // Recompute derived matrices KS and O
    recomputeAll();
    
    return true;
  } catch (error) {
    console.error('Failed to import matrices:', error);
    return false;
  }
}

/**
 * Save configuration to localStorage
 */
export function saveConfigurationToStorage(name) {
  const data = exportMatrices();
  const storage = JSON.parse(localStorage.getItem('matrixGallery') || '{}');
  
  storage[name] = data;
  localStorage.setItem('matrixGallery', JSON.stringify(storage));
  
  return Object.keys(storage);
}

/**
 * Load configuration from localStorage
 */
export function loadConfigurationFromStorage(name) {
  const storage = JSON.parse(localStorage.getItem('matrixGallery') || '{}');
  
  if (!storage[name]) {
    return false;
  }
  
  return importMatrices(storage[name]);
}

/**
 * Get all saved configurations
 */
export function getSavedConfigurations() {
  const storage = JSON.parse(localStorage.getItem('matrixGallery') || '{}');
  
  return Object.entries(storage).map(([name, data]) => ({
    name,
    timestamp: data.timestamp,
    dimensions: data.dimensions
  }));
}

/**
 * Delete a saved configuration
 */
export function deleteConfiguration(name) {
  const storage = JSON.parse(localStorage.getItem('matrixGallery') || '{}');
  
  delete storage[name];
  localStorage.setItem('matrixGallery', JSON.stringify(storage));
  
  return Object.keys(storage);
}
