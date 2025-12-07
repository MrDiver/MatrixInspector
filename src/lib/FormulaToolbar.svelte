<script>
  import { onMount } from 'svelte';
  import { parseFormula } from './formulaParser';
  import { currentFormula, parsedFormula, manualRecomputeFormula } from './stores';
  
  let formula = $currentFormula;
  let hasError = false;
  
  function handleInputChange() {
    const parsed = parseFormula(formula);
    hasError = !!parsed.error;
    // Don't auto-set parsedFormula - wait for button click
  }
  
  function handleComputeClick() {
    console.log('[FORMULA] Compute clicked, formula:', formula);
    const parsed = parseFormula(formula);
    if (parsed.error) {
      console.log('[FORMULA] Parse error:', parsed.error);
      hasError = true;
      return;
    }
    
    hasError = false;
    console.log('[FORMULA] Formula parsed successfully:', parsed);
    currentFormula.set(formula);
    parsedFormula.set(parsed);
    console.log('[FORMULA] Calling manual recompute');
    manualRecomputeFormula();
    console.log('[FORMULA] Compute complete');
  }
  
  // Update local formula when store changes (e.g., from loading)
  $: formula = $currentFormula;
  
  // Parse the initial formula on mount
  onMount(() => {
    const parsed = parseFormula(formula);
    hasError = !!parsed.error;
    if (!parsed.error) {
      parsedFormula.set(parsed);
    }
  });

</script>

<div class="formula-toolbar">
  <label for="formula-input">Formula:</label>
  <input
    id="formula-input"
    type="text"
    bind:value={formula}
    on:input={handleInputChange}
    placeholder="e.g., S*K*S or A*A^T"
    class:error={hasError}
  />
  <button 
    on:click={handleComputeClick}
    class="compute-btn"
    disabled={hasError}
    title="Compute the result matrix"
  >
    Compute
  </button>
  <div class="formula-examples">
    <button class="example-btn" on:click={() => { formula = 'S*K*S'; }}>S×K×S</button>
    <button class="example-btn" on:click={() => { formula = 'A*A^T'; }}>A×A^T</button>
    <button class="example-btn" on:click={() => { formula = 'P_0^T*K_0*P_0'; }}>P₀^T×K₀×P₀</button>
  </div>
</div>

<style>
  .formula-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-color);
  }
  
  label {
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
  }
  
  input {
    flex: 0 1 300px;
    padding: 8px 12px;
    border: 2px solid var(--border-color);
    border-radius: 6px;
    font-size: 14px;
    font-family: 'Courier New', monospace;
    background: var(--bg-secondary);
    color: var(--text-primary);
    transition: border-color 0.2s;
  }
  
  input:focus {
    outline: none;
    border-color: var(--primary-blue);
  }
  
  input.error {
    border-color: var(--danger-red);
  }

  .compute-btn {
    padding: 8px 16px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .compute-btn:hover:not(:disabled) {
    background: #5568d3;
    opacity: 1;
  }

  .compute-btn:disabled {
    background: #999;
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .formula-examples {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  
  .example-btn {
    padding: 6px 10px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    color: var(--text-secondary);
    transition: all 0.2s;
  }
  
  .example-btn:hover {
    background: var(--primary-blue);
    color: white;
    border-color: var(--primary-blue);
  }
  
  @media (max-width: 768px) {
    .formula-toolbar {
      flex-wrap: wrap;
    }
    
    input {
      min-width: 100%;
      max-width: 100%;
    }
  }
</style>
