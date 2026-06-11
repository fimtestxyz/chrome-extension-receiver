// Popup UI script

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString() + ' ' + date.toLocaleDateString();
}

function displayMessages(messages) {
  const container = document.getElementById('messages');
  
  if (!messages || messages.length === 0) {
    container.innerHTML = '<div class="empty-state">No messages received yet</div>';
    return;
  }
  
  // Sort by timestamp, newest first
  const sorted = [...messages].sort((a, b) => b.timestamp - a.timestamp);
  
  container.innerHTML = sorted.map(msg => `
    <div class="message">
      <div class="message-time">${formatTime(msg.timestamp)}</div>
      <div class="message-sender">From: ${msg.senderId}</div>
      <div class="message-data">${JSON.stringify(msg.data, null, 2)}</div>
    </div>
  `).join('');
}

function loadMessages() {
  chrome.runtime.sendMessage({ action: 'getMessages' }, (response) => {
    displayMessages(response.messages);
  });
}

document.getElementById('refresh').addEventListener('click', () => {
  loadMessages();
});

document.getElementById('clear').addEventListener('click', () => {
  if (confirm('Clear all received messages?')) {
    chrome.runtime.sendMessage({ action: 'clearMessages' }, () => {
      loadMessages();
    });
  }
});

// Load messages on popup open
loadMessages();
