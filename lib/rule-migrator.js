const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');
const chalk = require('chalk');

/**
 * Migrate existing rules to the vibe/ directory with unified frontmatter
 */
async function migrateExistingRules(projectPath, vibeDir, existingRules) {
  const migratedRules = [];

  if (existingRules.length === 0) {
    console.log('   ℹ️  No existing rules to migrate');
    return migratedRules;
  }

  console.log(`   📋 Processing ${existingRules.length} existing rule files...\n`);

  for (const rule of existingRules) {
    try {
      const migrated = await migrateRuleFile(rule, vibeDir);
      if (migrated) {
        migratedRules.push(migrated);
        console.log(`      ✅ ${chalk.green(rule.relativePath)} → ${chalk.cyan(migrated)}`);
      }
    } catch (error) {
      console.log(`      ❌ ${chalk.red(rule.relativePath)} - ${error.message}`);
    }
  }

  console.log('');
  return migratedRules;
}

/**
 * Migrate a single rule file to vibe/ directory
 */
async function migrateRuleFile(rule, vibeDir) {
  const content = await fs.readFile(rule.filePath, 'utf8');
  
  // Parse existing frontmatter and content
  const parsed = matter(content);
  const originalFrontmatter = parsed.data;
  const markdownContent = parsed.content.trim();

  // Skip empty files
  if (!markdownContent) {
    throw new Error('Empty rule file');
  }

  // Generate unified frontmatter based on rule type and existing config
  const unifiedFrontmatter = generateUnifiedFrontmatter(rule.type, originalFrontmatter);
  
  // Generate filename for vibe/ directory (flat structure)
  const vibeFilename = generateVibeFilename(rule);
  const vibeFilePath = path.join(vibeDir, vibeFilename);

  // Create the unified rule file
  const unifiedContent = matter.stringify(markdownContent, unifiedFrontmatter);
  await fs.writeFile(vibeFilePath, unifiedContent);

  return vibeFilename;
}

/**
 * Generate unified frontmatter from existing rule configuration
 */
function generateUnifiedFrontmatter(ruleType, originalFrontmatter) {
  const unified = {
    description: originalFrontmatter.description || `Migrated ${ruleType} rule`,
    applyTo: "**/*" // Default for Copilot
  };

  switch (ruleType) {
    case 'cursorrules-legacy':
      // Old .cursorrules files - treat as always apply
      unified.alwaysApply = true;
      break;

    case 'cursor-mdc':
      // Modern Cursor .mdc files
      unified.alwaysApply = originalFrontmatter.alwaysApply || false;
      if (originalFrontmatter.globs) {
        unified.globs = originalFrontmatter.globs;
        unified.applyTo = convertGlobsToApplyTo(originalFrontmatter.globs);
      }
      break;

    case 'claude-main':
    case 'gemini-main':
      // Main instruction files - treat as always apply
      unified.alwaysApply = true;
      unified.description = `Core ${ruleType.split('-')[0]} instructions`;
      break;

    case 'copilot-legacy':
      // Legacy copilot instructions - treat as always apply  
      unified.alwaysApply = true;
      unified.description = 'Core Copilot instructions';
      break;

    case 'copilot-instructions':
      // Modern Copilot .instructions.md files
      if (originalFrontmatter.applyTo) {
        unified.applyTo = originalFrontmatter.applyTo;
        unified.globs = convertApplyToToGlobs(originalFrontmatter.applyTo);
        unified.alwaysApply = false;
      } else {
        unified.alwaysApply = true;
      }
      break;

    default:
      // Unknown type - conservative defaults
      unified.alwaysApply = false;
      unified.description = 'Migrated rule - review enforcement level';
  }

  return unified;
}

/**
 * Convert Cursor globs to Copilot applyTo format
 */
function convertGlobsToApplyTo(globs) {
  if (typeof globs === 'string') {
    // Simple conversion: "*.ts" -> "**/*.ts"
    return globs.startsWith('**') ? globs : `**/${globs}`;
  }
  return "**/*"; // Default fallback
}

/**
 * Convert Copilot applyTo to Cursor globs format
 */
function convertApplyToToGlobs(applyTo) {
  if (typeof applyTo === 'string') {
    // Simple conversion: "**/*.ts" -> "*.ts"  
    return applyTo.replace(/^\*\*\//, '');
  }
  return "**/*"; // Default fallback
}

/**
 * Generate filename for vibe/ directory (flat structure)
 */
function generateVibeFilename(rule) {
  const { platform, type, relativePath } = rule;

  // Create descriptive filename based on source
  switch (type) {
    case 'cursorrules-legacy':
      return 'cursor-legacy-rules.md';
    
    case 'cursor-mdc':
      const mcdName = path.basename(relativePath, '.mdc');
      return `cursor-${mcdName}.md`;
    
    case 'claude-main':
      return 'claude-main-instructions.md';
    
    case 'gemini-main':
      return 'gemini-main-instructions.md';
    
    case 'copilot-legacy':
      return 'copilot-legacy-instructions.md';
    
    case 'copilot-instructions':
      const instructionName = path.basename(relativePath, '.instructions.md');
      return `copilot-${instructionName}.md`;
    
    default:
      const baseName = path.basename(relativePath, path.extname(relativePath));
      return `${platform}-${baseName}.md`;
  }
}

module.exports = {
  migrateExistingRules,
  migrateRuleFile,
  generateUnifiedFrontmatter,
  generateVibeFilename
};
