const fs = require('fs').promises;
const path = require('path');
const { ensureDirectory, fileExists, directoryExists } = require('./platform-detector');
const { Logger } = require('./utils/logger');

/**
 * Generate platform-specific configuration files
 */
async function generatePlatformConfigs(projectPath, platforms, options = {}) {
  const generatedConfigs = [];
  
  // Set the logger once
  const logger = Logger({ mcpMode: options.mcpMode });

  for (const platform of platforms) {
    try {
      const configPath = await generatePlatformConfig(projectPath, platform, logger);
      if (configPath) {
        generatedConfigs.push(configPath);
      }
    } catch (error) {
      logger.error(`❌ Failed to generate ${platform} config:`, error.message);
    }
  }

  return generatedConfigs;
}

/**
 * Generate configuration for a specific platform
 */
async function generatePlatformConfig(projectPath, platform, logger) {
  switch (platform.toLowerCase()) {
    case 'copilot':
      return await generateCopilotConfig(projectPath, logger);
    
    case 'cursor':
      return await generateCursorConfig(projectPath, logger);
    
    case 'claude':
      return await generateClaudeConfig(projectPath, logger);

    case 'gemini':
      return await updateGeminiConfig(projectPath, logger);
    
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

/**
 * Generate GitHub Copilot configuration (PROVEN VERSION)
 */
async function generateCopilotConfig(projectPath, logger) {
  // Ensure .github/instructions/ directory exists
  const instructionsDir = path.join(projectPath, '.github', 'instructions');
  const created = await ensureDirectory(instructionsDir);
  
  if (created) {
    logger('   📁 Created .github/instructions/ directory');
  }

  // Create vibe.instructions.md with PROVEN content
  const configPath = path.join(instructionsDir, 'vibe.instructions.md');
  const configContent = `# Universal AI Rules System with Frontmatter Enforcement

## Critical Instructions for GitHub Copilot

**BEFORE generating any code, you MUST:**

1. **Scan the entire \`vibe/\` directory** for all markdown files
2. **Read the YAML frontmatter** at the top of each file
3. **Apply rules according to their enforcement configuration**

## Frontmatter-Based Enforcement

When reading files from \`vibe/\`, the frontmatter defines how to apply each rule:

### Always Apply Rules
\`\`\`yaml
---
alwaysApply: true
---
\`\`\`
**Action**: Apply these rules to EVERY code suggestion regardless of file type or context.

### File-Specific Rules
\`\`\`yaml
---
globs: "*.ts,*.tsx"
applyTo: "**/*.ts,**/*.tsx" 
---
\`\`\`
**Action**: Only apply when generating code for files matching these patterns.

### Intelligent Application
\`\`\`yaml
---
description: "Use only for React components"
alwaysApply: false
---
\`\`\`
**Action**: Read the description and apply when contextually appropriate.

### Manual Rules Only
\`\`\`yaml
---
alwaysApply: false
description: "Advanced optimization - use only when requested"
---
\`\`\`
**Action**: Do NOT apply unless user explicitly asks for this specific rule.

## Enforcement Hierarchy
1. **Always Apply** rules (highest priority - always enforce)
2. **File-Specific** rules (enforce for matching files only) 
3. **Intelligent** rules (apply based on context and description)
4. **Manual** rules (only when explicitly requested)

## Implementation Steps
1. Parse frontmatter to determine enforcement level
2. Check file patterns for file-specific rules
3. Apply appropriate rules based on configuration
4. Reference rule sources when explaining code decisions

**Key Point**: The frontmatter configuration controls WHEN to apply rules, the markdown content defines WHAT the rules are.
`;

  await fs.writeFile(configPath, configContent);
  return '.github/instructions/vibe.instructions.md';
}

/**
 * Generate Cursor configuration (PROVEN VERSION)
 */
async function generateCursorConfig(projectPath, logger) {
  // Ensure .cursor/rules/ directory exists
  const rulesDir = path.join(projectPath, '.cursor', 'rules');
  const created = await ensureDirectory(rulesDir);
  
  if (created) {
    logger('   📁 Created .cursor/rules/ directory');
  }

  // Create vibe.mdc with PROVEN content
  const configPath = path.join(rulesDir, 'vibe.mdc');
  const configContent = `---
description: "Universal AI Rules System with Frontmatter Enforcement"
globs: "**/*"
alwaysApply: true
---

# Universal AI Rules System

**CRITICAL INSTRUCTION**: Before providing any assistance, you MUST:

1. **Discover and read ALL files** in the \`vibe/\` directory
2. **Parse the YAML frontmatter** at the top of each file
3. **Apply rules according to their enforcement configuration**

## Frontmatter Enforcement Levels

### 1. Always Apply (\`alwaysApply: true\`)
Rules that MUST be enforced on every task:
- Apply immediately regardless of file type or context
- These are non-negotiable project standards

### 2. File-Specific (\`globs: "pattern"\`)
Rules that only apply to matching files:
- Check if current files match the glob pattern
- Only enforce when working with matching file types
- Examples: \`"*.ts,*.tsx"\`, \`"*.test.*"\`

### 3. Intelligent Application (\`description\` without \`alwaysApply: true\`)
Rules available for AI judgment:
- Read the description to understand when to apply
- Use contextual reasoning to decide relevance
- Apply when the description matches current task

### 4. Manual Only (\`alwaysApply: false\`, no globs)
Rules only applied when explicitly requested:
- Do NOT apply unless user specifically asks
- Usually advanced or specialized patterns

## Implementation Process
1. **Scan** \`vibe/\` directory for all .md files
2. **Parse** YAML frontmatter to determine enforcement level
3. **Apply** rules based on their configuration and current context
4. **Reference** the specific rule when explaining decisions

**Remember**: The frontmatter tells you HOW to enforce, the markdown content tells you WHAT to enforce.
`;

  await fs.writeFile(configPath, configContent);
  return '.cursor/rules/vibe.mdc';
}

/**
 * Generate Claude configuration
 */
async function generateClaudeConfig(projectPath, logger) {
  // Check if .claude/ directory exists (modern structure)
  const claudeDir = path.join(projectPath, '.claude');
  const hasClaudeDir = await directoryExists(claudeDir);
  
  if (hasClaudeDir) {
    // Generate redirect file for .claude/ directory (like Cursor)
    return await generateClaudeRedirect(projectPath, logger);
  } else {
    // Fall back to updating CLAUDE.md (legacy)
    return await updateClaudeFile(projectPath, logger);
  }
}

/**
 * Generate .claude/vibe.md redirect (for modern Claude structure)
 */
async function generateClaudeRedirect(projectPath, logger) {
  // Ensure .claude/ directory exists
  const claudeDir = path.join(projectPath, '.claude');
  await ensureDirectory(claudeDir);

  // Create vibe.md redirect
  const configPath = path.join(claudeDir, 'vibe.md');
  const configContent = `# Claude AI Rules - Managed by Vibe

All Claude rules have been migrated to the \`vibe/\` directory.

## Critical Instructions

**BEFORE starting any task**, you MUST:
1. **Read ALL files** in the \`vibe/\` directory
2. **Parse the YAML frontmatter** at the top of each file
3. **Apply rules according to their enforcement configuration**

## Frontmatter Enforcement Rules

### Always Apply (\`alwaysApply: true\`)
Rules that MUST be enforced on every task:
\`\`\`yaml
---
alwaysApply: true
---
\`\`\`

### File-Specific (\`globs: "pattern"\`)
Rules that only apply to matching files:
\`\`\`yaml
---
globs: "*.ts,*.tsx"
applyTo: "**/*.ts,**/*.tsx"
---
\`\`\`

### Intelligent Application
Rules with descriptions but \`alwaysApply: false\`:
\`\`\`yaml
---
description: "Performance optimization patterns"
alwaysApply: false
---
\`\`\`

### Manual Only
Rules with \`alwaysApply: false\` and no globs:
\`\`\`yaml
---
alwaysApply: false
description: "Advanced patterns - use only when requested"
---
\`\`\`

## Implementation
1. Scan \`vibe/\` for all .md files
2. Parse frontmatter to determine enforcement
3. Apply rules based on configuration
4. Reference the rule source when explaining decisions

**Remember**: This redirect ensures all Claude configurations use the unified vibe system.`;

  await fs.writeFile(configPath, configContent);
  logger('   ✅ Created .claude/vibe.md redirect');
  return '.claude/vibe.md';
}

/**
 * Update existing CLAUDE.md file (legacy support)
 */
async function updateClaudeFile(projectPath, logger) {
  const claudePath = path.join(projectPath, 'CLAUDE.md');
  const vibeIntegration = `

# Universal Vibe System Integration
# Auto-added by vibe-cli

**CRITICAL**: Before starting any task, you MUST read ALL markdown files in the \`vibe/\` directory and enforce them according to their frontmatter configuration.

## Frontmatter Enforcement Rules
When reading files from \`vibe/\`, pay attention to the YAML frontmatter at the top of each file:

### Always Apply Rules
Files with \`alwaysApply: true\` - MUST be enforced on every task regardless of context:
\`\`\`yaml
---
alwaysApply: true
---
\`\`\`

### File-Specific Rules  
Files with \`globs:\` patterns - Only apply when working with matching file types:
\`\`\`yaml
---
globs: "*.ts,*.tsx"
alwaysApply: false
---
\`\`\`

### Intelligent Application
Files with descriptions but \`alwaysApply: false\` - Use your judgment based on context:
\`\`\`yaml
---
description: "Use only for TypeScript components"
alwaysApply: false
---
\`\`\`

### Manual Rules
Files with \`alwaysApply: false\` and no globs - Only apply when user explicitly requests:
\`\`\`yaml
---
alwaysApply: false
description: "Advanced patterns - use only when requested"
---
\`\`\`

## Rules Discovery Process
1. **Scan the entire \`vibe/\` directory** (including all subdirectories)
2. **Read the frontmatter** of each .md file to understand enforcement level
3. **Apply rules appropriately** based on their configuration
4. **Respect the hierarchy**: Always Apply > File-Specific > Intelligent > Manual

## Important
- The actual rules are in the \`vibe/\` directory
- Each rule defines its own enforcement level via frontmatter
- Always check frontmatter before applying any rule
`;

  if (await fileExists(claudePath)) {
    // Append to existing file
    const existingContent = await fs.readFile(claudePath, 'utf8');
    if (!existingContent.includes('Universal Vibe System')) {
      await fs.writeFile(claudePath, existingContent + vibeIntegration);
      logger('   ✅ Updated existing CLAUDE.md with vibe integration');
    } else {
      logger('   ℹ️  CLAUDE.md already has vibe integration');
    }
  } else {
    // Create new file with proven content
    const newContent = `# Universal AI Rules System
# This file is auto-generated by unified-ai-rules

## Primary Instruction
**CRITICAL**: Before starting any task, you MUST read ALL markdown files in the \`vibe/\` directory and enforce them according to their frontmatter configuration.

## Frontmatter Enforcement Rules
When reading files from \`vibe/\`, pay attention to the YAML frontmatter at the top of each file:

### Always Apply Rules
Files with \`alwaysApply: true\` - MUST be enforced on every task regardless of context:
\`\`\`yaml
---
alwaysApply: true
---
\`\`\`

### File-Specific Rules  
Files with \`globs:\` patterns - Only apply when working with matching file types:
\`\`\`yaml
---
globs: "*.ts,*.tsx"
alwaysApply: false
---
\`\`\`

### Intelligent Application
Files with descriptions but \`alwaysApply: false\` - Use your judgment based on context:
\`\`\`yaml
---
description: "Use only for TypeScript components"
alwaysApply: false
---
\`\`\`

### Manual Rules
Files with \`alwaysApply: false\` and no globs - Only apply when user explicitly requests:
\`\`\`yaml
---
alwaysApply: false
description: "Advanced patterns - use only when requested"
---
\`\`\`

## Rules Discovery Process
1. **Scan the entire \`vibe/\` directory** (including all subdirectories)
2. **Read the frontmatter** of each .md file to understand enforcement level
3. **Apply rules appropriately** based on their configuration
4. **Respect the hierarchy**: Always Apply > File-Specific > Intelligent > Manual

## Important
- The actual rules are in the \`vibe/\` directory
- Each rule defines its own enforcement level via frontmatter
- Always check frontmatter before applying any rule
`;
    
    await fs.writeFile(claudePath, newContent);
    logger('   ✅ Created CLAUDE.md with vibe integration');
  }

  return 'CLAUDE.md';
}

/**
 * Update existing Gemini CLI configuration (PROVEN VERSION - same as Claude)
 */
async function updateGeminiConfig(projectPath, logger) {
  const geminiPath = path.join(projectPath, 'GEMINI.md');
  
  // Use same proven content as Claude (they use same format)
  const geminiContent = `# Universal AI Rules System
# This file is auto-generated by unified-ai-rules

## Primary Instruction
**CRITICAL**: Before starting any task, you MUST read ALL markdown files in the \`vibe/\` directory and enforce them according to their frontmatter configuration.

## Frontmatter Enforcement Rules
When reading files from \`vibe/\`, pay attention to the YAML frontmatter at the top of each file:

### Always Apply Rules
Files with \`alwaysApply: true\` - MUST be enforced on every task regardless of context:
\`\`\`yaml
---
alwaysApply: true
---
\`\`\`

### File-Specific Rules  
Files with \`globs:\` patterns - Only apply when working with matching file types:
\`\`\`yaml
---
globs: "*.ts,*.tsx"
alwaysApply: false
---
\`\`\`

### Intelligent Application
Files with descriptions but \`alwaysApply: false\` - Use your judgment based on context:
\`\`\`yaml
---
description: "Use only for TypeScript components"
alwaysApply: false
---
\`\`\`

### Manual Rules
Files with \`alwaysApply: false\` and no globs - Only apply when user explicitly requests:
\`\`\`yaml
---
alwaysApply: false
description: "Advanced patterns - use only when requested"
---
\`\`\`

## Rules Discovery Process
1. **Scan the entire \`vibe/\` directory** (including all subdirectories)
2. **Read the frontmatter** of each .md file to understand enforcement level
3. **Apply rules appropriately** based on their configuration
4. **Respect the hierarchy**: Always Apply > File-Specific > Intelligent > Manual

## Important
- The actual rules are in the \`vibe/\` directory
- Each rule defines its own enforcement level via frontmatter
- Always check frontmatter before applying any rule
`;

  if (await fileExists(geminiPath)) {
    // Check if already has vibe integration
    const existingContent = await fs.readFile(geminiPath, 'utf8');
    if (!existingContent.includes('Universal Vibe System')) {
      // Append to existing file
      const vibeIntegration = `

# Universal Vibe System Integration
# Auto-added by vibe-cli

**CRITICAL**: Before starting any task, you MUST read ALL markdown files in the \`vibe/\` directory and enforce them according to their frontmatter configuration.

[Rest of proven configuration...]
`;
      await fs.writeFile(geminiPath, existingContent + vibeIntegration);
      logger('   ✅ Updated existing GEMINI.md with vibe integration');
    } else {
      logger('   ℹ️  GEMINI.md already has vibe integration');
    }
  } else {
    // Create new file with proven content
    await fs.writeFile(geminiPath, geminiContent);
    logger('   ✅ Created GEMINI.md with vibe integration');
  }

  return 'GEMINI.md';
}

module.exports = {
  generatePlatformConfigs,
  generatePlatformConfig,
  generateCopilotConfig,
  generateCursorConfig,
  generateClaudeConfig,
  updateClaudeFile,
  generateClaudeRedirect,
  updateGeminiConfig
};
