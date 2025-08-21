const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const matter = require('gray-matter');
const { detectPlatforms, directoryExists } = require('./platform-detector');
const { Logger } = require('./utils/logger');


// REAL Platform context limits based on 2025 documentation
const PLATFORM_LIMITS = {
  cursor: {
    contextWindow: 200000,   // 200K tokens (normal mode), 200K+ in Max mode
    warningThreshold: 40000, // 20% of context for rules
    name: "Cursor",
    configFile: ".cursor/rules/vibe.mdc",
    notes: "Normally 200k tokens, Max Mode uses model's full capacity"
  },
  copilot: {
    contextWindow: 64000,    // 64K with GPT-4o (confirmed in changelog)
    warningThreshold: 12000, // ~20% of context for rules
    name: "GitHub Copilot", 
    configFile: ".github/instructions/vibe.instructions.md",
    notes: "64K with GPT-4o, 128K in VS Code Insiders"
  },
  claude: {
    contextWindow: 200000,   // 200K standard, 1M in beta for tier 4+
    warningThreshold: 30000, // ~15% of context for rules
    name: "Claude Code",
    configFile: "CLAUDE.md",
    notes: "200K standard, 1M available in beta for Claude Sonnet 4"
  },
  gemini: {
    contextWindow: 1000000,  // 1M tokens confirmed (Gemini 2.5 Pro)
    warningThreshold: 50000, // ~5% of context for rules  
    name: "Gemini CLI",
    configFile: "GEMINI.md",
    notes: "1M tokens with Gemini 2.5 Pro, 2M available in some versions"
  }
};

/**
 * Show comprehensive vibe system status
 */
async function showStatus(projectPath, options = {}) {
  const logger = Logger({ mcpMode: options.mcpMode });

  logger(chalk.magenta('🔥 Vibe System Status\n'));

  // Check if vibe directory exists
  const vibeDir = path.join(projectPath, 'vibe');
  const vibeExists = await directoryExists(vibeDir);
  
  if (!vibeExists) {
    logger(chalk.red('❌ Vibe system not initialized'));
    logger(chalk.yellow('💡 Run'), chalk.cyan('vibe init'), chalk.yellow('to get started'));
    return;
  }

  logger(chalk.green('✅ Vibe system initialized\n'));

  // Detect platforms and analyze configurations
  const detection = await detectPlatforms(projectPath);
  await showPlatformStatus(projectPath, detection.platforms, options, logger);

  // Analyze vibe rules
  const vibeRules = await analyzeVibeRules(vibeDir);
  await showRuleStatus(vibeRules, detection.platforms, options, logger);

  // Performance analysis per platform
  if (detection.platforms.length > 0) {
    await showPerformanceAnalysis(vibeRules, detection.platforms, options, logger);
  }

  // Error detection and validation
  const issues = await detectRuleIssues(vibeRules);
  await showIssues(issues, logger);

  // Show suggestions
  showNextSteps(issues.length > 0, options, logger);
}

/**
 * Show platform detection and configuration status
 */
async function showPlatformStatus(projectPath, detectedPlatforms, options = {}, logger) {
  const verbose = options.verbose || false;
  

  logger(chalk.bold('🎯 Platform Status:\n'));

  for (const platform of ['cursor', 'copilot', 'claude', 'gemini']) {
    const isDetected = detectedPlatforms.includes(platform);
    const limits = PLATFORM_LIMITS[platform];
    const configPath = path.join(projectPath, limits.configFile);
    const configExists = await fileExists(configPath);

    if (isDetected && configExists) {
      logger(`   ✅ ${chalk.green(limits.name.toUpperCase())} (${limits.configFile})`);
    } else if (isDetected && !configExists) {
      logger(`   ⚠️  ${chalk.yellow(limits.name.toUpperCase())} (detected but no vibe config)`);
    } else {
      logger(`   ⚪ ${chalk.gray(limits.name.toUpperCase())} (not configured)`);
    }

    // VERBOSE: Show additional platform details
    if (verbose && (isDetected || limits)) {
      logger(`      📊 Context limit: ${limits.contextWindow.toLocaleString()} tokens`);
      logger(`      ⚠️  Warning threshold: ${limits.warningThreshold.toLocaleString()} tokens`);
      logger(`      📝 ${limits.notes}`);
      logger('');
    }
  }
  
  if (!verbose) {
    logger('');
  }
}

/**
 * Analyze and show vibe rules with categorization
 */
async function showRuleStatus(vibeRules, detectedPlatforms, options = {}, logger) {
  const verbose = options.verbose || false;

  // Categorize rules by enforcement level
  const categories = {
    always: vibeRules.filter(rule => rule.frontmatter.alwaysApply === true),
    fileSpecific: vibeRules.filter(rule => rule.frontmatter.globs && !rule.frontmatter.alwaysApply),
    intelligent: vibeRules.filter(rule => rule.frontmatter.description && !rule.frontmatter.alwaysApply && !rule.frontmatter.globs),
    manual: vibeRules.filter(rule => rule.frontmatter.alwaysApply === false && !rule.frontmatter.globs && !rule.frontmatter.description)
  };

  if (verbose) {
    // VERBOSE: Show full categorization + detailed analysis
    logger(chalk.bold(`📁 Vibe Rules by Enforcement (${vibeRules.length} files):\n`));
    showRuleCategory('⚡ Always Apply', categories.always, chalk.red, logger);
    showRuleCategory('🎯 File-Specific', categories.fileSpecific, chalk.yellow, logger);
    showRuleCategory('🧠 Intelligent', categories.intelligent, chalk.blue, logger);
    showRuleCategory('🔧 Manual Only', categories.manual, chalk.gray, logger);

    logger(chalk.bold('📊 Detailed Rule Analysis:\n'));
    for (const rule of vibeRules) {
      const tokens = estimateTokens(rule.content);
      logger(`   📄 ${chalk.bold(rule.filename)}`);
      logger(`      🔤 ~${tokens.toLocaleString()} tokens, ${rule.content.length.toLocaleString()} characters`);
      logger(`      ⚙️  ${getEnforcementDescription(rule.frontmatter)}`);
      logger(`      📝 "${rule.frontmatter.description || 'No description'}"`);
      logger(''); // Add spacing between rules
    }
  } else {
    // REGULAR: Show simple summary only
    logger(chalk.bold(`📁 Vibe Rules (${vibeRules.length} files): `), 
      chalk.red(`${categories.always.length} Always`), '•',
      chalk.yellow(`${categories.fileSpecific.length} File-Specific`), '•', 
      chalk.blue(`${categories.intelligent.length} Intelligent`), '•',
      chalk.gray(`${categories.manual.length} Manual\n`)
    );
  }
}

/**
 * Show performance analysis per platform (UPDATED WITH REAL DATA)
 */
async function showPerformanceAnalysis(vibeRules, detectedPlatforms, options = {}, logger) {
  const verbose = options.verbose || false;

  logger(chalk.bold('📊 Platform Performance Analysis:\n'));

  for (const platform of detectedPlatforms) {
    const limits = PLATFORM_LIMITS[platform];
    if (!limits) continue;

    const analysis = analyzeRuleImpactForPlatform(vibeRules, platform);
    const warningLevel = getWarningLevel(analysis.totalTokens, limits);
    
    // Color-code based on warning level
    const statusColor = warningLevel === 'high' ? chalk.red : 
                       warningLevel === 'moderate' ? chalk.yellow : chalk.green;
    const statusIcon = warningLevel === 'high' ? '❌' : 
                      warningLevel === 'moderate' ? '⚠️' : '✅';

    logger(`${statusIcon} ${statusColor(limits.name.toUpperCase())} (${limits.contextWindow.toLocaleString()} context limit):`);
    logger(`   📊 Current rules: ${analysis.totalTokens.toLocaleString()} tokens (${analysis.percentage}% of context)`);

    if (warningLevel === 'high') {
      logger(`   ${chalk.red('🚨 HIGH IMPACT')} - May significantly slow responses`);
    } else if (warningLevel === 'moderate') {
      logger(`   ${chalk.yellow('💛 MODERATE IMPACT')} - Monitor performance`);
    } else {
      logger(`   ${chalk.green('✅ LOW IMPACT')} - Performance should be good`);
    }

    // Show suggestions for this platform
    if (analysis.suggestions.length > 0) {
      analysis.suggestions.forEach(suggestion => {
        logger(`   💡 ${suggestion}`);
      });
    }

    // VERBOSE: Show additional performance details
    if (verbose) {
      const alwaysApplyTokens = vibeRules
        .filter(rule => rule.frontmatter.alwaysApply)
        .reduce((sum, rule) => sum + estimateTokens(rule.content), 0);

      logger(`   📈 Always Apply rules: ${alwaysApplyTokens.toLocaleString()} tokens`);
      logger(`   📈 File-Specific rules: ${(analysis.totalTokens - alwaysApplyTokens).toLocaleString()} tokens`);
      logger(`   📈 Available context: ${(limits.contextWindow - analysis.totalTokens).toLocaleString()} tokens`);
      logger(`   📝 Platform notes: ${limits.notes}`);
    }

    logger('\n'); // IMPROVED: Double spacing between platforms for better readability
  }
}

/**
 * Detect and show rule configuration issues
 */
async function showIssues(issues, logger) {
  
  if (issues.length === 0) {
    logger(chalk.green('✅ No rule configuration issues detected\n'));
    return;
  }

  logger(chalk.bold(`⚠️  Found ${issues.length} issues with vibe rules:\n`));

  for (const issue of issues) {
    const severity = issue.severity === 'error' ? chalk.red('❌') : chalk.yellow('⚠️');
    logger(`${severity} ${chalk.bold(issue.filename)}:`);
    logger(`   ${issue.message}`);
    if (issue.suggestion) {
      logger(`   💡 ${chalk.cyan(issue.suggestion)}`);
    }
    logger(''); // Add spacing between issues
  }

  logger(chalk.yellow('💡 Run'), chalk.cyan('vibe fix'), chalk.yellow('to automatically resolve these issues\n'));
}

/**
 * Show next steps to user
 */
function showNextSteps(hasIssues, options = {}, logger) {
  const verbose = options.verbose || false;

  logger(chalk.bold('💡 Next Steps:'));

  if (hasIssues) {
    logger(`   1. Run ${chalk.cyan('vibe fix')} to resolve configuration issues`);
    logger(`   2. Test with your AI tools to verify performance`);
  } else {
    logger(`   1. Test with your AI tools to verify integration`);
    logger(`   2. Add custom rules by editing files in ${chalk.cyan('vibe/')} directory`);
  }
  
  if (!verbose) {
    logger(`   3. Run ${chalk.cyan('vibe status --verbose')} for detailed analysis`);
  }
  logger('');
}

/**
 * Helper functions
 */
function showRuleCategory(title, rules, colorFn, logger) {
  
  logger(`${colorFn(title)} (${rules.length}):`);
  if (rules.length === 0) {
    logger('   (none)');
  } else {
    rules.forEach(rule => {
      const description = getEnforcementDescription(rule.frontmatter);
      logger(`   ${rule.filename} ${chalk.gray(`(${description})`)}`);
    });
  }
  logger(''); // Add spacing after each category
}

function getEnforcementDescription(frontmatter) {
  if (frontmatter.alwaysApply) return 'Always Apply';
  if (frontmatter.globs) return `Files: ${frontmatter.globs}`;
  if (frontmatter.description) return 'Intelligent';
  return 'Manual Only';
}

function estimateTokens(text) {
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

function analyzeRuleImpactForPlatform(vibeRules, platform) {
  // Calculate tokens that always load for this platform
  const alwaysApplyRules = vibeRules.filter(rule => rule.frontmatter.alwaysApply);
  const totalTokens = alwaysApplyRules.reduce((sum, rule) => sum + estimateTokens(rule.content), 0);
  
  const limits = PLATFORM_LIMITS[platform];
  const percentage = Math.round((totalTokens / limits.contextWindow) * 100);
  
  const suggestions = generateOptimizationSuggestions(vibeRules, platform, totalTokens, limits);
  
  return {
    totalTokens,
    percentage,
    suggestions
  };
}

function generateOptimizationSuggestions(vibeRules, platform, totalTokens, limits) {
  const suggestions = [];
  
  if (totalTokens > limits.warningThreshold * 1.5) {
    suggestions.push('Consider splitting large rules into smaller, more specific files');
    suggestions.push('Use file-specific rules (globs) instead of "alwaysApply: true"');
  } else if (totalTokens > limits.warningThreshold) {
    suggestions.push('Monitor AI response times - consider optimizing if performance degrades');
  }
  
  const alwaysApplyCount = vibeRules.filter(rule => rule.frontmatter.alwaysApply).length;
  if (alwaysApplyCount > 5) {
    suggestions.push(`${alwaysApplyCount} "Always Apply" rules - consider if all are truly needed`);
  }
  
  return suggestions;
}

function getWarningLevel(tokens, limits) {
  if (tokens > limits.warningThreshold * 1.5) return 'high';
  if (tokens > limits.warningThreshold) return 'moderate';
  return 'low';
}

async function analyzeVibeRules(vibeDir) {
  const ruleFiles = await fs.readdir(vibeDir);
  const rules = [];

  for (const filename of ruleFiles) {
    if (!filename.endsWith('.md')) continue;

    const filePath = path.join(vibeDir, filename);
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = matter(content);

    rules.push({
      filename,
      content: parsed.content,
      frontmatter: parsed.data,
      tokens: estimateTokens(parsed.content)
    });
  }

  return rules;
}

async function detectRuleIssues(vibeRules) {
  const issues = [];

  for (const rule of vibeRules) {
    const ruleIssues = validateRule(rule);
    issues.push(...ruleIssues);
  }

  return issues;
}

function validateRule(rule) {
  const issues = [];
  const { filename, frontmatter, content, tokens } = rule;

  // Check for missing required fields
  if (!frontmatter.description && !frontmatter.alwaysApply) {
    issues.push({
      filename,
      severity: 'error',
      message: 'Missing description field - rule may not be applied correctly',
      suggestion: 'Add description or set alwaysApply: true'
    });
  }

  // Check for conflicting settings
  if (frontmatter.alwaysApply && frontmatter.description && frontmatter.description.toLowerCase().includes('manual')) {
    issues.push({
      filename,
      severity: 'warning',
      message: 'Description suggests manual use but alwaysApply: true',
      suggestion: 'Consider setting alwaysApply: false'
    });
  }

  // Check for missing platform compatibility
  if (frontmatter.globs && !frontmatter.applyTo) {
    issues.push({
      filename,
      severity: 'warning',
      message: "Missing 'applyTo' field for Copilot compatibility",
      suggestion: 'Add applyTo field matching the globs pattern'
    });
  }

  // Check for large files (adjusted thresholds)
  if (tokens > 3000) {
    issues.push({
      filename,
      severity: 'warning',
      message: `Large rule file (${tokens.toLocaleString()} tokens) - may impact performance`,
      suggestion: 'Consider splitting into smaller, focused rules'
    });
  }

  // Check for empty content
  if (!content.trim()) {
    issues.push({
      filename,
      severity: 'error',
      message: 'Empty rule file',
      suggestion: 'Add rule content or remove file'
    });
  }

  return issues;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  showStatus,
  analyzeVibeRules,
  detectRuleIssues,
  validateRule,
  PLATFORM_LIMITS
};
