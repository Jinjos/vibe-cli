const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');
const matter = require('gray-matter');

/**
 * Scans for all AI tool configurations in a repository
 */
class AIConfigScanner {
  constructor() {
    // Known AI configuration file patterns
    this.configPatterns = {
      cursor: {
        legacy: ['.cursorrules'],
        modern: ['.cursor/rules']
      },
      copilot: {
        legacy: ['.github/copilot-instructions.md'],
        modern: ['.github/instructions/*.instructions.md', '.github/instructions/*.md']
      },
      claude: ['CLAUDE.md', '.claude/*.md'],
      gemini: ['GEMINI.md', '.gemini/*.md'],
      vibe: ['vibe/*.md'],
      vscode: ['.vscode/mcp.json']
    };
  }

  /**
   * Scan for all AI configurations
   */
  async scan(projectPath) {
    const result = {
      platforms: [],
      configurations: {},
      totalFiles: 0,
      totalTokens: 0,
      vibe: {
        initialized: false,
        managed: []
      }
    };

    // Check each platform
    for (const [platform, patterns] of Object.entries(this.configPatterns)) {
      const configs = await this.scanPlatform(projectPath, platform, patterns);
      
      if (configs.files.length > 0) {
        result.platforms.push(platform);
        result.configurations[platform] = configs;
        result.totalFiles += configs.files.length;
        result.totalTokens += configs.totalTokens;
      }
    }

    // Check vibe integration
    result.vibe = await this.checkVibeIntegration(projectPath, result);

    return result;
  }

  /**
   * Scan a specific platform's configuration
   */
  async scanPlatform(projectPath, platform, patterns) {
    const result = {
      files: [],
      totalTokens: 0,
      type: 'none' // 'legacy', 'modern', 'vibe-managed'
    };

    // Handle patterns that might be an object (legacy/modern) or array
    const patternList = Array.isArray(patterns) ? patterns : 
                       [...(patterns.legacy || []), ...(patterns.modern || [])];

    for (const pattern of patternList) {
      const files = await this.findFiles(projectPath, pattern);
      
      for (const file of files) {
        const fileInfo = await this.analyzeConfigFile(path.join(projectPath, file));
        fileInfo.relativePath = file;
        
        // Determine type
        if (patterns.legacy && patterns.legacy.some(p => this.matchesPattern(file, p))) {
          fileInfo.format = 'legacy';
          result.type = result.type === 'none' ? 'legacy' : result.type;
        } else if (patterns.modern && patterns.modern.some(p => this.matchesPattern(file, p))) {
          fileInfo.format = 'modern';
          result.type = 'modern';
        } else {
          fileInfo.format = 'standard';
        }

        result.files.push(fileInfo);
        result.totalTokens += fileInfo.tokens;
      }
    }

    return result;
  }

  /**
   * Find files matching a pattern
   */
  async findFiles(projectPath, pattern) {
    // If pattern contains wildcards, use glob
    if (pattern.includes('*')) {
      return await glob(pattern, { 
        cwd: projectPath,
        nodir: true,
        dot: true // Include dotfiles
      });
    }
    
    // Otherwise, check if file exists
    const filePath = path.join(projectPath, pattern);
    try {
      await fs.access(filePath);
      return [pattern];
    } catch {
      return [];
    }
  }

  /**
   * Analyze a configuration file
   */
  async analyzeConfigFile(filePath) {
    const result = {
      path: filePath,
      exists: true,
      tokens: 0,
      hasContent: false,
      frontmatter: null,
      categories: [],
      summary: ''
    };

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      result.hasContent = content.trim().length > 0;
      
      // Estimate token count (rough approximation)
      result.tokens = Math.ceil(content.length / 4);

      // Parse frontmatter if it's a markdown file
      if (filePath.endsWith('.md') || filePath.endsWith('.mdc')) {
        try {
          const parsed = matter(content);
          if (parsed.data && Object.keys(parsed.data).length > 0) {
            result.frontmatter = parsed.data;
          }
          
          // Extract categories from content
          result.categories = this.extractCategories(parsed.content);
          
          // Generate summary
          result.summary = this.generateSummary(parsed.content);
        } catch (error) {
          // Ignore frontmatter parsing errors
        }
      }

      // Handle JSON files
      if (filePath.endsWith('.json')) {
        try {
          const jsonContent = JSON.parse(content);
          result.summary = `JSON configuration with ${Object.keys(jsonContent).length} keys`;
        } catch {
          result.summary = 'Invalid JSON file';
        }
      }

    } catch (error) {
      result.exists = false;
      result.error = error.message;
    }

    return result;
  }

  /**
   * Extract categories from content
   */
  extractCategories(content) {
    const categories = [];
    const categoryKeywords = {
      'Code Standards': ['style', 'format', 'naming', 'convention', 'eslint', 'prettier'],
      'Testing': ['test', 'jest', 'mocha', 'playwright', 'cypress', 'coverage'],
      'Architecture': ['component', 'structure', 'pattern', 'design', 'api', 'database'],
      'Documentation': ['comment', 'jsdoc', 'readme', 'markdown', 'document'],
      'Performance': ['optimize', 'performance', 'speed', 'cache', 'lazy'],
      'Security': ['security', 'auth', 'encrypt', 'sanitize', 'validate'],
      'TypeScript': ['typescript', 'type', 'interface', 'generic', 'enum'],
      'React': ['react', 'jsx', 'hook', 'component', 'props', 'state'],
      'API': ['api', 'endpoint', 'rest', 'graphql', 'route'],
      'Database': ['database', 'sql', 'query', 'schema', 'migration']
    };

    const lowerContent = content.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      const matchCount = keywords.filter(keyword => lowerContent.includes(keyword)).length;
      if (matchCount >= 2 || (matchCount === 1 && keywords.some(k => lowerContent.split(k).length > 3))) {
        categories.push(category);
      }
    }

    return categories;
  }

  /**
   * Generate a summary of the content
   */
  generateSummary(content) {
    // Get first meaningful line after any headers
    const lines = content.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#') && !l.startsWith('---'));
    
    if (lines.length === 0) return 'Empty configuration';
    
    // Try to find a description or overview
    const overviewIndex = lines.findIndex(l => 
      l.toLowerCase().includes('overview') || 
      l.toLowerCase().includes('description') ||
      l.toLowerCase().includes('this ')
    );
    
    if (overviewIndex !== -1 && overviewIndex < 5) {
      return lines[overviewIndex].substring(0, 100) + (lines[overviewIndex].length > 100 ? '...' : '');
    }
    
    // Otherwise, return first meaningful line
    return lines[0].substring(0, 100) + (lines[0].length > 100 ? '...' : '');
  }

  /**
   * Check if a file matches a pattern
   */
  matchesPattern(file, pattern) {
    if (pattern.includes('*')) {
      // Convert glob pattern to regex
      const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
      return regex.test(file);
    }
    return file === pattern;
  }

  /**
   * Check vibe integration status
   */
  async checkVibeIntegration(projectPath, scanResult) {
    const vibeStatus = {
      initialized: false,
      managed: [],
      hasRedirects: {
        cursor: false,
        copilot: false,
        claude: false,
        gemini: false
      }
    };

    // Check if vibe directory exists
    if (scanResult.configurations.vibe && scanResult.configurations.vibe.files.length > 0) {
      vibeStatus.initialized = true;
    }

    // Check for vibe redirects in each platform
    if (scanResult.configurations.cursor) {
      const hasVibeRedirect = scanResult.configurations.cursor.files.some(f => 
        f.relativePath.includes('vibe.mdc')
      );
      if (hasVibeRedirect) {
        vibeStatus.managed.push('cursor');
        vibeStatus.hasRedirects.cursor = true;
      }
    }

    if (scanResult.configurations.copilot) {
      const hasVibeRedirect = scanResult.configurations.copilot.files.some(f => 
        f.relativePath.includes('vibe.instructions.md')
      );
      if (hasVibeRedirect) {
        vibeStatus.managed.push('copilot');
        vibeStatus.hasRedirects.copilot = true;
      }
    }

    // Check Claude and Gemini for vibe integration mentions
    for (const platform of ['claude', 'gemini']) {
      if (scanResult.configurations[platform]) {
        for (const file of scanResult.configurations[platform].files) {
          try {
            const content = await fs.readFile(file.path, 'utf-8');
            if (content.includes('vibe/') || content.includes('vibe directory')) {
              vibeStatus.managed.push(platform);
              vibeStatus.hasRedirects[platform] = true;
              break;
            }
          } catch {
            // Ignore read errors
          }
        }
      }
    }

    return vibeStatus;
  }
}

module.exports = { AIConfigScanner };
