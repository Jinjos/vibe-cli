# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

vibe-cli is a universal AI rules system that unifies coding standards across Claude Code, Cursor, GitHub Copilot, and Gemini CLI. It creates a single source of truth for coding rules that automatically generates platform-specific configurations.

## Development Commands

```bash
# Run the CLI directly for development
npm run dev

# Run tests
npm test

# No build step required (Node.js project)
npm run build

# Publish to npm
npm run publish-npm
```

## Architecture

### Core CLI Structure
- `bin/vibe` - Main CLI entry point using Commander.js
- `lib/` - Core functionality modules:
  - `init.js` - Initialize vibe system, migrate existing rules
  - `sync.js` - Sync rules from platform directories to vibe/
  - `status.js` - Show system status and performance metrics
  - `fix.js` - Auto-fix configuration issues
  - `cleanup.js` - Remove original migrated files
  - `platform-detector.js` - Detect AI platforms and existing configs
  - `rule-migrator.js` - Migrate rules between formats
  - `config-generator.js` - Generate platform-specific configs

### Analysis System
- `lib/analyzer/` - Repository analysis tools:
  - `index.js` - Main analyzer orchestrator
  - `tech-stack-detector.js` - Detect project technologies
  - `ai-config-scanner.js` - Scan for AI configurations
  - `rule-analyzer.js` - Analyze rule content and patterns
  - `gap-analyzer.js` - Identify missing configurations
  - `mcp-recommender.js` - Recommend MCP servers
  - `report-generator.js` - Generate analysis reports

### Supported Platforms
- **Cursor**: `.cursor/rules/*.mdc` files
- **Claude Code**: `CLAUDE.md` files
- **GitHub Copilot**: `.github/instructions/*.instructions.md` files
- **Gemini CLI**: `GEMINI.md` files

## Key Dependencies
- `commander` - CLI framework
- `chalk` - Terminal colors
- `ora` - Loading spinners
- `glob` - File pattern matching
- `gray-matter` - YAML frontmatter parsing

## Vibe System Structure

The tool creates a `vibe/` directory containing unified rules that get synced to platform-specific configurations:

```
project/
├── vibe/                    # Unified rules (single source of truth)
│   ├── coding-standards.md  # Core standards
│   └── typescript-rules.md  # Language-specific rules
├── CLAUDE.md               # Points to vibe/
├── GEMINI.md              # Points to vibe/
├── .cursor/rules/vibe.mdc # Points to vibe/
└── .github/instructions/  # Points to vibe/
```

## Rule Format

Rules support YAML frontmatter for smart application:
- `alwaysApply: true` - Always include in AI context
- `globs: "*.ts,*.tsx"` - Apply to specific file types
- `applyTo: "**/*.js"` - Apply to file patterns
- Default behavior: AI decides when to apply based on context