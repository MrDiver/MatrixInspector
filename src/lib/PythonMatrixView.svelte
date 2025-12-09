<script>
  import MatrixView from './MatrixView.svelte';
  import { pythonMatrix, highlightedElements, graph } from './stores';
  
  export let label = 'O(py)';
  export let grayBackground = true;
  
  $: matrixData = $pythonMatrix;
  $: hasData = matrixData && matrixData.data && matrixData.data.length > 0;
  
  // Sync python matrix into a temporary graph matrix for display
  $: if (hasData && $graph) {
    graph.update(g => {
      // Create or update _PYTHON_O matrix in the graph
      const pythonName = '_PYTHON_O';
      const rows = matrixData.rows;
      const cols = matrixData.cols;
      
      // Initialize matrix if not exists or size changed
      const existing = g.matrices[pythonName];
      if (!existing || existing.length !== rows || (existing[0]?.length || 0) !== cols) {
        g.initMatrix(pythonName, rows, cols);
      }
      
      // Copy values from python result into graph matrix
      const graphData = g.getMatrixData(pythonName);
      if (graphData && matrixData.data) {
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            const graphElem = graphData[i][j];
            const pythonValue = matrixData.data[i][j];
            
            if (graphElem) {
              graphElem.value = pythonValue;
              
              // Map python dependencies to graph element colors
              if (matrixData.dependencies && matrixData.dependencies[i] && matrixData.dependencies[i][j]) {
                const deps = matrixData.dependencies[i][j];
                const colors = new Set();
                
                deps.forEach(dep => {
                  if (dep.left) {
                    const node = g.getElementAt(dep.left.matrix, dep.left.row, dep.left.col);
                    if (node?.color) colors.add(node.color);
                  }
                  if (dep.right) {
                    const node = g.getElementAt(dep.right.matrix, dep.right.row, dep.right.col);
                    if (node?.color) colors.add(node.color);
                  }
                });
                
                // Store colors as dependency colors for mini block display
                graphElem.dependencyColors = Array.from(colors).slice(0, 9);
              }
            }
          }
        }
      }
      
      return g;
    });
  }
</script>

{#if hasData}
  <MatrixView
    matrixName="_PYTHON_O"
    {label}
    {grayBackground}
    showMiniBlocks={true}
  />
{:else}
  <div class="empty-state">
    <div class="empty-icon">🐍</div>
    <div class="empty-text">Run Python code to see O(py)</div>
  </div>
{/if}

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    background: var(--bg-tertiary);
    border: 2px dashed color-mix(in srgb, var(--text-secondary) 55%, transparent);
    border-radius: 8px;
    min-width: 200px;
    min-height: 150px;
  }
  
  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
    opacity: 0.5;
  }
  
  .empty-text {
    font-size: 13px;
    color: #6b7280;
    text-align: center;
  }
</style>

