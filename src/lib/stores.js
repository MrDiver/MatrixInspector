// Transpose state for each matrix (dynamically populated based on formula)
export const transposeState = writable({});

/**
 * Value types for matrix cells
 * EMPTY: 0 - cell is empty
 * IDENTITY: 1 - cell is identity element (value=1, no color)
 * COLORED: 2 - cell has a non-1 value with color
 */
export const VALUE_TYPES = {
  EMPTY: 0,
  IDENTITY: 1,
  COLORED: 2
};

/**
 * Svelte stores for matrix inspector state
 */
import { writable, derived, get } from 'svelte/store';
import { DependencyGraph, evaluateFormula } from './dependencyGraph';
import { getBaseMatrices, parseFormula } from './formulaParser';

// Configuration stores
export const rows = writable(5);
export const cols = writable(5);
export const symmetric = writable(false);
export const symmetricPattern = writable(false);

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

// Paint identity mode: when enabled, painting adds identity flag to colored cells
export const paintIdentityMode = writable(false);

// Main dependency graph
export const graph = writable(new DependencyGraph());

// Highlighted elements store (Set of element IDs)
export const highlightedElements = writable(new Set());

// Persistent selections in O matrix (stays across hovers)
export const persistentSelections = writable(new Set());

// Source cells selected in O matrix (to recompute persistentSelections robustly)
export const persistentSelectionSources = writable(new Set());

// Track if user is currently dragging to select multiple cells
export const draggingMultiSelect = writable(false);

function computePersistentHighlights(graphInstance, sources) {
  const union = new Set();
  if (!graphInstance || !sources) return union;
  sources.forEach(id => {
    const deps = graphInstance.getAllDependencies(id);
    deps.forEach(dep => union.add(dep));
  });
  return union;
}

// Python result matrix store
export const pythonMatrix = writable(null);

// Formula stores - Formula is always present and drives the application
export const currentFormula = writable('S*K*S'); // Default formula
export const iterationCount = writable(3); // Iteration count for iterative formulas (min 1)

// Initialize parsedFormula with the parsed default formula so matrices are initialized on app load
let defaultParsed = null;
let parsedFormula_internal = null;
export const parsedFormula = writable(null);

// Subscribe to currentFormula and parse it automatically
currentFormula.subscribe(formula => {
  if (formula) {
    const parsed = parseFormula(formula);
    parsedFormula_internal = parsed.error ? null : parsed;
    parsedFormula.set(parsedFormula_internal);
  }
});

// Export/import versioning
const CURRENT_EXPORT_VERSION = 3;
const SUPPORTED_IMPORT_VERSIONS = [2, 3];

// Per-matrix dimensions
export const matrixDimensions = writable({}); // { [name]: { rows, cols } }

/**
 * Initialize matrices from formula
 */
export function initializeFormulaMatrices(matrixNames, defaultRows = 5, defaultCols = 5) {
  const existingDims = get(matrixDimensions);
  const updatedDims = { ...existingDims };

  matrixNames.forEach(name => {
    if (!updatedDims[name]) {
      updatedDims[name] = { rows: defaultRows, cols: defaultCols };
    }
  });

  // Update store AND use updatedDims directly for graph initialization (don't rely on get() after set())
  matrixDimensions.set(updatedDims);

  graph.update(g => {
    g.clear();
    
    // Use the updatedDims that we know are correct, not the store value
    // (store updates may be batched/async in Svelte)
    matrixNames.forEach(name => {
      const dims = updatedDims[name] || { rows: defaultRows, cols: defaultCols };
      g.initMatrix(name, dims.rows, dims.cols);
    });
    
    // Initialize result matrix O with a safe default; recompute will resize if needed
    g.initMatrix('O', defaultRows, defaultCols);
    
    return g;
  });
  
  rows.set(defaultRows);
  cols.set(defaultCols);
  
  // Compute result based on formula
  recomputeFormula();
}

// Clear a single matrix without affecting others
export function clearMatrix(matrixName) {
  const dims = get(matrixDimensions)[matrixName] || { rows: 5, cols: 5 };
  
  graph.update(g => {
    // Clear just this matrix's data, keeping dimensions
    g.initMatrix(matrixName, dims.rows, dims.cols);
    return g;
  });
  
  // Recompute formula to update results
  recomputeFormula();
}

// Update a single matrix's dimensions and rebuild matrices
export function setMatrixDimensions(name, rowsVal, colsVal) {
  const r = Math.max(1, Math.min(50, Number(rowsVal) || 1));
  const c = Math.max(1, Math.min(50, Number(colsVal) || 1));

  matrixDimensions.update(dims => ({
    ...dims,
    [name]: { rows: r, cols: c }
  }));

  const currentParsed = get(parsedFormula);
  if (!currentParsed) return;

  const baseMatrices = getBaseMatrices(currentParsed);
  initializeFormulaMatrices(baseMatrices, r, c);
}

/**
 * Recompute result matrix based on current formula using actual matrix multiplication
 */
export function recomputeFormula() {
  let parsed = null;
  parsedFormula.subscribe(val => parsed = val)();
  if (!parsed) return;

  if (parsed.mode === 'iterative') {
    recomputeIterative(parsed);
    return;
  }

  if (!parsed.ast) return;

  graph.update(g => {
    g.intermediateCounter = 0;

    const resultMatrixName = evaluateFormula(g, parsed.ast, Array.from(parsed.variables));

    if (resultMatrixName && resultMatrixName !== 'O') {
      const resultData = g.getMatrixData(resultMatrixName);

      if (resultData) {
        const resultRows = resultData.length;
        const resultCols = resultData[0]?.length || 0;

        const oExisting = g.matrices['O'];
        if (!oExisting || oExisting.length !== resultRows || (oExisting[0]?.length || 0) !== resultCols) {
          g.initMatrix('O', resultRows, resultCols);
        }

        const oData = g.getMatrixData('O');

        if (oData) {
          for (let i = 0; i < resultData.length; i++) {
            for (let j = 0; j < resultData[i].length; j++) {
              const resultElem = resultData[i][j];
              const oElem = oData[i][j];

              if (resultElem && oElem) {
                oElem.value = resultElem.value;
                oElem.dependencies = [...resultElem.dependencies];
              }
            }
          }
        }

        rows.set(resultRows);
        cols.set(resultCols);
      }
    }

    return g;
  });
}

function recomputeIterative(parsed) {
  const iterations = Math.max(1, Number(get(iterationCount)) || 1);
  const dims = get(matrixDimensions);

  // Snapshot base matrices (explicit numeric ones) to preserve user edits across recompute
  const explicitNames = Array.from(parsed.explicitVariables || []);
  const baseSnapshots = new Map();
  graph.subscribe(g => {
    explicitNames.forEach(name => {
      const data = g.getMatrixData(name);
      if (!data) return;
      const rowsCount = data.length;
      const colsCount = data[0]?.length || 0;
      const clone = Array.from({ length: rowsCount }, (_, i) =>
        Array.from({ length: colsCount }, (_, j) => {
          const src = data[i][j];
          if (!src) return null;
          return {
            value: src.value,
            color: src.color,
            isIdentity: src.isIdentity,
            dependencies: [...src.dependencies]
          };
        })
      );
      baseSnapshots.set(name, clone);
    });
  })();

  graph.update(g => {
    g.clear();
    g.intermediateCounter = 0;
    g.intermediateDescriptions = {};

    // Track max computed index per base name
    const maxIndexByBase = new Map();

    explicitNames.forEach(name => {
      const match = name.match(/^([A-Z][a-z]*)_(\d+)$/);
      if (match) {
        const base = match[1];
        const idx = Number(match[2]);
        maxIndexByBase.set(base, Math.max(maxIndexByBase.get(base) || 0, idx));
      }
      const d = dims[name] || { rows: 5, cols: 5 };
      g.initMatrix(name, d.rows, d.cols);
      const snap = baseSnapshots.get(name);
      if (snap) {
        const target = g.getMatrixData(name);
        if (target) {
          for (let i = 0; i < snap.length; i++) {
            for (let j = 0; j < (snap[i]?.length || 0); j++) {
              const s = snap[i][j];
              const t = target[i]?.[j];
              if (s && t) {
                t.value = s.value;
                t.color = s.color;
                t.isIdentity = s.isIdentity;
                t.dependencies = [...s.dependencies];
              }
            }
          }
        }
      }
    });

    const ensureMatrix = (name, rows, cols) => {
      const existing = g.matrices[name];
      if (!existing || existing.length !== rows || (existing[0]?.length || 0) !== cols) {
        g.initMatrix(name, rows, cols);
      }
    };

    const copyMatrix = (src, dest, label) => {
      const srcData = g.getMatrixData(src);
      if (!srcData) return;
      const rowsCount = srcData.length;
      const colsCount = srcData[0]?.length || 0;
      ensureMatrix(dest, rowsCount, colsCount);
      const destData = g.getMatrixData(dest);
      if (!destData) return;
      for (let i = 0; i < rowsCount; i++) {
        for (let j = 0; j < colsCount; j++) {
          const s = srcData[i][j];
          const d = destData[i][j];
          if (s && d) {
            d.value = s.value;
            d.color = s.color;
            d.isIdentity = s.isIdentity;
            d.dependencies = [...s.dependencies];
          }
        }
      }
      if (label) {
        g.intermediateDescriptions[dest] = label;
      }
    };

    const resolveMatrixName = (token, nVal) => {
      let desiredIndex = null;
      if (token.subscriptType === 'number') {
        desiredIndex = token.subscript;
      } else if (token.subscript === 'n') {
        desiredIndex = nVal;
      } else if (token.subscript === 'n+1') {
        desiredIndex = nVal + 1;
      }

      let availableMax = maxIndexByBase.get(token.baseName) || 0;
      if (token.subscriptType === 'symbolic' && desiredIndex !== null && desiredIndex > availableMax) {
        desiredIndex = availableMax;
      }

      if (desiredIndex === null || Number.isNaN(desiredIndex)) {
        desiredIndex = availableMax;
      }

      return `${token.baseName}_${desiredIndex}`;
    };

    const instantiateAst = (ast, nVal) => {
      if (!ast) return null;
      if (ast.type === 'matrix') {
        const resolvedName = resolveMatrixName(ast, nVal);
        return { ...ast, name: resolvedName };
      }
      return {
        type: 'multiply',
        left: instantiateAst(ast.left, nVal),
        right: instantiateAst(ast.right, nVal)
      };
    };

    // Evaluate base cases (numeric targets)
    parsed.baseCases?.forEach(def => {
      const ast = instantiateAst(def.ast, 0);
      const resultName = evaluateFormula(g, ast, []);
      const targetIndex = def.target.subscript || 0;
      const targetName = `${def.target.baseName}_${targetIndex}`;
      copyMatrix(resultName, targetName, targetName);
      maxIndexByBase.set(def.target.baseName, Math.max(maxIndexByBase.get(def.target.baseName) || 0, targetIndex));
    });

    // Recurrence evaluation
    if (parsed.recurrence) {
      const rec = parsed.recurrence;
      const startIndex = maxIndexByBase.get(rec.target.baseName) || 0;
      for (let step = 0; step < iterations; step++) {
        const nVal = startIndex + step;
        const ast = instantiateAst(rec.ast, nVal);
        const resultName = evaluateFormula(g, ast, []);
        const targetIndex = nVal + 1;
        const targetName = `${rec.target.baseName}_${targetIndex}`;
        copyMatrix(resultName, targetName, targetName);
        maxIndexByBase.set(rec.target.baseName, Math.max(maxIndexByBase.get(rec.target.baseName) || 0, targetIndex));
      }
    }

    return g;
  });
}

/**
 * Subscribe to formula changes and recompute automatically
 */
parsedFormula.subscribe(() => {
  // Trigger recomputation when formula changes
  recomputeFormula();
});

// Recompute when iteration count changes
iterationCount.subscribe(() => {
  recomputeFormula();
});

/**
 * Initialize matrices with given dimensions
 */
/**
 * Toggle a matrix element (paint/unpaint)
 */
export function toggleElement(matrixName, row, col, color) {
  graph.update(g => {
    const element = g.getElementAt(matrixName, row, col);
    if (!element) return g;
    
    // Get current paint identity mode
    let paintIdentity;
    paintIdentityMode.subscribe(m => paintIdentity = m)();
    
    // Toggle value to 0 or 1, always use color for visualization
    const newValue = element.value ? 0 : 1;
    const newColor = newValue ? color : null; // Always use color when value is set
    const newIsIdentity = newValue && paintIdentity; // Set isIdentity flag if paint identity mode is on
    
    g.updateElement(matrixName, row, col, newValue, newColor);
    
    // Update the isIdentity flag
    element.isIdentity = newIsIdentity;
    
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
          const symElement = g.getElementAt(matrixName, col, row);
          if (symElement) {
            g.updateElement(matrixName, col, row, newValue, newColor);
            symElement.isIdentity = newIsIdentity;
          }
        }
      }
    }
    
    return g;
  });
  
  // Recompute derived matrices
  recomputeFormula();
}

/**
 * Generate random sparse matrix pattern
 */
export function generateRandomMatrix(matrixName, sparsity, symmetricPattern = false, color = null) {
  let r, c;
  rows.subscribe(val => r = val)();
  cols.subscribe(val => c = val)();
  
  const actualColor = color || PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
  
  // Get current paint identity mode
  let paintIdentity;
  paintIdentityMode.subscribe(m => paintIdentity = m)();
  
  graph.update(g => {
    // Get matrix dimensions
    const matrixIds = g.matrices[matrixName];
    if (!matrixIds) return g;
    
    const numRows = matrixIds.length;
    const numCols = matrixIds[0].length;
    
    // Clear existing values in target matrix
    for (let i = 0; i < numRows; i++) {
      for (let j = 0; j < numCols; j++) {
        g.updateElement(matrixName, i, j, 0, null, false);
      }
    }
    
    // Generate random pattern
    for (let i = 0; i < numRows; i++) {
      for (let j = 0; j < numCols; j++) {
        // Skip if symmetric and already set
        if (symmetricPattern && j < i) continue;
        
        if (Math.random() < sparsity) {
          g.updateElement(matrixName, i, j, 1, actualColor, paintIdentity);
          
          // If symmetric, mirror across diagonal
          if (symmetricPattern && i !== j) {
            g.updateElement(matrixName, j, i, 1, actualColor, paintIdentity);
          }
        }
      }
    }
    
    return g;
  });
  
  // Recompute derived matrices
  recomputeFormula();
}

/**
 * Fill the main diagonal of a matrix
 */
export function fillDiagonal(matrixName, color = null) {
  const actualColor = color || PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
  
  // Get current paint identity mode
  let paintIdentity;
  paintIdentityMode.subscribe(m => paintIdentity = m)();

  graph.update(g => {
    const matrixIds = g.matrices[matrixName];
    if (!matrixIds) return g;

    const numRows = matrixIds.length;
    const numCols = matrixIds[0].length;
    const diag = Math.min(numRows, numCols);

    for (let i = 0; i < diag; i++) {
      g.updateElement(matrixName, i, i, 1, actualColor, paintIdentity);
    }

    return g;
  });

  recomputeFormula();
}

/**
 * Recompute all derived matrices based on current formula
 */
/**
 * Highlight an element and its dependencies (replaces current highlights)
 */
export function highlightElement(elementId) {
  graph.subscribe(g => {
    const deps = g.getAllDependencies(elementId);
    highlightedElements.set(deps);
  })();
}

/**
 * Toggle an element in the persistent selections (for Ctrl+Click in O matrix)
 */
export function togglePersistentSelection(elementId) {
  graph.subscribe(g => {
    persistentSelectionSources.update(src => {
      const next = new Set(src);
      if (next.has(elementId)) {
        next.delete(elementId);
      } else {
        next.add(elementId);
      }

      const union = computePersistentHighlights(g, next);
      persistentSelections.set(union);
      highlightedElements.set(union);
      return next;
    });
  })();
}

/**
 * Clear persistent selections
 */
export function clearPersistentSelections() {
  persistentSelectionSources.set(new Set());
  persistentSelections.set(new Set());
  highlightedElements.set(new Set());
}

/**
 * Get current persistent selections (for restoring after hover)
 */
export function getPersistentSelections() {
  let result = null;
  persistentSelections.subscribe(sel => result = new Set(sel))();
  return result;
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
 * Export matrix data to JSON format (formula-driven)
 */
export function exportMatrices() {
  let currentGraph;
  let currentRows, currentCols;
  let currentSymmetric;
  let formula;
  let dims;
  
  graph.subscribe(g => currentGraph = g)();
  rows.subscribe(r => currentRows = r)();
  cols.subscribe(c => currentCols = c)();
  symmetric.subscribe(s => currentSymmetric = s)();
  currentFormula.subscribe(f => formula = f)();
  matrixDimensions.subscribe(d => dims = d)();
  
  // Parse formula to get base matrices
  let parsed;
  parsedFormula.subscribe(p => parsed = p)();
  const baseMatrices = getBaseMatrices(parsed);
  
  const matrixData = {};
  
  // Export only base matrices (not computed results)
  baseMatrices.forEach(matrixName => {
    const matrixIds = currentGraph.matrices[matrixName];
    if (!matrixIds) return;
    
    const rows = matrixIds.length;
    const cols = matrixIds[0].length;
    const data = [];
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const id = matrixIds[i][j];
        const element = currentGraph.getNode(id);
        // Only export non-zero painted cells
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
    
    if (data.length > 0) {
      matrixData[matrixName] = data;
    }
  });
  
  return {
    version: CURRENT_EXPORT_VERSION,
    timestamp: new Date().toISOString(),
    formula: formula,
    dimensions: {
      rows: currentRows,
      cols: currentCols
    },
    configuration: {
      symmetric: currentSymmetric
    },
    matrixDimensions: dims || {},
    matrices: matrixData
  };
}

/**
 * Import matrix data from JSON format (formula-driven)
 */
export function importMatrices(jsonData) {
  try {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    
    if (!data.version || !data.dimensions || !data.matrices) {
      throw new Error('Invalid matrix data format');
    }
    if (!SUPPORTED_IMPORT_VERSIONS.includes(data.version)) {
      throw new Error(`Unsupported config version ${data.version}. Supported versions: ${SUPPORTED_IMPORT_VERSIONS.join(', ')}`);
    }
    
    const { rows: r, cols: c } = data.dimensions;
    const { symmetric: sym } = data.configuration || {};
    const formula = data.formula || 'S*K*S';
    const importedDims = data.matrixDimensions || {};
    
    // First, update dimensions
    rows.set(r);
    cols.set(c);
    
    // Set symmetric mode
    if (sym !== undefined) {
      symmetric.set(sym);
    }
    
    // Parse formula immediately and push to stores
    const parsed = parseFormula(formula);
    if (parsed.error) {
      throw new Error(`Invalid formula in import: ${parsed.error}`);
    }
    currentFormula.set(formula);
    parsedFormula.set(parsed);
    const baseMatrices = getBaseMatrices(parsed);

    // Build per-matrix dimensions, falling back for legacy files
    const dims = { ...importedDims };
    baseMatrices.forEach(name => {
      if (!dims[name]) {
        dims[name] = { rows: r, cols: c };
      }
    });
    matrixDimensions.set(dims);
    
    // Initialize formula-driven matrices with per-matrix dimensions
    graph.update(g => {
      g.clear();
      baseMatrices.forEach(name => {
        const d = dims[name] || { rows: r, cols: c };
        g.initMatrix(name, d.rows, d.cols);
      });
      g.initMatrix('O', r, c);
      return g;
    });
    
    // Allow stores to settle before restoring data and recomputing
    setTimeout(() => {
      // Restore matrix data (only base matrices)
      graph.update(g => {
        baseMatrices.forEach(matrixName => {
          const matrixArray = data.matrices[matrixName] || [];
          
          matrixArray.forEach(({ row, col, value, color }) => {
            g.updateElement(matrixName, row, col, value, color);
          });
        });
        
        return g;
      });
      
      // Recompute result
      recomputeFormula();
    }, 10);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to import matrices:', error);
    return { success: false, error: error?.message || 'Import failed' };
  }
}

/**
 * Save configuration to localStorage
 */
export function saveConfigurationToStorage(name) {
  try {
    const data = exportMatrices();
    const storage = JSON.parse(localStorage.getItem('matrixGallery') || '{}');
    
    storage[name] = data;
    localStorage.setItem('matrixGallery', JSON.stringify(storage));
    
    return { success: true, keys: Object.keys(storage) };
  } catch (error) {
    console.error('Failed to save configuration:', error);
    return { success: false, error: error?.message || 'Save failed' };
  }
}

/**
 * Load configuration from localStorage
 */
export function loadConfigurationFromStorage(name) {
  const storage = JSON.parse(localStorage.getItem('matrixGallery') || '{}');
  
  if (!storage[name]) {
    return { success: false, error: 'Configuration not found' };
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
  try {
    const storage = JSON.parse(localStorage.getItem('matrixGallery') || '{}');
    
    delete storage[name];
    localStorage.setItem('matrixGallery', JSON.stringify(storage));
    
    return { success: true, keys: Object.keys(storage) };
  } catch (error) {
    console.error('Failed to delete configuration:', error);
    return { success: false, error: error?.message || 'Delete failed' };
  }
}
