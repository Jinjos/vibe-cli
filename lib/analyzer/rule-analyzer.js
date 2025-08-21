const fs = require('fs').promises;
const matter = require('gray-matter');

/**
 * Analyzes AI rules and instructions across platforms
 */
class RuleAnalyzer {
  constructor() {
    this.categoryKeywords = {
      'Code Standards': {
        keywords: ['style', 'format', 'naming', 'convention', 'eslint', 'prettier', 'standard', 'guideline'],
        weight: 1.5
      },
      'Testing': {
        keywords: ['test', 'jest', 'mocha', 'playwright', 'cypress', 'coverage', 'tdd', 'unit', 'integration', 'e2e'],
        weight: 1.3
      },
      'Architecture': {
        keywords: ['component', 'structure', 'pattern', 'design', 'architecture', 'folder', 'organize', 'modular'],
        weight: 1.4
      },
      'Documentation': {
        keywords: ['comment', 'jsdoc', 'readme', 'markdown', 'document', 'explain', 'description'],
        weight: 1.0
      },
      'Performance': {
        keywords: ['optimize', 'performance', 'speed', 'cache', 'lazy', 'efficient', 'fast', 'memory'],
        weight: 1.2
      },
      'Security': {
        keywords: ['security', 'auth', 'encrypt', 'sanitize', 'validate', 'permission', 'secure', 'xss', 'csrf'],
        weight: 1.5
      },
      'API Design': {
        keywords: ['api', 'endpoint', 'rest', 'graphql', 'route', 'http', 'request', 'response'],
        weight: 1.3
      },
      'Database': {
        keywords: ['database', 'sql', 'query', 'schema', 'migration', 'orm', 'transaction', 'index'],
        weight: 1.2
      },
      'Error Handling': {
        keywords: ['error', 'exception', 'catch', 'throw', 'handle', 'fallback', 'recover'],
        weight: 1.3
      },
      'Deployment': {
        keywords: ['deploy', 'docker', 'kubernetes', 'ci', 'cd', 'pipeline', 'build', 'release'],
        weight: 1.1
      }
    };
  }

  /**
   * Analyze all AI configurations for rules and patterns
   */
  async analyze(aiConfigs) {
    const analysis = {
      totalRules: 0,
      totalTokens: 0,
      byPlatform: {},
      byCategory: {},
      byCoverage: {
        wellCovered: [],
        moderate: [],
        gaps: []
      },
      duplicates: [],
      conflicts: [],
      recommendations: []
    };

    // Analyze each platform
    for (const [platform, config] of Object.entries(aiConfigs.configurations)) {
      const platformAnalysis = await this.analyzePlatform(platform, config);
      analysis.byPlatform[platform] = platformAnalysis;
      analysis.totalRules += platformAnalysis.ruleCount;
      analysis.totalTokens += platformAnalysis.totalTokens;
    }

    // Aggregate categories across platforms
    analysis.byCategory = this.aggregateCategories(analysis.byPlatform);

    // Find duplicates and conflicts
    analysis.duplicates = this.findDuplicates(analysis.byPlatform);
    analysis.conflicts = this.findConflicts(analysis.byPlatform);

    // Analyze coverage
    analysis.byCoverage = this.analyzeCoverage(analysis.byCategory);

    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  /**
   * Analyze a single platform's rules
   */
  async analyzePlatform(platform, config) {
    const result = {
      platform,
      fileCount: config.files.length,
      ruleCount: 0,
      totalTokens: config.totalTokens,
      rules: [],
      categories: {},
      format: config.type
    };

    for (const file of config.files) {
      const rules = await this.extractRules(file);
      result.rules.push(...rules);
      result.ruleCount += rules.length;
    }

    // Categorize rules
    for (const rule of result.rules) {
      for (const category of rule.categories) {
        if (!result.categories[category]) {
          result.categories[category] = {
            count: 0,
            rules: [],
            tokens: 0
          };
        }
        result.categories[category].count++;
        result.categories[category].rules.push(rule.title);
        result.categories[category].tokens += rule.tokens;
      }
    }

    return result;
  }

  /**
   * Extract individual rules from a file
   */
  async extractRules(fileInfo) {
    const rules = [];

    try {
      const content = await fs.readFile(fileInfo.path, 'utf-8');
      
      // For markdown files, try to extract individual rules
      if (fileInfo.path.endsWith('.md') || fileInfo.path.endsWith('.mdc')) {
        const parsed = matter(content);
        
        // If it's a single rule file (has frontmatter with enforcement)
        if (parsed.data && (parsed.data.alwaysApply !== undefined || parsed.data.globs)) {
          rules.push({
            title: this.extractTitle(parsed.content) || fileInfo.relativePath,
            file: fileInfo.relativePath,
            enforcement: this.determineEnforcement(parsed.data),
            categories: this.categorizeContent(parsed.content),
            tokens: Math.ceil(parsed.content.length / 4),
            frontmatter: parsed.data
          });
        } else {
          // Try to extract multiple rules from content
          const sections = this.extractSections(parsed.content);
          for (const section of sections) {
            rules.push({
              title: section.title,
              file: fileInfo.relativePath,
              enforcement: 'intelligent', // Default for rules without frontmatter
              categories: this.categorizeContent(section.content),
              tokens: Math.ceil(section.content.length / 4),
              section: true
            });
          }
        }
      }
    } catch (error) {
      // If we can't parse the file, treat it as a single rule
      rules.push({
        title: fileInfo.relativePath,
        file: fileInfo.relativePath,
        enforcement: 'unknown',
        categories: fileInfo.categories || [],
        tokens: fileInfo.tokens,
        error: error.message
      });
    }

    return rules;
  }

  /**
   * Extract title from content
   */
  extractTitle(content) {
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.startsWith('# ')) {
        return line.substring(2).trim();
      }
    }
    return null;
  }

  /**
   * Extract sections from content
   */
  extractSections(content) {
    const sections = [];
    const lines = content.split('\n');
    let currentSection = null;

    for (const line of lines) {
      if (line.startsWith('## ')) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: line.substring(3).trim(),
          content: ''
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Determine enforcement level from frontmatter
   */
  determineEnforcement(frontmatter) {
    if (frontmatter.alwaysApply === true) {
      return 'always';
    } else if (frontmatter.globs) {
      return 'file-specific';
    } else if (frontmatter.alwaysApply === false && !frontmatter.globs) {
      return 'manual';
    }
    return 'intelligent';
  }

  /**
   * Categorize content based on keywords
   */
  categorizeContent(content) {
    const categories = [];
    const lowerContent = content.toLowerCase();
    const contentWords = lowerContent.split(/\s+/);

    for (const [category, config] of Object.entries(this.categoryKeywords)) {
      let score = 0;
      let matchedKeywords = 0;

      for (const keyword of config.keywords) {
        const keywordCount = contentWords.filter(word => word.includes(keyword)).length;
        if (keywordCount > 0) {
          matchedKeywords++;
          score += keywordCount * config.weight;
        }
      }

      // Category is relevant if score is high enough
      if (score >= 3 || matchedKeywords >= 2) {
        categories.push(category);
      }
    }

    // If no categories detected, mark as 'General'
    if (categories.length === 0) {
      categories.push('General');
    }

    return categories;
  }

  /**
   * Aggregate categories across all platforms
   */
  aggregateCategories(byPlatform) {
    const aggregated = {};

    for (const [platform, analysis] of Object.entries(byPlatform)) {
      for (const [category, data] of Object.entries(analysis.categories || {})) {
        if (!aggregated[category]) {
          aggregated[category] = {
            count: 0,
            platforms: [],
            rules: [],
            tokens: 0
          };
        }
        aggregated[category].count += data.count;
        aggregated[category].tokens += data.tokens;
        aggregated[category].platforms.push(platform);
        aggregated[category].rules.push(...data.rules);
      }
    }

    return aggregated;
  }

  /**
   * Find duplicate rules across platforms
   */
  findDuplicates(byPlatform) {
    const duplicates = [];
    const ruleMap = new Map();

    for (const [platform, analysis] of Object.entries(byPlatform)) {
      for (const rule of analysis.rules || []) {
        const key = rule.title.toLowerCase();
        if (ruleMap.has(key)) {
          const existing = ruleMap.get(key);
          duplicates.push({
            rule: rule.title,
            platforms: [existing.platform, platform],
            files: [existing.file, rule.file]
          });
        } else {
          ruleMap.set(key, { platform, file: rule.file });
        }
      }
    }

    return duplicates;
  }

  /**
   * Find potential conflicts between rules
   */
  findConflicts(byPlatform) {
    const conflicts = [];
    
    // Look for rules that might conflict based on keywords
    const conflictPatterns = [
      { pattern: ['tabs', 'spaces'], message: 'Conflicting indentation rules' },
      { pattern: ['single quote', 'double quote'], message: 'Conflicting quote style' },
      { pattern: ['semicolon', 'no semicolon'], message: 'Conflicting semicolon usage' },
      { pattern: ['var', 'const', 'let'], message: 'Conflicting variable declarations' }
    ];

    const allRules = [];
    for (const [platform, analysis] of Object.entries(byPlatform)) {
      for (const rule of analysis.rules || []) {
        allRules.push({ ...rule, platform });
      }
    }

    // Check for conflicts
    for (const pattern of conflictPatterns) {
      const matchingRules = allRules.filter(rule => 
        pattern.pattern.some(keyword => 
          rule.title.toLowerCase().includes(keyword) || 
          (rule.content && rule.content.toLowerCase().includes(keyword))
        )
      );

      if (matchingRules.length > 1) {
        conflicts.push({
          type: pattern.message,
          rules: matchingRules.map(r => ({
            title: r.title,
            platform: r.platform,
            file: r.file
          }))
        });
      }
    }

    return conflicts;
  }

  /**
   * Analyze rule coverage
   */
  analyzeCoverage(byCategory) {
    const coverage = {
      wellCovered: [],
      moderate: [],
      gaps: []
    };

    const essentialCategories = [
      'Code Standards',
      'Testing',
      'Architecture',
      'Error Handling',
      'Documentation'
    ];

    // Check essential categories
    for (const category of essentialCategories) {
      if (byCategory[category]) {
        if (byCategory[category].count >= 3) {
          coverage.wellCovered.push({
            category,
            ruleCount: byCategory[category].count,
            platforms: [...new Set(byCategory[category].platforms)]
          });
        } else {
          coverage.moderate.push({
            category,
            ruleCount: byCategory[category].count,
            platforms: [...new Set(byCategory[category].platforms)]
          });
        }
      } else {
        coverage.gaps.push({
          category,
          reason: 'No rules found for this essential category'
        });
      }
    }

    return coverage;
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // Check for missing essential categories
    for (const gap of analysis.byCoverage.gaps) {
      recommendations.push({
        type: 'missing-category',
        priority: 'high',
        message: `Add ${gap.category} rules`,
        detail: gap.reason
      });
    }

    // Check for duplicate rules
    if (analysis.duplicates.length > 0) {
      recommendations.push({
        type: 'duplicates',
        priority: 'medium',
        message: `Found ${analysis.duplicates.length} duplicate rules across platforms`,
        detail: 'Consider consolidating duplicate rules'
      });
    }

    // Check for conflicts
    if (analysis.conflicts.length > 0) {
      recommendations.push({
        type: 'conflicts',
        priority: 'high',
        message: `Found ${analysis.conflicts.length} potential rule conflicts`,
        detail: 'Review and resolve conflicting rules'
      });
    }

    // Token optimization
    const avgTokensPerRule = analysis.totalRules > 0 ? 
      Math.round(analysis.totalTokens / analysis.totalRules) : 0;
    
    if (avgTokensPerRule > 2000) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        message: 'Rules are quite verbose',
        detail: `Average ${avgTokensPerRule} tokens per rule. Consider making rules more concise.`
      });
    }

    return recommendations;
  }
}

module.exports = { RuleAnalyzer };
