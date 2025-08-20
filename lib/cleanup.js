const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');

/**
 * Cleanup original rule files (Cursor and Copilot only)
 * ONLY removes original rules that were migrated during 'vibe init'
 * For rules added after init, use 'vibe sync --full' instead
 * NEVER touches vibe system files
 */
async function cleanupOriginalRules(projectPath, migratedRules, options = {}) {
  const spinner = ora();

  try {
    console.log(chalk.yellow('\n🧹 Cleanup - Removing Original Rule Files\n'));

    // Load migration data if not provided
    if (!migratedRules) {
      migratedRules = await loadMigrationData(projectPath);
    }

    if (migratedRules.length === 0) {
      console.log(chalk.blue('ℹ️  No original rules to cleanup'));
      console.log(chalk.blue('💡 Run'), chalk.cyan('vibe init'), chalk.blue('first to migrate rules\n'));
      return;
    }

    // Generate cleanup plan (Cursor and Copilot only)
    const cleanupPlan = generateCleanupPlan(migratedRules);
    
    if (cleanupPlan.length === 0) {
      console.log(chalk.blue('ℹ️  No original rule files need cleanup'));
      console.log(chalk.gray('   Root CLAUDE.md and GEMINI.md were enhanced, not replaced'));
      console.log(chalk.gray('   Only directory-based rules are removed\n'));
      return;
    }

    // Show what will be cleaned up
    console.log(chalk.bold('🗂️  Original files to be removed:\n'));
    cleanupPlan.forEach(item => {
      console.log(`   ${chalk.red('🗑️')} ${item.relativePath} ${chalk.gray(`(migrated to vibe/${item.newName})`)}`);
    });

    if (options.dryRun) {
      console.log(chalk.yellow('\n🔍 Dry run mode - no files removed'));
      console.log(chalk.yellow('💡 Run without --dry-run to perform cleanup\n'));
      return cleanupPlan;
    }

    // Always create backups (no option to disable)
    spinner.start('📦 Creating backups...');
    await createCleanupBackups(cleanupPlan);
    spinner.succeed('Created backups');

    // Remove original files
    spinner.start('🗑️  Removing original rule files...');
    const results = await executeCleanup(cleanupPlan);
    spinner.succeed(`Removed ${results.removed} files, ${results.protected} protected`);

    // Show results
    showCleanupResults(results);

    return results;

  } catch (error) {
    spinner.fail('Cleanup failed');
    throw error;
  }
}

/**
 * Generate cleanup plan - what files to remove (Cursor/Copilot/Claude with directories)
 */
function generateCleanupPlan(migratedRules) {
  const cleanupPlan = [];

  for (const rule of migratedRules) {
    // Cleanup rules from platforms with directory structures
    if (rule.platform === 'cursor' || rule.platform === 'copilot' || 
        (rule.platform === 'claude' && rule.relativePath.includes('.claude/'))) {
      // NEVER remove vibe system files
      if (isVibeSystemFile(rule.originalPath)) {
        continue; // Skip vibe files
      }

      cleanupPlan.push({
        originalPath: rule.originalPath,
        relativePath: path.relative(process.cwd(), rule.originalPath),
        newName: rule.filename,
        platform: rule.platform
      });
    }
    // Skip root CLAUDE.md and GEMINI.md - they just got enhanced, not migrated
  }

  return cleanupPlan;
}

/**
 * Check if a file is part of the vibe system (NEVER remove these)
 */
function isVibeSystemFile(filePath) {
  const filename = path.basename(filePath);
  const dirName = path.dirname(filePath);
  
  // CRITICAL: Never remove vibe system files
  if (filename === 'vibe.mdc') return true;
  if (filename === 'vibe.instructions.md') return true;
  if (filename === 'vibe.md') return true; // Claude/Gemini redirects
  if (dirName.includes('/vibe')) return true;
  if (filePath.includes('vibe/')) return true;
  if (filename === 'CLAUDE.md' && !filePath.includes('.claude/')) return true; // Root CLAUDE.md enhanced, not replaced
  if (filename === 'GEMINI.md' && !filePath.includes('.gemini/')) return true; // Root GEMINI.md enhanced, not replaced
  
  return false;
}

/**
 * Load migration data from previous init
 */
async function loadMigrationData(projectPath) {
  try {
    const migrationFile = path.join(projectPath, '.vibe-migration.json');
    const data = await fs.readFile(migrationFile, 'utf8');
    const migrationData = JSON.parse(data);
    return migrationData.migratedRules || [];
  } catch {
    // Fallback: detect what could be cleaned up
    const { detectPlatforms } = require('./platform-detector');
    const detection = await detectPlatforms(projectPath);
    
    return detection.existingRules
      .filter(rule => rule.platform === 'cursor' || rule.platform === 'copilot' || 
                     (rule.platform === 'claude' && rule.relativePath.includes('.claude/')))
      .map(rule => ({
        originalPath: rule.filePath,
        platform: rule.platform,
        filename: path.basename(rule.filePath)
      }));
  }
}

/**
 * Create backups before cleanup (always enabled)
 */
async function createCleanupBackups(cleanupPlan) {
  for (const item of cleanupPlan) {
    try {
      const backupPath = `${item.originalPath}.backup`;
      const content = await fs.readFile(item.originalPath, 'utf8');
      await fs.writeFile(backupPath, content);
    } catch (error) {
      console.warn(`⚠️  Could not backup ${item.relativePath}: ${error.message}`);
    }
  }
}

/**
 * Execute the cleanup plan
 */
async function executeCleanup(cleanupPlan) {
  const results = { removed: 0, protected: 0, details: [] };

  for (const item of cleanupPlan) {
    try {
      // Triple-check this isn't a vibe system file
      if (isVibeSystemFile(item.originalPath)) {
        results.details.push(`🛡️  Protected: ${item.relativePath} (vibe system file)`);
        results.protected++;
        continue;
      }

      // Remove the original file
      await fs.unlink(item.originalPath);
      results.details.push(`✅ Removed: ${item.relativePath}`);
      results.removed++;

    } catch (error) {
      results.details.push(`❌ Failed: ${item.relativePath} - ${error.message}`);
      results.protected++;
    }
  }

  return results;
}

/**
 * Show cleanup results
 */
function showCleanupResults(results) {
  console.log(chalk.bold('\n🎉 Cleanup Results:\n'));
  
  results.details.forEach(detail => {
    console.log(`   ${detail}`);
  });

  if (results.removed > 0) {
    console.log(chalk.green(`\n✅ Successfully removed ${results.removed} original rule files`));
    console.log(chalk.blue('📁 All rules preserved in vibe/ directory'));
    console.log(chalk.cyan('🤖 Vibe system configurations remain intact'));
  }
  
  if (results.protected > 0) {
    console.log(chalk.blue(`🛡️  ${results.protected} files protected (vibe system or failed)`));
  }

  console.log(chalk.magenta('\n🔥 Cleanup complete - your AI tools now use only the unified vibe system!\n'));
}

module.exports = {
  cleanupOriginalRules,
  loadMigrationData,
  generateCleanupPlan,
  executeCleanup,
  isVibeSystemFile,
  createCleanupBackups
};
