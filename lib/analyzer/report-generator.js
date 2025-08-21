const chalk = require('chalk');

/**
 * Generates formatted analysis reports - Improved MCP section
 */
class ReportGenerator {
  /**
   * Generate a complete analysis report
   */
  async generate(analysis, options = {}) {
    const sections = [];

    // Header
    sections.push(this.generateHeader());

    // Repository Overview
    sections.push(this.generateOverview(analysis.techStack, analysis.projectPath));

    // AI Tool Configurations
    sections.push(this.generateAIConfigSection(analysis.aiConfigs));

    // Rules Analysis - Updated to show correlation
    sections.push(this.generateRulesSection(analysis.ruleAnalysis, analysis.aiConfigs, analysis.techStack));

    // Gap Analysis
    sections.push(this.generateGapsSection(analysis.gaps, analysis.techStack));

    // MCP Recommendations - IMPROVED
    sections.push(this.generateImprovedMCPSection(analysis.mcpRecommendations));

    // Maturity Assessment
    sections.push(this.generateMaturitySection(analysis.maturityScore));

    return sections.join('\n\n');
  }

  /**
   * Generate report header
   */
  generateHeader() {
    return chalk.bold.cyan('🔍 REPOSITORY ANALYSIS REPORT\n' + '='.repeat(50));
  }

  /**
   * Generate repository overview section
   */
  generateOverview(techStack, projectPath) {
    const lines = [
      chalk.bold('📊 Repository Overview'),
      chalk.gray('-'.repeat(30)),
      `Path: ${chalk.blue(projectPath)}`,
      `Type: ${chalk.green(this.formatProjectType(techStack.type))}`
    ];

    // Language breakdown
    if (techStack.languages.length > 0) {
      lines.push(`Primary Language: ${chalk.yellow(this.capitalize(techStack.primary))}`);
      if (techStack.languages.length > 1) {
        lines.push(`Other Languages: ${techStack.languages.filter(l => l !== techStack.primary).join(', ')}`);
      }
    }

    lines.push('');
    lines.push(chalk.bold('Tech Stack:'));

    // Frontend/Backend frameworks
    if (techStack.frameworks.length > 0) {
      const frontend = techStack.frameworks.filter(f => 
        ['react', 'vue', 'angular', 'svelte', 'nextjs', 'gatsby', 'nuxt'].includes(f)
      );
      const backend = techStack.frameworks.filter(f => 
        ['express', 'fastify', 'nestjs', 'django', 'rails', 'laravel'].includes(f)
      );

      if (frontend.length > 0) {
        lines.push(`  Frontend: ${chalk.cyan(frontend.map(f => this.formatTech(f)).join(', '))}`);
      }
      if (backend.length > 0) {
        lines.push(`  Backend: ${chalk.cyan(backend.map(f => this.formatTech(f)).join(', '))}`);
      }
    }

    // Other tech
    if (techStack.databases.length > 0) {
      lines.push(`  Database: ${chalk.magenta(techStack.databases.map(d => this.formatTech(d)).join(', '))}`);
    }
    if (techStack.testing.length > 0) {
      lines.push(`  Testing: ${chalk.green(techStack.testing.map(t => this.formatTech(t)).join(', '))}`);
    }
    if (techStack.buildTools.length > 0) {
      lines.push(`  Build: ${chalk.yellow(techStack.buildTools.map(b => this.formatTech(b)).join(', '))}`);
    }
    if (techStack.deployment.length > 0) {
      lines.push(`  Deploy: ${chalk.blue(techStack.deployment.map(d => this.formatTech(d)).join(', '))}`);
    }

    // Architecture patterns
    if (techStack.architecture.patterns.length > 0) {
      lines.push('');
      lines.push('Architecture Patterns:');
      for (const pattern of techStack.architecture.patterns) {
        lines.push(`  - ${this.formatArchitecture(pattern)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate AI configurations section - ONLY REMOVED FILE PATHS AS REQUESTED
   */
  generateAIConfigSection(aiConfigs) {
    const lines = [
      chalk.bold('🤖 AI Tool Configurations Found'),
      chalk.gray('-'.repeat(30)),
      ''
    ];

    // Show each platform
    const platformOrder = ['cursor', 'copilot', 'claude', 'gemini', 'vibe'];
    
    for (const platform of platformOrder) {
      if (aiConfigs.configurations[platform]) {
        const config = aiConfigs.configurations[platform];
        const icon = this.getPlatformIcon(platform);
        const status = this.getPlatformStatus(platform, config, aiConfigs.vibe);
        
        lines.push(`${icon} ${chalk.bold(platform.toUpperCase())} ${status}:`);
        
        // Just show file count and total tokens, no file paths
        lines.push(`  Total: ${config.files.length} file${config.files.length > 1 ? 's' : ''}, ${this.formatTokens(config.totalTokens)}`);
        lines.push('');
      }
    }

    // Check for missing platforms
    const missingPlatforms = platformOrder.filter(p => 
      !aiConfigs.configurations[p] && p !== 'vibe'
    );
    
    if (missingPlatforms.length > 0) {
      for (const platform of missingPlatforms) {
        lines.push(`${this.getPlatformIcon(platform)} ${chalk.bold(platform.toUpperCase())}: ${chalk.red('Not configured')}`);
      }
      lines.push('');
    }

    // Vibe status
    if (aiConfigs.vibe.initialized) {
      lines.push(`${chalk.green('✅')} VIBE SYSTEM: ${chalk.green('Initialized')}`);
      if (aiConfigs.vibe.managed.length > 0) {
        lines.push(`   Managing: ${aiConfigs.vibe.managed.join(', ')}`);
      }
    } else {
      lines.push(`${chalk.gray('○')} VIBE SYSTEM: ${chalk.gray('Not initialized')}`);
    }

    return lines.join('\n');
  }

  /**
   * Generate rules analysis section - UPDATED WITH CORRELATION
   */
  generateRulesSection(ruleAnalysis, aiConfigs, techStack) {
    const lines = [
      chalk.bold('📋 AI Rules & Instructions Analysis'),
      chalk.gray('-'.repeat(30)),
      ''
    ];

    const totalTokens = ruleAnalysis.totalTokens;
    const isVibeInitialized = aiConfigs.vibe.initialized;

    // Token usage assessment
    lines.push(chalk.bold('TOTAL INSTRUCTIONS:'));
    const tokenAssessment = this.assessTokenUsage(totalTokens);
    lines.push(`${chalk.cyan(this.formatTokens(totalTokens))} across all AI platforms - ${tokenAssessment.badge}`);
    lines.push(chalk.dim(tokenAssessment.message));
    lines.push('');

    // Topic breakdown with correlation indicators
    if (Object.keys(ruleAnalysis.byCategory).length > 0) {
      lines.push(chalk.bold('CURRENT INSTRUCTION COVERAGE:'));
      lines.push(chalk.dim('(% of total tokens + coverage status)'));
      lines.push('');
      
      // Sort categories by token count
      const sortedCategories = Object.entries(ruleAnalysis.byCategory)
        .sort((a, b) => b[1].tokens - a[1].tokens);
      
      // Calculate percentages
      const totalCategoryTokens = sortedCategories.reduce((sum, [_, data]) => sum + data.tokens, 0);
      
      // Determine which categories have dedicated rules vs just keywords
      const dedicatedRuleCategories = this.identifyDedicatedRules(ruleAnalysis, aiConfigs);
      
      for (const [category, data] of sortedCategories) {
        const percentage = Math.round((data.tokens / totalCategoryTokens) * 100);
        const status = this.getCategoryStatus(category, dedicatedRuleCategories, techStack);
        
        lines.push(`${chalk.bold(category)}: ${percentage}% ${status}`);
      }
      lines.push('');

      // Add tech-specific missing coverage
      const missingTechCoverage = this.identifyMissingTechCoverage(techStack, dedicatedRuleCategories);
      if (missingTechCoverage.length > 0) {
        lines.push(chalk.bold('DETECTED BUT NOT COVERED:'));
        for (const missing of missingTechCoverage) {
          lines.push(`${chalk.red('✗')} ${missing.tech} - ${chalk.dim(missing.reason)}`);
        }
        lines.push('');
      }
    }

    // Configuration Status
    lines.push(chalk.bold('CONFIGURATION STATUS:'));
    
    if (isVibeInitialized) {
      lines.push(`${chalk.green('✓')} Vibe initialized - Single source of truth`);
      lines.push(`${chalk.green('✓')} All platforms use unified rules`);
      
      if (tokenAssessment.needsOptimization) {
        lines.push(`${chalk.yellow('!')} Consider reducing rule size for better performance`);
      }
    } else {
      const platformCount = aiConfigs.platforms.length;
      lines.push(`${chalk.blue('ℹ')} Managing ${platformCount} separate AI configurations`);
      
      const duplicatedTopics = Object.entries(ruleAnalysis.byCategory)
        .filter(([_, data]) => data.platforms.length > 1).length;
      
      if (duplicatedTopics > 0 && platformCount > 1) {
        lines.push(`${chalk.yellow('!')} ${duplicatedTopics} topics duplicated across platforms`);
        lines.push(`   ${chalk.dim('Consider')} ${chalk.cyan('vibe init')} ${chalk.dim('to eliminate duplication')}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Identify which categories have dedicated rule files
   */
  identifyDedicatedRules(ruleAnalysis, aiConfigs) {
    const dedicated = new Set();
    
    // Check all platform files for dedicated rule files
    for (const [platform, config] of Object.entries(aiConfigs.configurations)) {
      for (const file of config.files) {
        const fileName = file.relativePath.toLowerCase();
        
        // Map file names to categories
        if (fileName.includes('test')) dedicated.add('Testing');
        if (fileName.includes('security')) dedicated.add('Security');
        if (fileName.includes('database') || fileName.includes('mongo') || fileName.includes('redis')) dedicated.add('Database');
        if (fileName.includes('api')) dedicated.add('API Design');
        if (fileName.includes('performance')) dedicated.add('Performance');
        if (fileName.includes('error')) dedicated.add('Error Handling');
        if (fileName.includes('code') || fileName.includes('standard')) dedicated.add('Code Standards');
        if (fileName.includes('architect')) dedicated.add('Architecture');
        if (fileName.includes('deploy')) dedicated.add('Deployment');
        if (fileName.includes('doc')) dedicated.add('Documentation');
      }
    }
    
    return dedicated;
  }

  /**
   * Get category coverage status
   */
  getCategoryStatus(category, dedicatedRuleCategories, techStack) {
    const hasDedicatedRules = dedicatedRuleCategories.has(category);
    
    if (hasDedicatedRules) {
      return chalk.green('(✓ dedicated rules)');
    }
    
    // Check if this category is needed based on tech stack
    const isNeeded = this.isCategoryNeededForTechStack(category, techStack);
    
    if (isNeeded) {
      return chalk.yellow('(⚠ keywords only, needs dedicated rules)');
    }
    
    return chalk.gray('(keywords found)');
  }

  /**
   * Check if a category is needed based on tech stack
   */
  isCategoryNeededForTechStack(category, techStack) {
    const techRequirements = {
      'Database': techStack.databases.length > 0,
      'Testing': techStack.testing.length > 0,
      'API Design': techStack.frameworks.some(f => ['express', 'fastify', 'nestjs'].includes(f)),
      'Security': true, // Always needed
      'Error Handling': true, // Always needed
      'Performance': techStack.databases.includes('redis') || techStack.deployment.includes('docker'),
      'Deployment': techStack.deployment.length > 0
    };
    
    return techRequirements[category] || false;
  }

  /**
   * Identify missing tech-specific coverage
   */
  identifyMissingTechCoverage(techStack, dedicatedRuleCategories) {
    const missing = [];
    
    // Check databases
    for (const db of techStack.databases) {
      const dbName = this.formatTech(db);
      if (!dedicatedRuleCategories.has('Database')) {
        missing.push({
          tech: dbName,
          reason: `No ${dbName}-specific rules for connection, schema, queries`
        });
      }
    }
    
    // Check testing frameworks
    for (const test of techStack.testing) {
      const testName = this.formatTech(test);
      if (dedicatedRuleCategories.has('Testing')) {
        // Testing rules exist, so this is covered
        continue;
      }
      missing.push({
        tech: testName,
        reason: `No ${testName}-specific test patterns or configurations`
      });
    }
    
    return missing;
  }

  /**
   * Assess token usage and provide feedback
   */
  assessTokenUsage(tokens) {
    if (tokens < 5000) {
      return {
        badge: chalk.green('Optimized'),
        message: 'Lightweight configuration, excellent for performance',
        needsOptimization: false
      };
    } else if (tokens < 15000) {
      return {
        badge: chalk.blue('Good'),
        message: 'Reasonable size, good balance of guidance and performance',
        needsOptimization: false
      };
    } else if (tokens < 30000) {
      return {
        badge: chalk.yellow('Medium'),
        message: 'Substantial configuration, consider reviewing for redundancy',
        needsOptimization: true
      };
    } else {
      return {
        badge: chalk.red('Requires Optimization'),
        message: 'Large configuration may impact AI performance, review and consolidate',
        needsOptimization: true
      };
    }
  }

  /**
   * Generate gaps section - WITH SPECIFIC TECH RECOMMENDATIONS
   */
  generateGapsSection(gaps, techStack) {
    const lines = [
      chalk.bold('🔍 Gap Analysis & Recommendations'),
      chalk.gray('-'.repeat(30)),
      ''
    ];

    // Coverage score
    lines.push(`Coverage Score: ${this.formatCoverageScore(gaps.coverageScore)}`);
    lines.push(chalk.dim('(Based on your tech stack vs your AI instructions)'));
    lines.push('');

    // Show what technologies need rules
    if (gaps.priority.high.length > 0 || gaps.priority.medium.length > 0) {
      lines.push(chalk.bold('YOUR TECH STACK NEEDS RULES FOR:'));
      
      // Group by technology
      const techNeeds = this.groupGapsByTechnology(gaps, techStack);
      
      for (const [tech, needs] of Object.entries(techNeeds)) {
        lines.push(`\n${chalk.cyan(tech)}:`);
        for (const need of needs) {
          lines.push(`  ${need.priority === 'high' ? chalk.red('•') : chalk.yellow('•')} ${need.detail}`);
        }
      }
      lines.push('');
    }

    // Traditional priority listing
    if (gaps.priority.high.length > 0) {
      lines.push(chalk.red.bold('🔴 HIGH PRIORITY RULES NEEDED:'));
      for (const rec of gaps.priority.high) {
        lines.push(`  ${rec.title}`);
        lines.push(`    ${chalk.dim(rec.reason)}`);
      }
      lines.push('');
    }

    if (gaps.priority.medium.length > 0) {
      lines.push(chalk.yellow.bold('🟡 MEDIUM PRIORITY:'));
      for (const rec of gaps.priority.medium) {
        lines.push(`  ${rec.title}`);
        lines.push(`    ${chalk.dim(rec.reason)}`);
      }
      lines.push('');
    }

    if (gaps.priority.low.length > 0) {
      lines.push(chalk.green.bold('🟢 LOW PRIORITY:'));
      for (const rec of gaps.priority.low) {
        lines.push(`  ${rec.title}`);
        lines.push(`    ${chalk.dim(rec.reason)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Group gaps by technology for clearer presentation
   */
  groupGapsByTechnology(gaps, techStack) {
    const grouped = {};
    
    // Process all priority levels
    const allGaps = [
      ...gaps.priority.high.map(g => ({...g, priority: 'high'})),
      ...gaps.priority.medium.map(g => ({...g, priority: 'medium'})),
      ...gaps.priority.low.map(g => ({...g, priority: 'low'}))
    ];
    
    for (const gap of allGaps) {
      // Extract technology from the gap
      let tech = 'General';
      
      if (gap.pattern) {
        tech = this.formatTech(gap.pattern);
      } else if (gap.reason) {
        // Extract tech from reason
        for (const db of techStack.databases) {
          if (gap.reason.toLowerCase().includes(db)) {
            tech = this.formatTech(db);
            break;
          }
        }
        for (const fw of techStack.frameworks) {
          if (gap.reason.toLowerCase().includes(fw)) {
            tech = this.formatTech(fw);
            break;
          }
        }
      }
      
      if (!grouped[tech]) {
        grouped[tech] = [];
      }
      
      grouped[tech].push({
        priority: gap.priority,
        detail: gap.content || gap.title
      });
    }
    
    return grouped;
  }

  /**
   * Generate IMPROVED MCP recommendations section with better organization
   */
  generateImprovedMCPSection(recommendations) {
    const lines = [
      chalk.bold('🔧 Recommended MCP Servers'),
      chalk.gray('-'.repeat(30)),
      ''
    ];

    if (recommendations.length === 0) {
      lines.push(chalk.gray('No specific MCP servers recommended for your tech stack'));
      return lines.join('\n');
    }

    // Group servers by priority and filter out archived ones
    const activeRecommendations = recommendations.filter(r => !r.archived);
    const archivedServers = recommendations.filter(r => r.archived);
    
    const byPriority = {
      essential: activeRecommendations.filter(r => r.priority === 'essential'),
      recommended: activeRecommendations.filter(r => r.priority === 'recommended'),
      optional: activeRecommendations.filter(r => r.priority === 'optional')
    };

    // Show total count
    lines.push(`Found ${chalk.cyan(activeRecommendations.length)} relevant MCP servers for your tech stack:`);
    lines.push('');

    // Essential servers
    if (byPriority.essential.length > 0) {
      lines.push(chalk.red.bold(`ESSENTIAL (${byPriority.essential.length}):`));
      lines.push(chalk.dim('Core servers that directly support your detected technologies'));
      lines.push('');
      
      for (const mcp of byPriority.essential) {
        lines.push(`${chalk.red('●')} ${chalk.bold(mcp.name)} ${mcp.official ? chalk.green('[OFFICIAL]') : ''}`);
        lines.push(`  ${chalk.gray('Package:')} ${chalk.cyan(mcp.package)}`);
        lines.push(`  ${chalk.gray('Why:')} ${mcp.reason}`);
        lines.push(`  ${chalk.gray('Install:')} ${chalk.blue(mcp.installCommand || mcp.repository)}`);
        lines.push('');
      }
    }

    // Recommended servers
    if (byPriority.recommended.length > 0) {
      lines.push(chalk.yellow.bold(`RECOMMENDED (${byPriority.recommended.length}):`));
      lines.push(chalk.dim('Servers that enhance your development workflow'));
      lines.push('');
      
      for (const mcp of byPriority.recommended) {
        lines.push(`${chalk.yellow('●')} ${chalk.bold(mcp.name)} ${mcp.official ? chalk.green('[OFFICIAL]') : ''}`);
        lines.push(`  ${chalk.gray('Package:')} ${chalk.cyan(mcp.package)}`);
        lines.push(`  ${chalk.gray('Why:')} ${mcp.reason}`);
        lines.push(`  ${chalk.gray('Install:')} ${chalk.blue(mcp.installCommand || mcp.repository)}`);
        lines.push('');
      }
    }

    // Optional servers - SHOW ALL, not just 5
    if (byPriority.optional.length > 0) {
      lines.push(chalk.green.bold(`OPTIONAL (${byPriority.optional.length}):`));
      lines.push(chalk.dim('Additional servers that may be useful'));
      lines.push('');
      
      // Show all optional servers in a more compact format
      for (const mcp of byPriority.optional) {
        lines.push(`${chalk.green('○')} ${chalk.bold(mcp.name)} - ${mcp.reason}`);
        lines.push(`  ${chalk.gray(mcp.package)}`);
      }
      lines.push('');
    }

    // Archived servers - separate section
    if (archivedServers.length > 0) {
      lines.push(chalk.gray.bold(`ARCHIVED BUT FUNCTIONAL (${archivedServers.length}):`));
      lines.push(chalk.dim('These servers work but have been moved to the archived repository'));
      lines.push('');
      
      for (const mcp of archivedServers) {
        lines.push(`${chalk.gray('○')} ${mcp.name} - ${mcp.reason}`);
        lines.push(`  ${chalk.gray(mcp.package)}`);
      }
      lines.push(`  ${chalk.gray('See: https://github.com/modelcontextprotocol/servers-archived')}`);
      lines.push('');
    }

    // Summary
    lines.push(chalk.bold('Installation Notes:'));
    lines.push(`• ${chalk.green('[OFFICIAL]')} servers are maintained by the companies themselves`);
    lines.push(`• Essential servers provide core functionality for your detected tech`);
    lines.push(`• Most servers can be installed with npm or accessed via their GitHub repos`);
    lines.push(`• Full MCP registry: ${chalk.blue.underline('https://github.com/modelcontextprotocol/servers')}`);

    return lines.join('\n');
  }

  /**
   * Generate maturity assessment section
   */
  generateMaturitySection(maturityScore) {
    const lines = [
      chalk.bold('📊 AI Configuration Maturity Assessment'),
      chalk.gray('-'.repeat(30)),
      ''
    ];

    // Overall score with visual bar
    const scoreBar = this.generateScoreBar(maturityScore.total);
    lines.push(`Overall Score: ${chalk.bold(maturityScore.total + '/100')} ${scoreBar}`);
    lines.push('');

    // Breakdown
    lines.push('Score Breakdown:');
    for (const [category, data] of Object.entries(maturityScore.breakdown)) {
      const bar = this.generateMiniBar(data.score, data.max);
      lines.push(`  ${this.formatCategoryName(category)}: ${data.score}/${data.max} ${bar}`);
      lines.push(`    ${chalk.dim(data.detail)}`);
    }

    // Assessment
    lines.push('');
    lines.push(this.getMaturityAssessment(maturityScore.total));

    return lines.join('\n');
  }

  /**
   * Generate next steps section
   */
  generateNextSteps(analysis) {
    const lines = [
      chalk.bold('💡 Suggested Next Steps'),
      chalk.gray('-'.repeat(30)),
      ''
    ];

    const steps = [];
    const isVibeInitialized = analysis.aiConfigs.vibe.initialized;
    const hasRules = analysis.ruleAnalysis.totalRules > 0;

    // Priority 1: Create basic rules if none exist
    if (!hasRules) {
      const techStack = [];
      if (analysis.techStack.languages.length > 0) {
        techStack.push(...analysis.techStack.languages);
      }
      if (analysis.techStack.frameworks.length > 0) {
        techStack.push(...analysis.techStack.frameworks);
      }
      if (analysis.techStack.databases.length > 0) {
        techStack.push(...analysis.techStack.databases);
      }
      
      const mainTech = techStack.slice(0, 2).map(t => this.formatTech(t)).join(', ') || 'your tech stack';
      
      steps.push({
        priority: 1,
        text: `Create essential coding rules for ${mainTech}`,
        command: 'Start with: security patterns, error handling, code standards, and testing practices'
      });
    } else {
      // Priority 1: Add missing tech-specific rules
      const missingTechRules = [];
      for (const db of analysis.techStack.databases) {
        const hasDbRules = Object.keys(analysis.ruleAnalysis.byCategory).some(cat => 
          cat.toLowerCase().includes('database') || cat.toLowerCase().includes(db)
        );
        if (!hasDbRules) {
          missingTechRules.push(this.formatTech(db));
        }
      }
      
      if (missingTechRules.length > 0) {
        steps.push({
          priority: 1,
          text: `Create dedicated rules for: ${missingTechRules.join(', ')}`,
          command: `Add specific patterns, best practices, and configurations for each`
        });
      }
    }

    // Priority 2: Consolidate if not using vibe
    if (!isVibeInitialized && analysis.aiConfigs.platforms.length >= 2) {
      const duplicatedTopics = Object.entries(analysis.ruleAnalysis.byCategory)
        .filter(([_, data]) => data.platforms.length > 1).length;
      
      if (duplicatedTopics > 0) {
        steps.push({
          priority: 2,
          text: `Unify ${duplicatedTopics} duplicated topics with vibe`,
          command: 'Run: vibe init'
        });
      }
    }

    // Priority 3: Optimize if too large
    if (analysis.ruleAnalysis.totalTokens > 15000) {
      steps.push({
        priority: 3,
        text: 'Optimize rule token usage for better performance',
        command: isVibeInitialized ? 
          'Review and consolidate verbose rules in vibe/ directory' :
          'Remove redundant rules and consolidate similar instructions'
      });
    }

    // Priority 4: Configure missing platforms
    const missingPlatforms = ['cursor', 'copilot', 'claude', 'gemini'].filter(p => 
      !analysis.aiConfigs.platforms.includes(p)
    );

    if (missingPlatforms.length > 0 && missingPlatforms.length <= 2) {
      steps.push({
        priority: 4,
        text: `Configure ${missingPlatforms.length} missing AI platform${missingPlatforms.length > 1 ? 's' : ''}`,
        command: missingPlatforms.map(p => this.getPlatformSetupHint(p)).join(', ')
      });
    }

    // Lower priority: Install MCP servers (only suggest if rules exist or are being created)
    const essentialMCPs = analysis.mcpRecommendations.filter(m => m.priority === 'essential' && !m.archived);
    if (essentialMCPs.length > 0 && (hasRules || steps.length > 0)) {
      // Prioritize official servers
      const officialEssential = essentialMCPs.filter(m => m.official);
      const otherEssential = essentialMCPs.filter(m => !m.official);
      
      const topMCPs = [...officialEssential, ...otherEssential].slice(0, 2);
      
      steps.push({
        priority: hasRules ? 5 : 6, // Lower priority if no rules exist yet
        text: 'Install essential MCP servers for enhanced AI capabilities',
        command: topMCPs.map(m => {
          if (m.repository) {
            return `Check: ${m.repository}`;
          }
          return `npx ${m.package}`;
        }).join(' & ')
      });
    }

    // Sort by priority and display
    steps.sort((a, b) => a.priority - b.priority);
    
    for (let i = 0; i < Math.min(steps.length, 5); i++) {
      lines.push(`${i + 1}. ${steps[i].text}`);
      if (steps[i].command) {
        lines.push(`   ${chalk.dim(steps[i].command)}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  // Helper methods

  getPlatformSetupHint(platform) {
    const hints = {
      cursor: 'Create .cursor/rules/',
      copilot: 'Create .github/instructions/',
      claude: 'Create CLAUDE.md',
      gemini: 'Create GEMINI.md'
    };
    return hints[platform] || platform;
  }

  getPlatformIcon(platform) {
    const icons = {
      cursor: '🎯',
      copilot: '🐙',
      claude: '🤖',
      gemini: '💎',
      vibe: '🔥',
      vscode: '💻'
    };
    return icons[platform] || '📄';
  }

  getPlatformStatus(platform, config, vibeStatus) {
    if (vibeStatus.managed.includes(platform)) {
      return chalk.green('(vibe-managed)');
    }
    if (config.type === 'modern') {
      return chalk.blue('(configured)');
    }
    if (config.type === 'legacy') {
      return chalk.yellow('(legacy format)');
    }
    return '';
  }

  getFileIcon(file) {
    if (!file.exists) return chalk.red('✗');
    if (file.hasContent === false) return chalk.yellow('⚠');
    return chalk.green('✓');
  }

  formatTokens(tokens) {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k tokens`;
    }
    return `${tokens} tokens`;
  }

  formatProjectType(type) {
    const types = {
      'full-stack-application': 'Full-Stack Application',
      'frontend-application': 'Frontend Application',
      'backend-api': 'Backend API',
      'backend-service': 'Backend Service',
      'library': 'Library/Package',
      'application': 'Application'
    };
    return types[type] || type;
  }

  formatTech(tech) {
    const names = {
      'nextjs': 'Next.js',
      'nestjs': 'NestJS',
      'graphql': 'GraphQL',
      'postgresql': 'PostgreSQL',
      'mongodb': 'MongoDB',
      'mysql': 'MySQL',
      'sqlite': 'SQLite',
      'redis': 'Redis',
      'typescript': 'TypeScript',
      'javascript': 'JavaScript',
      'express': 'Express',
      'fastify': 'Fastify',
      'react': 'React',
      'vue': 'Vue',
      'angular': 'Angular',
      'jest': 'Jest',
      'docker': 'Docker'
    };
    return names[tech.toLowerCase()] || this.capitalize(tech);
  }

  formatArchitecture(pattern) {
    const names = {
      'monorepo': 'Monorepo structure',
      'microservices': 'Microservices architecture',
      'component-based': 'Component-based structure',
      'serverless': 'Serverless deployment'
    };
    return names[pattern] || pattern;
  }

  formatCoverageScore(score) {
    if (score >= 90) return chalk.green(`${score}% - Excellent`);
    if (score >= 70) return chalk.blue(`${score}% - Good`);
    if (score >= 50) return chalk.yellow(`${score}% - Moderate`);
    return chalk.red(`${score}% - Needs Improvement`);
  }

  generateScoreBar(score) {
    const filled = Math.round(score / 10);
    const empty = 10 - filled;
    return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  }

  generateMiniBar(score, max) {
    const percentage = (score / max) * 100;
    const filled = Math.round(percentage / 20);
    const empty = 5 - filled;
    return chalk.green('▰'.repeat(filled)) + chalk.gray('▱'.repeat(empty));
  }

  formatCategoryName(category) {
    const names = {
      'platformCoverage': 'Platform Coverage',
      'ruleCoverage': 'Rule Coverage',
      'ruleQuality': 'Rule Quality',
      'mcpReadiness': 'MCP Readiness'
    };
    return names[category] || category;
  }

  getMaturityAssessment(score) {
    if (score >= 90) {
      return chalk.green('✨ Excellent! Your AI configuration is comprehensive and well-optimized.');
    } else if (score >= 70) {
      return chalk.blue('👍 Good setup! A few improvements would make it excellent.');
    } else if (score >= 50) {
      return chalk.yellow('📈 Decent foundation. Several opportunities for enhancement.');
    } else {
      return chalk.red('🚀 Getting started. Focus on the high-priority recommendations above.');
    }
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

module.exports = { ReportGenerator };
