const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const { Logger } = require('../utils/logger');
const { TechStackDetector } = require('./tech-stack-detector');
const { AIConfigScanner } = require('./ai-config-scanner');
const { RuleAnalyzer } = require('./rule-analyzer');
const { GapAnalyzer } = require('./gap-analyzer');
const { MCPRecommender } = require('./mcp-recommender');
const { ReportGenerator } = require('./report-generator');

/**
 * Main analyzer class that orchestrates the full repository analysis
 */
class RepositoryAnalyzer {
  constructor(options = {}) {
    this.techStackDetector = new TechStackDetector(options);
    this.aiConfigScanner = new AIConfigScanner();
    this.ruleAnalyzer = new RuleAnalyzer();
    this.gapAnalyzer = new GapAnalyzer();
    this.mcpRecommender = new MCPRecommender();
    this.reportGenerator = new ReportGenerator();
    this.mcpMode = options.mcpMode || false;
  }

  /**
   * Create a spinner factory that returns no-op when in MCP mode
   * @returns {Object} Spinner-like object
   */
  createSpinner() {
    if (this.mcpMode) {
      // Return no-op spinner for MCP mode
      return {
        start: () => {},
        succeed: () => {},
        fail: () => {},
        stop: () => {}
      };
    }
    return ora();
  }

  /**
   * Perform complete repository analysis
   * @param {string} projectPath - Path to analyze
   * @param {Object} options - Analysis options
   * @returns {Object} Complete analysis report
   */
  async analyze(projectPath, options = {}) {
    const spinner = this.createSpinner();
    
    try {
      // Step 1: Detect tech stack
      spinner.start('🔍 Analyzing repository structure and tech stack...');
      const techStack = await this.techStackDetector.detect(projectPath);
      spinner.succeed('Tech stack analysis complete');

      // Step 2: Scan for AI configurations
      spinner.start('🤖 Scanning for AI tool configurations...');
      const aiConfigs = await this.aiConfigScanner.scan(projectPath);
      spinner.succeed(`Found ${aiConfigs.totalFiles} AI configuration files`);

      // Step 3: Analyze rules and instructions
      spinner.start('📋 Analyzing AI rules and instructions...');
      const ruleAnalysis = await this.ruleAnalyzer.analyze(aiConfigs);
      spinner.succeed(`Analyzed ${ruleAnalysis.totalRules} rules across platforms`);

      // Step 4: Identify gaps
      spinner.start('🔎 Identifying configuration gaps...');
      const gaps = await this.gapAnalyzer.analyze(techStack, ruleAnalysis);
      spinner.succeed('Gap analysis complete');

      // Step 5: Recommend MCP servers
      spinner.start('🔧 Generating MCP server recommendations...');
      const mcpRecommendations = await this.mcpRecommender.recommend(techStack);
      spinner.succeed(`Found ${mcpRecommendations.length} relevant MCP servers`);

      // Step 6: Calculate maturity score
      const maturityScore = this.calculateMaturityScore({
        techStack,
        aiConfigs,
        ruleAnalysis,
        gaps
      });

      // Compile full analysis
      const analysis = {
        projectPath,
        timestamp: new Date().toISOString(),
        techStack,
        aiConfigs,
        ruleAnalysis,
        gaps,
        mcpRecommendations,
        maturityScore
      };

      // Generate report
      if (options.mcpMode) {
        return this.transformForMCP(analysis);
      } else if (options.json) {
        return this.transformForCLI(analysis);
      } else {
        const report = await this.reportGenerator.generate(analysis, options);
        return report;
      }

    } catch (error) {
      spinner.fail('Analysis failed');
      throw error;
    }
  }

  /**
   * Calculate AI configuration maturity score
   */
  calculateMaturityScore({ techStack, aiConfigs, ruleAnalysis, gaps }) {
    let score = 0;
    let breakdown = {};

    // Platform coverage (33 points)
    const platformScore = Math.min(33, (aiConfigs.platforms.length / 4) * 33);
    breakdown.platformCoverage = {
      score: Math.round(platformScore),
      max: 33,
      detail: `${aiConfigs.platforms.length}/4 platforms configured`
    };
    score += platformScore;

    // Rule coverage (33 points)
    // If no rules exist at all, coverage should be 0
    if (ruleAnalysis.totalRules === 0) {
      breakdown.ruleCoverage = {
        score: 0,
        max: 33,
        detail: 'No rules configured yet'
      };
    } else {
      // Calculate total patterns from all sources
      const allPatterns = [
        ...techStack.languages,
        ...techStack.frameworks,
        ...techStack.databases,
        ...techStack.testing,
        ...techStack.deployment,
        ...techStack.patterns,
        ...(techStack.architecture.patterns || [])
      ];
      
      // Remove duplicates
      const uniquePatterns = [...new Set(allPatterns)];
      const totalPatterns = uniquePatterns.length;
      const uncoveredCount = gaps.uncoveredPatterns.length;
      const coveredPatterns = Math.max(0, totalPatterns - uncoveredCount);
      
      const coverageRatio = totalPatterns > 0 
        ? coveredPatterns / totalPatterns 
        : 0;
      const coverageScore = coverageRatio * 33;
      breakdown.ruleCoverage = {
        score: Math.round(coverageScore),
        max: 33,
        detail: `${coveredPatterns}/${totalPatterns} patterns covered`
      };
      score += coverageScore;
    }

    // Rule quality (34 points)
    const qualityScore = this.assessRuleQuality(ruleAnalysis) * 34;
    breakdown.ruleQuality = {
      score: Math.round(qualityScore),
      max: 34,
      detail: 'Based on categorization and token distribution'
    };
    score += qualityScore;

    return {
      total: Math.round(score),
      max: 100,
      breakdown
    };
  }

  /**
   * Transform raw analysis into optimized JSON structure for MCP consumption
   */
  transformForMCP(analysis) {
    return {
      analysis: {
        metadata: {
          projectPath: analysis.projectPath,
          timestamp: analysis.timestamp,
          analysisVersion: "1.0.0"
        },
        
        project: this.extractProjectInfo(analysis.techStack, analysis.projectPath),
        aiConfiguration: this.transformAIConfigs(analysis.aiConfigs, analysis.ruleAnalysis),
        coverage: this.transformMaturityScore(analysis.maturityScore),
        gaps: this.transformGaps(analysis.gaps),
        recommendations: this.transformRecommendations(analysis.mcpRecommendations, analysis.gaps),
        insights: this.generateInsights(analysis)
      }
    };
  }

  /**
   * Transform raw analysis into CLI-compatible JSON structure
   */
  transformForCLI(analysis) {
    const techStack = analysis.techStack;
    
    // Define frontend and backend frameworks
    const frontendFrameworks = ['react', 'vue', 'angular', 'svelte', 'nextjs', 'gatsby', 'nuxt', 'vite', 'webpack'];
    const backendFrameworks = ['express', 'fastify', 'nestjs', 'koa', 'hapi', 'fastapi', 'django', 'flask', 'rails', 'laravel', 'spring'];
    
    // Split frameworks into frontend and backend
    const allFrameworks = techStack.frameworks || [];
    const frontend = allFrameworks.filter(f => frontendFrameworks.includes(f.toLowerCase()));
    const backend = allFrameworks.filter(f => backendFrameworks.includes(f.toLowerCase()));
    
    return {
      // Top-level project info  
      type: techStack.type || 'unknown',
      primary: techStack.primary || '',
      
      // Languages as objects with name and confidence properties
      languages: (techStack.languages || []).map(lang => ({
        name: this.capitalize(lang),
        confidence: 1.0,
        detected: true
      })),
      
      // Frameworks split by category - objects with name properties
      backend: backend.map(fw => ({
        name: this.formatTech(fw),
        type: 'backend',
        detected: true
      })),
      
      frontend: frontend.map(fw => ({
        name: this.formatTech(fw), 
        type: 'frontend',
        detected: true
      })),
      
      // Simple arrays for compatibility
      frameworks: allFrameworks,
      databases: techStack.databases || [],
      testing: techStack.testing || [],
      buildTools: techStack.buildTools || [],
      deployment: techStack.deployment || [],
      packageManagers: techStack.packageManagers || [],
      
      // Additional structured data
      architecture: techStack.architecture,
      maturity: analysis.maturityScore,
      
      // Analysis metadata
      timestamp: analysis.timestamp,
      projectPath: analysis.projectPath
    };
  }

  /**
   * Capitalize first letter of a string
   */
  capitalize(str) {
    if (!str || typeof str !== 'string') return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Format technology names for display (proper capitalization)
   */
  formatTech(tech) {
    if (!tech || typeof tech !== 'string') return tech;
    
    const specialCases = {
      'fastapi': 'FastAPI',
      'nextjs': 'Next.js',
      'nuxt': 'Nuxt.js',
      'nestjs': 'NestJS',
      'expressjs': 'Express.js',
      'vuejs': 'Vue.js',
      'reactjs': 'React.js',
      'nodejs': 'Node.js'
    };
    
    return specialCases[tech.toLowerCase()] || this.capitalize(tech);
  }

  /**
   * Extract and format project information - Enhanced to use full tech stack data
   */
  extractProjectInfo(techStack, projectPath) {
    const projectName = projectPath.split('/').pop() || 'unknown';
    
    // Use all enhanced tech stack categories
    return {
      name: projectName,
      type: techStack.type || 'Application',
      primaryLanguage: techStack.primary || (techStack.languages && techStack.languages[0]) || 'unknown',
      languages: techStack.languages || [],
      techStack: {
        frontend: techStack.frameworks?.filter(f => 
          ['react', 'vue', 'angular', 'svelte', 'nextjs', 'gatsby', 'nuxt', 'astro', 'remix', 'solidjs'].includes(f.toLowerCase())
        ) || [],
        backend: techStack.frameworks?.filter(f => 
          ['express', 'fastify', 'nestjs', 'koa', 'hapi', 'fastapi', 'django', 'flask', 'rails', 'laravel', 'spring'].includes(f.toLowerCase())
        ) || [],
        database: techStack.databases || [],
        testing: techStack.testing || [],
        deployment: techStack.deployment || [],
        tools: techStack.buildTools || [],
        // Enhanced categories from improved detector
        cloud: techStack.cloud || [],
        api: techStack.api || [],
        styling: techStack.styling || [],
        monitoring: techStack.monitoring || [],
        stateManagement: techStack.stateManagement || [],
        linting: techStack.linting || []
      },
      architecture: techStack.architecture || { type: 'standard', patterns: [] },
      packageManagers: techStack.packageManagers || []
    };
  }

  /**
   * Transform AI configurations for MCP format
   */
  transformAIConfigs(aiConfigs, ruleAnalysis) {
    const platforms = {};
    
    // Process each platform using the correct data structure
    const allPlatforms = ['cursor', 'claude', 'copilot', 'gemini'];
    allPlatforms.forEach(platform => {
      const platformConfig = aiConfigs.configurations[platform];
      if (platformConfig && platformConfig.files && platformConfig.files.length > 0) {
        platforms[platform] = {
          configured: true,
          fileCount: platformConfig.files.length,
          tokenCount: platformConfig.totalTokens || 0,
          status: 'active'
        };
      } else {
        // Generate appropriate error message based on platform
        let reason;
        switch(platform) {
          case 'cursor':
            reason = 'No .cursorrules or .cursor/rules found';
            break;
          case 'copilot':
            reason = 'No .github/copilot-instructions.md or .github/instructions/*.md found';
            break;
          case 'claude':
            reason = 'No CLAUDE.md or .claude/*.md found';
            break;
          case 'gemini':
            reason = 'No GEMINI.md or .gemini/*.md found';
            break;
          default:
            reason = `No ${platform} configuration found`;
        }
        
        platforms[platform] = {
          configured: false,
          reason: reason
        };
      }
    });

    return {
      platforms,
      vibeSystem: {
        initialized: aiConfigs.vibe?.initialized || false,
        reason: aiConfigs.vibe?.initialized ? 'System active' : 'No vibe/ directory found'
      },
      totalRules: ruleAnalysis.totalRules || 0,
      totalTokens: ruleAnalysis.totalTokens || 0
    };
  }

  /**
   * Transform maturity score for MCP format
   */
  transformMaturityScore(maturityScore) {
    return {
      score: maturityScore.total || 0,
      breakdown: maturityScore.breakdown || {}
    };
  }

  /**
   * Transform gaps analysis for MCP format - Enhanced to preserve detailed requirements
   */
  transformGaps(gaps) {
    return {
      uncoveredTechnologies: (gaps.recommendations || []).map(rec => ({
        technology: rec.pattern || rec.category,
        title: rec.title,
        priority: rec.priority || 'medium',
        reason: rec.reason,
        requirements: rec.requirements || [], // Preserve detailed requirements arrays
        suggestedRules: rec.requirements || [`${rec.pattern || rec.category} best practices`],
        category: rec.category,
        type: rec.type || 'tech-specific'
      })),
      summary: {
        totalGaps: (gaps.recommendations || []).length,
        byPriority: gaps.priority || { high: [], medium: [], low: [] },
        coverageScore: gaps.coverageScore || 0
      },
      missingPlatforms: gaps.missingPlatforms || [],
      configurationIssues: gaps.issues || []
    };
  }

  /**
   * Transform recommendations for MCP format - Enhanced for better AI consumption
   */
  transformRecommendations(mcpRecommendations, gaps) {
    return {
      immediate: (gaps.recommendations || []).map(rec => ({
        action: rec.action || 'configure_rules',
        priority: rec.priority || 'medium',
        title: rec.title,
        description: rec.reason || rec.description,
        requirements: rec.requirements || [], // Detailed requirements for AI agents
        category: rec.category,
        type: rec.type,
        benefit: rec.benefit || 'Improved AI assistance with specific technology guidance'
      })),
      mcpServers: (mcpRecommendations || []).map(mcp => ({
        name: mcp.name,
        package: mcp.package,
        priority: mcp.priority || 'recommended',
        reason: mcp.reason,
        official: mcp.official || false,
        detectedTechnologies: mcp.detectedTechnologies || []
      })),
      summary: {
        totalRecommendations: (gaps.recommendations || []).length,
        totalMcpServers: (mcpRecommendations || []).length,
        highPriorityCount: (gaps.priority?.high || []).length
      }
    };
  }

  /**
   * Generate insights from analysis data
   */
  generateInsights(analysis) {
    const strengths = [];
    const weaknesses = [];
    const nextSteps = [];

    // Analyze strengths
    if (analysis.aiConfigs.platforms && analysis.aiConfigs.platforms.length > 0) {
      strengths.push('Existing AI tool adoption');
    }
    if (analysis.techStack.testing && analysis.techStack.testing.length > 0) {
      strengths.push('Testing infrastructure in place');
    }

    // Analyze weaknesses
    if (!analysis.aiConfigs.vibeInitialized) {
      weaknesses.push('Fragmented AI configurations');
    }
    if (analysis.gaps.uncoveredPatterns && analysis.gaps.uncoveredPatterns.length > 0) {
      weaknesses.push('Missing technology-specific rules');
    }

    // Generate next steps
    if (!analysis.aiConfigs.vibeInitialized) {
      nextSteps.push('Initialize vibe system');
    }
    if (analysis.gaps.uncoveredPatterns && analysis.gaps.uncoveredPatterns.length > 0) {
      nextSteps.push('Add technology-specific rules');
    }

    return {
      strengths,
      weaknesses,
      nextSteps
    };
  }

  /**
   * Assess the quality of rules based on various factors
   */
  assessRuleQuality(ruleAnalysis) {
    let quality = 0;
    
    // Check category distribution
    const categories = Object.keys(ruleAnalysis.byCategory);
    if (categories.length >= 3) quality += 0.3;
    if (categories.length >= 4) quality += 0.2;
    
    // Check if essential categories are covered
    const essentialCategories = ['Code Standards', 'Testing', 'Architecture'];
    const coveredEssentials = essentialCategories.filter(cat => 
      ruleAnalysis.byCategory[cat] && ruleAnalysis.byCategory[cat].count > 0
    );
    quality += (coveredEssentials.length / essentialCategories.length) * 0.3;
    
    // Check token distribution (not too heavy, not too light)
    const avgTokensPerRule = ruleAnalysis.totalTokens / ruleAnalysis.totalRules;
    if (avgTokensPerRule > 500 && avgTokensPerRule < 2000) {
      quality += 0.2;
    }
    
    return Math.min(1, quality);
  }
}

/**
 * Main entry point for the analyze command
 */
async function analyzeRepository(projectPath, options = {}) {
  const analyzer = new RepositoryAnalyzer(options);

  const logger = Logger({ mcpMode: options.mcpMode });

  
  // Suppress console output in MCP mode
  logger(chalk.magenta('\n🔍 VIBE REPOSITORY ANALYZER\n'));
  
  try {
    const result = await analyzer.analyze(projectPath, options);
    
    // In MCP mode, return the result directly without console output
    if (options.mcpMode) {
      return result;
    }
    logger(result);
    
    
    return result;
  } catch (error) {
    // Suppress error output in MCP mode
    if (!options.mcpMode) {
      logger.error(chalk.red('❌ Analysis failed:'), error.message);
      if (options.verbose) {
        logger.error(error.stack);
      }
    }
    throw error;
  }
}

module.exports = {
  analyzeRepository,
  RepositoryAnalyzer
};
