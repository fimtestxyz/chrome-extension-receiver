async function updateStatus() {
  // 1. Check Debugger Status
  // Since background.js handles debugger, we check active debuggers
  // In a real extension, you'd use a message passing system to query the service worker
  chrome.runtime.sendMessage({ action: 'getDebuggerStatus' }, (response) => {
    const led = document.getElementById('debugger-led');
    const txt = document.getElementById('debugger-text');
    if (response?.active) {
      led.className = 'indicator online';
      txt.textContent = 'Active';
    } else {
      led.className = 'indicator offline';
      txt.textContent = 'Inactive';
    }
  });

  // 2. Check Backend Status
  const config = await chrome.storage.local.get(['backendUrl', 'backendEndpoint']);
  const url = (config.backendUrl || 'http://localhost:8000') + (config.backendEndpoint || '/health');
  
  try {
    const res = await fetch(url);
    if (res.ok) {
      document.getElementById('backend-led').className = 'indicator online';
      document.getElementById('backend-text').textContent = 'Online';
    }
  } catch (e) {
    document.getElementById('backend-led').className = 'indicator offline';
    document.getElementById('backend-text').textContent = 'Offline';
  }

  // 3. Check Queue
  chrome.storage.local.get(['capture_queue'], (res) => {
    const queue = res.capture_queue || [];
    document.getElementById('queue-count').textContent = `${queue.length} pending`;
  });
}

document.getElementById('open-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

setInterval(updateStatus, 2000);
updateStatus();
