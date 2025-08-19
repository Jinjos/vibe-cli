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

## 🚀 Quick Start

```bash
# Install globally
npm install -g vibe-cli

# Navigate to your project
cd your-awesome-project

# Initialize the vibe system
vibe init

# Check status and performance
vibe status
```

**That's it!** Your AI tools now share the same coding standards.

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

### `vibe init` - Setup
```bash
vibe init                           # Auto-detect and setup all platforms
vibe init --platforms cursor,claude # Setup specific platforms only
vibe init --force                   # Overwrite existing configurations
```

### `vibe status` - Monitor
```bash
vibe status                         # Quick overview
vibe status --verbose               # Detailed analysis with performance metrics
```

### `vibe fix` - Maintain
```bash
vibe fix --dry-run                  # Preview fixes without applying
vibe fix                            # Automatically resolve configuration issues
```

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

Your existing rules get converted to the unified format with appropriate frontmatter.

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
- 🚀 **Zero Configuration** - Works out of the box with smart defaults
- 📊 **Performance Aware** - Monitors context usage per platform
- 🔧 **Self-Healing** - Automatically fixes common configuration issues
- 🔄 **Migration Friendly** - Seamlessly imports existing rules

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
