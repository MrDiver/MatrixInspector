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
import { DependencyGraph, evaluateFormula } from './dependencyGraph';
import { parseFormula, getBaseMatrices } from './formulaParser';

// Configuration stores
export const rows = writable(5);
export const cols = writable(5);
export const symmetric = writable(false);
export const mirrorS = writable(true);

// Define color palette - Soft pastels that work well in both light and dark modes
export const COLOR_PALETTE = {
  primary: '#667eea',     // Soft Indigo
  secondary: '#764ba2',   // Soft Purple
  accent1: '#f093fb',     // Soft Pink
  accent2: '#4facfe',     // Soft Blue
  accent3: '#43e97b',     // Soft Green
  accent4: '#fa709a',     // Soft Rose
  accent5: '#30b0fe',     // Sky Blue
  accent6: '#a8edea',     // Soft Cyan
  accent7: '#fed6e3',     // Blush
  accent8: '#ffeaa7',     // Soft Yellow
  accent9: '#fd79a8',     // Mauve
  accent10: '#6c5ce7',    // Periwinkle
  accent11: '#00b894',    // Mint
  accent12: '#fdcb6e'     // Honey
};

// Preset colors - Soft pastel palette for matrix cells
export const PRESET_COLORS = [
  COLOR_PALETTE.accent1,  // Soft Pink
  COLOR_PALETTE.accent2,  // Soft Blue
  COLOR_PALETTE.accent3,  // Soft Green
  COLOR_PALETTE.accent4,  // Soft Rose
  COLOR_PALETTE.accent5,  // Sky Blue
  COLOR_PALETTE.accent6,  // Soft Cyan
  COLOR_PALETTE.accent7,  // Blush
  COLOR_PALETTE.accent8,  // Soft Yellow
  COLOR_PALETTE.accent9,  // Mauve
  COLOR_PALETTE.accent10, // Periwinkle
  COLOR_PALETTE.accent11, // Mint
  COLOR_PALETTE.accent12  // Honey
];

export const currentColor = writable(COLOR_PALETTE.accent1);

// Main dependency graph
export const graph = writable(new DependencyGraph());

// Highlighted elements store (Set of element IDs)
export const highlightedElements = writable(new Set());

// Python result matrix store
export const pythonMatrix = writable(null);

// Formula stores - Formula is always present and drives the application
export const currentFormula = writable('S*K*S'); // Default formula
export const parsedFormula = writable(null);

/**
 * Initialize matrices from formula (without recomputing)
 * @param {string[]} matrixNames - Names of base matrices to initialize
 * @param {number} defaultRows - Number of rows
 * @param {number} defaultCols - Number of columns
 * @param {boolean} shouldRecompute - Whether to trigger recomputation (default: true)
 */
export function initializeFormulaMatrices(matrixNames, defaultRows = 5, defaultCols = 5, shouldRecompute = true) {
  graph.update(g => {
    g.clear();
    
    // Initialize each base matrix from the formula
    matrixNames.forEach(name => {
      g.initMatrix(name, defaultRows, defaultCols);
    });
    
    // Initialize result matrix O
    g.initMatrix('O', defaultRows, defaultRows);
    
    return g;
  });
  
  rows.set(defaultRows);
  cols.set(defaultCols);
  
  // Only compute result if explicitly requested
  if (shouldRecompute) {
    recomputeFormula();
  }
}

/**
 * Recompute result matrix based on current formula using actual matrix multiplication
 */
export function recomputeFormula() {
  console.log('[RECOMPUTE] Starting recompute...');
  console.log('[RECOMPUTE] Call stack:', new Error().stack);
  let parsed = null;
  let r = 5;
  let c = 5;
  
  parsedFormula.subscribe(val => parsed = val)();
  rows.subscribe(val => r = val)();
  cols.subscribe(val => c = val)();
  
  console.log('[RECOMPUTE] Parsed formula:', parsed);
  console.log('[RECOMPUTE] Dimensions:', r, 'x', c);
  
  // @ts-ignore - parsed comes from store subscription
  if (!parsed || !parsed.ast) {
    console.log('[RECOMPUTE] No parsed formula or AST, aborting');
    return;
  }
  
  graph.update(g => {
    console.log('[RECOMPUTE] Graph has matrices:', Object.keys(g.matrices));
    
    // Reset intermediate counter for fresh computation
    g.intermediateCounter = 0;
    
    // Evaluate the formula AST (performs actual matrix multiplication)
    // @ts-ignore - parsed is checked for ast above
    const resultMatrixName = evaluateFormula(g, parsed.ast, Array.from(parsed.variables));
    console.log('[RECOMPUTE] Result matrix name:', resultMatrixName);
    
    // Copy result to O matrix
    if (resultMatrixName && resultMatrixName !== 'O') {
      const resultData = g.getMatrixData(resultMatrixName);
      const oData = g.getMatrixData('O');
      
      console.log('[RECOMPUTE] Result data exists:', !!resultData);
      console.log('[RECOMPUTE] O data exists:', !!oData);
      
      if (resultData && oData) {
        let copiedCount = 0;
        for (let i = 0; i < resultData.length; i++) {
          for (let j = 0; j < resultData[i].length; j++) {
            const resultElem = resultData[i][j];
            const oElem = oData[i][j];
            
            if (resultElem && oElem) {
              oElem.value = resultElem.value;
              oElem.dependencies = [...resultElem.dependencies];
              if (resultElem.value !== 0) copiedCount++;
            }
          }
        }
        console.log('[RECOMPUTE] Copied', copiedCount, 'non-zero values to O matrix');
      }
    }
    
    return g;
  });
  
  console.log('[RECOMPUTE] Recompute finished, forcing graph update');
  graph.update(g => g); // Force UI update
}

/**
 * Flag to control whether formula subscription should trigger recomputation
 */
let shouldAutoRecompute = false; // Changed to false - no auto-recompute by default

/**
 * Manually trigger recomputation of the O matrix
 */
export function manualRecomputeFormula() {
  console.log('[MANUAL RECOMPUTE] Manually triggered');
  recomputeFormula();
  console.log('[MANUAL RECOMPUTE] Complete');
}

/**
 * Temporarily disable auto-recomputation (e.g., during data loading)
 */
export function disableAutoRecompute() {
  shouldAutoRecompute = false;
}

/**
 * Re-enable auto-recomputation
 */
export function enableAutoRecompute() {
  shouldAutoRecompute = true;
}

/**
 * Subscribe to formula changes - but DON'T auto-recompute
 * User must click the Compute button to trigger computation
 */
// Commented out - we use manual compute button now
// parsedFormula.subscribe(() => {
//   if (shouldAutoRecompute) {
//     recomputeFormula();
//   }
// });

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
 * Recompute all derived matrices based on current formula
 */
export function recomputeAll() {
  recomputeFormula();
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
 * Export matrix data to JSON format - saves EVERYTHING
 */
export function exportMatrices() {
  console.log('[EXPORT] Starting export...');
  let currentGraph;
  let currentRows, currentCols;
  let currentSymmetric, currentMirror;
  let currentFormulaText;
  let parsedFormulaData;
  
  graph.subscribe(g => currentGraph = g)();
  rows.subscribe(r => currentRows = r)();
  cols.subscribe(c => currentCols = c)();
  symmetric.subscribe(s => currentSymmetric = s)();
  mirrorS.subscribe(m => currentMirror = m)();
  currentFormula.subscribe(f => currentFormulaText = f)();
  parsedFormula.subscribe(p => parsedFormulaData = p)();
  
  console.log('[EXPORT] Formula:', currentFormulaText);
  console.log('[EXPORT] Dimensions:', currentRows, 'x', currentCols);
  
  const matrixData = {};
  
  if (!currentGraph) {
    console.log('[EXPORT] No graph, returning empty export');
    return {
      version: 2,
      timestamp: new Date().toISOString(),
      formula: currentFormulaText || 'S*K*S',
      dimensions: { rows: 5, cols: 5 },
      configuration: { symmetric: false, mirror: false },
      matrices: {}
    };
  }
  
  // Export ONLY base matrices (not transposed, intermediate, or O)
  // The computed matrices will be regenerated on load
  // @ts-ignore - parsedFormulaData has variables from parseFormula output
  const baseMatrices = parsedFormulaData?.variables ? Array.from(parsedFormulaData.variables) : [];
  console.log('[EXPORT] Base matrices to export:', baseMatrices);
  
  baseMatrices.forEach(matrixName => {
    const matrixIds = currentGraph.matrices[matrixName];
    if (!matrixIds) return;
    
    const rows = matrixIds.length;
    const cols = matrixIds[0]?.length || 0;
    const data = [];
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const id = matrixIds[i][j];
        const element = currentGraph.getNode(id);
        // Only save non-zero painted cells
        if (element && element.value !== 0 && element.color) {
          data.push({
            row: i,
            col: j,
            value: element.value,
            color: element.color
          });
        }
      }
    }
    
    console.log(`[EXPORT] Matrix "${matrixName}": ${data.length} non-zero cells saved (${rows}x${cols})`);
    matrixData[matrixName] = data;
  });
  
  const result = {
    version: 2,
    timestamp: new Date().toISOString(),
    formula: currentFormulaText,
    dimensions: {
      rows: currentRows,
      cols: currentCols
    },
    configuration: {
      symmetric: currentSymmetric,
      mirror: currentMirror
    },
    matrices: matrixData,
    // @ts-ignore - currentGraph is DependencyGraph
    idCounter: currentGraph?.nodes?.size || 0 // Save ID counter state
  };
  
  console.log('[EXPORT] Export complete:', result);
  return result;
}

/**
 * Import matrix data from JSON format - uses existing functions like manual input
 */
export function importMatrices(jsonData) {
  try {
    console.log('[IMPORT] Starting import with data:', jsonData);
    
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    
    if (!data.version || !data.dimensions || !data.matrices) {
      throw new Error('Invalid matrix data format');
    }
    
    const { rows: r, cols: c } = data.dimensions;
    const { symmetric: sym, mirror: mir } = data.configuration || {};
    const formula = data.formula || 'S*K*S';
    
    console.log('[IMPORT] Formula:', formula);
    console.log('[IMPORT] Dimensions:', r, 'x', c);
    console.log('[IMPORT] Version:', data.version);
    console.log('[IMPORT] Matrices to restore:', Object.keys(data.matrices));
    
    // Handle version 1 (old format with S_left, S_right, KS)
    if (data.version === 1) {
      console.log('[IMPORT] OLD VERSION 1 FORMAT - needs migration to new formula system');
      alert('This is an old save format. Please re-save after loading to update to the new format.');
      
      // For old saves, we need to migrate the data
      const migratedMatrices = {};
      if (data.matrices.S_left) {
        migratedMatrices.S = data.matrices.S_left;
      }
      if (data.matrices.K) {
        migratedMatrices.K = data.matrices.K;
      }
      data.matrices = migratedMatrices;
    }
    
    // Step 1: Disable auto-recompute for the entire import process
    console.log('[IMPORT] Step 1: Disabling auto-recompute...');
    disableAutoRecompute();
    
    // Step 2: Set dimensions and settings FIRST (before creating matrices)
    console.log('[IMPORT] Step 2: Setting dimensions and settings...');
    rows.set(r);
    cols.set(c);
    symmetric.set(sym || false);
    mirrorS.set(mir || false);
    
    // Step 3: Parse the formula
    console.log('[IMPORT] Step 3: Parsing formula...');
    const parsed = parseFormula(formula);
    if (parsed.error) {
      disableAutoRecompute(); // Make sure to re-enable on error
      throw new Error(`Invalid formula: ${parsed.error}`);
    }
    
    // Step 4: Set formula in the store (won't trigger recompute - disabled)
    console.log('[IMPORT] Step 4: Setting formula...');
    currentFormula.set(formula);
    parsedFormula.set(parsed);
    
    // Step 5: Initialize matrices using existing function with correct dimensions
    console.log('[IMPORT] Step 5: Initializing matrices from formula...');
    const baseMatrices = getBaseMatrices(parsed);
    console.log('[IMPORT] Base matrices needed:', baseMatrices);
    initializeFormulaMatrices(baseMatrices, r, c, false); // Don't recompute yet
    
    // Step 6: "Paint" the cells (same way generateRandomMatrix does it)
    console.log('[IMPORT] Step 6: Restoring painted cells...');
    graph.update(g => {
      Object.keys(data.matrices).forEach(matrixName => {
        const matrixArray = data.matrices[matrixName];
        console.log(`[IMPORT] Restoring ${matrixArray.length} cells for matrix "${matrixName}"`);
        
        // Restore each painted cell
        matrixArray.forEach(({ row, col, value, color }) => {
          g.updateElement(matrixName, row, col, value, color);
        });
      });
      return g;
    });
    console.log('[IMPORT] All cells restored');
    
    // Step 7: Recompute (same as generateRandomMatrix does)
    console.log('[IMPORT] Step 7: Calling recomputeAll()...');
    recomputeAll();
    
    // Step 8: Re-enable auto-recompute AFTER a delay to avoid reactivity triggering another compute
    console.log('[IMPORT] Step 8: Scheduling auto-recompute re-enable...');
    setTimeout(() => {
      enableAutoRecompute();
      console.log('[IMPORT] Auto-recompute re-enabled');
    }, 200);
    
    console.log('[IMPORT] Import complete!');
    
    return true;
  } catch (error) {
    console.error('[IMPORT] ERROR:', error);
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
