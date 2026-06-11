# Chrome HTTP Traffic Capture & Forward Extension - Development Tasks

## Legend

- 🚧 **In Progress** - Currently working on
- ✅ **Done** - Completed
- ⏸️ **Blocked** - Waiting on dependency
- 📋 **Todo** - Not started
- 🔄 **Recurring** - Ongoing task

---

## Phase 1: Core Infrastructure

### Chrome Extension - Basic Setup
- [📋] Update manifest.json with required permissions (`debugger`, `storage`, `tabs`)
- [📋] Create options page HTML structure
- [📋] Implement options page JavaScript (whitelist management, backend config)
- [📋] Add CSS styling for options page
- [📋] Update popup UI to show extension status
- [📋] Add settings persistence with chrome.storage.local
- [📋] Create default configurations (backend URL, example whitelist)
- [📋] Add import/export config functionality

### Python API - Basic Service
- [📋] Set up backend project structure using `uv init` in `backend/`
- [📋] Create `/capture` POST endpoint
- [📋] Design data model for received captures
- [📋] Add `/health` GET endpoint (health check)
- [📋] Add `/stats` GET endpoint (capture statistics)
- [📋] Implement CORS headers for local development
- [📋] Add request validation and error handling
- [📋] Add logging for debugging

### Integration - Basic Test
- [📋] Manual test: Extension → Options page → Save config
- [📋] Manual test: Python API start → Health check
- [📋] Manual test: Extension → API connection test button
- [📋] Write unit tests for URL pattern matching

---

## Phase 2: CDP Integration

### Debugger Attachment
- [📋] Implement `chrome.debugger.attach(tabId, '1.3')`
- [📋] Handle attachment errors (tab closed, permission denied)
- [📋] Add `chrome.debugger.onDetach` event listener
- [📋] Implement reconnection logic on detach
- [📋] Auto-attach to tabs when extension enabled
- [📋] Add per-tab attachment state tracking

### CDP Network Domain
- [📋] Enable CDP Network domain via `Network.enable()` command
- [📋] Handle `chrome.debugger.onCommand` events
- [📋] Parse CDP command responses correctly
- [📋] Add error handling for CDP commands

### Event Handlers
- [📋] Handle `Network.requestWillBeSent` (capture request details)
  - [📋] Extract: request ID, method, URL, headers
  - [📋] Extract: postData (POST body)
  - [📋] Extract: resourceType (xhr, fetch, etc.)
  - [📋] Store request metadata by requestId
- [📋] Handle `Network.responseReceived` (capture response metadata)
  - [📋] Extract: request ID, status, statusText
  - [📋] Extract: response headers
  - [📋] Store response metadata by requestId
- [📋] Handle `Network.loadingFinished` (capture response body)
  - [📋] Call `Network.getResponseBody(requestId)`
  - [📋] Extract: body text, base64Encoded flag
  - [📋] Merge with request/response metadata
  - [📋] Forward complete payload to API

### Edge Cases & Error Handling
- [📋] Handle binary response bodies (set flag, don't crash)
- [📋] Handle large responses (truncation, size limits)
- [📋] Handle timeouts when fetching response body
- [📋] Handle CDP command failures gracefully
- [📋] Add comprehensive error logging

---

## Phase 3: Whitelist Filtering

### Pattern Matching Engine
- [📋] Implement wildcard-to-regex conversion function
  - [📋] Parse protocol wildcards (`*://`)
  - [📋] Parse domain/host patterns
  - [📋] Parse path wildcards (`/*`)
  - [📋] Handle query string patterns
- [📋] Add pattern syntax validation
- [📋] Add pattern testing UI in options page
- [📋] Add pattern documentation
- [📋] Pre-defined patterns for common APIs (GitHub, Stripe, etc.)

### URL Filtering Logic
- [📋] Filter requests by whitelist during event handling
- [📋] Match requests to patterns efficiently (O(n) or better)
- [📋] Cache compiled regex patterns
- [📋] Add debug logging for matches/non-matches
- [📋] Handle special cases (localhost, chrome://, extension://)

---

## Phase 4: API Forwarding & Queue

### API Forwarding
- [📋] Implement POST to Python API with captured data
- [📋] Handle network errors (API down, connection refused)
- [📋] Add timeout handling (5s default)
- [📋] Add request status tracking (sent, queued, failed)
- [📋] Batch multiple captures (reduce network roundtrips)
  - [📋] Implement batch buffer (collect 5-10 items)
  - [📋] Flush buffer on interval or size limit
  - [📋] Update Python API to accept batch payloads

### Offline Queue
- [📋] Implement queue storage in chrome.storage.local
- [📋] Queue structure: id, payload, attempts, nextRetry
- [📋] Add queue to storage on API failures
- [📋] Implement retry with exponential backoff
  - [📋] Initial delay: 2s, max: 60s
  - [📋] Max retry attempts: 3
- [📋] Implement periodic queue flush (every 30s)
- [📋] Add queue limit (500 items max)
- [📋] Add queue UI in popup and options page
- [📋] Clear queue functionality
- [📋] Export queue to file (optional)

---

## Phase 5: Polish & Testing

### Edge Case Handling
- [📋] Handle multipart/form-data requests (may not capture body)
- [📋] Handle WebSocket messages (future enhancement)
- [📋] Handle CORS preflight requests (OPTIONS method)
- [📋] Handle redirects (chain of requests)
- [📋] Handle DevTools detach conflicts
- [📋] Handle extension updates (preserve queue/config)

### Privacy & Security Features
- [📋] Add option to sanitize sensitive headers
  - [📋] Remove `authorization`, `cookie`, `set-cookie`
  - [📋] Make header sanitization configurable
- [📋] Add "exclude localhost" option (avoid loops)
- [📋] Add "clear data on uninstall" option
- [📋] Add storage encryption (optional, base64 at minimum)

### User Experience Improvements
- [📋] Add badge counter (queue size/capture count)
- [📋] Add notification sounds (optional)
- [📋] Add dark mode support
- [📋] Add keyboard shortcuts
- [📋] Add tooltips and help text
- [📋] Improve error messages (user-friendly)

### Testing & Documentation
- [📋] Write e2e tests (Puppeteer/Playwright)
- [📋] Add unit tests for pattern matching
- [📋] Add integration tests for API forwarding
- [📋] Write user guide (how to use)
- [📋] Write developer guide (how to extend)
- [📋] Add screenshots to README
- [📋] Record demo video (optional)

---

## Phase 6: Packaging & Distribution

### Release Preparation
- [📋] Create production build (minify assets)
- [📋] Create extension ZIP file
- [📋] Prepare Web Store listing
  - [📋] Write description
  - [📋] Create screenshots (1280x800, 640x400)
  - [📋] Store icons
- [📋] Package Python API (requirements.txt, setup.py)
- [📋] Create installation guide
- [📋] Create quick start guide

---

## Ongoing Maintenance

- [🔄] Monitor for Chrome CDP API changes
- [🔄] Update dependencies (Chrome APIs, Flask)
- [🔄] Fix user-reported bugs
- [🔄] Respond to user feedback
- [🔄] Update documentation
- [🔄] Performance optimization

---

## Known Technical Debt

- [📋] Consider migrating to WebSocket for real-time API communication
- [📋] Investigate using Service Worker Offscreen API for long-running tasks
- [📋] Profile memory usage (CDP event buildup)
- [📋] Add request deduplication (same request captured twice)
- [📋] Consider using IndexedDB for larger queue storage

---

## Dependencies & Prerequisites

### Required
- Chrome 88+ (CDP Network domain support)
- Chrome Developer Tools protocol version 1.3+
- **Package Manager:** `uv`
- **Python 3.8+** for backend
- **Flask 2.0+** for backend API

### Optional
- Playwright/Puppeteer for automated testing
- Chrome Web Store developer account

---

## Blocked By

- Waiting on user confirmation of Python port preference (8000 default)
- Waiting on user confirmation of default whitelist patterns

---

## Next Immediate Tasks (Priority Order)

1. [📋] **Update manifest.json** - Add debugger permission
2. [📋] **Create options page HTML** - Basic form structure
3. [📋] **Implement whitelist storage** - chrome.storage.local wrapper
4. [📋] **Basic Python API** - Flask scaffold with /capture endpoint
5. [📋] **Manual integration test** - Connect extension to API

---

## Estimated Timeline

- **Phase 1:** 2-3 hours (basic infrastructure)
- **Phase 2:** 4-6 hours (CDP integration, complex)
- **Phase 3:** 2-3 hours (whitelist logic)
- **Phase 4:** 3-4 hours (API + queue)
- **Phase 5:** 3-4 hours (testing + polish)
- **Phase 6:** 1-2 hours (packaging)

**Total:** ~15-22 hours of development

---

## Notes

- Debugger permission shows warning banner to user - this is expected CDP behavior
- Some response bodies cannot be captured (binary/encrypted) - handle gracefully
- Chrome storage has limits (~10GB total, but quota-limited per extension)
- Test thoroughly with different content types (JSON, HTML, binary)