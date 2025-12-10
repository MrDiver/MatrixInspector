<script>
  import { themes, selectedTheme, setTheme } from './themeStore';

  export let open = false;
  export let onClose = () => {};

  function chooseTheme(id) {
    setTheme(id);
    onClose();
  }
</script>

{#if open}
  <div class="theme-menu" role="dialog" aria-label="Theme selector">
    <div class="theme-menu__header">
      <div>
        <p class="eyebrow">Personalize</p>
        <h3>Pick a vibe</h3>
        <p class="sub">Gradients, glassmorphism, neon pulses—switch instantly.</p>
      </div>
      <button class="close-btn" on:click={onClose} aria-label="Close theme menu">✕</button>
    </div>
    <div class="theme-grid">
      {#each themes as theme}
        <button
          class={`theme-card ${$selectedTheme === theme.id ? 'active' : ''}`}
          style={`--accent:${theme.accent};`}
          on:click={() => chooseTheme(theme.id)}
        >
          <div class="theme-card__badge">{theme.name}</div>
          <div class="theme-card__preview">
            <span class="chip" aria-hidden="true"></span>
            <span class="chip" aria-hidden="true"></span>
            <span class="chip" aria-hidden="true"></span>
            <div class="glass"></div>
          </div>
          <div class="theme-card__footer">Click to apply</div>
        </button>
      {/each}
    </div>
  </div>
{/if}

<style>
  .theme-menu {
    position: absolute;
    top: 76px;
    right: 24px;
    width: min(420px, 90vw);
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    box-shadow: 0 20px 80px rgba(0, 0, 0, 0.18);
    border-radius: 18px;
    padding: 16px;
    z-index: 50;
    animation: float-in 220ms ease;
  }

  :global(html.dark) .theme-menu,
  :global([data-theme="dark"]) .theme-menu,
  :global([data-theme="cyber"]) .theme-menu {
    background: rgba(15, 23, 42, 0.9);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .theme-menu__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
  }

  .eyebrow {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 11px;
    color: var(--text-secondary);
  }

  h3 {
    margin: 2px 0 4px;
    font-size: 20px;
    color: var(--text-primary);
  }

  .sub {
    margin: 0;
    color: var(--text-secondary);
    font-size: 13px;
  }

  .close-btn {
    border: none;
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border-radius: 12px;
    width: 36px;
    height: 36px;
    cursor: pointer;
    font-weight: 700;
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
    transition: transform 120ms ease, box-shadow 120ms ease;
  }

  .close-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
  }

  .theme-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }

  .theme-card {
    position: relative;
    border: 1px solid rgba(0, 0, 0, 0.04);
    border-radius: 14px;
    padding: 10px;
    /* Keep the card tinted, not black, even on dark themes */
    background: color-mix(in srgb, var(--accent-strong) 18%, var(--bg-secondary));
    cursor: pointer;
    text-align: left;
    overflow: hidden;
    transition: transform 160ms ease, box-shadow 200ms ease, border-color 160ms ease;
    animation: pulse-card 2600ms ease-in-out infinite;
  }

  .theme-card.active {
    border-color: rgba(255, 255, 255, 0.6);
    box-shadow: 0 14px 40px rgba(0, 0, 0, 0.18), var(--panel-glow, 0 0 0 rgba(0,0,0,0));
    transform: translateY(-2px) scale(1.01);
  }

  .theme-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--accent);
    opacity: 0.6;
    filter: blur(26px);
    transform: translateZ(0);
    z-index: 0;
    background-size: 180% 180%;
    animation: drift 5400ms ease-in-out infinite;
  }

  .theme-card::after {
    content: '';
    position: absolute;
    inset: 1px;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0));
    mix-blend-mode: screen;
    opacity: 0.35;
    pointer-events: none;
  }

  .theme-card__badge {
    position: relative;
    display: inline-flex;
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.8);
    color: #0f172a;
    font-weight: 700;
    font-size: 12px;
    z-index: 1;
  }

  :global(html.dark) .theme-card__badge,
  :global([data-theme="dark"]) .theme-card__badge,
  :global([data-theme="cyber"]) .theme-card__badge {
    background: rgba(15, 23, 42, 0.85);
    color: #e2e8f0;
  }

  .theme-card__preview {
    position: relative;
    margin: 10px 0;
    height: 82px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.7);
    overflow: hidden;
    z-index: 1;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    padding: 10px;
    align-items: center;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
  }

  :global(html.dark) .theme-card__preview,
  :global([data-theme="dark"]) .theme-card__preview,
  :global([data-theme="cyber"]) .theme-card__preview {
    background: rgba(15, 23, 42, 0.9);
  }

  .chip {
    display: block;
    height: 16px;
    border-radius: 8px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.65));
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
    animation: pop 900ms ease forwards;
  }

  .chip:nth-child(1) { animation-delay: 40ms; }
  .chip:nth-child(2) { animation-delay: 120ms; }
  .chip:nth-child(3) { animation-delay: 200ms; }

  .glass {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.1));
    mix-blend-mode: screen;
    pointer-events: none;
    animation: shimmer 3200ms ease-in-out infinite;
  }

  .theme-card__footer {
    position: relative;
    z-index: 1;
    color: var(--text-secondary);
    font-size: 12px;
  }

  @keyframes float-in {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes drift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  @keyframes pop {
    0% { transform: translateY(6px) scale(0.9); opacity: 0; }
    60% { transform: translateY(-3px) scale(1.04); opacity: 1; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }

  @keyframes shimmer {
    0% { opacity: 0.12; transform: translateX(-8%); }
    50% { opacity: 0.32; transform: translateX(4%); }
    100% { opacity: 0.12; transform: translateX(-8%); }
  }

  @keyframes pulse-card {
    0% { box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08); }
    50% { box-shadow: 0 10px 26px rgba(0, 0, 0, 0.12), var(--panel-glow, 0 0 0 rgba(0,0,0,0)); }
    100% { box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08); }
  }
</style>
