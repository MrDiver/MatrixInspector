<script>
  import { onMount } from 'svelte';
  import MatrixView from './lib/MatrixView.svelte';
  import CSRView from './lib/CSRView.svelte';
  import ColorPicker from './lib/ColorPicker.svelte';
  import Notification from './lib/Notification.svelte';
  import Gallery from './lib/Gallery.svelte';
  import PythonEditor from './lib/PythonEditor.svelte';
  import PythonMatrixView from './lib/PythonMatrixView.svelte';
  import FormulaToolbar from './lib/FormulaToolbar.svelte';
  import IntermediateMatricesView from './lib/IntermediateMatricesView.svelte';
  import TrackedInstancesView from './lib/TrackedInstancesView.svelte';
  import BaseMatricesSidebar from './lib/BaseMatricesSidebar.svelte';
  import ToggleIcon from './lib/ToggleIcon.svelte';
  import { symmetric, symmetricPattern, initializeFormulaMatrices, generateRandomMatrix, currentColor, fillDiagonal, transposeState, pythonMatrix, parsedFormula, matrixDimensions, clearPersistentSelections, persistentSelections, paintIdentityMode, currentFormula } from './lib/stores';
  import { getBaseMatrices, getAllMatrixReferences } from './lib/formulaParser';
  import { darkMode } from './lib/themeStore';
  import './sw-registration.js';
    // Initialize formula matrices only when formula actually changes (avoid re-init on fullscreen toggle)
    let lastInitializedFormula = null;

    $: if ($parsedFormula) {
      const baseMatrices = getBaseMatrices($parsedFormula);
      if (baseMatrices.length > 0 && $currentFormula !== lastInitializedFormula) {
        initializeFormulaMatrices(baseMatrices);
        lastInitializedFormula = $currentFormula;
      }
    }

  let notificationComponent;
  let pythonEditorOpen = false;
  let pythonResult = null;
  let showShortcutModal = false;
  let isFullscreen = false;

  // Sync Python result into store (including clearing when null)
  $: pythonMatrix.set(pythonResult);

  let symmetricValue = false;
  let sparsityValue = 0.3;
  let generateSymmetric = false;
  let showCSR = true;

  // Keyboard shortcuts configuration
  const shortcuts = [
    {
      category: 'Paint Mode',
      shortcuts: [
        {
          key: '1',
          description: 'Toggle Paint Identity',
          modifiers: { ctrl: false, shift: false, alt: false },
          action: () => paintIdentityMode.update(v => !v)
        },
        {
          key: 's',
          description: 'Toggle Symmetric',
          modifiers: { ctrl: false, shift: false, alt: false },
          action: () => { symmetricValue = !symmetricValue; }
        },
        {
          key: 'p',
          description: 'Toggle Symmetric Pattern',
          modifiers: { ctrl: false, shift: false, alt: false },
          action: () => { generateSymmetric = !generateSymmetric; }
        }
      ]
    },
    {
      category: 'View',
      shortcuts: [
        {
          key: 'f',
          description: 'Toggle Fullscreen Mode',
          modifiers: { ctrl: false, shift: false, alt: false },
          action: () => { isFullscreen = !isFullscreen; }
        }
      ]
    },
    {
      category: 'Help',
      shortcuts: [
        {
          key: '?',
          description: 'Show This Menu',
          modifiers: { ctrl: false, shift: false, alt: false },
          action: () => { showShortcutModal = !showShortcutModal; }
        }
      ]
    }
  ];

  function handleKeyPress(e) {
    // Don't trigger shortcuts if user is typing in an input
    if (e.target.matches('input[type="text"], textarea, input[type="number"]')) {
      return;
    }

    const key = e.key.toLowerCase();
    const modifiers = {
      ctrl: e.ctrlKey || e.metaKey,
      shift: e.shiftKey,
      alt: e.altKey
    };

    // Handle ESC or D to clear persistent selections
    if ((key === 'escape' || key === 'd') && $persistentSelections.size > 0) {
      e.preventDefault();
      clearPersistentSelections();
      return;
    }

    // Find matching shortcut
    for (const category of shortcuts) {
      for (const shortcut of category.shortcuts) {
        if (shortcut.key === key &&
            shortcut.modifiers.ctrl === modifiers.ctrl &&
            shortcut.modifiers.shift === modifiers.shift &&
            shortcut.modifiers.alt === modifiers.alt) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    }
  }
  
  onMount(() => {
    // Initialize formula-driven matrices
    const baseMatrices = getBaseMatrices($parsedFormula);
    if (baseMatrices.length > 0) {
      initializeFormulaMatrices(baseMatrices);
    }

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  });
  
  // Sync symmetric checkbox to store
  $: symmetric.set(symmetricValue)
  $: symmetricPattern.set(generateSymmetric)
  
  function handleClear() {
    // Clear matrices based on current formula
    const baseMatrices = getBaseMatrices($parsedFormula);
    if (baseMatrices.length > 0) {
      initializeFormulaMatrices(baseMatrices);
    }
  }
  
  function handleFillDiagonal(matrixName) {
    let color;
    currentColor.subscribe(c => color = c)();
    fillDiagonal(matrixName, color);
  }
  
  async function renderAreaToBlob(area) {
    const { default: html2canvas } = await import('html2canvas');

    const width = area.offsetWidth || area.scrollWidth;
    const height = area.offsetHeight || area.scrollHeight;
    const scale = Math.min(2, window.devicePixelRatio || 1.5);

    const canvas = await html2canvas(area, {
      backgroundColor: '#ffffff',
      scale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      width,
      height,
      scrollX: 0,
      scrollY: 0
    });

    const blob = await new Promise(resolve => canvas.toBlob(resolve));
    if (blob) return blob;

    // Fallback: dataURL -> Blob to avoid null toBlob results
    const dataUrl = canvas.toDataURL('image/png');
    const res = await fetch(dataUrl);
    return await res.blob();
  }

  async function captureMatrixScreenshot() {
    const area = document.getElementById('screenshot-area');
    if (!area) return;
    try {
      area.classList.add('screenshot-safe');
      const blob = await renderAreaToBlob(area);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `matrix-inspector-${Date.now()}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      notificationComponent.show('Screenshot downloaded!', 'success');
    } catch (error) {
      console.error('Screenshot failed:', error);
      notificationComponent.show('Screenshot failed. Please try again.', 'error');
    } finally {
      area.classList.remove('screenshot-safe');
    }
  }

  async function copyMatrixScreenshot() {
    const area = document.getElementById('screenshot-area');
    if (!area) return;
    try {
      area.classList.add('screenshot-safe');
      const blob = await renderAreaToBlob(area);
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new window.ClipboardItem({ 'image/png': blob })
        ]);
        notificationComponent.show('Screenshot copied to clipboard!', 'success');
      } else {
        notificationComponent.show('Clipboard API not supported.', 'error');
      }
    } catch (error) {
      console.error('Screenshot failed:', error);
      notificationComponent.show('Screenshot failed. Please try again.', 'error');
    } finally {
      area.classList.remove('screenshot-safe');
    }
  }
</script>

<main class:fullscreen={isFullscreen}>
  {#if !isFullscreen}
  <header class="app-header">
    <div class="header-left">
      <div class="logo">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="2" width="12" height="12" fill="#4363d8" rx="2"/>
          <rect x="18" y="2" width="12" height="12" fill="#46f0f0" rx="2"/>
          <rect x="2" y="18" width="12" height="12" fill="#f58231" rx="2"/>
          <rect x="18" y="18" width="12" height="12" fill="#e6194b" rx="2"/>
        </svg>
        <h1>Matrix Inspector</h1>
      </div>
      <span class="subtitle">SKS Sparse Matrix Layout</span>
    </div>
    
    <div class="header-actions">
      <button on:click={captureMatrixScreenshot} class="icon-btn" title="Screenshot">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      </button>
      <button on:click={copyMatrixScreenshot} class="icon-btn" title="Copy Screenshot">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2"/>
          <rect x="3" y="3" width="13" height="13" rx="2"/>
        </svg>
      </button>
      <button on:click={() => showCSR = !showCSR} class="icon-btn" title="Toggle CSR View">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
        </svg>
      </button>
      <button on:click={() => darkMode.update(d => !d)} class="icon-btn" title="Toggle Dark Mode">
        {#if $darkMode}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        {:else}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        {/if}
      </button>
      <button on:click={() => pythonEditorOpen = !pythonEditorOpen} class="icon-btn" class:active={pythonEditorOpen} title="Python Editor (Ctrl+P)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9.5 2c-1.82 0-3.53.5-5 1.35C2.99 4.34 2 6.05 2 8c0 .83.09 1.64.26 2.4L2 20h6l.74-10h6.52L16 20h6l-.26-9.6c.17-.76.26-1.57.26-2.4 0-1.95-.99-3.66-2.5-4.65C18.03 2.5 16.32 2 14.5 2z"/>
        </svg>
      </button>
      <button on:click={() => showShortcutModal = !showShortcutModal} class="icon-btn" title="Keyboard Shortcuts (?)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4m0 -2v.01"/>
        </svg>
      </button>
    </div>
  </header>

  <!-- Formula Toolbar - Always visible, drives the entire application -->
  <FormulaToolbar />


  <div class="toolbar">
    <div class="toolbar-row">
      <div class="toolbar-section">
        <span class="section-label">📐 Matrix Dimensions</span>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0;">Controls moved to sidebar</p>
      </div>

      <div class="toolbar-section">
        <button on:click={handleClear} class="btn btn-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          Clear
        </button>
      </div>
    </div>

    <div class="toolbar-row">
      <div class="toolbar-section">
        <span class="section-label">🎨 Paint Mode</span>
        <ColorPicker />
        <label class="toggle-button" title="Paint Identity">
          <input type="checkbox" bind:checked={$paintIdentityMode} />
          <span><ToggleIcon type="identity" /></span>
        </label>
        <label class="toggle-button" title="Symmetric">
          <input type="checkbox" bind:checked={symmetricValue} />
          <span><ToggleIcon type="symmetric" /></span>
        </label>
      </div>
    </div>

    <div class="toolbar-row">
      <div class="toolbar-section">
        <span class="section-label">🎲 Generate</span>
        <label class="input-group">
          <span>Sparsity</span>
          <input type="number" min="0" max="1" step="0.05" bind:value={sparsityValue}/>
        </label>
        <label class="toggle-button" title="Symmetric Pattern">
          <input type="checkbox" bind:checked={generateSymmetric} />
          <span><ToggleIcon type="sympattern" /></span>
        </label>
      </div>
    </div>
  </div>
  {/if}

  <div class="workspace" class:fullscreen-workspace={isFullscreen}>
    {#if $parsedFormula}
      <BaseMatricesSidebar />
    {/if}
    
    <div class="main-content">
      <div class="screenshot-area" id="screenshot-area">
        {#if $parsedFormula}
          <div class="matrix-grid formula-layout">
            <!-- Row 1: Tracked Instances for formula tracking (e.g., A_0, A_1 for A*A*A) -->
            <TrackedInstancesView />
            
            <!-- Row 1.7: Intermediate Results / Final Results -->
            <IntermediateMatricesView />
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Floating Clear Selection Button -->
  {#if $persistentSelections.size > 0}
    <button 
      class="floating-clear-btn"
      on:click={clearPersistentSelections}
      title="Clear selection (Press D or ESC)"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
      <span>{$persistentSelections.size}</span>
    </button>
  {/if}
  
  {#if showCSR && $parsedFormula}
    {@const baseMatrices = getBaseMatrices($parsedFormula)}
    <div class="csr-panel">
      {#each baseMatrices as matrixName}
        <CSRView matrixName={matrixName} label={matrixName} />
      {/each}
      <CSRView matrixName="O" label="O" />
    </div>
  {/if}

  <Notification bind:this={notificationComponent} />
  <Gallery on:notify={(e) => notificationComponent?.show(e.detail.message, e.detail.type)} />
  <PythonEditor bind:isOpen={pythonEditorOpen} bind:pythonResult />

  <!-- Keyboard Shortcuts Modal -->
  {#if showShortcutModal}
    <div class="modal-overlay" on:click={() => showShortcutModal = false}>
      <div class="modal" on:click|stopPropagation>
        <div class="modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button on:click={() => showShortcutModal = false} class="close-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-content">
          {#each shortcuts as category}
            <div class="shortcut-group">
              <h3>{category.category}</h3>
              {#each category.shortcuts as shortcut}
                <div class="shortcut-item">
                  <kbd>
                    {#if shortcut.modifiers.ctrl}Ctrl+{/if}
                    {#if shortcut.modifiers.shift}Shift+{/if}
                    {#if shortcut.modifiers.alt}Alt+{/if}
                    {shortcut.key.toUpperCase()}
                  </kbd>
                  <span>{shortcut.description}</span>
                </div>
              {/each}
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</main>

<style>
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    margin: 0;
    padding: 0;
    background: var(--bg-secondary);
    color: var(--text-primary);
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  .formula-layout .matrix-row {
    justify-content: flex-start;
    gap: 16px;
    margin-bottom: 24px;
  }

  .formula-layout .result-row {
    border-top: 2px solid var(--border-color);
    padding-top: 24px;
  }
  
  main {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    background: var(--header-gradient);
    color: white;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
    gap: 16px;
    flex-wrap: wrap;
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .logo h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
  }

  .subtitle {
    font-size: 12px;
    opacity: 0.8;
  }

  .header-actions {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .icon-btn {
    padding: 8px;
    background: var(--button-hover-bg);
    border: none;
    border-radius: 6px;
    cursor: pointer;
    color: white;
    transition: background 0.2s, transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: manipulation;
  }

  :global(.icon-btn.active) {
    background: var(--button-active-bg);
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.25);
  }

  .icon-btn:hover {
    background: var(--button-active-bg);
  }

  .icon-btn:active {
    transform: scale(0.95);
  }

  .matrix-icon-btn {
    padding: 8px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    touch-action: manipulation;
    width: 36px;
    height: 36px;
  }

  .matrix-icon-btn:hover {
    border-color: var(--primary-blue);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
  }

  .matrix-icon-btn:active {
    transform: translateY(0);
  }

  .matrix-icon-btn.active {
    background: #43e97b;
    color: white;
    border-color: #43e97b;
  }

  .matrix-icon-btn.active:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(67, 233, 123, 0.3);
  }

  .toolbar {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-color);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    overflow-x: auto;
  }

  .toolbar-row {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
  }

  .toolbar-section {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }

  .section-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-right: 4px;
    white-space: nowrap;
  }

  .input-group {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-tertiary);
  }

  .input-group span {
    font-weight: 500;
    white-space: nowrap;
  }

  .dimension-spinner {
    display: flex;
    align-items: center;
  }

  .dimension-spinner .input-group {
    gap: 4px;
  }

  .dimension-spinner .x {
    font-weight: 600;
    color: var(--text-secondary);
    margin: 0 2px;
    display: flex;
    align-items: center;
    height: 1.2em;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-tertiary);
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
  }

  .matrix-with-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .matrix-actions {
    display: flex;
    gap: 6px;
    justify-content: center;
  }

  .btn {
    padding: 8px 14px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 6px;
    touch-action: manipulation;
    white-space: nowrap;
  }

  .toggle-button {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .toggle-button input[type="checkbox"] {
    display: none;
  }

  .toggle-button span {
    padding: 2px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    transition: all 0.2s;
    touch-action: manipulation;
    cursor: pointer;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    min-height: 36px;
  }

  .toggle-button span :global(svg) {
    width: 22px;
    height: 22px;
    color: currentColor;
  }

  .toggle-button input[type="checkbox"]:checked + span {
    background: var(--primary-blue);
    color: var(--text-primary);
    border-color: var(--primary-blue);
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    font-size: 16px;
  }

  .toggle-button:hover span {
    border-color: var(--primary-blue);
    background: var(--bg-hover);
  }

  .toggle-button input[type="checkbox"]:checked + span:hover {
    background: var(--primary-blue);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .btn-secondary {
    background: var(--danger-red);
    color: white;
  }

  .btn-secondary:hover {
    background: var(--danger-red-hover);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
  }

  .btn-secondary:active {
    transform: translateY(0);
  }

  :global(html.dark) .btn-secondary {
    background: #fa709a;
  }

  :global(html.dark) .btn-secondary:hover {
    background: #f55a86;
  }
  
  .workspace {
    display: flex;
    gap: 0;
    flex: 1;
    background: none;
    overflow: hidden;
  }

  .main-content {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    flex: 1;
    padding: 12px;
    overflow-x: auto;
    overflow-y: auto;
  }

  main.fullscreen {
    height: 100vh;
    overflow: hidden;
  }

  .fullscreen-workspace {
    padding: 40px;
    height: 100vh;
    align-items: center;
    justify-content: center;
    overflow: auto;
  }

  .fullscreen-workspace .screenshot-area {
    margin: 0;
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .screenshot-area {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    padding: 16px;
    margin-top: 12px;
    background: var(--bg-primary);
    border-radius: 16px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.07);
    min-width: min-content;
  }
  
  .matrix-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
  }

  .matrix-row {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: center;
  }

  .matrix-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    min-width: 200px;
    flex-shrink: 0;
  }

  
  .csr-panel {
    display: flex;
    flex-direction: row;
    gap: 16px;
    padding: 16px;
    border-top: 1px solid var(--border-color);
    flex-wrap: wrap;
    justify-content: center;
    width: 100%;
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.05);
    overflow-x: auto;
  }
  
  input[type="number"] {
    padding: 6px 10px;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-primary);
    border-radius: 6px;
    font-size: 13px;
    width: 60px;
    transition: border-color 0.15s;
  }

  input[type="number"]:focus {
    outline: none;
    border-color: var(--primary-blue);
    box-shadow: 0 0 0 3px var(--input-focus-shadow);
  }
  
  input[type="checkbox"] {
    cursor: pointer;
    width: 16px;
    height: 16px;
    accent-color: var(--primary-blue);
  }

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    .app-header {
      flex-direction: column;
      align-items: flex-start;
      padding: 12px 16px;
      gap: 12px;
    }

    .header-left {
      width: 100%;
    }

    .logo {
      gap: 10px;
    }

    .logo h1 {
      font-size: 18px;
    }

    .header-actions {
      width: 100%;
      justify-content: space-around;
    }

    .toolbar {
      padding: 12px;
      gap: 8px;
    }

    .toolbar-row {
      gap: 12px;
    }

    .toolbar-section {
      gap: 8px;
    }

    .workspace {
      padding: 8px;
    }

    .screenshot-area {
      padding: 12px;
      gap: 12px;
      border-radius: 12px;
    }

    .matrix-row {
      gap: 12px;
    }

    .matrix-cell {
      gap: 8px;
      min-width: 160px;
    }

    .btn {
      padding: 6px 12px;
      font-size: 12px;
    }

    .icon-btn {
      padding: 6px;
    }

    .input-group,
    .checkbox-label {
      font-size: 12px;
    }

    input[type="number"] {
      width: 50px;
      padding: 4px 8px;
      font-size: 12px;
    }

    .csr-panel {
      padding: 12px;
      gap: 12px;
    }
  }

  @media (max-width: 480px) {
    .logo h1 {
      font-size: 16px;
    }

    .subtitle {
      font-size: 11px;
    }

    .header-actions {
      gap: 8px;
    }

    .icon-btn {
      padding: 5px;
    }

    .section-label {
      font-size: 12px;
    }

    .toolbar {
      padding: 8px;
    }

    .toolbar-row {
      gap: 8px;
    }

    .toolbar-section {
      gap: 6px;
    }

    .matrix-cell {
      min-width: 140px;
    }

    .btn {
      padding: 5px 10px;
      font-size: 11px;
    }

    input[type="number"] {
      width: 45px;
      padding: 3px 6px;
      font-size: 11px;
    }

    .input-group,
    .checkbox-label {
      font-size: 11px;
    }
  }

  .matrix-with-controls {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
  }

  .selection-controls {
    display: flex;
    justify-content: center;
    width: 100%;
  }

  /* Floating Clear Selection Button */
  .floating-clear-btn {
    position: fixed;
    bottom: 32px;
    right: 32px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: var(--color-rose);
    color: white;
    border: none;
    border-radius: 50px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 16px rgba(250, 112, 154, 0.4);
    z-index: 100;
    animation: float-in 0.3s ease-out, glow 2s ease-in-out infinite;
  }

  .floating-clear-btn:hover {
    background: #e63f7d;
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 8px 24px rgba(250, 112, 154, 0.5);
  }

  .floating-clear-btn:active {
    transform: translateY(0) scale(1);
  }

  .floating-clear-btn svg {
    width: 20px;
    height: 20px;
  }

  @keyframes float-in {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.8);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes glow {
    0%, 100% {
      box-shadow: 0 4px 16px rgba(250, 112, 154, 0.4);
    }
    50% {
      box-shadow: 0 4px 24px rgba(250, 112, 154, 0.6), 0 0 40px rgba(250, 112, 154, 0.3);
    }
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
  }

  .modal {
    background: var(--bg-primary);
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    border: 1px solid var(--border-color);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    border-bottom: 1px solid var(--border-color);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .modal-content {
    padding: 20px;
  }

  .shortcut-group {
    margin-bottom: 24px;
  }

  .shortcut-group:last-child {
    margin-bottom: 0;
  }

  .shortcut-group h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .shortcut-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
  }

  .shortcut-item kbd {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 4px 8px;
    font-family: 'Courier New', monospace;
    font-weight: 600;
    font-size: 12px;
    color: var(--text-primary);
    min-width: 40px;
    text-align: center;
  }

  .shortcut-item span {
    color: var(--text-primary);
    font-size: 14px;
  }

  /* Screenshot-safe overrides to avoid unsupported CSS color functions */
  :global(.screenshot-safe *) {
    filter: none !important;
    text-shadow: none !important;
  }

  /* Restore visible highlights in screenshot-safe mode with solid colors instead of color-mix */
  :global(.screenshot-safe td.highlight) {
    opacity: 1 !important;
    box-shadow: inset 0 0 0 3px var(--cell-highlight) !important;
    background: var(--cell-highlight) !important;
    z-index: 6;
  }

  /* Normal cells in screenshot mode keep their base color */
  :global(.screenshot-safe td) {
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06) !important;
    background: var(--cell-base, var(--matrix-cell-bg)) !important;
  }
</style>

