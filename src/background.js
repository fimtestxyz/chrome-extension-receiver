import PatternMatcher from './pattern-matcher.js';
import QueueManager from './queue-manager.js';

// State tracking
const activeDebuggers = new Map(); // tabId -> debuggerState
const requestCache = new Map();    // requestId -> requestData

/**
 * Forward a capture to the backend
 */
async function forwardToApi(payload) {
    try {
      const config = await chrome.storage.local.get(['backendUrl', 'backendEndpoint', 'settings']);
      let baseUrl = (config.backendUrl || 'http://localhost:8000').replace(/\/$/, '');
      let endpoint = (config.backendEndpoint || '/capture');
      if (!endpoint.startsWith('/')) endpoint = '/' + endpoint;
      endpoint = endpoint.replace(/\/$/, '');

      const url = baseUrl + endpoint;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      console.log('Successfully forwarded capture to API');
    } catch (e) {
      console.warn('API Forward failed, queuing for retry:', e.message);
      await QueueManager.enqueue(payload);
    }
  }

/**
 * CDP Event Handlers
 */
const CDP_HANDLERS = {
  'Network.requestWillBeSent': (params, tabId) => {
    const { requestId, request } = params;
    const url = request.url;

    // 1. Check Whitelist
    chrome.storage.local.get(['whitelist'], (res) => {
      const groupName = PatternMatcher.matches(url, res.whitelist);
      if (!groupName) return;

      console.log(`[Capture] Request: ${request.method} ${url} [Group: ${groupName}]`);

      // Store request metadata
      requestCache.set(requestId, {
        requestId,
        tabId,
        timestamp: Date.now(),
        group_name: groupName,
        request: {
          method: request.method,
          url: url,
          headers: request.headers,
          postData: request.postData,
          resourceType: params.type
        }
      });
    });
  },

  'Network.responseReceived': (params, tabId) => {
    const { requestId, response } = params;
    const reqData = requestCache.get(requestId);
    if (!reqData) return;

    reqData.response = {
      status: response.status,
      headers: response.headers
    };
  },

  'Network.loadingFinished': async (params, tabId) => {
    const { requestId } = params;
    const reqData = requestCache.get(requestId);
    if (!reqData) return;

    try {
      // 2. Capture Response Body
      chrome.debugger.sendCommand({ tabId }, 'Network.getResponseBody', { requestId }, (result) => {
        if (chrome.runtime.lastError) {
          console.warn('Could not get response body:', chrome.runtime.lastError.message);
          reqData.response.body = '[Unavailable]';
          reqData.response.base64Encoded = false;
        } else {
          reqData.response.body = result.body;
          reqData.response.base64Encoded = result.base64Encoded;
        }

        // 3. Forward to API
        forwardToApi(reqData);
        
        // Cleanup cache
        requestCache.delete(requestId);
      });
    } catch (e) {
      console.error('CDP Body Capture Error:', e);
    }
  }
};

/**
 * Debugger Lifecycle Management
 */
async function attachDebugger(tabId) {
  if (!tabId || typeof tabId !== 'number') {
    console.error('Invalid tabId provided to attachDebugger:', tabId);
    return;
  }

  if (activeDebuggers.has(tabId)) {
    return; // Already attached
  }

  try {
    // Check if the tab is a restricted URL (e.g., chrome://)
    const tab = await chrome.tabs.get(tabId);
    if (tab?.url?.startsWith('chrome://') || tab?.url?.startsWith('edge://') || tab?.url?.startsWith('about:')) {
      return; // Silently skip restricted URLs
    }

    await chrome.debugger.attach({ tabId }, '1.3', () => {
      if (chrome.runtime.lastError) {
        // Ignore "already attached" errors as they are harmless
        if (!chrome.runtime.lastError.message.includes('already attached')) {
          console.error(`Failed to attach to tab ${tabId}:`, chrome.runtime.lastError.message);
        }
        return;
      }

      console.log(`Debugger attached to tab ${tabId}`);
      activeDebuggers.set(tabId, true);

      // Enable Network domain
      chrome.debugger.sendCommand({ tabId }, 'Network.enable', {}, () => {
        if (chrome.runtime.lastError) console.error('Network.enable failed:', chrome.runtime.lastError.message);
      });
    });
  } catch (e) {
    console.error('Attachment error for tab ' + tabId + ':', e);
  }
}

// Handle CDP Events
chrome.debugger.onEvent.addListener((source, method, params) => {
  const tabId = source.tabId;

  if (CDP_HANDLERS[method]) {
    CDP_HANDLERS[method](params, tabId);
  }
});

// Auto-attach to tabs
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await attachDebugger(activeInfo.tabId);
});

chrome.tabs.onCreated.addListener(async (tab) => {
  if (tab.id) {
    await attachDebugger(tab.id);
  }
});

chrome.debugger.onDetach.addListener((tabId) => {
  console.log(`Debugger detached from tab ${tabId}`);
  activeDebuggers.delete(tabId);
});

// Periodic Queue Flush
setInterval(async () => {
  const queue = await QueueManager.getQueue();
  if (queue.length === 0) return;

  const now = Date.now();
  const readyToRetry = queue.filter(item => item.nextRetry <= now);

  for (const item of readyToRetry) {
    try {
      await forwardToApi(item.payload);
      // If successful, remove from queue
      await QueueManager.dequeue(); // This is simple FIFO, might need ID based remove
    } catch (e) {
      await QueueManager.markFailed(item.id);
    }
  }
}, 30000);

// Handle messages from popup and other scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getDebuggerStatus') {
    sendResponse({ active: activeDebuggers.size > 0 });
  }
  return true; // Keep channel open for async responses
});

console.log('CDP Capture Service Worker Initialized');
