/**
 * Pattern Matching Engine
 * Converts Chrome-style wildcard patterns (*://api.example.com/*) into Regular Expressions
 */
const PatternMatcher = {
  /**
   * Converts a wildcard pattern to a RegExp object
   * @param {string} pattern 
   * @returns {RegExp}
   */
  compile(pattern) {
    // Escape all regex special characters except *
    let escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    
    // Replace * with .* (non-greedy)
    escaped = escaped.replace(/\*/g, '.*');
    
    // Anchor to start and end
    return new RegExp(`^${escaped}$`, 'i');
  },

  /**
   * Checks if a URL matches any of the enabled patterns in the whitelist
   * @param {string} url 
   * @param {Array} whitelist 
   * @returns {boolean}
   */
  matches(url, whitelist) {
    if (!whitelist || whitelist.length === 0) return false;
    
    return whitelist.some(item => {
      if (!item.enabled) return false;
      try {
        const regex = this.compile(item.pattern);
        return regex.test(url);
      } catch (e) {
        console.error(`Invalid pattern: ${item.pattern}`, e);
        return false;
      }
    });
  }
};

export default PatternMatcher;
