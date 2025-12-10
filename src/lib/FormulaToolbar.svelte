<script>
  import { onMount } from 'svelte';
  import { parseFormula } from './formulaParser';
  import { currentFormula, parsedFormula, iterationCount } from './stores';

  let lastParsedFormula = $currentFormula;

  function handleInput(value) {
    const parsed = parseFormula(value);
    parsedFormula.set(parsed.error ? null : parsed);
  }

  // Parse the initial formula on mount
  onMount(() => {
    handleInput($currentFormula);
  });

  // Re-parse whenever currentFormula changes (including programmatic updates)
  $: if ($currentFormula !== lastParsedFormula) {
    lastParsedFormula = $currentFormula;
    handleInput($currentFormula);
  }
  
  $: hasError = $currentFormula && parseFormula($currentFormula).error;
</script>

<div class="formula-toolbar">
  <label for="formula-input">Formula:</label>
  <input
    id="formula-input"
    type="text"
    bind:value={$currentFormula}
    on:input={(e) => handleInput(e.currentTarget.value)}
    placeholder="e.g., S*K*S or A*A^T"
    class:error={hasError}
  />
  <label for="iteration-count" class="iteration-label">Iterations:</label>
  <input
    id="iteration-count"
    type="number"
    min="1"
    max="20"
    bind:value={$iterationCount}
    class="iteration-input"
  />
  <div class="formula-examples">
    <button class="example-btn" on:click={() => { currentFormula.set('S*K*S'); }}>S×K×S</button>
    <button class="example-btn" on:click={() => { currentFormula.set('A*A^T'); }}>A×A^T</button>
    <button class="example-btn" on:click={() => { currentFormula.set('P_0^T*K_0*P_0'); }}>P₀^T×K₀×P₀</button>
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
    flex: 1;
    min-width: 200px;
    max-width: 400px;
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
  
  .formula-examples {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .iteration-label {
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
  }

  .iteration-input {
    width: 64px;
    padding: 6px 8px;
    border: 2px solid var(--border-color);
    border-radius: 6px;
    font-size: 14px;
    font-family: 'Courier New', monospace;
    background: var(--bg-secondary);
    color: var(--text-primary);
    transition: border-color 0.2s;
  }

  .iteration-input:focus {
    outline: none;
    border-color: var(--primary-blue);
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
