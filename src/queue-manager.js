/**
 * API Forwarding & Queue Manager
 * Handles sending captures to the Python backend and manages an offline retry queue
 */
class QueueManager {
  constructor(maxSize = 500) {
    this.maxSize = maxSize;
    this.queueKey = 'capture_queue';
  }

  async getQueue() {
    const result = await chrome.storage.local.get([this.queueKey]);
    return result[this.queueKey] || [];
  }

  async enqueue(payload) {
    const queue = await this.getQueue();
    
    const entry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      payload,
      attempts: 0,
      nextRetry: Date.now() + 2000 // Retry in 2s
    };

    queue.push(entry);
    
    // Enforce size limit (FIFO)
    if (queue.length > this.maxSize) {
      queue.shift();
    }

    await chrome.storage.local.set({ [this.queueKey]: queue });
  }

  async dequeue() {
    const queue = await this.getQueue();
    if (queue.length === 0) return null;
    
    const item = queue.shift();
    await chrome.storage.local.set({ [this.queueKey]: queue });
    return item;
  }

  async markFailed(id) {
    const queue = await this.getQueue();
    const index = queue.findIndex(item => item.id === id);
    
    if (index !== -1) {
      queue[index].attempts++;
      // Exponential backoff: 2^attempts * 1000ms
      const delay = Math.pow(2, queue[index].attempts) * 1000;
      queue[index].nextRetry = Date.now() + delay;
      
      // If too many attempts, drop it
      if (queue[index].attempts > 5) {
        queue.splice(index, 1);
      }
      
      await chrome.storage.local.set({ [this.queueKey]: queue });
    }
  }
}

export default new QueueManager();
