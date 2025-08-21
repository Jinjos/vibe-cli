const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const { detectPlatforms } = require('./platform-detector');
const { migrateExistingRules } = require('./rule-migrator');
const { generatePlatformConfigs } = require('./config-generator');
const { Logger } = require('./utils/logger');

/**
 * Main initialization function for vibe system
 */
async function initializeVibeSystem(projectPath, options = {}) {
  const mcpMode = options.mcpMode || false;
  
  // Create spinner factory that returns no-op when in MCP mode
  const createSpinner = () => {
    if (mcpMode) {
      return {
        start: () => {},
        succeed: () => {},
        fail: () => {},
        stop: () => {}
      };
    }
    return ora();
  };
  
  const spinner = createSpinner();
  
  // Helper function to conditionally log
  const logger = Logger({ mcpMode: options.mcpMode });

  try {
    // Step 1: Create vibe directory (flat structure)
    spinner.start('📁 Creating vibe/ directory...');
    const vibeDir = path.join(projectPath, 'vibe');
    await fs.mkdir(vibeDir, { recursive: true });
    spinner.succeed('Created vibe/ directory');

    // Step 2: Detect platforms and existing rules
    spinner.start('🔍 Scanning for existing AI configurations...');
    const detection = await detectPlatforms(projectPath);
    spinner.succeed(`Found ${detection.platforms.length} platforms, ${detection.existingRules.length} rule files`);

    // Step 3: Migrate existing rules
    let migratedRules = [];
    if (detection.existingRules.length > 0) {
      spinner.start('📋 Migrating existing rules to vibe/ directory...');
      migratedRules = await migrateExistingRules(projectPath, vibeDir, detection.existingRules);
      spinner.succeed(`Migrated ${migratedRules.length} rules to vibe/`);
    } else {
      spinner.start('📋 Creating starter rules...');
      await createStarterRules(vibeDir);
      spinner.succeed('Created starter rules in vibe/');
    }

    // Step 4: Generate platform configurations (filtered by --platforms)
    spinner.start('⚙️  Generating platform configurations...');
    const platformsToSetup = (!options.platforms || options.platforms === 'auto') ? 
      ['cursor', 'claude', 'copilot', 'gemini'] : 
      options.platforms.split(',').map(p => p.trim());

    const generatedConfigs = await generatePlatformConfigs(projectPath, platformsToSetup, options);
    spinner.succeed(`Generated configurations for ${generatedConfigs.length} platforms`);

    // Step 5: Save migration data for potential cleanup
    if (migratedRules.length > 0) {
      await saveMigrationData(projectPath, migratedRules);
    }

    // Step 6: Show information about cleanup option (only if not --full)
    if (!options.full && migratedRules.length > 0) {
      showCleanupInformation(migratedRules, logger);
    }

    // Step 7: Show completion summary
    displayCompletionSummary(detection, generatedConfigs, options.full, platformsToSetup, logger);

    // Return data for potential cleanup
    return {
      migratedRules,
      detection,
      generatedConfigs
    };

  } catch (error) {
    spinner.fail('Initialization failed');
    throw error;
  }
}

/**
 * Save migration data for later cleanup
 */
async function saveMigrationData(projectPath, migratedRules) {
  const migrationFile = path.join(projectPath, '.vibe-migration.json');
  const migrationData = {
    timestamp: new Date().toISOString(),
    migratedRules: migratedRules.map(rule => ({
      originalPath: rule.originalPath,
      platform: rule.platform,
      filename: rule.filename
    }))
  };
  
  await fs.writeFile(migrationFile, JSON.stringify(migrationData, null, 2));
}

/**
 * Show information about cleanup option to user
 */
function showCleanupInformation(migratedRules, logger) {
  const cursorRules = migratedRules.filter(r => r.platform === 'cursor').length;
  const copilotRules = migratedRules.filter(r => r.platform === 'copilot').length;
  
  if (cursorRules > 0 || copilotRules > 0) {
    logger(chalk.yellow('\n💡 IMPORTANT: Original rule files are still in place\n'));
    logger('   Your rules have been migrated to the vibe/ directory, but the original files remain:');

    if (cursorRules > 0) {
      logger(`   📁 .cursor/rules/ - ${cursorRules} original Cursor files`);
    }
    if (copilotRules > 0) {
      logger(`   📁 .github/ - ${copilotRules} original Copilot files`);
    }

    logger('\n   After testing the vibe system, you can safely remove the originals:');
    logger(`   ${chalk.cyan('vibe cleanup')} - Remove original files only`);
    logger(`   ${chalk.cyan('vibe init --full')} - Next time, use this for end-to-end setup`);
    logger('\n   💡 The vibe system will work with or without the original files\n');
  }
}

/**
 * Create starter rules if no existing rules found
 */
async function createStarterRules(vibeDir) {
  const starterRules = [
    {
      filename: 'coding-standards.md',
      content: `---
alwaysApply: true
applyTo: "**/*"
description: "Core coding standards that must always be followed"
---

# Core Coding Standards

## General Principles
- Write clean, readable, and maintainable code
- Use meaningful variable and function names
- Keep functions small and focused (single responsibility)
- Comment complex logic, not obvious code

## Code Style
- Use 2 spaces for indentation (not tabs)
- Maximum line length: 100 characters
- Use trailing commas in multi-line objects/arrays
- Prefer const over let, avoid var
- Use template literals for string interpolation

## Error Handling
- Always handle errors gracefully
- Use try-catch blocks for async operations
- Provide meaningful error messages
- Log errors with context
`
    },
    {
      filename: 'testing-standards.md',
      content: `---
globs: "*.test.*,*.spec.*"
alwaysApply: false
applyTo: "**/*.test.*,**/*.spec.*"
description: "Testing standards for test files"
---

# Testing Standards

## Testing Philosophy
- Write tests first (TDD) when possible
- Test behavior, not implementation
- Aim for high test coverage (>80%)
- Keep tests simple and focused

## Test Structure
- Follow AAA pattern (Arrange, Act, Assert)
- Use setup and teardown methods appropriately
- Group related tests with describe blocks
- Use descriptive test names

## Best Practices
- Mock external dependencies
- Keep tests independent of each other
- Run tests in CI/CD pipeline
- Fix failing tests immediately
`
    }
  ];

  for (const rule of starterRules) {
    await fs.writeFile(path.join(vibeDir, rule.filename), rule.content);
  }
}

/**
 * Display completion summary to user
 */
function displayCompletionSummary(detection, generatedConfigs, isFullSetup, selectedPlatforms, logger) {
  logger(chalk.green('\n🎉 Vibe system initialization complete!\n'));

  logger(chalk.bold('📋 What was created:'));
  logger(`   📁 ${chalk.cyan('vibe/')} - Your unified rules directory`);

  if (generatedConfigs.length > 0) {
    logger('   🤖 Platform configurations:');
    generatedConfigs.forEach(config => {
      logger(`      → ${chalk.yellow(config)}`);
    });
  }

  // Show which platforms were configured
  if (selectedPlatforms.length < 4) {
    logger(`   🎯 Configured platforms: ${selectedPlatforms.join(', ')}`);
    const allPlatforms = ['cursor', 'claude', 'copilot', 'gemini'];
    const skipped = allPlatforms.filter(p => !selectedPlatforms.includes(p));
    if (skipped.length > 0) {
      logger(`   ⚪ Skipped platforms: ${skipped.join(', ')}`);
    }
  }

  if (isFullSetup) {
    logger('   🧹 Original rule files removed');
  }

  logger(chalk.bold('\n💡 Next steps:'));
  logger('   1. Review and customize rules in vibe/ directory');
  logger('   2. Test with your AI tools to verify integration');
  logger('   3. Run', chalk.cyan('vibe status'), 'to verify setup');

  if (!isFullSetup && detection.existingRules.length > 0) {
    logger('   4. Run', chalk.cyan('vibe cleanup'), 'to remove original rule files');
  }

  logger(chalk.magenta('\n🔥 Your AI agents now share the same vibe!\n'));
}

module.exports = {
  initializeVibeSystem,
  createStarterRules,
  showCleanupInformation,
  saveMigrationData
};
