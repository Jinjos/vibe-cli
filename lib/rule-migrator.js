const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');
const chalk = require('chalk');
const { Logger } = require('./utils/logger');

/**
 * Analyze all rules to detect naming conflicts
 */
function analyzeNamingConflicts(existingRules) {
  const baseNameMap = new Map(); // baseName -> [rules]
  const conflictSet = new Set(); // baseNames that have conflicts
  
  // Group rules by base name
  for (const rule of existingRules) {
    const baseName = extractContentBaseName(rule);
    if (!baseNameMap.has(baseName)) {
      baseNameMap.set(baseName, []);
    }
    baseNameMap.get(baseName).push(rule);
  }
  
  // Identify conflicts (same base name from different platforms)
  for (const [baseName, rules] of baseNameMap) {
    const platforms = new Set(rules.map(r => r.platform));
    if (platforms.size > 1) {
      conflictSet.add(baseName);
    }
  }
  
  return {
    baseNameMap,
    conflictSet,
    hasConflict: (baseName) => conflictSet.has(baseName)
  };
}

/**
 * Migrate existing rules to the vibe/ directory with smart naming
 */
async function migrateExistingRules(projectPath, vibeDir, existingRules, options = {}) {
  const migratedRules = [];
  const logger = Logger({ mcpMode: options.mcpMode });

  // Filter out main platform configuration files that shouldn't be migrated
  const platformConfigFiles = ['CLAUDE.md', 'GEMINI.md', '.github/copilot-instructions.md'];
  const vibeIntegrationFiles = ['vibe.mdc', 'vibe.md', 'vibe.instructions.md'];
  
  const rulesToMigrate = existingRules.filter(rule => {
    const filename = path.basename(rule.relativePath);
    return !platformConfigFiles.includes(rule.relativePath) && 
           !vibeIntegrationFiles.includes(filename);
  });
  
  if (rulesToMigrate.length === 0) {
    logger('   ℹ️  No existing rules to migrate');
    return migratedRules;
  }

  logger(`   📋 Processing ${rulesToMigrate.length} existing rule files...\n`);

  // First pass: collect all base names to detect conflicts
  const nameAnalysis = analyzeNamingConflicts(rulesToMigrate);
  
  // Second pass: migrate with smart naming based on conflict analysis
  for (const rule of rulesToMigrate) {
    try {
      const migrated = await migrateRuleFile(rule, vibeDir, nameAnalysis, logger);
      if (migrated) {
        migratedRules.push({
          ...migrated,
          originalPath: rule.filePath,
          platform: rule.platform
        });
        logger(`      ✅ ${chalk.green(rule.relativePath)} → ${chalk.cyan(migrated.filename)}`);
      }
    } catch (error) {
      logger.error(`      ❌ ${chalk.red(rule.relativePath)} - ${error.message}`);
    }
  }

  logger('');
  return migratedRules;
}

/**
 * Migrate a single rule file with smart naming
 */
async function migrateRuleFile(rule, vibeDir, nameAnalysis, logger) {
  let content = await fs.readFile(rule.filePath, 'utf8');
  
  // Pre-process content to fix common YAML issues
  // Fix unquoted glob patterns that start with * or contain **
  content = content.replace(/^(\s*globs:\s*)([*].*)$/gm, (match, prefix, glob) => {
    // If the glob is not already quoted, quote it
    if (!glob.startsWith('"') && !glob.startsWith("'")) {
      return `${prefix}'${glob}'`;
    }
    return match;
  });
  
  // Parse existing frontmatter and content
  let parsed;
  let originalFrontmatter;
  let markdownContent;
  
  try {
    parsed = matter(content);
    originalFrontmatter = parsed.data;
    markdownContent = parsed.content.trim();
  } catch (parseError) {
    // If gray-matter fails to parse, try to extract frontmatter manually
    logger(`      ⚠️  YAML parse error in ${rule.relativePath}, attempting manual extraction`);
    const lines = content.split('\n');
    const frontmatterStart = lines.findIndex(line => line.trim() === '---');
    const frontmatterEnd = lines.findIndex((line, idx) => idx > frontmatterStart && line.trim() === '---');
    
    if (frontmatterStart >= 0 && frontmatterEnd > frontmatterStart) {
      // Extract frontmatter manually
      originalFrontmatter = {};
      for (let i = frontmatterStart + 1; i < frontmatterEnd; i++) {
        const line = lines[i].trim();
        if (line && line.includes(':')) {
          const [key, ...valueParts] = line.split(':');
          let value = valueParts.join(':').trim();
          // Handle boolean values
          if (value === 'true') value = true;
          else if (value === 'false') value = false;
          // Remove quotes if present
          else if ((value.startsWith('"') && value.endsWith('"')) || 
                   (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          originalFrontmatter[key.trim()] = value;
        }
      }
      markdownContent = lines.slice(frontmatterEnd + 1).join('\n').trim();
    } else {
      throw new Error('Could not parse frontmatter');
    }
  }

  // Skip empty files
  if (!markdownContent) {
    throw new Error('Empty rule file');
  }

  // Generate smart filename based on conflict analysis
  const smartFilename = generateSmartFilename(rule, nameAnalysis);

  // Generate unified frontmatter based on rule type and existing config
  const unifiedFrontmatter = generateUnifiedFrontmatter(rule.type, originalFrontmatter);
  
  // Create the unified rule file
  const vibeFilePath = path.join(vibeDir, smartFilename);
  
  // Manually construct frontmatter to ensure proper YAML formatting
  let frontmatterLines = ['---'];
  
  // Add each frontmatter field with proper formatting
  if (unifiedFrontmatter.description) {
    frontmatterLines.push(`description: ${JSON.stringify(unifiedFrontmatter.description)}`);
  }
  if (unifiedFrontmatter.globs) {
    // Always quote globs to avoid YAML alias interpretation
    frontmatterLines.push(`globs: ${JSON.stringify(unifiedFrontmatter.globs)}`);
  }
  if (unifiedFrontmatter.applyTo) {
    frontmatterLines.push(`applyTo: ${JSON.stringify(unifiedFrontmatter.applyTo)}`);
  }
  if (unifiedFrontmatter.alwaysApply !== undefined) {
    frontmatterLines.push(`alwaysApply: ${unifiedFrontmatter.alwaysApply}`);
  }
  
  frontmatterLines.push('---');
  
  // Combine frontmatter and content
  const unifiedContent = frontmatterLines.join('\n') + '\n' + markdownContent;
  await fs.writeFile(vibeFilePath, unifiedContent);

  return {
    filename: smartFilename,
    originalFilename: path.basename(rule.filePath),
    vibeFilePath
  };
}

/**
 * Generate smart filename with conflict resolution
 */
function generateSmartFilename(rule, nameAnalysis) {
  const { platform } = rule;

  // Extract content-based name from filename or path
  const baseName = extractContentBaseName(rule);
  
  // Only add platform prefix if there's a conflict
  let filename;
  if (nameAnalysis.hasConflict(baseName)) {
    filename = `${platform}-${baseName}.md`;
  } else {
    filename = `${baseName}.md`;
  }

  return filename;
}

/**
 * Extract content-based name from rule file
 */
function extractContentBaseName(rule) {
  const { type, relativePath } = rule;
  const filename = path.basename(relativePath, path.extname(relativePath));

  // For cursor-mdc files, just return the filename without extension
  if (type === 'cursor-mdc') {
    return filename;
  }

  // Remove platform-specific prefixes to get content name
  const cleanName = filename
    .replace(/^(cursor-|copilot-|claude-|gemini-)/, '') // Remove platform prefixes
    .replace(/^(instructions|rules)$/, 'core')          // Generic names become 'core'
    .replace(/[^a-z0-9-]/gi, '-')                       // Clean special chars
    .replace(/-+/g, '-')                                // Collapse multiple dashes
    .replace(/^-|-$/g, '');                             // Remove leading/trailing dashes

  // Fallback to meaningful names based on content hints
  if (!cleanName || cleanName === 'rules' || cleanName === 'instructions') {
    switch (type) {
      case 'cursorrules-legacy': return 'cursor-legacy';
      case 'cursor-mdc': return filename.replace('.mdc', '');
      case 'claude-main': return 'claude-main';
      case 'claude-modern': return filename; // Use original filename for Claude modern files
      case 'gemini-main': return 'gemini-main';
      case 'gemini-modern': return filename; // Use original filename for Gemini modern files
      case 'copilot-legacy': return 'copilot-legacy';
      case 'copilot-instructions': return filename.replace('.instructions', '');
      default: return filename;
    }
  }

  return cleanName;
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
      if (originalFrontmatter.globs && originalFrontmatter.globs !== '') {
        // Ensure globs is properly quoted if it contains special characters
        unified.globs = String(originalFrontmatter.globs);
        unified.applyTo = convertGlobsToApplyTo(originalFrontmatter.globs);
      }
      break;

    case 'claude-main':
    case 'gemini-main':
      // Main instruction files - treat as always apply
      unified.alwaysApply = true;
      unified.description = `Core ${ruleType.split('-')[0]} instructions`;
      break;
      
    case 'claude-modern':
    case 'gemini-modern':
      // Modern directory files - respect existing frontmatter or default to intelligent
      unified.alwaysApply = originalFrontmatter.alwaysApply || false;
      if (originalFrontmatter.globs && originalFrontmatter.globs !== '') {
        unified.globs = originalFrontmatter.globs;
        unified.applyTo = convertGlobsToApplyTo(originalFrontmatter.globs);
      }
      break;

    case 'copilot-legacy':
      // Legacy copilot instructions - treat as always apply  
      unified.alwaysApply = true;
      unified.description = 'Core Copilot instructions';
      break;

    case 'copilot-instructions':
      // Modern Copilot .instructions.md files
      if (originalFrontmatter.applyTo && originalFrontmatter.applyTo !== '') {
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
  if (!globs || globs === '') {
    return "**/*"; // Default fallback for undefined or empty globs
  }
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
  if (!applyTo || applyTo === '') {
    return "**/*"; // Default fallback for undefined or empty applyTo
  }
  if (typeof applyTo === 'string') {
    // Simple conversion: "**/*.ts" -> "*.ts"  
    return applyTo.replace(/^\*\*\//, '');
  }
  return "**/*"; // Default fallback
}

module.exports = {
  migrateExistingRules,
  migrateRuleFile,
  generateUnifiedFrontmatter,
  generateSmartFilename,
  extractContentBaseName,
  analyzeNamingConflicts
};
