# Performance & Feature Optimizations for Flight Data Scraper

## Executive Summary

This Chrome extension is a capable foundation for flight data scraping, leveraging CDP (Chrome DevTools Protocol) for network capture. However, for production flight data collection, significant enhancements are needed in UI/UX, functionality, and performance optimization.

---

## Current Architecture Assessment

### Strengths ✅
- **CDP Integration**: Comprehensive network event interception (request, response, body)
- **Pattern Matching**: Flexible URL whitelist system with wildcard support
- **Offline Resilience**: Queue manager with exponential backoff retry
- **Clean Separation**: Modular architecture (background, popup, options, queue, pattern matcher)

### Weaknesses ❌
- **No Real-Time Visibility**: No live feed of captured data
- **Limited Filtering**: Only URL matching, no content-based filtering or transformation
- **No Rate Limiting**: Could overwhelm backend or trigger anti-bot measures
- **Minimal Error Handling**: Basic queue retry but no detailed error tracking
- **No Data Persistence**: Captures only go to backend, no local storage history
- **Static Configuration**: No session/scenario-based profiles

---

## 1. UI/UX Enhancements

### 1.1 Popup Overhaul
**Current:** Basic status LEDs and settings link
**Recommended:** Dashboard-style popup with real-time metrics

```html
<!-- Enhanced popup layout -->
┌─────────────────────────────────┐
│ ✈️ Flight Scraper  [● Live]    │
├─────────────────────────────────┤
│ Capture Rate                    │
│ ├── 42 req/min (↑ 12%)          │
│ └── Last capture: 2s ago        │
├─────────────────────────────────┤
│ Queue Status                    │
│ ├── 127 pending                 │
│ ├── 0 failed                    │
│ └── Success: 98.2%              │
├─────────────────────────────────┤
│ Recent Captures                 │
│ ├─ ✈️ SFO→NYC $89              │
│ ├─ ✈️ LAX→SEA $145             │
│ └─ ✈️ ORD→MIA $312             │
├─────────────────────────────────┤
│ [⏸ Pause] [⬇ Export] [⚙️ Settings]│
└─────────────────────────────────┘
```

**Implementation:**
- **Live Capture Feed**: Show last 5-10 captures with extracted flight data
- **Real-time Metrics**: Requests per minute, success rate, queue depth
- **Quick Actions**: Pause/resume capture, quick export toggle
- **Visual Feedback**: Color-coded status indicators, trend arrows
- **Keyboard Shortcuts**: `Cmd/Ctrl+Shift+F` to open, space to pause

### 1.2 Options Page Redesign
**Current:** Single-column form
**Recommended:** Multi-tab interface with advanced configuration

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚙️ Settings                                      [● Backend Online] │
├─────────────────────────────────────────────────────────────────────┤
│ [Connection]  [Patterns]  [Data Rules]  [Schedule]  [Advanced]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ Connection Tab                                                        │
│ ├─ Backend URL: [http://localhost:8000         ] [🔧 Test] [🔀 Rotate]│
│ ├─ Auth Headers                                                         │
│ │  └─ [API-Key]: [•••••••••••••••••] [👁 Show]                     │
│ └─ Failover Servers                                                   │
│     ├─ http://backup1.example.com  [● Active]                        │
│     └─ http://backup2.example.com  [○ Standby]                       │
│                                                                       │
│ Patterns Tab                                                          │
│ ├─ Whitelist Patterns                                                 │
│ │  ├─ *://api.expedia.com/flights/*     [✅] [📊] [✏️] [🗑]        │
│ │  ├─ *://www.kayak.com/flights/*       [✅] [📊] [✏️] [🗑]        │
│ │  └─ *://flights.google.com/*          [⭕] [📊] [✏️] [🗑]        │
│ └─ [📥 Import Pattern Set] [📤 Export] [+ Add Custom Pattern]       │
│                                                                       │
│ Data Rules Tab                                                        │
│ ├─ Extraction Rules (JSONPath/XPath)                                  │
│ │  └─ For: *://api.expedia.com/*                                      │
│ │     ├─ $.flights[*].price → final_price                            │
│ │     ├─ $.flights[*]{airline, departure_time} → route_info        │
│ │     └─ [$] → raw_response                                          │
│ ├─ Filtering Rules                                                    │
│ │  ├─ Price range: $0 - $5000                                         │
│ │  ├─ Airlines: [x] United  [ ] Delta  [x] Southwest               │
│ │  └─ Max duration: 24h                                               │
│ └─ [+ Add Extraction Rule]                                            │
│                                                                       │
│ Schedule Tab                                                          │
│ ├─ Capture Mode: [● Continuous  ○ Periodic  ○ Manual]               │
│ ├─ Active Hours: [06:00] - [23:59]                                    │
│ ├─ Rate Limits: 60 req/min, 1000 req/hr                               │
│ └─ [🗓 Weekly Schedule] [🕒 Time Zone: PDT (UTC-7)]                   │
│                                                                       │
│ Advanced Tab                                                          │
│ ├─ Storage Management                                                  │
│ │  ├─ Max local storage: 50MB                                         │
│ │  ├─ Auto-export: Daily at 02:00                                     │
│ │  └─ Retention period: 30 days                                      │
│ ├─ Proxy Configuration                                                 │
│ │  └─ Rotation mode: [○ None  ● Random  ○ Sequential]              │
│ ├─ Headers                                                             │
│ │  └─ [x] Sanitize auth headers  [x] Add random User-Agent           │
│ └─ [🔄 Reset] [🗑 Clear Data] [💾 Save All Changes]                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 New Features - Capture Inspector Tab
Add a dedicated page for detailed capture inspection and management.

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🔍 Capture Inspector                           [● Capturing Active] │
├─────────────────────────────────────────────────────────────────────┤
│ Filters: [Patterns▼] [Status▼] [Airlines▼] [Price $0-$1000]         │
│ Search: [Search in request/response...] [🔍] [🕒 Last Hour▼]         │
├─────────────────────────────────────────────────────────────────────┤
│ 1,247 captures found  |  [📊 Analytics] [⬇ Export CSV] [🗑 Bulk Delete]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ ┌── Capture #1247 ─────────────────────────────────────────────────┐│
│ │ Expedia API                                    [2s ago]  [✅ Success]│
│ │ Route: SFO → JFK  |  Price: $89  |  Airline: United               │
│ │ Request: https://api.expedia.com/v1/flights?...                 ││
│ │ Response: 200 OK  |  1.2KB  |  Duration: 245ms                   ││
│ │ [👁 View JSON] [📋 Copy] [🔄 Re-send] [🗑]                     ││
│ └───────────────────────────────────────────────────────────────────┘│
│                                                                       │
│ ┌── Capture #1246 ─────────────────────────────────────────────────┐│
│ │ Kayak API                                      [5s ago]  [⚠ Timeout]│
│ │ Route: LAX → SEA  |  Price: $145  |  Airline: Alaska              │
│ │ Request: https://www.kayak.com/s/api/...                        ││
│ │ Response: Failed (timeout 30s)                                   ││
│ │ [👁 View Error] [🔄 Retry] [🗑]                                   ││
│ └───────────────────────────────────────────────────────────────────┘│
│                                                                       │
│ [← Previous] [Page 1 of 125] [Next →]                               │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.4 Visual Enhancements
- **Dark Mode**: Automatic dark theme based on system preferences
- **Color Coding**: Success (green), warning (yellow), error (red), pending (gray)
- **Micro-animations**: Smooth transitions, loading states, hover effects
- **Responsive Design**: Works across different screen sizes
- **Accessibility**: Keyboard navigation, ARIA labels, high contrast support
- **Toast Notifications**: Subtle feedback for actions (saved, paused, error)

---

## 2. Functionality Enhancements

### 2.1 Advanced Data Extraction & Transformation

**Current:** Capture raw request/response, no parsing
**Recommended:** Extract and transform flight-specific data

**Implementation:**

```javascript
// New module: src/data-extractor.js
const DataExtractor = {
  extractionRules: {
    expedia: {
      pattern: '*://api.expedia.com/*',
      extractors: [
        {
          name: 'flight_offers',
          jsonPath: '$.offers[*]',
          transform: (offer) => ({
            airlines: offer.airlines,
            departure: offer.departureTime,
            arrival: offer.arrivalTime,
            price: offer.price.total,
            currency: offer.price.currency,
            routes: `${offer.origin.iata} → ${offer.destination.iata}`
          })
        }
      ]
    },
    kayak: {
      pattern: '*://www.kayak.com/api/*',
      extractors: [
        {
          name: 'kayak_flights',
          jsonPath: '$.result[*]',
          transform: (flight) => ({
            airlines: flight.airlineDisplayCode,
            departure: flight.departTimeEpoch,
            arrival: flight.arriveTimeEpoch,
            price: flight.price.amount,
            currency: flight.price.currency,
            routes: flight.shortRoute
          })
        }
      ]
    }
  },

  extract(url, responseBody) {
    const rule = this.findRule(url);
    if (!rule) return { raw: responseBody };

    try {
      const data = JSON.parse(responseBody);
      const extracted = [];

      for (const extractor of rule.extractors) {
        const matches = this.extractByPath(data, extractor.jsonPath);
        extracted.push(...matches.map(extractor.transform));
      }

      return {
        extracted,
        timestamp: Date.now(),
        source: this.extractDomain(url)
      };
    } catch (e) {
      console.warn('Extraction failed, returning raw:', e);
      return { raw: responseBody };
    }
  },

  extractByPath(data, path) {
    // Simple JSONPath implementation or use library
    // Returns array of matching elements
  }
};

export default DataExtractor;
```

### 2.2 Rate Limiting & Request Control

**Current:** No rate limiting
**Recommended:** Configurable rate limiting per pattern/domain

```javascript
// New module: src/rate-limiter.js
const RateLimiter = {
  windows: {
    perSecond: new Map(),
    perMinute: new Map(),
    perHour: new Map()
  },

  check(url, limits = { sec: 10, min: 600, hr: 10000 }) {
    const key = this.extractDomain(url);
    const now = Date.now();
    const secWindow = Math.floor(now / 1000);
    const minWindow = Math.floor(now / 60000);
    const hrWindow = Math.floor(now / 3600000);

    if (!this.limitsAllowed(key, secWindow, limits.sec, 'perSecond')) {
      return { allowed: false, reason: 'second', wait: 1000 };
    }
    if (!this.limitsAllowed(key, minWindow, limits.min, 'perMinute')) {
      return { allowed: false, reason: 'minute', wait: 60000 };
    }
    if (!this.limitsAllowed(key, hrWindow, limits.hr, 'perHour')) {
      return { allowed: false, reason: 'hour', wait: 3600000 };
    }

    return { allowed: true };
  },

  limitsAllowed(key, window, limit, windowType) {
    const counter = this.windows[windowType];
    const keyWindow = `${key}_${window}`;
    const count = counter.get(keyWindow) || 0;

    if (count >= limit) return false;

    counter.set(keyWindow, count + 1);
    setTimeout(() => counter.delete(keyWindow), this.getTTL(windowType));
    return true;
  }
};

export default RateLimiter;
```

### 2.3 Smart Retry & Circuit Breaking

**Current:** Basic exponential backoff (max 5 attempts)
**Recommended:** Intelligent retry with circuit breaking and error categorization

```javascript
// Enhanced: src/queue-manager.js
class QueueManager {
  // ... existing code ...

  async markFailed(id, errorType) {
    const queue = await this.getQueue();
    const index = queue.findIndex(item => item.id === id);

    if (index !== -1) {
      const item = queue[index];
      item.attempts++;

      // Different retry strategies based on error type
      const strategies = {
        timeout: { baseDelay: 2000, maxAttempts: 3 },
        rateLimit: { baseDelay: 60000, maxAttempts: 2 },
        serverError: { baseDelay: 5000, maxAttempts: 5 },
        clientError: { baseDelay: 1000, maxAttempts: 1 }
      };

      const strategy = strategies[errorType] || strategies.serverError;
      const delay = strategy.baseDelay * Math.pow(2, item.attempts - 1);

      item.nextRetry = Date.now() + delay;
      item.errorType = errorType;
      item.lastError = new Error().stack;

      if (item.attempts >= strategy.maxAttempts) {
        item.status = 'abandoned';
        console.warn(`Item ${id} abandoned after ${item.attempts} attempts`);
      }

      await chrome.storage.local.set({ [this.queueKey]: queue });
    }
  }
}
```

### 2.4 Session & Profile Management

**Current:** Single configuration, no profiles
**Recommended:** Multiple scraping profiles for different scenarios

```javascript
// New module: src/profile-manager.js
const ProfileManager = {
  profiles: {
    domestic_us: {
      name: 'US Domestic Flights',
      patterns: ['*://api.expedia.com/flights/us/*', '*://flights.google.com/*'],
      filters: {
        origins: ['SFO', 'LAX', 'JFK', 'ORD'],
        maxPrice: 500,
        airlines: ['United', 'Delta', 'Southwest']
      },
      rateLimits: { sec: 5, min: 300, hr: 5000 },
      schedule: { start: 6, end: 23, timezone: 'America/Los_Angeles' }
    },
    international_eu: {
      name: 'Europe Flights',
      patterns: ['*://api.ryanair.com/*', '*://api.lufthansa.com/*'],
      filters: {
        origins: ['LHR', 'CDG', 'FRA', 'AMS'],
        maxPrice: 800,
        airlines: []
      },
      rateLimits: { sec: 3, min: 180, hr: 3000 },
      schedule: { start: 4, end: 22, timezone: 'Europe/London' }
    }
  },

  async setProfile(profileName) {
    const profile = this.profiles[profileName];
    if (!profile) throw new Error(`Profile not found: ${profileName}`);

    await chrome.storage.local.set({
      activeProfile: profileName,
      whitelist: profile.patterns.map(p => ({ pattern: p, enabled: true })),
      filters: profile.filters,
      rateLimits: profile.rateLimits,
      schedule: profile.schedule
    });

    console.log(`Switched to profile: ${profile.name}`);
  },

  async createProfile(name, config) {
    this.profiles[name] = {
      name,
      ...config,
      createdAt: Date.now(),
      modifiedAt: Date.now()
    };
    await chrome.storage.local.set({ profiles: this.profiles });
  }
};

export default ProfileManager;
```

### 2.5 Local Data Storage & Persistence

**Current:** Transient queue only
**Recommended:** IndexedDB for persistent capture storage

```javascript
// New module: src/storage-manager.js
const StorageManager = {
  db: null,
  DB_NAME: 'FlightScraperDB',
  DB_VERSION: 1,

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Captures store
        const capturesStore = db.createObjectStore('captures', { keyPath: 'id' });
        capturesStore.createIndex('timestamp', 'timestamp', { unique: false });
        capturesStore.createIndex('airline', 'airline', { unique: false });
        capturesStore.createIndex('price', 'price', { unique: false });
        capturesStore.createIndex('route', 'route', { unique: false });
        capturesStore.createIndex('status', 'status', { unique: false });

        // Rules store
        db.createObjectStore('rules', { keyPath: 'id', autoIncrement: true });

        // Sessions store
        db.createObjectStore('sessions', { keyPath: 'id' });
      };
    });
  },

  async saveCapture(capture) {
    const txn = this.db.transaction(['captures'], 'readwrite');
    const store = txn.objectStore('captures');
    return new Promise((resolve, reject) => {
      const request = store.add(capture);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async queryCaptures(filters, limit = 100, offset = 0) {
    const txn = this.db.transaction(['captures'], 'readonly');
    const store = txn.objectStore('captures');
    const index = filters.airline ? store.index('airline') : store;

    return new Promise((resolve, reject) => {
      const results = [];
      const keyRange = filters.airline ? IDBKeyRange.only(filters.airline) : null;

      const request = index.openCursor(keyRange);
      let count = 0;
      let skipped = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (!cursor || count >= limit) {
          resolve(results);
          return;
        }

        const capture = cursor.value;
        if (this.matchesFilters(capture, filters)) {
          if (skipped >= offset) {
            results.push(capture);
            count++;
          }
          skipped++;
        }
        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });
  },

  async exportToCSV(filters) {
    const captures = await this.queryCaptures(filters, 10000);
    const headers = ['Timestamp', 'URL', 'Airline', 'Price', 'Route', 'Status'];
    const rows = captures.map(c => [
      new Date(c.timestamp).toISOString(),
      c.url,
      c.airline,
      c.price,
      c.route,
      c.status
    ]);

    return [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${v}"`).join(','))
    ].join('\n');
  },

  async cleanup(olderThanDays = 30) {
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    const txn = this.db.transaction(['captures'], 'readwrite');
    const store = txn.objectStore('captures');

    return new Promise((resolve, reject) => {
      let deleted = 0;
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (!cursor) {
          resolve(deleted);
          return;
        }

        if (cursor.value.timestamp < cutoff) {
          cursor.delete();
          deleted++;
        }
        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });
  }
};

export default StorageManager;
```

### 2.6 Scheduling & Automation

**Current:** Continuous capture, no scheduling
**Recommended:** Configurable schedules and automation

```javascript
// New module: src/scheduler.js
const Scheduler = {
  timerId: null,

  start(schedule) {
    this.stop();

    const checkSchedule = () => {
      const now = new Date();
      const configTime = now.toLocaleTimeString('en-US', {
        timeZone: schedule.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const currentHour = parseInt(configTime.split(':')[0]);

      if (currentHour >= schedule.start && currentHour < schedule.end) {
        this.resumeCapture();
      } else {
        this.pauseCapture();
      }
    };

    // Check every minute
    this.timerId = setInterval(checkSchedule, 60000);
    checkSchedule(); // Initial check
  },

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  },

  async resumeCapture() {
    const { isPaused } = await chrome.storage.local.get('isPaused');
    if (isPaused) {
      await chrome.storage.local.set({ isPaused: false });
      chrome.action.setIcon({ path: 'icons/icon128-active.png' });
      console.log('Capture resumed by schedule');
    }
  },

  async pauseCapture() {
    await chrome.storage.local.set({ isPaused: true });
    chrome.action.setIcon({ path: 'icons/icon128-paused.png' });
    console.log('Capture paused by schedule');
  }
};

export default Scheduler;
```

### 2.7 Proxy Rotation Support

**Current:** No proxy support
**Recommended:** Rotation or sticky proxy assignment

```javascript
// New module: src/proxy-manager.js
const ProxyManager = {
  proxies: [],

  async loadProxies() {
    const config = await chrome.storage.local.get(['proxies']);
    this.proxies = config.proxies || [];
  },

  getProxy(targetUrl) {
    if (this.proxies.length === 0) return null;

    const mode = chrome.proxy.Settings;
    if (!mode) return null;

    const proxy = this.rotateProxy();
    return {
      mode: 'fixed_servers',
      rules: {
        singleProxy: {
          scheme: proxy.protocol,
          host: proxy.host,
          port: proxy.port
        }
      }
    };
  },

  rotateProxy() {
    const index = Math.floor(Math.random() * this.proxies.length);
    return this.proxies[index];
  },

  setStickyProxy(tabId, url) {
    const proxy = this.rotateProxy();
    chrome.proxy.settings.set({ value: this.getProxy(url), scope: 'regular' });
    return proxy;
  }
};

export default ProxyManager;
```

---

## 3. Performance Optimizations

### 3.1 Background Process Optimization

**Current:** Service worker may be terminated unexpectedly
**Recommended:** Keep-alive mechanism and state persistence

```javascript
// Enhanced: src/background.js
const KEEP_ALIVE_INTERVAL = 800000; // 13.3 min (Chrome limit ~30s after last message)
let keepAliveId;

function keepAlive() {
  if (keepAliveId) clearInterval(keepAliveId);

  keepAliveId = setInterval(() => {
    chrome.runtime.getPlatformInfo();
    chrome.storage.local.set({ lastHeartbeat: Date.now() });
  }, KEEP_ALIVE_INTERVAL);
}

// Initialize
keepAlive();

// Handle restart after termination
chrome.runtime.onStartup.addListener(restoreState);
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await initializeDefaultState();
  } else {
    await restoreState();
  }
});
```

### 3.2 Memory Management

**Current:** Unbounded `requestCache` in memory
**Recommended:** Size-limited cache with TTL eviction

```javascript
// Enhanced: src/background.js
class RequestCache {
  constructor(maxSize = 1000, ttlSeconds = 300) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttlSeconds * 1000;
  }

  get(requestId) {
    const entry = this.cache.get(requestId);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(requestId);
      return null;
    }

    return entry.data;
  }

  set(requestId, data) {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(requestId, {
      timestamp: Date.now(),
      data
    });
  }

  delete(requestId) {
    return this.cache.delete(requestId);
  }
}

const requestCache = new RequestCache(1000, 300);
```

### 3.3 Batch Processing

**Current:** Individual API calls per capture
**Recommended:** Batch multiple captures

```javascript
// Enhanced: src/queue-manager.js
class QueueManager {
  batchCache = [];

  async addToBatch(payload) {
    this.batchCache.push(payload);

    if (this.batchCache.length >= 50) {
      await this.flushBatch();
    }
  }

  async flushBatch() {
    if (this.batchCache.length === 0) return;

    try {
      const config = await chrome.storage.local.get(['backendUrl', 'backendEndpoint']);
      const url = (config.backendUrl || 'http://localhost:8000') + (config.backendEndpoint || '/capture/batch');

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captures: this.batchCache })
      });

      if (response.ok) {
        console.log(`Batch sent: ${this.batchCache.length} captures`);
        this.batchCache = [];
      } else {
        throw new Error(`Batch failed: ${response.status}`);
      }
    } catch (e) {
      console.warn('Batch flush failed, re-queuing:', e);
      // Re-queue all items in batch
      this.batchCache.forEach(item => this.enqueue(item));
      this.batchCache = [];
    }
  }

  startBatchFlushTimer(intervalMs = 5000) {
    setInterval(() => this.flushBatch(), intervalMs);
  }
}
```

### 3.4 Storage Optimization

**Current:** Single large queue in chrome.storage.local
**Recommended:** Partitioned storage with compression

```javascript
// Enhanced: src/storage-manager.js
const StorageManager = {
  async batchSave(items, batchSize = 10) {
    const batches = this.chunk(items, batchSize);

    for (const batch of batches) {
      await chrome.storage.local.set({
        [`queue_${Date.now()}`]: batch
      });
    }
  },

  async getQueuedItems() {
    const all = await chrome.storage.local.get();
    const queueKey = Object.keys(all).filter(k => k.startsWith('queue_'));

    return queueKey.flatMap(key => all[key]);
  },

  async compressData(data) {
    // Use TextEncoder + simple LZString-like compression
    const encoder = new TextEncoder();
    const bytes = encoder.encode(JSON.stringify(data));

    // Simple compression: replace frequent patterns
    // Production: use proper compression library
    return Array.from(bytes);
  },

  chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
};
```

### 3.5 Debugging & Monitoring

**Current:** Basic console.log
**Recommended:** Structured logging with levels

```javascript
// New module: src/logger.js
const Logger = {
  levels: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  },

  currentLevel: 1,

  async init() {
    const { logLevel } = await chrome.storage.local.get('logLevel');
    this.currentLevel = this.levels[logLevel] || this.levels.INFO;
  },

  debug(...args) {
    if (this.currentLevel <= this.levels.DEBUG) {
      console.log('[DEBUG]', new Date().toISOString(), ...args);
      this.logToStorage('debug', args);
    }
  },

  info(...args) {
    if (this.currentLevel <= this.levels.INFO) {
      console.log('[INFO]', new Date().toISOString(), ...args);
      this.logToStorage('info', args);
    }
  },

  warn(...args) {
    if (this.currentLevel <= this.levels.WARN) {
      console.warn('[WARN]', new Date().toISOString(), ...args);
      this.logToStorage('warn', args);
    }
  },

  error(...args) {
    if (this.currentLevel <= this.levels.ERROR) {
      console.error('[ERROR]', new Date().toISOString(), ...args);
      this.logToStorage('error', args);
    }
  },

  async logToStorage(level, args) {
    try {
      const logs = await chrome.storage.local.get(['logs']) || { logs: [] };
      logs.logs.push({
        level,
        timestamp: Date.now(),
        message: args.join(' ')
      });

      // Keep last 100 logs
      if (logs.logs.length > 100) {
        logs.logs = logs.logs.slice(-100);
      }

      await chrome.storage.local.set({ logs: logs.logs });
    } catch (e) {
      // Don't log failure to avoid infinite loop
    }
  }
};

export default Logger;
```

---

## 4. Anti-Detection Measures

### 4.1 Request Obfuscation

```javascript
// New module: src/stealth.js
const Stealth = {
  userAgents: [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  ],

  getRandomUA() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  },

  async spoofHeaders(request) {
    return {
      ...request.headers,
      'User-Agent': this.getRandomUA(),
      'Accept-Language': await this.getRandomLanguage(),
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Dest': 'empty'
    };
  },

  async getRandomLanguage() {
    const langs = ['en-US,en;q=0.9', 'en-GB,en;q=0.9', 'en;q=0.9'];
    return langs[Math.floor(Math.random() * langs.length)];
  },

  addRandomDelay(minMs = 100, maxMs = 2000) {
    const delay = minMs + Math.random() * (maxMs - minMs);
    return new Promise(resolve => setTimeout(resolve, delay));
  }
};

export default Stealth;
```

### 4.2 Fingerprint Randomization

```javascript
// New module: src/fingerprint.js
const Fingerprint = {
  async generateCanvasNoise() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgb(255,0,0)';
    ctx.fillRect(0, 0, 10, 10);
    ctx.fillStyle = 'rgb(0,255,0)';
    ctx.fillRect(2, 2, 6, 6);
    return canvas.toDataURL();
  },

  getSpoofedWebGL() {
    const randomVendor = ['Intel Inc.', 'NVIDIA Corporation', 'AMD'];
    const randomRenderer = [
      'Intel Iris OpenGL Engine',
      'NVIDIA GeForce RTX 3080/PCIe/SSE2',
      'AMD Radeon RX 6800 XT'
    ];

    return {
      vendor: randomVendor[Math.floor(Math.random() * randomVendor.length)],
      renderer: randomRenderer[Math.floor(Math.random() * randomRenderer.length)]
    };
  }
};
```

---

## 5. Backend Integration Improvements

### 5.1 Bi-Directional Communication

**Current:** Unidirectional send only
**Recommended:** Bidirectional WebSocket or long-polling

```javascript
// New module: src/backend-client.js
const BackendClient = {
  ws: null,

  connect(url) {
    this.ws = new WebSocket(url.replace('http', 'ws'));

    this.ws.onopen = () => {
      console.log('Backend WebSocket connected');
      chrome.action.setIcon({ path: 'icons/icon128-connected.png' });
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleCommand(message);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.reconnect();
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed, reconnecting...');
      this.reconnect();
    };
  },

  async handleCommand(command) {
    switch (command.type) {
      case 'pause_capture':
        await chrome.storage.local.set({ isPaused: true });
        break;
      case 'resume_capture':
        await chrome.storage.local.set({ isPaused: false });
        break;
      case 'set_rate_limit':
        await chrome.storage.local.set({ rateLimits: command.limits });
        break;
      case 'update_rules':
        await chrome.storage.local.set({ whitelist: command.rules });
        break;
    }
  },

  reconnect() {
    setTimeout(() => {
      const { backendUrl } = chrome.storage.local.get('backendUrl');
      this.connect(backendUrl);
    }, 5000);
  }
};

export default BackendClient;
```

### 5.2 Authentication & Security

```javascript
// Enhanced: src/background.js
async function forwardToApi(payload) {
  try {
    const config = await chrome.storage.local.get(['backendUrl', 'backendEndpoint', 'apiKey']);
    const url = (config.backendUrl || 'http://localhost:8000') + (config.backendEndpoint || '/capture');

    const headers = {
      'Content-Type': 'application/json'
    };

    // Add authentication
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error('Authentication failed, please check API key');
        // Notify user via badge
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#ff3b30' });
      }
      throw new Error(`HTTP ${response.status}`);
    }

    chrome.action.setBadgeText({ text: '' });
    console.log('Successfully forwarded capture to API');
  } catch (e) {
    console.warn('API Forward failed, queuing for retry:', e.message);
    await QueueManager.enqueue(payload);
  }
}
```

---

## 6. Testing & Quality Assurance

### 6.1 Unit Testing Framework

```javascript
// tests/background.test.js
describe('Background Service', () => {
  beforeEach(() => {
    global.chrome = {
      runtime: { sendMessage: jest.fn(), onStartup: { addListener: jest.fn() } },
      storage: { local: { get: jest.fn(), set: jest.fn() } },
      debugger: {
        sendCommand: jest.fn(),
        onEvent: { addListener: jest.fn() },
        onDetach: { addListener: jest.fn() }
      }
    };
  });

  test('should whitelist match correct URLs', () => {
    const whitelist = [{ pattern: '*://api.example.com/*', enabled: true }];
    expect(PatternMatcher.matches('https://api.example.com/flights', whitelist)).toBe(true);
    expect(PatternMatcher.matches('https://other.com/flights', whitelist)).toBe(false);
  });

  test('should respect rate limits', () => {
    const limiter = new RateLimiter();
    expect(limiter.check('http://api.example.com', { sec: 10 }).allowed).toBe(true);
    // Make 10 more calls...
    // Ensure rate limit triggers
  });
});
```

### 6.2 E2E Tests

```javascript
// tests/capture-flow.test.js
describe('Flight Capture Flow', () => {
  let browser;
  let extension;

  beforeAll(async () => {
    extension = await loadExtension();
    browser = await puppeteer.launch();
  });

  test('should capture flight data from Expedia', async () => {
    const page = await browser.newPage();
    await page.goto('https://www.expedia.com/Flights');

    // Trigger a flight search
    await page.click('[data-testid="submit-button"]');

    // Wait for capture
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify capture
    const captures = await extension.getCaptures();
    expect(captures.length).toBeGreaterThan(0);
    expect(captures[0]).toHaveProperty('destination');
  });
});
```

---

## 7. Deployment & Updates

### 7.1 Auto-Update Mechanism

```javascript
// New module: src/updater.js
const Updater = {
  async checkForUpdates() {
    const { currentVersion, updateCheckUrl } = await chrome.storage.local.get([
      'currentVersion', 'updateCheckUrl'
    ]);

    try {
      const response = await fetch(updateCheckUrl);
      const { latestVersion, downloadUrl, changelog } = await response.json();

      if (latestVersion !== currentVersion) {
        this.notifyUpdateAvailable(latestVersion, changelog);
      }
    } catch (e) {
      console.warn('Update check failed:', e);
    }
  },

  notifyUpdateAvailable(version, changelog) {
    chrome.notifications.create('update-available', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Flight Scraper Update Available',
      message: `Version ${version} is ready to install.`,
      priority: 2
    });
  }
};

export default Updater;
```

---

## 8. Summary of Prioritized Enhancements

### Phase 1: Critical (Weeks 1-2)
- [ ] Add real-time capture viewer in popup
- [ ] Implement rate limiting per domain
- [ ] Add IndexedDB for local storage
- [ ] Implement data extraction rules (JSONPath)
- [ ] Add pause/resume functionality

### Phase 2: High Priority (Weeks 3-4)
- [ ] Build capture inspector page
- [ ] Add profile/scenario management
- [ ] Implement scheduling capabilities
- [ ] Add export to CSV/JSON
- [ ] Improve error handling with categorization

### Phase 3: Medium Priority (Weeks 5-6)
- [ ] Add batch API endpoint support
- [ ] Implement WebSocket backend communication
- [ ] Add proxy rotation support
- [ ] Implement stealth features
- [ ] Add automated testing suite

### Phase 4: Enhancement (Weeks 7-8)
- [ ] Add analytics dashboard
- [ ] Implement auto-update mechanism
- [ ] Add advanced filtering
- [ ] Improve performance monitoring
- [ ] Add comprehensive logging

---

## 9. Estimated Effort

| Feature | Complexity | Time Estimate |
|---------|-----------|---------------|
| Real-time UI | Medium | 2-3 days |
| Rate Limiting | Low | 1 day |
| IndexedDB Storage | Medium | 2-3 days |
| Data Extraction | High | 3-4 days |
| Profile Management | Medium | 2-3 days |
| Scheduling | Medium | 2 days |
| Batch Processing | Low | 1 day |
| WebSocket Client | Medium | 2 days |
| Proxy Support | High | 3-4 days |
| Stealth Features | High | 4-5 days |
| Testing Suite | Medium | 3-4 days |

**Total Estimated Effort:** 4-6 weeks for full implementation

---

## 10. Recommended Tech Stack Additions

- **JSONPath:** `jsonpath-plus` for data extraction
- **Date/Time:** `date-fns` for scheduling
- **Compression:** `lz-string` for storage efficiency
- **Validation:** `zod` or `joi` for config validation
- **Testing:** `jest` + `@testing-library/chrome`
- **Build:** `esbuild` or `vite` for bundling
- **TypeScript:** Gradual type migration for safety

---

## 11. Security Considerations

1. **API Key Storage:** Use `chrome.storage.local` with encryption options
2. **HTTPS Enforcement:** Validate backend URLs, enforce HTTPS
3. **Content Sandbox:** Validate and sanitize extracted data
4. **CORS Handling:** Respect browser security model
5. **User Consent:** Clear privacy policy and permissions explanation

---

## 12. File Structure After Optimization

```
chrome_extension_receiver/
├── manifest.json
├── icons/
├── src/
│   ├── background/
│   │   ├── index.js (main entry)
│   │   ├── cdp-handler.js
│   │   ├── capture-orchestrator.js
│   │   └── websocket-client.js
│   ├── modules/
│   │   ├── data-extractor.js
│   │   ├── rate-limiter.js
│   │   ├── profile-manager.js
│   │   ├── proxy-manager.js
│   │   ├── storage-manager.js
│   │   ├── scheduler.js
│   │   ├── stealth.js
│   │   ├── logger.js
│   │   └── updater.js
│   ├── ui/
│   │   ├── popup/
│   │   │   ├── index.html
│   │   │   └── index.js
│   │   ├── options/
│   │   │   ├── index.html
│   │   │   └── index.js
│   │   └── inspector/
│   │       ├── index.html
│   │       └── index.js
│   ├── utils/
│   │   ├── pattern-matcher.js
│   │   ├── queue-manager.js
│   │   └── request-cache.js
│   └── types/
│       └── index.d.ts
├── tests/
│   ├── unit/
│   └── e2e/
└── package.json
```

---

*Generated on 2024 for Chrome Extension Receiver flight data scraping optimization*