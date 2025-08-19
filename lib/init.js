const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const { detectPlatforms } = require('./platform-detector');
const { migrateExistingRules } = require('./rule-migrator');
const { generatePlatformConfigs } = require('./config-generator');

/**
 * Main initialization function for vibe system
 */
async function initializeVibeSystem(projectPath, options = {}) {
  const spinner = ora();

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
    if (detection.existingRules.length > 0) {
      spinner.start('📋 Migrating existing rules to vibe/ directory...');
      const migratedRules = await migrateExistingRules(projectPath, vibeDir, detection.existingRules);
      spinner.succeed(`Migrated ${migratedRules.length} rules to vibe/`);
    } else {
      spinner.start('📋 Creating starter rules...');
      await createStarterRules(vibeDir);
      spinner.succeed('Created starter rules in vibe/');
    }

    // Step 4: Generate platform configurations
    spinner.start('⚙️  Generating platform configurations...');
    const platformsToSetup = options.platforms === 'auto' ? 
      ['cursor', 'claude', 'copilot', 'gemini'] : 
      options.platforms.split(',').map(p => p.trim());

    const generatedConfigs = await generatePlatformConfigs(projectPath, platformsToSetup, options);
    spinner.succeed(`Generated configurations for ${generatedConfigs.length} platforms`);

    // Step 5: Show completion summary
    displayCompletionSummary(detection, generatedConfigs);

  } catch (error) {
    spinner.fail('Initialization failed');
    throw error;
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
      filename: 'typescript-rules.md',
      content: `---
globs: "*.ts,*.tsx"
alwaysApply: false
applyTo: "**/*.ts,**/*.tsx"
description: "TypeScript specific rules and best practices"
---

# TypeScript Rules

## Type Definitions
- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Define proper return types for functions
- Avoid using 'any' - use 'unknown' if type is truly unknown

## Naming Conventions
- Use PascalCase for interfaces, types, and classes
- Use camelCase for variables, functions, and methods
- Use UPPER_SNAKE_CASE for constants

## Best Practices
- Enable strict mode in tsconfig.json
- Use type guards for runtime type checking
- Use utility types (Partial, Pick, Omit, etc.)
- Use named exports over default exports
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
function displayCompletionSummary(detection, generatedConfigs) {
  console.log(chalk.green('\n🎉 Vibe system initialization complete!\n'));
  
  console.log(chalk.bold('📋 What was created:'));
  console.log(`   📁 ${chalk.cyan('vibe/')} - Your unified rules directory`);
  
  if (generatedConfigs.length > 0) {
    console.log('   🤖 Platform configurations:');
    generatedConfigs.forEach(config => {
      console.log(`      → ${chalk.yellow(config)}`);
    });
  }

  console.log(chalk.bold('\n💡 Next steps:'));
  console.log('   1. Review and customize rules in vibe/ directory');
  console.log('   2. Test with your AI tools to verify integration');
  console.log('   3. Run', chalk.cyan('vibe status'), 'to verify setup');
  console.log('   4. Add new rules with', chalk.cyan('vibe add-rule <category> <name>'));
  
  console.log(chalk.magenta('\n🔥 Your AI agents now share the same vibe!\n'));
}

module.exports = {
  initializeVibeSystem,
  createStarterRules
};
