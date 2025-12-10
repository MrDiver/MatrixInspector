/**
 * Dependency Graph System for Matrix Multiplication
 * 
 * Each matrix element has a unique ID and tracks its dependencies
 * through a graph structure that enables efficient highlighting.
 */

let idCounter = 0;

/**
 * Generate a unique ID for a matrix element
 */
export function generateId() {
  return `elem_${idCounter++}`;
}

/**
 * Reset the ID counter (useful for testing or regeneration)
 */
export function resetIdCounter() {
  idCounter = 0;
}

/**
 * Create a matrix element with a unique ID
 */
export function createElement(matrixName, row, col, value = 0, color = null, isIdentity = false, colorIndex = null) {
  return {
    id: generateId(),
    matrixName,
    row,
    col,
    value,
    color,
    colorIndex,
    isIdentity, // Flag: true if this element should be treated as identity in multiplication
    dependencies: [], // IDs of elements this depends on
    dependents: []    // IDs of elements that depend on this
  };
}

/**
 * Dependency Graph
 * Stores all matrix elements and their relationships
 */
export class DependencyGraph {
  constructor() {
    this.nodes = new Map(); // id -> element
    this.matrices = {}; // matrixName -> 2D array of element IDs
    this.intermediateCounter = 0; // Counter for generated intermediate matrices
    this.intermediateDescriptions = {}; // matrixName -> description string
  }

  /**
   * Add a node to the graph
   */
  addNode(element) {
    this.nodes.set(element.id, element);
  }

  /**
   * Get a node by ID
   */
  getNode(id) {
    return this.nodes.get(id);
  }

  /**
   * Get all nodes for a specific matrix
   */
  getMatrixNodes(matrixName) {
    return Array.from(this.nodes.values()).filter(
      node => node.matrixName === matrixName
    );
  }

  /**
   * Get element at specific position in a matrix
   */
  getElementAt(matrixName, row, col) {
    if (!this.matrices[matrixName]) return null;
    if (!this.matrices[matrixName][row]) return null;
    const id = this.matrices[matrixName][row][col];
    return this.nodes.get(id);
  }

  /**
   * Add a dependency relationship: target depends on source
   */
  addDependency(targetId, sourceId) {
    const target = this.nodes.get(targetId);
    const source = this.nodes.get(sourceId);
    
    if (target && source) {
      if (!target.dependencies.includes(sourceId)) {
        target.dependencies.push(sourceId);
      }
      if (!source.dependents.includes(targetId)) {
        source.dependents.push(targetId);
      }
    }
  }

  /**
   * Get all dependencies of a node (recursive, returns Set of IDs)
   */
  getAllDependencies(id, visited = new Set()) {
    if (visited.has(id)) return visited;
    
    const node = this.nodes.get(id);
    if (!node) return visited;
    
    visited.add(id);
    
    for (const depId of node.dependencies) {
      this.getAllDependencies(depId, visited);
    }
    
    return visited;
  }

  /**
   * Get direct dependencies of a node
   */
  getDirectDependencies(id) {
    const node = this.nodes.get(id);
    return node ? node.dependencies : [];
  }

  /**
   * Get all dependents of a node (nodes that depend on this one)
   */
  getAllDependents(id, visited = new Set()) {
    if (visited.has(id)) return visited;
    
    const node = this.nodes.get(id);
    if (!node) return visited;
    
    visited.add(id);
    
    for (const depId of node.dependents) {
      this.getAllDependents(depId, visited);
    }
    
    return visited;
  }

  /**
   * Initialize a matrix in the graph
   */
  initMatrix(matrixName, rows, cols) {
    this.matrices[matrixName] = Array.from({ length: rows }, (_, i) =>
      Array.from({ length: cols }, (_, j) => {
        const element = createElement(matrixName, i, j);
        this.addNode(element);
        return element.id;
      })
    );
  }

  /**
   * Update an element's value and color
   */
  updateElement(matrixName, row, col, value, color, isIdentity = false, colorIndex = null) {
    const element = this.getElementAt(matrixName, row, col);
    if (element) {
      element.value = value;
      element.color = color;
      element.isIdentity = isIdentity;
      element.colorIndex = colorIndex;
    }
  }

  /**
   * Clear all dependencies for a matrix (useful before recomputation)
   */
  clearMatrixDependencies(matrixName) {
    const nodes = this.getMatrixNodes(matrixName);
    for (const node of nodes) {
      // Remove this node from its sources' dependents
      for (const sourceId of node.dependencies) {
        const source = this.nodes.get(sourceId);
        if (source) {
          source.dependents = source.dependents.filter(id => id !== node.id);
        }
      }
      node.dependencies = [];
    }
  }

  /**
   * Get CSR representation with element IDs
   */
  getCSRWithIds(matrixName) {
    const matrixIds = this.matrices[matrixName];
    if (!matrixIds) return null;

    const rows = matrixIds.length;
    const cols = matrixIds[0].length;
    
    const row_offsets = [0];
    const col_indices = [];
    const elementIds = [];
    let count = 0;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const id = matrixIds[i][j];
        const element = this.nodes.get(id);
        
        if (element && element.value) {
          col_indices.push(j);
          elementIds.push(id);
          count++;
        }
      }
      row_offsets.push(count);
    }

    return { row_offsets, col_indices, elementIds };
  }

  /**
   * Clear the entire graph
   */
  clear() {
    this.nodes.clear();
    this.matrices = {};
    this.intermediateDescriptions = {};
    resetIdCounter();
  }

  /**
   * Get matrix data as 2D array of elements
   */
  getMatrixData(matrixName) {
    if (!this.matrices[matrixName]) return null;
    
    return this.matrices[matrixName].map(row =>
      row.map(id => this.nodes.get(id))
    );
  }
}

/**
 * Multiply two matrices and track dependencies
 * Result dimensions: (left.rows, right.cols)
 * Dependencies: which base matrix elements contributed to each result element
 */
export function multiplyMatrices(graph, leftMatrixName, rightMatrixName, resultMatrixName) {
  const leftMatrix = graph.getMatrixData(leftMatrixName);
  const rightMatrix = graph.getMatrixData(rightMatrixName);
  
  if (!leftMatrix || !rightMatrix) return;
  
  const leftRows = leftMatrix.length;
  const leftCols = leftMatrix[0]?.length || 0;
  const rightRows = rightMatrix.length;
  const rightCols = rightMatrix[0]?.length || 0;
  
  // Ensure dimensions match for multiplication
  if (leftCols !== rightRows) {
    const error = `Cannot multiply ${leftMatrixName} (${leftRows}×${leftCols}) × ${rightMatrixName} (${rightRows}×${rightCols})`;
    console.error(error);
    // Store error in graph for later retrieval
    if (!graph.dimensionErrors) graph.dimensionErrors = [];
    graph.dimensionErrors.push(error);
    return;
  }
  
  // Clear result matrix dependencies
  graph.clearMatrixDependencies(resultMatrixName);
  
  // Perform multiplication with dependency tracking
  const resultData = graph.getMatrixData(resultMatrixName);
  
  for (let i = 0; i < leftRows; i++) {
    for (let j = 0; j < rightCols; j++) {
      const resultElement = resultData[i][j];
      if (!resultElement) continue;
      
      const contributors = new Set();
      let sum = 0;
      
      // result[i][j] = sum over k: left[i][k] * right[k][j]
      for (let k = 0; k < leftCols; k++) {
        const leftElem = leftMatrix[i][k];
        const rightElem = rightMatrix[k][j];
        
        if (leftElem?.value && rightElem?.value) {
          // Add contribution
          sum += leftElem.value * rightElem.value;
          
          // Handle identity elements: pass through the other element's dependencies
          const leftIsIdentity = leftElem.isIdentity;
          const rightIsIdentity = rightElem.isIdentity;
          
          if (leftIsIdentity && rightIsIdentity) {
            // Both are identity: no dependencies to add
            // (identity * identity = identity, which is identity)
          } else if (leftIsIdentity) {
            // Left is identity: only add right element's dependencies
            contributors.add(rightElem.id);
            for (const depId of rightElem.dependencies) {
              contributors.add(depId);
            }
          } else if (rightIsIdentity) {
            // Right is identity: only add left element's dependencies
            contributors.add(leftElem.id);
            for (const depId of leftElem.dependencies) {
              contributors.add(depId);
            }
          } else {
            // Neither is identity: add both elements and their dependencies (original behavior)
            contributors.add(leftElem.id);
            contributors.add(rightElem.id);
            
            for (const depId of leftElem.dependencies) {
              contributors.add(depId);
            }
            for (const depId of rightElem.dependencies) {
              contributors.add(depId);
            }
          }
        }
      }
      
      // Set result value
      resultElement.value = sum;
      
      // Set up dependencies
      for (const depId of contributors) {
        graph.addDependency(resultElement.id, depId);
      }
    }
  }
}

/**
 * Transpose a matrix and create a new transposed matrix with dependency tracking
 * Returns the name of the transposed matrix
 */
export function transposeMatrix(graph, matrixName) {
  const sourceData = graph.getMatrixData(matrixName);
  if (!sourceData) return null;
  
  const sourceRows = sourceData.length;
  const sourceCols = sourceData[0]?.length || 0;
  
  // Create transposed matrix name
  const transposedName = `${matrixName}_T`;
  
  // Initialize or resize transposed matrix
  const existing = graph.matrices[transposedName];
  if (!existing || existing.length !== sourceCols || (existing[0]?.length || 0) !== sourceRows) {
    graph.initMatrix(transposedName, sourceCols, sourceRows);
  }
  
  // Clear dependencies in case we're recomputing
  graph.clearMatrixDependencies(transposedName);
  
  // Copy transposed values and dependencies
  const transposedData = graph.getMatrixData(transposedName);
  
  for (let i = 0; i < sourceRows; i++) {
    for (let j = 0; j < sourceCols; j++) {
      const sourceElem = sourceData[i][j];
      const transposedElem = transposedData[j][i]; // Note: j, i reversed
      
      if (sourceElem && transposedElem) {
        transposedElem.value = sourceElem.value;
        transposedElem.color = sourceElem.color;
        
        // The transposed element depends on the source element
        graph.addDependency(transposedElem.id, sourceElem.id);
        
        // Also inherit dependencies from source
        for (const depId of sourceElem.dependencies) {
          graph.addDependency(transposedElem.id, depId);
        }
      }
    }
  }
  
  return transposedName;
}

/**
 * Convert an AST node to a formula string representation
 */
function astToFormula(ast) {
  if (!ast) return '';
  
  if (ast.type === 'matrix') {
    return ast.transpose ? `${ast.name}ᵀ` : ast.name;
  }
  
  if (ast.type === 'multiply') {
    const left = astToFormula(ast.left);
    const right = astToFormula(ast.right);
    return `${left} × ${right}`;
  }
  
  return '';
}

/**
 * Evaluate a formula AST and compute the result matrix
 * Returns the result matrix name
 * matrixIndex tracks which instance of each matrix we're at (for tracking duplicates)
 */
export function evaluateFormula(graph, ast, baseMatrixNames, matrixIndex = { count: 0 }) {
  if (!ast) return null;
  
  // If it's a single matrix (leaf node)
  if (ast.type === 'matrix') {
    const currentIndex = matrixIndex.count;
    matrixIndex.count++;
    
    // Create instance name for tracking separate occurrences
    const instanceName = `${ast.name}_${currentIndex}`;
    
    // Ensure instance matrix exists with independent element IDs
    const baseMatrixData = graph.getMatrixData(ast.name);
    if (baseMatrixData) {
      const rows = baseMatrixData.length;
      const cols = baseMatrixData[0]?.length || 0;
      
      // Initialize instance matrix (this creates new element IDs)
      graph.initMatrix(instanceName, rows, cols);
      
      // Sync values/colors from base, but keep new element IDs for separate tracking
      const instanceData = graph.getMatrixData(instanceName);
      if (instanceData) {
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            const baseElem = baseMatrixData[i][j];
            const instElem = instanceData[i][j];
            
            if (baseElem && instElem) {
              instElem.value = baseElem.value;
              instElem.color = baseElem.color;
              instElem.isIdentity = baseElem.isIdentity;
              // instElem keeps its own unique ID for independent tracking
            }
          }
        }
      }
    }
    
    // Check if we need to transpose
    if (ast.transpose) {
      return transposeMatrix(graph, instanceName);
    }
    return instanceName;
  }
  
  // If it's a multiplication
  if (ast.type === 'multiply') {
    // Recursively evaluate left and right subtrees
    const leftMatrixName = evaluateFormula(graph, ast.left, baseMatrixNames, matrixIndex);
    const rightMatrixName = evaluateFormula(graph, ast.right, baseMatrixNames, matrixIndex);
    
    if (!leftMatrixName || !rightMatrixName) return null;
    
    // Generate intermediate result name
    const intermediateIndex = (graph.intermediateCounter || 0) + 1;
    graph.intermediateCounter = intermediateIndex;
    const intermediateName = `_TEMP_${intermediateIndex}`;
    
    // Initialize intermediate matrix if not exists
    const leftData = graph.getMatrixData(leftMatrixName);
    const rightData = graph.getMatrixData(rightMatrixName);
    
    if (!leftData || !rightData) return null;
    
    const resultRows = leftData.length;
    const resultCols = rightData[0]?.length || 0;
    
    const existing = graph.matrices[intermediateName];
    if (!existing || existing.length !== resultRows || (existing[0]?.length || 0) !== resultCols) {
      graph.initMatrix(intermediateName, resultRows, resultCols);
    }
    
    // Perform multiplication
    multiplyMatrices(graph, leftMatrixName, rightMatrixName, intermediateName);
    
    // Store formula description for display (but not for the final result)
    const leftFormula = astToFormula(ast.left);
    const rightFormula = astToFormula(ast.right);
    graph.intermediateDescriptions[intermediateName] = `${leftFormula} × ${rightFormula}`;
    
    return intermediateName;
  }
  
  return null;
}
