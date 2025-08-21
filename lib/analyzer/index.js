const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');

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
    this.techStackDetector = new TechStackDetector();
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
   * Extract and format project information
   */
  extractProjectInfo(techStack, projectPath) {
    const projectName = projectPath.split('/').pop() || 'unknown';
    
    return {
      name: projectName,
      type: techStack.type || 'Application',
      primaryLanguage: techStack.primary || (techStack.languages && techStack.languages[0]) || 'unknown',
      languages: techStack.languages || [],
      techStack: {
        frontend: techStack.frontend || [],
        backend: techStack.backend || [],
        database: techStack.databases || [],
        testing: techStack.testing || [],
        deployment: techStack.deployment || [],
        tools: techStack.buildTools || []
      }
    };
  }

  /**
   * Transform AI configurations for MCP format
   */
  transformAIConfigs(aiConfigs, ruleAnalysis) {
    const platforms = {};
    
    // Process each platform
    const allPlatforms = ['cursor', 'claude', 'copilot', 'gemini'];
    allPlatforms.forEach(platform => {
      const platformData = aiConfigs.platforms.find(p => p.platform === platform);
      if (platformData && platformData.files && platformData.files.length > 0) {
        platforms[platform] = {
          configured: true,
          fileCount: platformData.files.length,
          tokenCount: platformData.totalTokens || 0,
          status: platformData.status || 'active'
        };
      } else {
        platforms[platform] = {
          configured: false,
          reason: `No ${platform.toUpperCase()}.md found`
        };
      }
    });

    return {
      platforms,
      vibeSystem: {
        initialized: aiConfigs.vibeInitialized || false,
        reason: aiConfigs.vibeInitialized ? 'System active' : 'No vibe/ directory found'
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
   * Transform gaps analysis for MCP format
   */
  transformGaps(gaps) {
    return {
      uncoveredTechnologies: (gaps.uncoveredPatterns || []).map(pattern => ({
        technology: pattern,
        priority: 'high',
        reason: `${pattern} detected but lacks dedicated rules`,
        suggestedRules: [`${pattern} best practices`, `${pattern} configuration guidelines`]
      })),
      missingPlatforms: gaps.missingPlatforms || [],
      configurationIssues: gaps.issues || []
    };
  }

  /**
   * Transform recommendations for MCP format
   */
  transformRecommendations(mcpRecommendations, gaps) {
    return {
      immediate: (gaps.recommendations || []).map(rec => ({
        action: rec.action || 'configure_system',
        priority: rec.priority || 'medium',
        description: rec.description || rec.title,
        benefit: rec.benefit || 'Improved AI assistance'
      })),
      mcpServers: (mcpRecommendations || []).map(mcp => ({
        name: mcp.name,
        package: mcp.package,
        priority: mcp.priority || 'recommended',
        reason: mcp.reason,
        official: mcp.official || false
      }))
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
  
  // Suppress console output in MCP mode
  if (!options.mcpMode) {
    console.log(chalk.magenta('\n🔍 VIBE REPOSITORY ANALYZER\n'));
  }
  
  try {
    const result = await analyzer.analyze(projectPath, options);
    
    // In MCP mode, return the result directly without console output
    if (options.mcpMode) {
      return result;
    }
    
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(result);
    }
    
    return result;
  } catch (error) {
    // Suppress error output in MCP mode
    if (!options.mcpMode) {
      console.error(chalk.red('❌ Analysis failed:'), error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
    }
    throw error;
  }
}

module.exports = {
  analyzeRepository,
  RepositoryAnalyzer
};
