import type { UrlRule, ToolbarConfig } from '../types';

interface MatchResult {
  matched: boolean;
  rule?: UrlRule;
  priority: number;
}

class URLMatcher {
  private cache = new Map<string, MatchResult>();
  private maxCacheSize = 1000;

  // Parse URL into components
  private parseUrl(url: string): {
    protocol: string;
    hostname: string;
    pathname: string;
    search: string;
    hash: string;
    origin: string;
  } {
    try {
      const urlObj = new URL(url);
      return {
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
        pathname: urlObj.pathname,
        search: urlObj.search,
        hash: urlObj.hash,
        origin: urlObj.origin,
      };
    } catch (error) {
      // Fallback for invalid URLs
      const match = url.match(/^https?:\/\/([^\/]+)(.*)$/);
      if (match) {
        return {
          protocol: 'https:',
          hostname: match[1],
          pathname: match[2] || '',
          search: '',
          hash: '',
          origin: `https://${match[1]}`,
        };
      }
      throw new Error(`Invalid URL: ${url}`);
    }
  }

  // Convert glob pattern to regex
  private globToRegex(pattern: string): RegExp {
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexPattern = pattern
      .split(/\*+/)
      .map(escapeRegex)
      .join('.*');
    return new RegExp(`^${regexPattern}$`);
  }

  // Test if URL matches a single rule
  private testRule(url: string, rule: UrlRule): boolean {
    const urlInfo = this.parseUrl(url);
    const { pattern, type } = rule;

    try {
      switch (type) {
        case 'host':
          // Host-only matching (e.g., 'github.com', '*.github.com')
          if (pattern === '*') {
            return true;
          }
          if (pattern.includes('*')) {
            const regex = this.globToRegex(pattern);
            return regex.test(urlInfo.hostname);
          }
          return urlInfo.hostname === pattern || urlInfo.hostname.endsWith(`.${pattern}`);

        case 'path':
          // Host + path matching (e.g., 'github.com/user/repo')
          if (pattern.includes('*')) {
            const regex = this.globToRegex(pattern);
            return regex.test(`${urlInfo.hostname}${urlInfo.pathname}`);
          }
          return `${urlInfo.hostname}${urlInfo.pathname}` === pattern;

        case 'full':
          // Full URL matching (exact or with glob)
          if (pattern.includes('*')) {
            const regex = this.globToRegex(pattern);
            return regex.test(url);
          }
          return url === pattern;

        case 'regex':
          // Regular expression matching
          const regex = new RegExp(pattern);
          return regex.test(url);

        default:
          return false;
      }
    } catch (error) {
      console.error(`Error testing rule ${rule.id}:`, error);
      return false;
    }
  }

  // Test URL against multiple rules
  testRules(url: string, rules: UrlRule[]): MatchResult {
    // Check cache first
    const cacheKey = `${url}:${JSON.stringify(rules.map(r => r.id).sort())}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const enabledRules = rules.filter(rule => rule.enabled);

    // Sort rules by priority (lower number = higher priority)
    const sortedRules = [...enabledRules].sort((a, b) => a.priority - b.priority);

    let bestMatch: MatchResult = { matched: false, priority: Infinity };

    for (const rule of sortedRules) {
      if (this.testRule(url, rule)) {
        if (rule.priority < bestMatch.priority) {
          bestMatch = {
            matched: true,
            rule,
            priority: rule.priority,
          };
        }
      }
    }

    // Cache the result
    this.cache.set(cacheKey, bestMatch);

    // Limit cache size
    if (this.cache.size > this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    return bestMatch;
  }

  // Check if URL should be enabled based on whitelist/blacklist rules
  shouldEnable(url: string, rules: UrlRule[]): boolean {
    const whitelistRules = rules.filter(rule => rule.enabled && rule.isWhitelist);
    const blacklistRules = rules.filter(rule => rule.enabled && !rule.isWhitelist);

    // If no whitelist rules, allow by default (unless blacklisted)
    if (whitelistRules.length === 0) {
      const blacklistMatch = this.testRules(url, blacklistRules);
      return !blacklistMatch.matched;
    }

    // Check whitelist
    const whitelistMatch = this.testRules(url, whitelistRules);
    if (!whitelistMatch.matched) {
      return false;
    }

    // Check blacklist (blacklist overrides whitelist)
    const blacklistMatch = this.testRules(url, blacklistRules);
    return !blacklistMatch.matched;
  }

  // Get matching rules for a URL
  getMatchingRules(url: string, rules: UrlRule[]): UrlRule[] {
    console.log('🔍 URL Matcher: getMatchingRules called with:', { url, rulesCount: rules.length });
    const matchingRules = rules.filter(rule => {
      console.log('🔍 URL Matcher: Testing rule:', rule.id, rule.pattern, 'enabled:', rule.enabled);
      const matches = rule.enabled && this.testRule(url, rule);
      console.log('🔍 URL Matcher: Rule', rule.id, 'matches:', matches);
      return matches;
    });
    console.log('🔍 URL Matcher: Final matching rules:', matchingRules.map(r => r.id));
    return matchingRules;
  }

  // Get toolbar buttons for a URL based on rules (legacy support)
  getToolbarButtonsForUrl(url: string, rules: UrlRule[], allButtons: any[]): any[] {
    console.log('🔍 URL Matcher: getToolbarButtonsForUrl called with:', { url, rulesCount: rules.length, buttonsCount: allButtons.length });
    const matchingRules = this.getMatchingRules(url, rules);
    const matchingRuleIds = new Set(matchingRules.map(rule => rule.id));

    console.log('🔍 URL Matcher: Matching rule IDs:', Array.from(matchingRuleIds));

    const result = allButtons.filter(button => {
      console.log('🔍 URL Matcher: Testing button:', button.id, button.enabled, button.urlRuleIds);
      if (!button.enabled) return false;

      // If button has no specific rule associations, show it
      if (!button.urlRuleIds || button.urlRuleIds.length === 0) {
        console.log('🔍 URL Matcher: Button', button.id, 'has no URL rule associations, showing');
        return true;
      }

      // Check if button is associated with any matching rule
      const matches = button.urlRuleIds.some((ruleId: string) => matchingRuleIds.has(ruleId));
      console.log('🔍 URL Matcher: Button', button.id, 'rule IDs', button.urlRuleIds, 'matches:', matches);
      return matches;
    });

    console.log('🔍 URL Matcher: Final matching buttons:', result.map(b => b.id));
    return result;
  }

  // Get toolbars for a URL based on new configuration structure
  getToolbarsForUrl(url: string, toolbars: ToolbarConfig[]): ToolbarConfig[] {
    console.log("toolbars:", url, toolbars)
    return toolbars.filter(toolbar => {
      if (!toolbar.enabled) return false;

      // If toolbar has no website patterns, show it everywhere
      if (!toolbar.websitePatterns || toolbar.websitePatterns.length === 0) {
        return true;
      }

      // Check if URL matches any of the toolbar's website patterns
      return toolbar.websitePatterns.some(pattern => {
        if (!pattern.enabled) return false;
        return this.testWebsitePattern(url, pattern.pattern);
      });
    });
  }

  // Test URL against a website pattern
  private testWebsitePattern(url: string, pattern: string): boolean {
    try {
      const urlInfo = this.parseUrl(url);

      // Handle different pattern types
      if (pattern === '*') {
        return true;
      }

      // Handle wildcard patterns like *.github.com
      if (pattern.includes('*')) {
        const regex = this.globToRegex(pattern);
        return regex.test(urlInfo.hostname);
      }

      // Handle exact domain match
      if (pattern.includes('.') && !pattern.includes('/')) {
        return urlInfo.hostname === pattern || urlInfo.hostname.endsWith(`.${pattern}`);
      }

      // Handle full URL patterns
      if (pattern.includes('://')) {
        if (pattern.includes('*')) {
          const regex = this.globToRegex(pattern);
          return regex.test(url);
        }
        return url === pattern;
      }

      // Default to hostname match
      return urlInfo.hostname === pattern || urlInfo.hostname.endsWith(`.${pattern}`);
    } catch (error) {
      console.error(`Error testing website pattern ${pattern}:`, error);
      return false;
    }
  }

  // Test a rule pattern against a URL (for UI validation)
  validateRule(pattern: string, type: UrlRule['type'], testUrl: string): boolean {
    try {
      const testRule: UrlRule = {
        id: 'test',
        name: 'Test Rule',
        type,
        pattern,
        enabled: true,
        priority: 0,
        isWhitelist: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      return this.testRule(testUrl, testRule);
    } catch (error) {
      return false;
    }
  }

  // Get rule examples for UI
  getRuleExamples(): Array<{ type: UrlRule['type']; examples: string[]; description: string }> {
    return [
      {
        type: 'host',
        examples: ['github.com', '*.github.com', 'stackoverflow.com'],
        description: 'Match specific domain names or subdomains'
      },
      {
        type: 'path',
        examples: ['github.com/user/repo', 'stackoverflow.com/questions/*'],
        description: 'Match specific domain and path combinations'
      },
      {
        type: 'full',
        examples: ['https://github.com/user/repo', '*://*.github.com/*'],
        description: 'Match complete URLs with optional wildcards'
      },
      {
        type: 'regex',
        examples: ['https?://.*\\.github\\.com/.*', '^https://(www\\.)?google\\.com/search'],
        description: 'Use regular expressions for advanced matching'
      }
    ];
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache statistics
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
    };
  }
}

export const urlMatcher = new URLMatcher();