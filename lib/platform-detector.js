const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');
const { Logger } = require('./utils/logger');

/**
 * Detect which AI platforms are present and find existing rule files
 */
async function detectPlatforms(projectPath) {
  const platforms = [];
  const existingRules = [];

  // Platform detection patterns
  const detectionPatterns = {
    cursor: [
      '.cursorrules',
      '.cursor/rules/*.mdc'
    ],
    claude: [
      'CLAUDE.md',           // Legacy single file
      '.claude/*.md'         // Modern directory structure
    ],
    gemini: [
      'GEMINI.md',           // Legacy single file
      '.gemini/*.md'         // Future-proof directory structure
    ],
    copilot: [
      '.github/copilot-instructions.md',
      '.github/instructions/*.instructions.md'
    ]
  };

  const logger = Logger();

  logger('🔍 Scanning for existing AI configurations...\n');

  // Check each platform
  for (const [platform, patterns] of Object.entries(detectionPatterns)) {
    let platformDetected = false;
    
    for (const pattern of patterns) {
      const fullPattern = path.join(projectPath, pattern);
      const matches = await glob(fullPattern, { absolute: true });
      
      if (matches.length > 0) {
        if (!platformDetected) {
          platforms.push(platform);
          platformDetected = true;
          logger(`   ✅ ${platform.toUpperCase()} detected`);
        }
        
        // Add found files to existing rules
        for (const filePath of matches) {
          const relativePath = path.relative(projectPath, filePath);
          existingRules.push({
            platform,
            filePath,
            relativePath,
            type: determineRuleType(relativePath)
          });
          logger(`      → ${relativePath}`);
        }
      }
    }
    
    if (!platformDetected) {
      logger(`   ⚪ ${platform.toUpperCase()} not detected`);
    }
  }

  logger(`\n📊 Summary: Found ${platforms.length} platforms with ${existingRules.length} rule files\n`);

  return {
    platforms,
    existingRules,
    projectPath
  };
}

/**
 * Determine the type of rule file based on its path
 */
function determineRuleType(relativePath) {
  if (relativePath === '.cursorrules') return 'cursorrules-legacy';
  if (relativePath.includes('.cursor/rules/')) return 'cursor-mdc';
  if (relativePath === 'CLAUDE.md') return 'claude-main';
  if (relativePath.includes('.claude/')) return 'claude-modern';
  if (relativePath === 'GEMINI.md') return 'gemini-main';
  if (relativePath.includes('.gemini/')) return 'gemini-modern';
  if (relativePath === '.github/copilot-instructions.md') return 'copilot-legacy';
  if (relativePath.includes('.github/instructions/')) return 'copilot-instructions';
  return 'unknown';
}

/**
 * Check if directory exists
 */
async function directoryExists(dirPath) {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if file exists
 */
async function fileExists(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Create directory if it doesn't exist
 */
async function ensureDirectory(dirPath) {
  if (!(await directoryExists(dirPath))) {
    await fs.mkdir(dirPath, { recursive: true });
    return true; // Created
  }
  return false; // Already existed
}

module.exports = {
  detectPlatforms,
  directoryExists,
  fileExists,
  ensureDirectory,
  determineRuleType
};
