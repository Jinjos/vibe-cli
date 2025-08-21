# vibe-cli 🔥

> **One vibe to rule them all** - Unify your AI coding assistants with shared standards

Stop managing separate rule files for every AI tool. **vibe-cli** creates a single source of truth for your coding standards that works seamlessly across Claude Code, Cursor, GitHub Copilot, and Gemini CLI.

## ⚡ The Problem

Managing AI coding assistants is chaos:
- 📄 **Cursor** needs `.cursor/rules/*.mdc` files
- 🤖 **Claude Code** needs `CLAUDE.md` files  
- 🐙 **GitHub Copilot** needs `.github/instructions/` files
- 💎 **Gemini CLI** needs `GEMINI.md` files
- 🔄 **Same rules, different formats** - nightmare to maintain

## ✨ The Solution

**vibe-cli** unifies everything:
1. 📝 **Write rules once** in the `vibe/` directory
2. 🚀 **Auto-generate** platform-specific configurations
3. 🎯 **Smart enforcement** based on file types and context
4. 🔄 **Easy updates** - change once, apply everywhere

## 🚀 Installation & Quick Start

### Option 1: CLI Usage (Traditional)
```bash
# Install the CLI globally
npm install -g @jinjos/vibe-cli

# Navigate to your project
cd your-awesome-project

# Analyze your project (optional but recommended)
vibe analyze

# Initialize the vibe system
vibe init

# Check status and performance
vibe status
```

### Option 2: MCP Integration (AI-First) 🤖
For seamless AI integration with Claude, Cursor, or other MCP-compatible clients:

```json
{
  "mcpServers": {
    "vibe": {
      "command": "npx",
      "args": ["-y", "@jinjos/vibe-mcp"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

**That's it!** Your AI tools now have direct access to vibe functionality and share the same coding standards.

## 📊 Platform Support

| Platform | Context Window | Configuration File |
|----------|---------------|-------------------|
| 🤖 **Claude Code** | 200K tokens | `CLAUDE.md` |
| 🎯 **Cursor** | 200K tokens | `.cursor/rules/vibe.mdc` |
| 🐙 **GitHub Copilot** | 64K tokens | `.github/instructions/vibe.instructions.md` |
| 💎 **Gemini CLI** | 1M tokens | `GEMINI.md` |

## 🎨 Smart Rule Enforcement

Define how each rule applies using YAML frontmatter:

### 🔴 Always Apply (Critical standards)
```markdown
---
alwaysApply: true
description: "Core coding standards"
---

# Never compromise on these rules
- Use meaningful variable names
- Write tests for all functions
```

### 🟡 File-Specific (Targeted rules)
```markdown
---
globs: "*.ts,*.tsx"
applyTo: "**/*.ts,**/*.tsx"
description: "TypeScript best practices"
---

# Only applies to TypeScript files
- Use strict mode
- Define proper return types
```

### 🔵 Intelligent (Context-aware)
```markdown
---
description: "Performance optimization patterns"
alwaysApply: false
---

# AI decides when to apply based on context
- Use memoization for expensive calculations
- Implement lazy loading for large datasets
```

### ⚪ Manual Only (On-demand)
```markdown
---
alwaysApply: false
description: "Advanced optimization - use only when requested"
---

# Only applied when explicitly requested
- Complex performance optimizations
- Advanced architectural patterns
```

## 🔧 Commands

### `vibe init` - Initial Setup
```bash
vibe init                           # Auto-detect and setup all platforms
vibe init --platforms cursor,claude # Setup specific platforms only
vibe init --full                    # Complete setup: migrate rules AND remove originals
```

### `vibe sync` - Keep Rules Synchronized
```bash
vibe sync                           # Sync ALL rules from Cursor/Copilot directories
vibe sync --platforms cursor        # Only sync from Cursor
vibe sync --full                    # Sync rules AND remove originals
vibe sync --dry-run                 # Preview what would be synced
```

**Perfect for teams:** When teammates add rules to `.cursor/rules/` or `.github/instructions/` directories, `vibe sync` refreshes your vibe/ directory with all current rules. Rules with the same name will be overwritten.

### `vibe status` - Monitor System Health
```bash
vibe status                         # Quick overview
vibe status --verbose               # Detailed analysis with performance metrics
```

### `vibe fix` - Maintain Configuration
```bash
vibe fix --dry-run                  # Preview fixes without applying
vibe fix                            # Automatically resolve configuration issues
```

### `vibe cleanup` - Remove Original Files
```bash
vibe cleanup                        # Remove files migrated by init (with backups)
vibe cleanup --dry-run              # Preview what would be removed
```

**Note:** Only removes files that were migrated during `vibe init`. For ongoing maintenance, use `vibe sync --full` instead.

### `vibe analyze` - Comprehensive Repository Analysis
```bash
vibe analyze                        # Full repository and AI configuration analysis
vibe analyze --json                 # Output as JSON for automated processing
vibe analyze --verbose              # Include detailed breakdowns
vibe analyze --recommendations      # Focus on what's missing or needs updating
```

**NEW:** Get deep insights into your project:
- 🔍 **Tech Stack Detection** - Automatically identifies your languages, frameworks, databases
- 🤖 **AI Configuration Analysis** - Analyzes all your AI tool setups and token usage
- 📊 **Rule Coverage Assessment** - Shows what's covered vs missing in your AI instructions
- 🎯 **Gap Analysis** - Identifies missing rules for your specific tech stack
- 🔧 **MCP Server Recommendations** - Suggests relevant MCP servers based on your actual stack
- 📈 **AI Configuration Maturity Score** - Honest assessment of your AI setup quality

## 📁 Project Structure After Init

```
your-project/
├── vibe/                                           # 🎯 Your unified rules
│   ├── coding-standards.md                         # Core standards (always applied)
│   ├── typescript-rules.md                        # Language-specific rules  
│   └── testing-standards.md                       # Workflow standards
├── CLAUDE.md                                       # → Points to vibe/
├── GEMINI.md                                       # → Points to vibe/
├── .cursor/rules/vibe.mdc                         # → Points to vibe/
└── .github/instructions/vibe.instructions.md      # → Points to vibe/
```

## 🔄 Automatic Migration

**vibe-cli** automatically discovers and migrates existing rules:

✅ **Cursor** - `.cursorrules` and `.cursor/rules/*.mdc`  
✅ **Claude Code** - `CLAUDE.md` files  
✅ **Gemini CLI** - `GEMINI.md` files  
✅ **GitHub Copilot** - `.github/copilot-instructions.md` and `.github/instructions/*.instructions.md`

## 🔄 Common Workflows

### Initial Project Setup
```bash
# Conservative approach (test first)
vibe init                    # Setup system, keep original files
vibe status                  # Verify everything works
vibe cleanup                 # Remove originals when confident

# Power user approach  
vibe init --full            # Complete setup in one command
```

### Ongoing Team Collaboration
```bash
# Teammate added rules to .cursor/rules/ or .github/instructions/
vibe sync                   # Refresh vibe/ with all platform rules
vibe sync --full           # Sync and remove originals

# Monthly maintenance
vibe status --verbose       # Check performance and health  
vibe fix                    # Resolve any configuration issues
```

### Platform-Specific Management
```bash
# Only work with specific platforms
vibe init --platforms cursor,claude
vibe sync --platforms copilot        # Sync only from Copilot

# Preview changes safely
vibe sync --dry-run                   # See what would be synced
vibe cleanup --dry-run                # See what would be removed
```

### Repository Analysis & Optimization
```bash
# Understand your project's AI configuration maturity
vibe analyze                          # Get comprehensive analysis report
vibe analyze --recommendations        # Focus on actionable improvements

# Use insights to improve your setup
vibe init                            # Setup vibe system based on analysis
# Create rules for detected gaps (MongoDB, Redis, etc.)
# Install recommended MCP servers for your tech stack
```

## 📊 Performance Monitoring

Get platform-specific performance insights:

```bash
vibe status --verbose
```

```
📊 Platform Performance Analysis:

✅ CURSOR (200,000 context limit):
   📊 Current rules: 1,580 tokens (1% of context)
   ✅ LOW IMPACT - Performance should be good

⚠️  GITHUB COPILOT (64,000 context limit):
   📊 Current rules: 1,580 tokens (2% of context)  
   💛 MODERATE IMPACT - Monitor performance

✅ GEMINI CLI (1,000,000 context limit):
   📊 Current rules: 1,580 tokens (0% of context)
   ✅ LOW IMPACT - Performance should be good
```

## 🤝 Why Developers Love vibe-cli

- 🎯 **Single Source of Truth** - Update rules once, apply everywhere
- 🔍 **Intelligent Analysis** - Deep repository analysis with actionable insights
- 🤖 **Smart MCP Recommendations** - Suggests relevant servers based on your actual tech stack
- 📊 **Performance Aware** - Monitors context usage and provides optimization guidance
- 🚀 **Zero Configuration** - Works out of the box with smart defaults
- 🔧 **Self-Healing** - Automatically fixes common configuration issues
- 🔄 **Migration Friendly** - Seamlessly imports existing rules
- 📈 **Maturity Assessment** - Honest scoring of your AI configuration quality

## 🆘 Troubleshooting

### Rules not being applied?
```bash
vibe status --verbose    # Check for configuration issues
vibe fix                 # Automatically resolve problems
```

### Performance issues?
```bash
vibe status             # Check platform performance analysis
```

### Want to understand your project better?
```bash
vibe analyze            # Get comprehensive analysis and recommendations
vibe analyze --verbose  # Detailed breakdown with specific suggestions
```

### Need help?
- 📖 **Documentation**: [GitHub Wiki](https://github.com/your-username/vibe-cli/wiki)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/your-username/vibe-cli/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-username/vibe-cli/discussions)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

<div align="center">

**🔥 Give your AI tools the perfect vibe 🔥**

[**Get Started**](https://github.com/your-username/vibe-cli#quick-start) • [**Documentation**](https://github.com/your-username/vibe-cli/wiki) • [**Examples**](https://github.com/your-username/vibe-cli/tree/main/examples)

</div>
