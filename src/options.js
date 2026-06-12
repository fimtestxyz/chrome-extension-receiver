// Options page logic

const DEFAULT_CONFIG = {
  backendUrl: 'http://localhost:8000',
  backendEndpoint: '/capture',
  whitelist: [
    { pattern: '*://httpbin.org/*', enabled: true, description: 'Test Site', group_name: 'default' }
  ],
  settings: {
    sanitizeHeaders: true,
    maxQueueSize: 500
  }
};

async function saveSettings() {
  const config = {
    backendUrl: document.getElementById('backendUrl').value,
    backendEndpoint: document.getElementById('backendEndpoint').value,
    whitelist: getWhitelistFromUI(),
    settings: {
      sanitizeHeaders: document.getElementById('sanitizeHeaders').checked,
      maxQueueSize: 500
    }
  };

  await chrome.storage.local.set(config);
  alert('Settings saved successfully!');
}

function getWhitelistFromUI() {
  const items = document.querySelectorAll('.whitelist-item');
  const whitelist = [];
  items.forEach(item => {
    whitelist.push({
      pattern: item.querySelector('.whitelist-pattern').value,
      enabled: item.querySelector('.pattern-toggle').checked,
      group_name: item.querySelector('.whitelist-group').value || 'default'
    });
  });
  return whitelist;
}

function renderWhitelist(whitelist) {
  const container = document.getElementById('whitelistContainer');
  container.innerHTML = '';

  if (!whitelist || whitelist.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">No URL patterns added yet. Add one above to start capturing traffic.</div>
      </div>
    `;
    return;
  }

  whitelist.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'whitelist-item';
    div.innerHTML = `
      <input type="checkbox" class="pattern-toggle" ${item.enabled ? 'checked' : ''} data-index="${index}" aria-label="Enable/disable pattern">
      <input type="text" class="whitelist-pattern" value="${item.pattern}" placeholder="*://example.com/*" data-index="${index}">
      <input type="text" class="whitelist-group" value="${item.group_name || 'default'}" placeholder="Group" data-index="${index}">
      <button class="btn btn-sm btn-danger delete-pattern" data-index="${index}" aria-label="Delete pattern">🗑️</button>
    `;
    container.appendChild(div);
  });
}

async function loadSettings() {
  const config = await chrome.storage.local.get();
  const settings = { ...DEFAULT_CONFIG, ...config };

  document.getElementById('backendUrl').value = settings.backendUrl;
  document.getElementById('backendEndpoint').value = settings.backendEndpoint;
  document.getElementById('sanitizeHeaders').checked = settings.settings?.sanitizeHeaders ?? true;
  
  renderWhitelist(settings.whitelist);
}

async function testConnection() {
  const url = document.getElementById('backendUrl').value + document.getElementById('backendEndpoint').value;
  const statusText = document.getElementById('status-text');
  const indicator = document.getElementById('status-indicator');
  const badge = document.getElementById('connectionStatus');

  statusText.textContent = 'Testing…';
  indicator.className = '';
  badge.className = 'status-badge';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url.replace('/capture', '/health'), {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      statusText.textContent = 'Online';
      indicator.className = 'status-online';
      badge.className = 'status-badge online';
    } else {
      throw new Error('API responded with error');
    }
  } catch (e) {
    statusText.textContent = 'Offline';
    indicator.className = 'status-offline';
    badge.className = 'status-badge offline';
  }
}

document.getElementById('saveSettings').addEventListener('click', saveSettings);
document.getElementById('addPattern').addEventListener('click', () => {
  const patternInput = document.getElementById('newPattern');
  const groupInput = document.getElementById('newGroup');
  const pattern = patternInput.value.trim();
  const groupName = groupInput.value.trim() || 'default';
  if (pattern) {
    const currentList = getWhitelistFromUI();
    currentList.push({ pattern, enabled: true, group_name: groupName });
    renderWhitelist(currentList);
    patternInput.value = '';
    groupInput.value = '';
  }
});

document.querySelectorAll('.whitelist-item').forEach(item => {
  // Use event delegation for delete buttons
});

// Since items are dynamic, use delegation
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('delete-pattern')) {
    const index = parseInt(e.target.dataset.index);
    const currentList = getWhitelistFromUI();
    currentList.splice(index, 1);
    renderWhitelist(currentList);
  }
});

document.getElementById('testConnection').addEventListener('click', testConnection);
document.getElementById('resetDefaults').addEventListener('click', async () => {
  await chrome.storage.local.clear();
  loadSettings();
});

loadSettings();
