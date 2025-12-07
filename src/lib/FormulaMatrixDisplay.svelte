<script>
  import { parsedFormula, formulaMatrices, initializeFormulaMatrices } from './stores';
  import { getBaseMatrices, getAllMatrixReferences } from './formulaParser';
  import MatrixView from './MatrixView.svelte';
  
  $: formula = $parsedFormula;
  $: baseMatrices = formula ? getBaseMatrices(formula) : [];
  $: allReferences = formula ? getAllMatrixReferences(formula) : [];
  
  // Initialize matrices when formula changes
  $: if (formula && baseMatrices.length > 0) {
    initializeFormulaMatrices(baseMatrices, 5, 5);
  }
  
  function transposeMatrix(name) {
    // Get base matrix dimensions
    const base = $formulaMatrices.get(name);
    if (!base) return null;
    
    return {
      name: `${name}^T`,
      rows: base.cols,
      cols: base.rows,
      editable: false,
      transpose: true,
      baseName: name
    };
  }
</script>

{#if formula && allReferences.length > 0}
  <div class="formula-display">
    <div class="formula-header">
      <h3>Formula Matrices</h3>
      <div class="formula-expression">
        {#each formula.tokens as token, i}
          <span class="token" class:transpose={token.transpose}>
            {token.name}{#if token.transpose}^T{/if}
          </span>
          {#if i < formula.tokens.length - 1}
            <span class="operator">×</span>
          {/if}
        {/each}
      </div>
    </div>
    
    <div class="matrices-grid">
      <div class="section">
        <h4>Editable Matrices</h4>
        <div class="matrix-row">
          {#each baseMatrices as matrixName}
            <div class="matrix-container">
              <MatrixView 
                matrixName={matrixName}
                label={matrixName}
                paintable={true}
              />
            </div>
          {/each}
        </div>
      </div>
      
      {#if allReferences.some(ref => ref.transpose)}
        <div class="section">
          <h4>Transposed Views</h4>
          <div class="matrix-row">
            {#each allReferences.filter(ref => ref.transpose) as ref}
              {@const transposed = transposeMatrix(ref.name)}
              {#if transposed}
                <div class="matrix-container">
                  <div class="transpose-indicator">Read-only (computed)</div>
                  <MatrixView 
                    matrixName={ref.name}
                    label={ref.displayName}
                    paintable={false}
                  />
                </div>
              {/if}
            {/each}
          </div>
        </div>
      {/if}
      
      <div class="section">
        <h4>Result</h4>
        <div class="result-placeholder">
          <p>Result matrix will appear here after computation</p>
        </div>
      </div>
    </div>
  </div>
{:else}
  <div class="empty-state">
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M4 7h3m0 0v10m0-10l3 3m-3-3L4 10"/>
      <text x="10" y="16" font-family="monospace" font-size="10" fill="currentColor">ƒ</text>
      <path d="M14 10h6M14 14h6"/>
    </svg>
    <h3>Enter a formula to get started</h3>
    <p>Use the formula input above to define your matrix expression</p>
  </div>
{/if}

<style>
  .formula-display {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  
  .formula-header {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px 20px;
    background: var(--bg-secondary);
    border-radius: 8px;
  }
  
  .formula-header h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 18px;
  }
  
  .formula-expression {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'Courier New', monospace;
    font-size: 20px;
    padding: 12px;
    background: var(--bg-primary);
    border-radius: 6px;
  }
  
  .token {
    padding: 6px 12px;
    background: var(--color-primary);
    color: white;
    border-radius: 6px;
    font-weight: 600;
  }
  
  .token.transpose {
    background: var(--color-cyan);
    color: var(--bg-primary);
  }
  
  .operator {
    color: var(--text-secondary);
    font-size: 24px;
    font-weight: bold;
  }
  
  .matrices-grid {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }
  
  .section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .section h4 {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
  }
  
  .matrix-row {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
  }
  
  .matrix-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .transpose-indicator {
    font-size: 12px;
    color: var(--color-cyan);
    font-weight: 600;
    padding: 4px 8px;
    background: color-mix(in srgb, var(--color-cyan) 15%, transparent);
    border-radius: 4px;
    text-align: center;
  }
  
  .result-placeholder {
    padding: 40px;
    background: var(--bg-secondary);
    border: 2px dashed var(--border-color);
    border-radius: 8px;
    text-align: center;
  }
  
  .result-placeholder p {
    margin: 0;
    color: var(--text-secondary);
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 20px;
    text-align: center;
    color: var(--text-secondary);
  }
  
  .empty-state svg {
    margin-bottom: 24px;
    opacity: 0.5;
  }
  
  .empty-state h3 {
    margin: 0 0 8px 0;
    color: var(--text-primary);
    font-size: 20px;
  }
  
  .empty-state p {
    margin: 0;
    font-size: 14px;
  }
</style>
