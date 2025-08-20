/**
 * Analyzes gaps between detected tech stack and existing rules
 */
class GapAnalyzer {
  constructor() {
    // Technology-specific rule requirements
    this.techRequirements = {
      // Databases
      mongodb: {
        category: 'MongoDB Best Practices',
        requirements: [
          'Connection pooling and management',
          'Schema design and validation',
          'Indexing strategies',
          'Aggregation pipeline patterns',
          'Transaction handling'
        ],
        priority: 'high'
      },
      redis: {
        category: 'Redis Caching Patterns',
        requirements: [
          'Key naming conventions',
          'TTL strategies',
          'Cache invalidation patterns',
          'Memory optimization',
          'Pub/sub patterns'
        ],
        priority: 'high'
      },
      postgresql: {
        category: 'PostgreSQL Standards',
        requirements: [
          'Query optimization',
          'Index management',
          'Migration patterns',
          'Connection pooling',
          'JSONB best practices'
        ],
        priority: 'high'
      },
      mysql: {
        category: 'MySQL Guidelines',
        requirements: [
          'Query optimization',
          'Index strategies',
          'Replication setup',
          'Backup procedures',
          'Performance tuning'
        ],
        priority: 'high'
      },
      
      // Testing frameworks
      jest: {
        category: 'Jest Testing Standards',
        requirements: [
          'Test structure and organization',
          'Mocking strategies',
          'Coverage requirements',
          'Snapshot testing guidelines',
          'Async testing patterns'
        ],
        priority: 'high'
      },
      mocha: {
        category: 'Mocha Testing Patterns',
        requirements: [
          'Test organization',
          'Assertion libraries',
          'Async testing',
          'Test hooks usage',
          'Reporter configuration'
        ],
        priority: 'high'
      },
      
      // Frameworks
      express: {
        category: 'Express.js Standards',
        requirements: [
          'Middleware organization',
          'Route structure',
          'Error handling middleware',
          'Request validation',
          'Security middleware setup'
        ],
        priority: 'high'
      },
      react: {
        category: 'React Best Practices',
        requirements: [
          'Component structure',
          'Hooks guidelines',
          'State management patterns',
          'Performance optimization',
          'Testing components'
        ],
        priority: 'high'
      },
      nextjs: {
        category: 'Next.js Guidelines',
        requirements: [
          'Page structure',
          'API routes patterns',
          'SSR/SSG strategies',
          'Image optimization',
          'Performance best practices'
        ],
        priority: 'high'
      },
      
      // Other tech
      docker: {
        category: 'Docker Best Practices',
        requirements: [
          'Dockerfile optimization',
          'Multi-stage builds',
          'Security scanning',
          'Layer caching strategies',
          'Compose patterns'
        ],
        priority: 'medium'
      },
      kubernetes: {
        category: 'Kubernetes Patterns',
        requirements: [
          'Resource limits',
          'Health checks',
          'ConfigMap/Secret usage',
          'Deployment strategies',
          'Service mesh patterns'
        ],
        priority: 'medium'
      }
    };

    // Core categories every project should have
    this.coreRequirements = {
      'Security Best Practices': {
        requirements: [
          'Input validation and sanitization',
          'Authentication patterns',
          'Authorization checks',
          'OWASP guidelines',
          'Dependency scanning'
        ],
        priority: 'high',
        condition: 'always'
      },
      'Error Handling Standards': {
        requirements: [
          'Consistent error formats',
          'Error logging strategies',
          'User-friendly error messages',
          'Recovery patterns',
          'Error monitoring setup'
        ],
        priority: 'high',
        condition: 'always'
      },
      'Code Quality Standards': {
        requirements: [
          'Linting configuration',
          'Code formatting rules',
          'Naming conventions',
          'File organization',
          'Import ordering'
        ],
        priority: 'medium',
        condition: 'always'
      },
      'Git Workflow': {
        requirements: [
          'Commit message format',
          'Branch naming conventions',
          'PR guidelines',
          'Code review process',
          'Merge strategies'
        ],
        priority: 'medium',
        condition: 'always'
      }
    };
  }

  /**
   * Analyze gaps between tech stack and rules
   */
  async analyze(techStack, ruleAnalysis) {
    const gaps = {
      uncoveredPatterns: [],
      missingCategories: [],
      recommendations: [],
      coverageScore: 0,
      priority: {
        high: [],
        medium: [],
        low: []
      }
    };

    // Get covered categories from existing rules
    const coveredCategories = new Set(Object.keys(ruleAnalysis.byCategory));
    const coveredFiles = this.extractCoveredFiles(ruleAnalysis);

    // Check tech-specific requirements
    const techGaps = this.analyzeTechGaps(techStack, coveredCategories, coveredFiles);
    
    // Check core requirements
    const coreGaps = this.analyzeCoreGaps(coveredCategories, coveredFiles);
    
    // Generate specific recommendations
    gaps.recommendations = [...techGaps, ...coreGaps];
    
    // Prioritize recommendations
    gaps.priority = this.prioritizeRecommendations(gaps.recommendations);
    
    // Calculate coverage
    gaps.coverageScore = this.calculateCoverage(techStack, gaps.recommendations);
    
    // Store patterns for other uses
    gaps.uncoveredPatterns = gaps.recommendations.map(r => r.pattern).filter(Boolean);

    return gaps;
  }

  /**
   * Extract what files/topics are actually covered
   */
  extractCoveredFiles(ruleAnalysis) {
    const covered = new Set();
    
    // Extract from file names in byPlatform data
    if (ruleAnalysis.byPlatform) {
      for (const [platform, data] of Object.entries(ruleAnalysis.byPlatform)) {
        if (data.rules) {
          for (const rule of data.rules) {
            const file = rule.file.toLowerCase();
            if (file.includes('test')) covered.add('testing');
            if (file.includes('security')) covered.add('security');
            if (file.includes('database')) covered.add('database');
            if (file.includes('mongo')) covered.add('mongodb');
            if (file.includes('redis')) covered.add('redis');
            if (file.includes('api')) covered.add('api');
            if (file.includes('error')) covered.add('error');
          }
        }
      }
    }
    
    return covered;
  }

  /**
   * Analyze technology-specific gaps
   */
  analyzeTechGaps(techStack, coveredCategories, coveredFiles) {
    const gaps = [];
    
    // Check all technologies in use
    const allTech = [
      ...techStack.databases,
      ...techStack.frameworks,
      ...techStack.testing,
      ...techStack.deployment
    ];
    
    for (const tech of allTech) {
      const techReq = this.techRequirements[tech];
      if (!techReq) continue;
      
      // Check if this tech has dedicated rules
      const hasDedicatedRules = 
        coveredCategories.has(techReq.category) ||
        coveredFiles.has(tech.toLowerCase()) ||
        this.hasRelatedCategory(tech, coveredCategories);
      
      if (!hasDedicatedRules) {
        gaps.push({
          type: 'tech-specific',
          category: techReq.category,
          pattern: tech,
          title: `${this.formatTechName(tech)} Configuration Guidelines`,
          content: techReq.requirements.join(', '),
          reason: `You're using ${this.formatTechName(tech)} but have no dedicated ${this.formatTechName(tech)} rules`,
          priority: techReq.priority
        });
      }
    }
    
    return gaps;
  }

  /**
   * Check if any covered category relates to this tech
   */
  hasRelatedCategory(tech, coveredCategories) {
    const techLower = tech.toLowerCase();
    
    for (const category of coveredCategories) {
      const catLower = category.toLowerCase();
      
      // Direct match
      if (catLower.includes(techLower)) return true;
      
      // Related matches
      if (tech === 'mongodb' && catLower.includes('database')) return false; // Need specific MongoDB rules
      if (tech === 'redis' && catLower.includes('cache')) return true;
      if (tech === 'jest' && catLower.includes('test')) return true;
      if (tech === 'express' && catLower.includes('api')) return true;
    }
    
    return false;
  }

  /**
   * Analyze core requirement gaps
   */
  analyzeCoreGaps(coveredCategories, coveredFiles) {
    const gaps = [];
    
    for (const [category, config] of Object.entries(this.coreRequirements)) {
      // Check if this core category is covered
      const isCovered = this.isCategoryCovered(category, coveredCategories, coveredFiles);
      
      if (!isCovered && config.condition === 'always') {
        gaps.push({
          type: 'core',
          category,
          title: category,
          content: config.requirements.join(', '),
          reason: `${category} are essential for any project`,
          priority: config.priority
        });
      }
    }
    
    return gaps;
  }

  /**
   * Check if a category is covered
   */
  isCategoryCovered(category, coveredCategories, coveredFiles) {
    const catLower = category.toLowerCase();
    
    // Check direct category match
    for (const covered of coveredCategories) {
      if (covered.toLowerCase().includes(catLower.split(' ')[0])) {
        return true;
      }
    }
    
    // Check file-based coverage
    if (catLower.includes('security') && coveredFiles.has('security')) return true;
    if (catLower.includes('error') && coveredFiles.has('error')) return true;
    if (catLower.includes('git') && coveredFiles.has('git')) return true;
    
    return false;
  }

  /**
   * Format technology name
   */
  formatTechName(tech) {
    const names = {
      mongodb: 'MongoDB',
      redis: 'Redis',
      postgresql: 'PostgreSQL',
      mysql: 'MySQL',
      jest: 'Jest',
      mocha: 'Mocha',
      express: 'Express.js',
      react: 'React',
      nextjs: 'Next.js',
      docker: 'Docker',
      kubernetes: 'Kubernetes'
    };
    return names[tech] || tech.charAt(0).toUpperCase() + tech.slice(1);
  }

  /**
   * Prioritize recommendations
   */
  prioritizeRecommendations(recommendations) {
    const priority = {
      high: [],
      medium: [],
      low: []
    };
    
    for (const rec of recommendations) {
      priority[rec.priority || 'medium'].push(rec);
    }
    
    return priority;
  }

  /**
   * Calculate coverage score
   */
  calculateCoverage(techStack, recommendations) {
    // Count total expected categories
    const expectedCount = 
      techStack.databases.length +
      techStack.frameworks.length +
      techStack.testing.length +
      Object.keys(this.coreRequirements).length;
    
    if (expectedCount === 0) return 100;
    
    // Count missing categories
    const missingCount = recommendations.length;
    
    const coverage = ((expectedCount - missingCount) / expectedCount) * 100;
    return Math.max(0, Math.round(coverage));
  }
}

module.exports = { GapAnalyzer };
