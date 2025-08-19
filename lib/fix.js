const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const matter = require('gray-matter');
const ora = require('ora');
const { detectRuleIssues, analyzeVibeRules } = require('./status');

/**
 * Automatically fix detected rule configuration issues
 */
async function fixRuleIssues(projectPath, options = {}) {
  const spinner = ora();

  try {
    console.log(chalk.magenta('🔧 Vibe Fix - Resolving Rule Issues\n'));

    // Check if vibe system exists
    const vibeDir = path.join(projectPath, 'vibe');
    try {
      await fs.access(vibeDir);
    } catch {
      console.log(chalk.red('❌ Vibe system not initialized'));
      console.log(chalk.yellow('💡 Run'), chalk.cyan('vibe init'), chalk.yellow('first'));
      return;
    }

    // Analyze current rules and detect issues
    spinner.start('🔍 Analyzing rule issues...');
    const vibeRules = await analyzeVibeRules(vibeDir);
    const issues = await detectRuleIssues(vibeRules);
    spinner.succeed(`Found ${issues.length} issues to address`);

    if (issues.length === 0) {
      console.log(chalk.green('✅ No issues detected - your vibe is clean!\n'));
      return;
    }

    // Show what will be fixed
    console.log(chalk.bold('🔧 Issues to fix:\n'));
    issues.forEach(issue => {
      const icon = issue.severity === 'error' ? chalk.red('❌') : chalk.yellow('⚠️');
      console.log(`${icon} ${chalk.bold(issue.filename)}: ${issue.message}`);
    });

    if (options.dryRun) {
      console.log(chalk.yellow('\n🔍 Dry run mode - no changes made'));
      console.log(chalk.yellow('💡 Run without --dry-run to apply fixes'));
      return;
    }

    console.log('');

    // Create backups if requested
    if (options.backup) {
      spinner.start('📦 Creating backups...');
      await createBackups(vibeDir, issues);
      spinner.succeed('Created backups');
    }

    // Apply fixes
    spinner.start('🔧 Applying fixes...');
    const fixResults = await applyFixes(vibeDir, issues);
    spinner.succeed(`Applied ${fixResults.fixed} fixes, ${fixResults.skipped} skipped`);

    // Show results
    showFixResults(fixResults);

  } catch (error) {
    spinner.fail('Fix operation failed');
    throw error;
  }
}

/**
 * Apply fixes to rule files
 */
async function applyFixes(vibeDir, issues) {
  const results = { fixed: 0, skipped: 0, details: [] };

  // Group issues by filename for batch processing
  const issuesByFile = issues.reduce((acc, issue) => {
    if (!acc[issue.filename]) acc[issue.filename] = [];
    acc[issue.filename].push(issue);
    return acc;
  }, {});

  for (const [filename, fileIssues] of Object.entries(issuesByFile)) {
    try {
      const filePath = path.join(vibeDir, filename);
      const content = await fs.readFile(filePath, 'utf8');
      const parsed = matter(content);
      
      let frontmatter = { ...parsed.data };
      let wasFixed = false;

      // Apply fixes to frontmatter
      for (const issue of fileIssues) {
        const fix = generateFix(issue, frontmatter, parsed.content);
        if (fix.canFix) {
          Object.assign(frontmatter, fix.frontmatterChanges);
          wasFixed = true;
          results.details.push(`✅ ${filename}: ${fix.description}`);
        } else {
          results.details.push(`⚠️  ${filename}: ${issue.message} (manual fix required)`);
          results.skipped++;
        }
      }

      // Write back the fixed file
      if (wasFixed) {
        const fixedContent = matter.stringify(parsed.content, frontmatter);
        await fs.writeFile(filePath, fixedContent);
        results.fixed++;
      }

    } catch (error) {
      results.details.push(`❌ ${filename}: Failed to fix - ${error.message}`);
      results.skipped++;
    }
  }

  return results;
}

/**
 * Generate fix for a specific issue
 */
function generateFix(issue, frontmatter, content) {
  const changes = {};
  let canFix = false;
  let description = '';

  // Handle different types of issues
  if (issue.message.includes('Missing description field')) {
    changes.description = generateDescriptionFromContent(content);
    canFix = true;
    description = 'Added auto-generated description';
  }

  if (issue.message.includes("Missing 'applyTo' field")) {
    if (frontmatter.globs) {
      changes.applyTo = convertGlobsToApplyTo(frontmatter.globs);
      canFix = true;
      description = 'Added applyTo field for Copilot compatibility';
    }
  }

  if (issue.message.includes('alwaysApply: true') && issue.message.includes('manual use')) {
    changes.alwaysApply = false;
    canFix = true;
    description = 'Changed to manual application based on description';
  }

  return {
    canFix,
    frontmatterChanges: changes,
    description
  };
}

/**
 * Generate description from rule content
 */
function generateDescriptionFromContent(content) {
  // Extract first heading or first sentence
  const lines = content.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    if (line.startsWith('# ')) {
      return line.replace('# ', '').trim();
    }
  }
  
  // Fallback to first meaningful sentence
  const firstSentence = lines.find(line => line.length > 10 && !line.startsWith('#'));
  return firstSentence ? firstSentence.substring(0, 80) + '...' : 'Auto-generated rule';
}

/**
 * Convert Cursor globs to Copilot applyTo format
 */
function convertGlobsToApplyTo(globs) {
  if (typeof globs === 'string') {
    return globs.startsWith('**') ? globs : `**/${globs}`;
  }
  return "**/*";
}

/**
 * Create backups of files that will be modified
 */
async function createBackups(vibeDir, issues) {
  const filesToBackup = [...new Set(issues.map(issue => issue.filename))];
  
  for (const filename of filesToBackup) {
    const originalPath = path.join(vibeDir, filename);
    const backupPath = path.join(vibeDir, `${filename}.backup`);
    
    try {
      const content = await fs.readFile(originalPath, 'utf8');
      await fs.writeFile(backupPath, content);
    } catch (error) {
      console.warn(`⚠️  Could not backup ${filename}: ${error.message}`);
    }
  }
}

/**
 * Show fix results to user
 */
function showFixResults(results) {
  console.log(chalk.bold('\n🎉 Fix Results:\n'));
  
  results.details.forEach(detail => {
    console.log(`   ${detail}`);
  });

  if (results.fixed > 0) {
    console.log(chalk.green(`\n✅ Successfully fixed ${results.fixed} issues`));
  }
  
  if (results.skipped > 0) {
    console.log(chalk.yellow(`⚠️  ${results.skipped} issues require manual attention`));
  }

  console.log(chalk.yellow('\n💡 Run'), chalk.cyan('vibe status'), chalk.yellow('to verify fixes\n'));
}

module.exports = {
  fixRuleIssues,
  applyFixes,
  generateFix,
  createBackups
};
