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
  }

  /**
   * Perform complete repository analysis
   * @param {string} projectPath - Path to analyze
   * @param {Object} options - Analysis options
   * @returns {Object} Complete analysis report
   */
  async analyze(projectPath, options = {}) {
    const spinner = ora();
    
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
      if (options.json) {
        return analysis;
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
  
  console.log(chalk.magenta('\n🔍 VIBE REPOSITORY ANALYZER\n'));
  
  try {
    const result = await analyzer.analyze(projectPath, options);
    
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(result);
    }
    
    return result;
  } catch (error) {
    console.error(chalk.red('❌ Analysis failed:'), error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    throw error;
  }
}

module.exports = {
  analyzeRepository,
  RepositoryAnalyzer
};
