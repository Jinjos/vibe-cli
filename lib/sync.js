const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const { detectPlatforms } = require('./platform-detector');
const { migrateExistingRules } = require('./rule-migrator');
const { cleanupOriginalRules } = require('./cleanup');

/**
 * Main sync function for vibe system - simplified version
 * Syncs ALL rules from Cursor/Copilot directories to vibe/
 * @param {string} projectPath - Project root directory
 * @param {Object} options - Sync options
 * @param {boolean} options.full - Move rules and delete originals
 * @param {string} options.platforms - Comma-separated platforms to sync
 * @param {boolean} options.dryRun - Show what would be synced without making changes
 * @returns {Object} Sync results
 */
async function syncVibeSystem(projectPath, options = {}) {
  const spinner = ora();

  try {
    // Step 1: Verify vibe system exists
    const vibeDir = path.join(projectPath, 'vibe');
    try {
      await fs.access(vibeDir);
    } catch (error) {
      throw new Error('Vibe system not initialized. Run "vibe init" first.');
    }

    // Step 2: Get existing vibe rules to track overwrites
    spinner.start('📋 Loading existing vibe rules...');
    const existingVibeRules = await getExistingVibeRules(vibeDir);
    const existingVibeNames = new Set(existingVibeRules.map(r => r.filename));
    spinner.succeed(`Found ${existingVibeRules.length} existing vibe rules`);

    // Step 3: Detect ALL rules from Cursor/Copilot directories
    spinner.start('🔍 Scanning for new platform rules...');
    const detection = await detectPlatforms(projectPath);
    
    // Filter rules from platforms with directory structures
    let rulesToSync = detection.existingRules.filter(rule => 
      rule.platform === 'cursor' || 
      rule.platform === 'copilot' ||
      (rule.platform === 'claude' && rule.relativePath.includes('.claude/'))
    );
    
    // Filter by platforms if specified
    if (options.platforms && options.platforms !== 'auto') {
      const platforms = options.platforms.split(',').map(p => p.trim());
      rulesToSync = rulesToSync.filter(rule => platforms.includes(rule.platform));
    }
    
    if (rulesToSync.length === 0) {
      spinner.succeed('No rules found to sync');
      console.log(chalk.green('✨ No platform rules to sync!'));
      return { syncedRules: [], newRules: 0, overwrittenRules: 0 };
    }
    
    spinner.succeed(`Found ${rulesToSync.length} rules to sync`);

    // Step 4: Analyze what will happen (new vs overwrite)
    const syncAnalysis = await analyzeSyncOperation(rulesToSync, existingVibeNames);
    
    // Step 5: Dry run check
    if (options.dryRun) {
      console.log(chalk.cyan('\n📋 DRY RUN - Sync operation summary:'));
      console.log(`   ${chalk.green('✨')} ${syncAnalysis.new.length} new rules to add`);
      console.log(`   ${chalk.yellow('🔄')} ${syncAnalysis.overwrite.length} existing rules to overwrite`);
      
      if (syncAnalysis.overwrite.length > 0) {
        console.log(chalk.yellow('\n📝 Rules that will be overwritten:'));
        syncAnalysis.overwrite.forEach(rule => {
          console.log(`   ${chalk.yellow('→')} ${rule.targetName}`);
        });
      }
      
      if (options.full) {
        console.log(chalk.yellow('\n🗑️  With --full flag, originals would be removed'));
      }
      return { syncedRules: rulesToSync, newRules: syncAnalysis.new.length, overwrittenRules: syncAnalysis.overwrite.length, dryRun: true };
    }

    // Step 6: Sync ALL rules to vibe system
    spinner.start('📋 Syncing rules to vibe/ directory...');
    const syncedRules = await migrateExistingRules(projectPath, vibeDir, rulesToSync);
    spinner.succeed(`Synced ${syncedRules.length} rules to vibe/`);

    // Step 7: Full sync cleanup if requested
    if (options.full && syncedRules.length > 0) {
      spinner.start('🗑️  Removing original rule files (--full mode)...');
      await cleanupOriginalRules(projectPath, syncedRules, { force: true });
      spinner.succeed('Removed original rule files');
    }

    // Step 8: Success summary
    console.log(chalk.green(`\n✨ Sync complete!`));
    console.log(`   ${chalk.green('✨')} ${syncAnalysis.new.length} new rules added`);
    console.log(`   ${chalk.yellow('🔄')} ${syncAnalysis.overwrite.length} existing rules overwritten`);
    console.log(`   ${chalk.blue('📁')} Total rules synced: ${syncedRules.length}`);
    
    if (!options.full && syncedRules.length > 0) {
      console.log(chalk.blue('\n💡 Run'), chalk.cyan('vibe sync --full'), chalk.blue('to remove originals'));
    }

    return { syncedRules, newRules: syncAnalysis.new.length, overwrittenRules: syncAnalysis.overwrite.length };

  } catch (error) {
    spinner.fail('Sync failed');
    throw error;
  }
}

/**
 * Analyze sync operation to determine new vs overwrite
 */
async function analyzeSyncOperation(rulesToSync, existingVibeNames) {
  const analysis = {
    new: [],
    overwrite: []
  };

  for (const rule of rulesToSync) {
    // Generate the target filename using the same logic as rule-migrator
    const targetName = generatePotentialFilename(rule);
    
    if (existingVibeNames.has(targetName)) {
      analysis.overwrite.push({ ...rule, targetName });
    } else {
      analysis.new.push({ ...rule, targetName });
    }
  }

  return analysis;
}

/**
 * Get list of existing rules in vibe directory
 */
async function getExistingVibeRules(vibeDir) {
  try {
    const files = await fs.readdir(vibeDir);
    const mdFiles = files.filter(file => file.endsWith('.md'));
    return mdFiles.map(file => ({
      filename: file,
      path: path.join(vibeDir, file)
    }));
  } catch (error) {
    return [];
  }
}



/**
 * Generate potential filename for a rule (uses same logic as rule-migrator)
 */
function generatePotentialFilename(rule) {
  // Use the same logic as rule-migrator for consistency
  const { extractContentBaseName } = require('./rule-migrator');
  
  try {
    // Use the exact same naming logic as rule-migrator
    const baseName = extractContentBaseName(rule);
    let candidateName = `${baseName}.md`;
    
    // Check for conflicts with platform prefix (simplified for conflict detection)
    const { platform } = rule;
    
    return candidateName;
  } catch (error) {
    // Fallback to simple naming if there are any issues
    const basename = path.basename(rule.filePath, path.extname(rule.filePath));
    
    // Convert common patterns to readable names
    if (basename === '.cursorrules') return 'cursor-rules.md';
    if (basename === 'CLAUDE') return 'claude-rules.md';
    if (basename === 'GEMINI') return 'gemini-rules.md';
    if (basename.endsWith('.instructions')) return basename.replace('.instructions', '') + '.md';
    
    return basename + '.md';
  }
}



module.exports = {
  syncVibeSystem
};
