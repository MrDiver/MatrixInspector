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
export function createElement(matrixName, row, col, value = 0, color = null) {
  return {
    id: generateId(),
    matrixName,
    row,
    col,
    value,
    color,
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
  updateElement(matrixName, row, col, value, color) {
    const element = this.getElementAt(matrixName, row, col);
    if (element) {
      element.value = value;
      element.color = color;
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
    resetIdCounter();
  }
}

/**
 * Compute KS = K * S_right and establish dependencies
 */
export function computeKS(graph, rows, cols) {
  const matrixName = 'KS';
  
  // Clear existing KS dependencies
  graph.clearMatrixDependencies(matrixName);
  
  // For each element in KS
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < cols; j++) {
      const ksElement = graph.getElementAt(matrixName, i, j);
      if (!ksElement) continue;
      
      // KS[i][j] = sum over t: K[i][t] * S_right[t][j]
      const contributors = [];
      
      for (let t = 0; t < rows; t++) {
        const kElement = graph.getElementAt('K', i, t);
        const sRightElement = graph.getElementAt('S_right', t, j);
        
        if (kElement?.value && sRightElement?.value) {
          contributors.push(kElement.id);
          contributors.push(sRightElement.id);
          
          // Add dependencies
          graph.addDependency(ksElement.id, kElement.id);
          graph.addDependency(ksElement.id, sRightElement.id);
        }
      }
      
      // Update KS element
      ksElement.value = contributors.length > 0 ? 1 : 0;
      ksElement.dependencies = contributors;
    }
  }
}

/**
 * Compute O = S_left * KS and establish dependencies
 */
export function computeO(graph, rows, cols) {
  const matrixName = 'O';
  
  // Clear existing O dependencies
  graph.clearMatrixDependencies(matrixName);
  
  // For each element in O
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < rows; j++) {
      const oElement = graph.getElementAt(matrixName, i, j);
      if (!oElement) continue;
      
      // O[i][j] = sum over k: S_left[i][k] * KS[k][j]
      const contributors = [];
      
      for (let k = 0; k < cols; k++) {
        const sLeftElement = graph.getElementAt('S_left', i, k);
        const ksElement = graph.getElementAt('KS', k, j);
        
        if (sLeftElement?.value && ksElement?.value) {
          // Track direct contributors
          contributors.push(sLeftElement.id);
          contributors.push(ksElement.id);
          
          // Add S_left dependency
          graph.addDependency(oElement.id, sLeftElement.id);
          
          // Add KS dependency (which transitively includes K and S_right)
          graph.addDependency(oElement.id, ksElement.id);
          
          // Also add all KS dependencies to O
          for (const ksDepId of ksElement.dependencies) {
            contributors.push(ksDepId);
            graph.addDependency(oElement.id, ksDepId);
          }
        }
      }
      
      // Update O element
      oElement.value = contributors.length > 0 ? 1 : 0;
      oElement.dependencies = contributors;
    }
  }
}
