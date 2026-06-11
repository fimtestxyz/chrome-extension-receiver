# Chrome Extension Receiver

A Manifest V3 Chrome extension that receives and displays messages from other extensions or external sources.

## Features

- **External Message Reception**: Listens for messages from other Chrome extensions
- **Message Storage**: Stores up to 100 recent messages in local storage
- **Popup UI**: View received messages with timestamp and sender information
- **Message Management**: Refresh and clear message history

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome_extension_receiver` directory

## Usage

### Receiving Messages

Other extensions can send messages to this extension using:

```javascript
// From another extension
chrome.runtime.sendMessage(
  'YOUR_EXTENSION_ID_HERE',  // This receiver's extension ID
  { type: 'test', data: 'Hello!' },
  (response) => {
    console.log('Response:', response);
  }
);
```

### Viewing Messages

1. Click the extension icon in Chrome toolbar
2. View received messages in the popup
3. Use "Refresh" to reload messages
4. Use "Clear All" to delete all stored messages

## File Structure

```
chrome_extension_receiver/
├── manifest.json          # Extension configuration
├── src/
│   ├── background.js      # Service worker (message handler)
│   ├── popup.html         # Popup UI
│   └── popup.js           # Popup logic
├── icons/                 # Extension icons (you need to add these)
└── README.md             # This file
```

## Required Icons

You need to provide icon files in the `icons/` directory:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

You can create simple placeholder icons or use any icon you like.

## Message Format

Messages are stored with the following structure:

```javascript
{
  timestamp: 1234567890,      // Unix timestamp
  senderId: "extension_id",   // Sender's extension ID
  data: { ... }               // The actual message payload
}
```

## Development

### Testing

1. Install the extension
2. Note the extension ID from `chrome://extensions/`
3. Create a test sender extension or use the browser console:

```javascript
// In browser console on any page
chrome.runtime.sendMessage(
  'YOUR_RECEIVER_EXTENSION_ID',
  { test: true, message: 'Hello from console!' },
  (response) => console.log(response)
);
```

### Debugging

- View service worker logs: Click "service worker" link on extension card
- View popup logs: Right-click popup → Inspect
- Check storage: Chrome DevTools → Application → Storage → Local Storage

## License

MIT
