# Chrome HTTP Traffic Capture & Forward Extension - Test Plan

## Test Strategy

This document outlines the comprehensive testing strategy for the Chrome Extension and Python API, covering unit tests, integration tests, end-to-end tests, and manual testing procedures.

---

## Test Environments

### Local Development
- **Chrome Version:** 88+ (stable channel)
- **Python Version:** 3.8+
- **OS:** macOS, Linux, Windows
- **Backend:** Flask development server (`localhost:8000`)

### Test Data
- Sample API endpoints (JSONPlaceholder, httpbin.org)
- Mock HTTP servers
- Local test servers

---

## Unit Tests

### Chrome Extension - JavaScript

#### `src/pattern-matcher.js`
```javascript
describe('URL Pattern Matching', () => {
  test('matches wildcard protocol', () => {
    pattern = '*://api.example.com/*'
    expect(matchesPattern('https://api.example.com/users')).toBe(true)
    expect(matchesPattern('http://api.example.com/users')).toBe(true)
  })

  test('matches path wildcards', () => {
    pattern = 'https://api.example.com/v1/*'
    expect(matchesPattern('https://api.example.com/v1/users')).toBe(true)
    expect(matchesPattern('https://api.example.com/v2/users')).toBe(false)
  })

  test('rejects non-matching domains', () => {
    pattern = '*://api.example.com/*'
    expect(matchesPattern('https://api.other.com/users')).toBe(false)
  })

  test('handles query strings', () => {
    pattern = '*://api.example.com/search*'
    expect(matchesPattern('https://api.example.com/search?q=test')).toBe(true)
  })

  test('handles regex special characters', () => {
    pattern = '*://api.example.com/users[0-9]*'
    expect(matchesPattern('https://api.example.com/users123')).toBe(true)
  })
})
```

#### `src/storage-manager.js`
```javascript
describe('Configuration Storage', () => {
  test('saves and retrieves whitelist', async () => {
    const whitelist = [{ pattern: '*://test.com/*', enabled: true }]
    await saveWhitelist(whitelist)
    const retrieved = await getWhitelist()
    expect(retrieved).toEqual(whitelist)
  })

  test('validates whitelist patterns', () => {
    expect(validatePattern('*://test.com/*')).toBe(true)
    expect(validatePattern('invalid pattern')).toBe(false)
  })
})
```

#### `src/queue-manager.js`
```javascript
describe('Offline Queue', () => {
  test('adds items to queue', async () => {
    const payload = { request: { url: 'https://api.test.com' } }
    await enqueue(payload)
    const queue = await getQueue()
    expect(queue.length).toBe(1)
    expect(queue[0].payload).toEqual(payload)
  })

  test('respects queue size limit', async () => {
    const maxSize = 500
    for (let i = 0; i < 600; i++) {
      await enqueue({ test: i })
    }
    const queue = await getQueue()
    expect(queue.length).toBe(maxSize)
  })

  test('dequeues items', async () => {
    await enqueue({ test: 1 })
    const item = await dequeue()
    expect(item.payload.test).toBe(1)
    const queue = await getQueue()
    expect(queue.length).toBe(0)
  })

  test('increments retry attempts', async () => {
    await enqueue({ test: 1 })
    await incrementRetry(queueId)
    const item = await getQueueItem(queueId)
    expect(item.attempts).toBe(1)
  })
})
```

### Python API

#### `test_capture_endpoint.py`
```python
import pytest
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_capture_endpoint_success(client):
    payload = {
        'timestamp': 1704067200000,
        'request': {'method': 'GET', 'url': 'https://api.test.com'},
        'response': {'status': 200}
    }
    response = client.post('/capture', json=payload)
    assert response.status_code == 200
    assert response.json['status'] == 'success'

def test_capture_endpoint_validation(client):
    # Missing required fields
    response = client.post('/capture', json={})
    assert response.status_code == 400

def test_capture_endpoint_batch(client):
    batch = [
        {'timestamp': 1, 'request': {}, 'response': {}},
        {'timestamp': 2, 'request': {}, 'response': {}}
    ]
    response = client.post('/capture', json={'captures': batch})
    assert response.status_code == 200
    assert response.json['received'] == 2

def test_health_endpoint(client):
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json['status'] == 'healthy'

def test_stats_endpoint(client):
    response = client.get('/stats')
    assert response.status_code == 200
    assert 'total_captures' in response.json
```

---

## Integration Tests

### Extension ↔ API Communication

#### Test 1: Successful Capture Forward
**Setup:**
- Start Python API on `localhost:8000`
- Load extension with whitelist: `*://httpbin.org/*`

**Steps:**
1. Navigate to `https://httpbin.org/get`
2. Wait for request to complete
3. Check API received payload

**Expected:**
- Extension captures request
- API receives POST to `/capture`
- Response status 200
- Queue remains empty

#### Test 2: API Offline - Queue Behavior
**Setup:**
- Stop Python API
- Load extension with whitelist

**Steps:**
1. Navigate to whitelisted URL
2. Check extension queue
3. Start Python API
4. Wait for retry interval

**Expected:**
- Request added to queue
- Queue size = 1
- After API starts, queue flushes
- Queue size = 0

#### Test 3: Pattern Matching
**Setup:**
- Whitelist: `*://api.github.com/*`

**Steps:**
1. Navigate to `https://api.github.com/users/octocat`
2. Navigate to `https://github.com/octocat` (should NOT match)

**Expected:**
- First request captured
- Second request ignored
- API receives only 1 payload

---

## End-to-End Tests (Automated)

### Using Puppeteer/Playwright

```javascript
const puppeteer = require('puppeteer');

describe('E2E: Traffic Capture', () => {
  let browser, page, extensionId;

  beforeAll(async () => {
    // Load extension
    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });
    
    // Get extension ID
    const targets = await browser.targets();
    const extensionTarget = targets.find(t => t.type() === 'service_worker');
    extensionId = extensionTarget.url().split('/')[2];
  });

  test('captures whitelisted API request', async () => {
    page = await browser.newPage();
    
    // Navigate to test page
    await page.goto('https://httpbin.org/get');
    
    // Wait for capture
    await page.waitForTimeout(2000);
    
    // Check API received data
    const response = await fetch('http://localhost:8000/stats');
    const stats = await response.json();
    expect(stats.total_captures).toBeGreaterThan(0);
  });

  test('does not capture non-whitelisted request', async () => {
    // Clear stats
    await fetch('http://localhost:8000/clear');
    
    page = await browser.newPage();
    await page.goto('https://example.com');
    await page.waitForTimeout(2000);
    
    const response = await fetch('http://localhost:8000/stats');
    const stats = await response.json();
    expect(stats.total_captures).toBe(0);
  });

  afterAll(async () => {
    await browser.close();
  });
});
```

---

## Manual Testing Procedures

### Test Case 1: Extension Installation
**Steps:**
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select extension directory
5. Check for errors in console

**Expected:**
- Extension loads without errors
- Icon appears in toolbar
- Service worker status: "Service worker (active)"

---

### Test Case 2: Options Page Configuration
**Steps:**
1. Right-click extension icon → "Options"
2. Set backend URL: `http://localhost:8000`
3. Add whitelist pattern: `*://httpbin.org/*`
4. Click "Test Connection"
5. Click "Save Settings"

**Expected:**
- Options page opens
- Connection test shows success (green checkmark)
- Settings saved (check chrome.storage.local in DevTools)
- No console errors

---

### Test Case 3: CDP Debugger Attachment
**Steps:**
1. Open new tab: `https://httpbin.org`
2. Check for debugger banner: "Chrome is being controlled..."
3. Open extension service worker console
4. Look for log: "Debugger attached to tab X"

**Expected:**
- Debugger banner appears
- Service worker logs confirm attachment
- No CDP errors

---

### Test Case 4: Request Capture (GET)
**Steps:**
1. Ensure Python API is running
2. Navigate to: `https://httpbin.org/get`
3. Check extension popup (click icon)
4. Check Python API logs

**Expected:**
- Popup shows "Recent Captures: 1"
- Python API logs show received POST
- Request details include: method=GET, url, headers

---

### Test Case 5: Request Capture (POST with Body)
**Steps:**
1. Navigate to: `https://httpbin.org/forms/post`
2. Fill out form and submit
3. Check extension popup
4. Check Python API received payload

**Expected:**
- POST request captured
- Request body includes form data
- Response captured (200 OK)

---

### Test Case 6: Response Body Capture
**Steps:**
1. Navigate to: `https://httpbin.org/json`
2. Wait for response
3. Check Python API payload

**Expected:**
- Response body contains JSON
- Body is not base64-encoded (text response)
- JSON is valid

---

### Test Case 7: Offline Queue
**Steps:**
1. Stop Python API (`Ctrl+C`)
2. Navigate to whitelisted URL
3. Open extension popup
4. Check queue status

**Expected:**
- Popup shows "Queue: 1 pending"
- No errors in console
- Request stored in chrome.storage.local

---

### Test Case 8: Queue Retry
**Steps:**
1. With items in queue, restart Python API
2. Wait 30 seconds (retry interval)
3. Check extension popup
4. Check Python API logs

**Expected:**
- Queue flushes automatically
- Popup shows "Queue: 0 pending"
- Python API receives queued payloads

---

### Test Case 9: Pattern Filtering
**Steps:**
1. Whitelist: `*://api.github.com/*`
2. Navigate to: `https://github.com` (should NOT match)
3. Navigate to: `https://api.github.com/users/octocat` (should match)

**Expected:**
- First navigation: no capture
- Second navigation: capture occurs
- Python API receives only 1 payload

---

### Test Case 10: Header Sanitization
**Steps:**
1. Enable "Sanitize Secrets" in options
2. Navigate to site with Authorization header
3. Check captured payload

**Expected:**
- `authorization` header removed
- `cookie` header removed
- Other headers preserved

---

### Test Case 11: Large Response Handling
**Steps:**
1. Navigate to URL with large response (>1MB)
2. Check extension console for errors
3. Check Python API receives payload

**Expected:**
- No crashes
- Response body may be truncated (log warning)
- Extension continues to work

---

### Test Case 12: Binary Response Handling
**Steps:**
1. Navigate to: `https://httpbin.org/image/png`
2. Check extension console
3. Check Python API payload

**Expected:**
- Response captured with `base64Encoded: true`
- Body is base64 string
- No errors

---

### Test Case 13: Redirect Handling
**Steps:**
1. Navigate to: `https://httpbin.org/redirect/2`
2. Check number of captures

**Expected:**
- Multiple requests captured (redirect chain)
- Final response is 200 OK
- Each redirect has correct status code

---

### Test Case 14: DevTools Conflict
**Steps:**
1. Attach debugger via extension
2. Open Chrome DevTools (F12)
3. Check service worker console

**Expected:**
- `chrome.debugger.onDetach` event fires
- Extension attempts to reattach
- May show "Another debugger is attached" error (expected)

---

### Test Case 15: Extension Update/Reload
**Steps:**
1. With items in queue, reload extension
2. Check queue persistence
3. Check whitelist persistence

**Expected:**
- Queue items preserved in storage
- Whitelist patterns preserved
- Extension resumes capturing

---

## Performance Tests

### Test 1: High-Frequency Requests
**Setup:**
- Whitelist: `*://httpbin.org/*`
- Script to make 100 requests/second

**Expected:**
- Extension handles all requests without crash
- Queue doesn't grow unbounded
- Memory usage remains stable

### Test 2: Memory Leak Detection
**Steps:**
1. Capture 1000+ requests over 10 minutes
2. Monitor extension memory (Task Manager)

**Expected:**
- Memory usage < 100MB
- No continuous growth pattern

### Test 3: Storage Quota
**Steps:**
1. Fill queue to 500 items
2. Attempt to add more

**Expected:**
- Queue respects 500-item limit
- Oldest items removed (FIFO)

---

## Security Tests

### Test 1: Localhost Loop Prevention
**Setup:**
- Whitelist includes `*://localhost:8000/*`

**Expected:**
- Extension detects loop
- Does NOT capture requests to backend API
- Prevents infinite recursion

### Test 2: Sensitive Header Sanitization
**Steps:**
1. Capture request with `Authorization: Bearer token`
2. Check forwarded payload

**Expected:**
- Header removed if sanitization enabled
- Header preserved if disabled

### Test 3: HTTPS Certificate Validation
**Steps:**
1. Navigate to site with invalid cert
2. Check if request captured

**Expected:**
- Browser blocks request (security)
- Extension does not capture blocked requests

---

## Cross-Browser Compatibility

| Feature | Chrome | Edge | Opera | Brave |
|---------|--------|------|-------|-------|
| CDP API | ✅ | ✅ | ✅ | ✅ |
| Debugger permission | ✅ | ✅ | ✅ | ✅ |
| Storage API | ✅ | ✅ | ✅ | ✅ |

*Note: Firefox does not support chrome.debugger API*

---

## Test Data & Fixtures

### Sample Whitelist Patterns
```json
[
  {"pattern": "*://httpbin.org/*", "enabled": true, "description": "HTTPBin"},
  {"pattern": "*://api.github.com/*", "enabled": true, "description": "GitHub API"},
  {"pattern": "*://jsonplaceholder.typicode.com/*", "enabled": true, "description": "JSONPlaceholder"}
]
```

### Sample Captured Payload
```json
{
  "timestamp": 1704067200000,
  "tabId": 12345,
  "request": {
    "method": "POST",
    "url": "https://httpbin.org/post",
    "headers": {"content-type": "application/json"},
    "body": "{\"test\":true}"
  },
  "response": {
    "status": 200,
    "headers": {"content-type": "application/json"},
    "body": "{\"args\":{},\"data\":\"{\\\"test\\\":true}\"}"
  }
}
```

---

## Bug Reporting Template

When reporting bugs, include:
- Chrome version
- Extension version
- Python API version
- Whitelist patterns
- Steps to reproduce
- Expected vs actual behavior
- Console errors (extension + API)
- Screenshot/video if UI issue

---

## Test Automation Setup

### Install Dependencies
```bash
# Extension tests
npm install --save-dev jest puppeteer playwright

# Python API tests
uv pip install pytest pytest-flask
```

### Run Tests
```bash
# Extension unit tests
npm test

# Extension e2e tests
npm run test:e2e

# Python API tests
pytest tests/

# All tests
npm run test:all
```

---

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - uses: actions/setup-python@v2
      
      - name: Install dependencies
        run: |
          npm install
          pip install -r requirements.txt
      
      - name: Run extension tests
        run: npm test
      
      - name: Run Python tests
        run: pytest
      
      - name: Run e2e tests
        run: npm run test:e2e
```

---

## Test Coverage Goals

- **Unit tests:** >80% coverage
- **Integration tests:** All critical paths
- **E2E tests:** Core user workflows
- **Manual tests:** Before each release

---

## Known Test Limitations

1. **CDP Debugger Banner:** Cannot be dismissed programmatically in tests
2. **Binary Responses:** May not capture full body (CDP limitation)
3. **WebSocket:** Not tested (future enhancement)
4. **CORS:** May interfere with some test scenarios
5. **Rate Limiting:** Some test APIs have rate limits (httpbin.org)

---

## Test Schedule

- **Pre-commit:** Unit tests (automatic via git hook)
- **Daily:** Integration tests (CI)
- **Weekly:** Full e2e suite
- **Release:** Complete manual test checklist