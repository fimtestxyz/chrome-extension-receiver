# Chrome HTTP Traffic Capture & Forward Extension - Implementation Plan

## Overview

A Chrome Extension (Manifest V3) that captures HTTP traffic from whitelisted URLs using the Chrome DevTools Protocol (CDP) and forwards captured requests/responses to a local Python API service.

## Architecture

### Chrome Extension Side

```
┌─────────────────────────────────────────────────────────────────┐
│                     Chrome Extension                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐  ┌──────────────────────────────────────┐   │
│  │  Options Page  │──│  chrome.storage.local (Config)       │   │
│  └────────────────┘  │ - whitelist patterns                 │   │
 │                     │ - backend API endpoint               │   │
 │  ┌────────────────┐ │ - extension settings                 │   │
 │  │  Popup UI      │ └──────────────────────────────────────┘   │
 │  └────────────────┘                   │                        │
│                                        │                        │
│  ┌─────────────────────────────────────▼────────────────────┐   │
│  │              Service Worker (background.js)                │   │
│  │                                                              │   │
│  │  1. Attach chrome.debugger to active tabs                   │   │
│  │  2. Enable CDP Network domain                               │   │
│  │  3. Listen to Network events:                               │   │
│  │     - Network.requestWillBeSent                             │   │
│  │     - Network.responseReceived                              │   │
│  │     - Network.loadingFinished                               │   │
│  │  4. Filter by whitelist patterns                            │   │
│  │  5. Capture headers + body                                  │   │
│  │  6. Forward to Python API                                   │   │
│  │  7. Maintain offline queue                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP POST
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                    Python API Service                             │
│                    (localhost:8000)                               │
├───────────────────────────────────────────────────────────────────┤
│  POST /capture    - Receive HTTP traffic data                    │
│  GET /health      - Health check                                 │
│  GET /stats       - Capture statistics                           │
└───────────────────────────────────────────────────────────────────┘
```

### Chrome DevTools Protocol (CDP) Flow

```
Tab opened/updated
    │
    ▼
chrome.debugger.attach(tabId, '1.3')
    │
    ▼
Network.enable()
    │
    ├─► Network.requestWillBeSent      → Capture request details
    │     - method, url, headers
    │     - postData (for POST/PUT)
    │     - request ID
    │
    ├─► Network.responseReceived       → Check response status
    │     - request ID, status, headers
    │     - response type (XHR, fetch, etc)
    │
    └─► Network.loadingFinished        → Get response body
          - request ID
          - Use Network.getResponseBody(requestId)
          - Forward complete payload to Python API
```

## Technology Stack

### Chrome Extension
- **Manifest Version:** V3
- **Permissions:**
  - `debugger` - Required for CDP access
  - `storage` - Persist whitelist and config
  - `tabs` - List and attach to tabs
- **CDP Domains Used:**
  - `Network` - HTTP traffic capture
  - `Page` - (Optional) Page lifecycle events

### Python API
- **Framework:** Flask (lightweight, easy to run locally)
- **Package Manager:** `uv` (fast Python package installer and resolver)
- **Project Root:** `backend/` folder
- **Optional:** FastAPI for async support if high throughput needed
- **Data Storage:** SQLite (optional) for persistence

## Key Design Decisions

### 1. Debugger Attachment Strategy
**Issue:** CDP requires attaching `chrome.debugger` to each tab.

**Solution:**
- Auto-attach to tabs on `chrome.tabs.onActivated`
- Attach to tabs when extension is enabled
- Listen for `chrome.debugger.onDetach` and handle reconnection
- User sees "Chrome is being controlled by automated software" banner (CDP limitation)

**Alternative:** Manual attach via popup UI (less annoying, more user control)

**Decision:** Semi-automatic - attach to tabs opened/enabled by user action, provide toggle in options

### 2. Whitelist Pattern Matching
**Challenge:** How to match URLs flexibly?

**Options:**
1. **Regex patterns** (`.*\.api\.example\.com/.*`) - Most flexible, complex to explain
2. **URL patterns** (`https://api.example.com/*`) - Chrome-style, easier
3. **Exact URLs** - Too restrictive

**Decision:** Chrome-style URL patterns (`*://api.example.com/*`)
- Protocol wildcards: `*://` (http, https)
- Path wildcards: `/path/*`
- Host wildcards: not supported by Chrome, will use regex conversion

### 3. Request Body Capture
**Issue:** POST body is not always available

**Solution:**
- Get POST data from `Network.requestWillBeSent.postData` (if provided)
- For `multipart/form-data` requests, body may be truncated/binary - handle gracefully
- Store as base64 for binary payloads

### 4. Response Body Capture
**Issue:** Response body must be retrieved after loading completes

**Solution:**
- Use `Network.getResponseBody(requestId)` in `loadingFinished` handler
- Works for text-based responses (JSON, HTML, XML, text)
- For binary responses (images, videos), body may be empty or truncated
- Handle errors gracefully (some responses can't be captured)

### 5. Offline Queue
**Problem:** Python API may be down/unreachable

**Solution:**
- Queue failed forwards in `chrome.storage.local`
- Retry with exponential backoff
- Queue limit: 500 items (prevent storage bloat)
- Queue flush on successful API connection

### 6. Privacy & Security
**Considerations:**
- User explicitly whitelists URLs (opt-in)
- Data forwarded to localhost only (not to cloud)
- Add clear/uninstall button to wipe all data
- Don't capture requests to localhost (avoid loops)
- Sanitize sensitive headers (Authorization, Cookie) - configurable

### 7. Python API Rate Limiting
**Problem:** High-frequency API calls could overwhelm local server

**Solution:**
- Batch multiple captures in single POST (reduce network roundtrips)
- Throttle captures (max 10/second per tab)
- Python API handles并发 gracefully

## Data Structures

### Config (chrome.storage.local)
```javascript
{
  "enabled": true,
  "backendUrl": "http://localhost:8000",
  "backendEndpoint": "/capture",
  "whitelist": [
    {
      "id": "uuid-1",
      "pattern": "*://api.example.com/*",
      "enabled": true,
      "description": "API Example"
    }
  ],
  "settings": {
    "captureHeaders": true,
    "sanitizeHeaders": ["authorization", "cookie, "set-cookie"],
    "maxQueueSize": 500,
    "batchInterval": 5000,  // Batch captures every 5s
    "retryAttempts": 3
  }
}
```

### Capture Payload (sent to Python API)
```javascript
{
  "timestamp": 1704067200000,
  "tabId": 12345,
  "tabTitle": "Dashboard - My App",
  "tabUrl": "https://dashboard.example.com",

  "request": {
    "requestId": "12345.678",
    "method": "POST",
    "url": "https://api.example.com/users",
    "headers": {
      "content-type": "application/json",
      "user-agent": "..."
    },
    "body": "{\"name\":\"John\"}",
    "postData": "{\"name\":\"John\"}",  // Same as body
    "resourceType": "xhr"
  },

  "response": {
    "status": 200,
    "statusText": "OK",
    "headers": {
      "content-type": "application/json",
      "content-length": "42"
    },
    "body": "{\"id\":123,\"name\":\"John\"}",
    "base64Encoded": false
  },

  "timing": {
    "startTime": 123.456,
    "endTime": 126.789,
    "duration": 3.333
  }
}
```

### Queue Entry (chrome.storage.local)
```javascript
{
  "id": "queue-uuid",
  "timestamp": 1704067200000,
  "payload": { /* capture payload */ },
  "attempts": 0,
  "nextRetry": 1704067260000
}
```

## User Interface

### Options Page
```
┌─────────────────────────────────────────────────────────────┐
│  HTTP Traffic Capture Settings                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Extension Status: [ENABLED]  🟢 ON │ OFF                    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Backend Configuration                                   │ │
│  │                                                         │ │
│  │ API Base URL: [http://localhost:8000          ]        │ │
│  │ Endpoint:      [/capture                         ]      │ │
│  │                [Test Connection  ✓]                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ URL Whitelist                                           │ │
│  │                                                         │ │
│  │ Add Pattern: [*://api.example.com/*           ] [Add]   │ │
│  │                                                         │ │
│  │ ✅ *://api.github.com/*              [Delete]           │ │
│  │ ✅ *://api.stripe.com/*              [Delete]           │ │
│  │ ⬜ *://*/api/*                       [Delete]           │ │
│  │                                                         │ │
│  │ Examples:                                               │ │
│  │ • *://api.example.com/*     - Match any protocol       │ │
│  │ • https://api.example.com/  - HTTPS only, exact path   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Advanced Settings                                       │ │
│  │                                                         │ │
│  │ Max Queue Size:    [500        ]                        │ │
│  │ Capture Headers:   [✓]                                 │ │
│  │ Sanitize Secrets:  [✓] (remove auth/cookie headers)    │ │
│  │ Retry Attempts:    [3  ]                                │ │
│  │                                                         │ │
│  │ [Export Config]  [Import Config]  [Reset to Defaults]  │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Queue Status: 12 pending  |  [Clear Queue]                │
│                                                              │
│                                            [Save Settings]   │
└──────────────────────────────────────────────────────────────┘
```

### Popup UI
```
┌──────────────────────────────────┐
│  📥 Traffic Capture              │
├──────────────────────────────────┤
│  Status: 🟢 Capturing (3 tabs)   │
│                                  │
│  Recent Captures:                │
│  • 201 POST /api/users           │
│    200 OK (45ms)                 │
│  • 200 GET /api/posts            │
│    200 OK (23ms)                 │
│  • 401 GET /api/profile          │
│    401 Unauthorized (11ms)       │
│                                  │
│  Queue: 12 pending | [Flush]     │
│                                  │
│  [Settings]  [Pause]             │
└──────────────────────────────────┘
```

## Development Phases

### Phase 1: Core Infrastructure
- [ ] Options page UI with whitelist and backend config
- [ ] Basic service worker with storage management
- [ ] Python Flask API scaffold with `/capture` endpoint
- [ ] Integration test: manual capture → API receive

### Phase 2: CDP Integration
- [ ] `chrome.debugger` attachment logic
- [ ] CDP Network domain enable
- [ ] Request event handling (`requestWillBeSent`)
- [ ] Response event handling (`responseReceived`, `loadingFinished`)
- [ ] Response body capture with `getResponseBody`

### Phase 3: Whitelist Filtering
- [ ] URL pattern matching engine (wildcard → regex conversion)
- [ ] Filter events by whitelist
- [ ] Add pattern syntax documentation

### Phase 4: API Forwarding & Queue
- [ ] POST captured data to Python API
- [ ) Queue system for offline/retry
- [ ] Batch sending optimization
- [ ] Error handling and logging

### Phase 5: Polish & Testing
- [ ] Edge case handling (binary responses, CORS, etc)
- [ ] Privacy/sanitization option
- [ ] User notifications (badge count, popup alerts)
- [ ] Comprehensive test suite

## Limitations & Known Issues

1. **Debugger Banner:** Users see "Chrome is being controlled by automated software" banner
2. **Body Access:** Some response bodies can't be captured (binary, large)
3. **DevTools Conflict:** Opening DevTools may detach debugger (need reconnection logic)
4. **Resource Limits:** Chrome storage has size limits (~10GB but quota-limited)
5. **Localhost Only:** Python API must run on `localhost` due to CORS/security

## Security Considerations

1. **User Consent:** Only whitelisted URLs captured (explicit opt-in)
2. **Local Backend:** Data only forwarded to localhost (no cloud transmission)
3. **Sensitive Data:** Optionally sanitize auth headers/cookies
4. **Storage Encryption:** (Optional) Encrypt queued data in storage
5. **Manifest Review:** Required permissions clearly explained to user

## Future Enhancements

1. **Response Modification:** (Not for this MVP) Modify responses via CDP
2. **Mocking/Stubbing:** (Not for this MVP) Whitelist-based API mocking
3. **Diff Views:** Compare similar API calls
4. **Har Export:** Export captured traffic as HAR file
5. **Search/Filter:** Search captured requests
6. **Websocket Support:** Capture WebSocket messages via CDP Runtime domain

## References

- [Chrome DevTools Protocol - Network Domain](https://chromedevtools.github.io/devtools-protocol/tot/Network/)
- [chrome.debugger API](https://developer.chrome.com/docs/extensions/reference/api/debugger)
- [Manifest V3 Debugger Permission](https://developer.chrome.com/docs/extensions/mv3/manifest/debugger/)