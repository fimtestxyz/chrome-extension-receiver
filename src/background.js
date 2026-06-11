// Background service worker for Chrome Extension Receiver

// Listen for messages from other extensions
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    console.log('Received external message:', request);
    console.log('From extension:', sender.id);
    
    // Store the received message
    chrome.storage.local.get(['messages'], (result) => {
      const messages = result.messages || [];
      messages.push({
        timestamp: Date.now(),
        senderId: sender.id,
        data: request
      });
      
      // Keep only last 100 messages
      if (messages.length > 100) {
        messages.shift();
      }
      
      chrome.storage.local.set({ messages }, () => {
        console.log('Message stored');
      });
    });
    
    // Send response back to sender
    sendResponse({ status: 'received', timestamp: Date.now() });
    return true; // Keep channel open for async response
  }
);

// Listen for messages from within this extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received internal message:', request);
  
  if (request.action === 'getMessages') {
    chrome.storage.local.get(['messages'], (result) => {
      sendResponse({ messages: result.messages || [] });
    });
    return true;
  }
  
  if (request.action === 'clearMessages') {
    chrome.storage.local.set({ messages: [] }, () => {
      sendResponse({ status: 'cleared' });
    });
    return true;
  }
});

// Log when extension starts
console.log('Chrome Extension Receiver background service worker started');
