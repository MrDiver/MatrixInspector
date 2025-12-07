<script>
  export let message = '';
  export let type = 'info'; // 'info', 'success', 'error', 'warning'
  export let duration = 3000;
  export let visible = false;

  let timeoutId = null;

  export function show(msg, notifType = 'info', dur = 3000) {
    message = msg;
    type = notifType;
    duration = dur;
    visible = true;

    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      visible = false;
    }, duration);
  }

  function getIcon() {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  }

  function getColor() {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      default:
        return '#3b82f6';
    }
  }
</script>

{#if visible}
  <div class="notification-container">
    <div class="notification" style:border-left-color={getColor()}>
      <span class="icon">{getIcon()}</span>
      <span class="message">{message}</span>
    </div>
  </div>
{/if}

<style>
  .notification-container {
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 9999;
  }

  .notification {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    background: white;
    border-radius: 8px;
    border-left: 4px solid;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    animation: slideIn 0.3s ease-out forwards, slideOut 0.3s ease-out 2.7s forwards;
    font-size: 14px;
    font-weight: 500;
    color: #1f2937;
    max-width: 300px;
    word-break: break-word;
  }

  .icon {
    font-weight: bold;
    font-size: 16px;
    min-width: 20px;
    text-align: center;
  }

  .message {
    flex: 1;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(400px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideOut {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(400px);
    }
  }
</style>
