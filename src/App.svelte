<script>
  import { onMount } from 'svelte';
  import BaseMatrixEditor from './lib/BaseMatrixEditor.svelte';
  import FormulaViewMatrix from './lib/FormulaViewMatrix.svelte';
  import OutputMatrix from './lib/OutputMatrix.svelte';
  import SimpleColorPicker from './lib/SimpleColorPicker.svelte';
  import { PRESET_COLORS, COLOR_PALETTE } from './lib/constants';
  
  // Layer 1: Entity Store
  import { baseMatrices, createMatrix, initializeFromFormula, exportMatrices, importMatrices } from './lib/entityStore';
  
  // Layer 2: View Layer
  import { formula, parsedFormula, formulaViewMatrices, validateFormulaDimensions } from './lib/viewLayer';
  
  // Layer 3: Computation Layer
  import { computeOutput, autoCompute, enableAutoCompute, disableAutoCompute } from './lib/computationLayer';
  
  let currentColor = COLOR_PALETTE.accent1;
  let formulaInput = $formula;
  let validationError = null;
  
  // Initialize default matrices
  onMount(() => {
    createMatrix('S', 5, 5);
    createMatrix('K', 5, 5);
  });
  
  // Update formula when input changes
  function handleFormulaChange() {
    formula.set(formulaInput);
    
    if ($parsedFormula) {
      // Initialize matrices from formula
      initializeFromFormula($parsedFormula.variables);
      
      // Validate dimensions
      const validation = validateFormulaDimensions();
      validationError = validation.valid ? null : validation.error;
    }
  }
  
  function handleCompute() {
    const validation = validateFormulaDimensions();
    if (!validation.valid) {
      alert(validation.error);
      return;
    }
    
    computeOutput();
  }
  
  function handleSave() {
    const data = {
      version: 3,
      formula: $formula,
      matrices: exportMatrices()
    };
    
    const json = JSON.stringify(data, null, 2);
    localStorage.setItem('matrix_inspector_save', json);
    alert('Saved successfully!');
  }
  
  function handleLoad() {
    const json = localStorage.getItem('matrix_inspector_save');
    if (!json) {
      alert('No saved data found');
      return;
    }
    
    try {
      const data = JSON.parse(json);
      
      // Load formula
      if (data.formula) {
        formulaInput = data.formula;
        formula.set(data.formula);
      }
      
      // Load matrices
      if (data.matrices) {
        importMatrices(data.matrices);
      }
      
      alert('Loaded successfully!');
    } catch (error) {
      alert('Failed to load: ' + error.message);
    }
  }
  
  function handleAddMatrix() {
    const name = prompt('Enter matrix name (single letter):');
    if (name && name.length === 1 && /[A-Z]/.test(name)) {
      createMatrix(name, 5, 5);
    } else if (name) {
      alert('Matrix name must be a single uppercase letter');
    }
  }
</script>

<main>
  <header>
    <h1>Matrix Inspector</h1>
    <p class="subtitle">Clean Architecture Edition</p>
  </header>
  
  <section class="formula-section">
    <div class="formula-input-group">
      <label for="formula">Formula:</label>
      <input 
        id="formula"
        type="text" 
        bind:value={formulaInput}
        on:change={handleFormulaChange}
        placeholder="e.g., S*K*S"
      />
      <button on:click={handleCompute} class="btn-compute">Compute</button>
    </div>
    
    {#if validationError}
      <div class="error-message">{validationError}</div>
    {/if}
  </section>
  
  <section class="color-picker-section">
    <span class="label">Paint Color:</span>
    <SimpleColorPicker bind:color={currentColor} />
  </section>
  
  <section class="base-matrices-section">
    <div class="section-header">
      <h2>Base Matrices (Editable)</h2>
      <button on:click={handleAddMatrix} class="btn-add">+ Add Matrix</button>
    </div>
    
    <div class="matrices-grid">
      {#each Array.from($baseMatrices.keys()) as matrixName}
        <BaseMatrixEditor {matrixName} {currentColor} />
      {/each}
    </div>
  </section>
  
  <section class="formula-view-section">
    <h2>Formula View (Read-only)</h2>
    
    {#if $formulaViewMatrices.length > 0}
      <div class="formula-display">
        {#each $formulaViewMatrices as viewMatrix, i}
          <FormulaViewMatrix {viewMatrix} />
          {#if i < $formulaViewMatrices.length - 1}
            <div class="operator">×</div>
          {/if}
        {/each}
        <div class="operator">=</div>
        <OutputMatrix />
      </div>
    {:else}
      <p class="no-formula">Enter a formula above to see visualization</p>
    {/if}
  </section>
  
  <section class="controls-section">
    <button on:click={handleSave} class="btn-save">Save</button>
    <button on:click={handleLoad} class="btn-load">Load</button>
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
  }
  
  :global(:root) {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --text-primary: #333;
    --text-secondary: #666;
    --border-color: #ddd;
    --bg-primary: white;
    --bg-secondary: #f9f9f9;
  }
  
  main {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  header {
    text-align: center;
    color: white;
    margin-bottom: 2rem;
  }
  
  header h1 {
    font-size: 3rem;
    margin: 0;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
  }
  
  .subtitle {
    font-size: 1.2rem;
    margin: 0.5rem 0 0 0;
    opacity: 0.9;
  }
  
  section {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }
  
  section h2 {
    margin: 0 0 1rem 0;
    color: var(--primary-color);
  }
  
  .formula-input-group {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  
  .formula-input-group label {
    font-weight: bold;
    color: var(--text-primary);
  }
  
  .formula-input-group input {
    flex: 1;
    padding: 0.75rem;
    border: 2px solid var(--border-color);
    border-radius: 8px;
    font-size: 1.1rem;
    font-family: 'Courier New', monospace;
  }
  
  .formula-input-group input:focus {
    outline: none;
    border-color: var(--primary-color);
  }
  
  .btn-compute {
    padding: 0.75rem 2rem;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-compute:hover {
    background: var(--secondary-color);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }
  
  .error-message {
    margin-top: 1rem;
    padding: 0.75rem;
    background: #fee;
    border: 1px solid #fcc;
    border-radius: 4px;
    color: #c00;
  }
  
  .color-picker-section {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .color-picker-section .label {
    font-weight: bold;
    color: var(--text-primary);
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .btn-add {
    padding: 0.5rem 1rem;
    background: #43e97b;
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-add:hover {
    background: #38d170;
    transform: translateY(-1px);
  }
  
  .matrices-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }
  
  .formula-display {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .operator {
    font-size: 2rem;
    font-weight: bold;
    color: var(--primary-color);
  }
  
  .no-formula {
    text-align: center;
    color: var(--text-secondary);
    font-style: italic;
    padding: 2rem;
  }
  
  .controls-section {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }
  
  .btn-save, .btn-load {
    padding: 0.75rem 2rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-save {
    background: #43e97b;
    color: white;
  }
  
  .btn-save:hover {
    background: #38d170;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }
  
  .btn-load {
    background: #4facfe;
    color: white;
  }
  
  .btn-load:hover {
    background: #3a9ef5;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }
</style>
