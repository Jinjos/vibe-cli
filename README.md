# Vibe AI 🔥

> **One vibe to rule them all** - Unify your AI coding assistants with shared standards

## The Problem

Your team uses different AI tools on the same codebase:
- 📄 Sarah uses **Cursor** (needs `.cursor/rules/*.mdc`)
- 🤖 Tom uses **Claude** (needs `CLAUDE.md`)  
- 🐙 Mike uses **Copilot** (needs `.github/instructions/*.md`)

**Without vibe:** Sarah improves the React hooks guidelines. Tom and Mike never see these improvements. Three developers, three different versions of "truth" = chaos.

**With vibe:** Sarah updates `vibe/react-patterns.md`. Everyone gets the improvement automatically. One source of truth = harmony.

## Quick Start (2 minutes)

```bash
# 1. See what your project needs (10 seconds)
npx @jinjos/vibe-cli analyze

# 2. Set up vibe
npx @jinjos/vibe-cli init

# Done! All your AI tools now share the same rules
```

## What `vibe analyze` Shows You

```
🔍 REPOSITORY ANALYSIS REPORT
==================================================

📊 Tech Stack Detected:
  Frontend: React, Next.js
  Database: MongoDB
  Testing: Playwright

🤖 AI Configuration Maturity: 21/100 ⚠️

❌ MISSING RULES FOR YOUR STACK:
  • MongoDB: connection patterns, indexing, schemas
  • React: hooks guidelines, performance patterns
  • Security: input validation, auth patterns
  • Error handling: logging, recovery strategies

🎯 NEXT STEPS:
1. Create MongoDB connection rules
2. Add React component patterns
3. Run: vibe init
```

**Why this matters:** Instead of guessing what rules to write, `vibe analyze` tells you EXACTLY what your project needs based on your actual tech stack.

## Installation

### For AI Assistants (Recommended)
Add to your Claude/Cursor MCP config:
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

### Traditional CLI
```bash
npm install -g @jinjos/vibe-cli
```

## Core Commands

### `vibe analyze` - Know What You Need 🎯
```bash
vibe analyze  # Get AI configuration health check (0-100 score)
```
Shows exactly what rules your tech stack needs.

### `vibe init` - Set It Up
```bash
vibe init      # Creates vibe/ directory and configures all platforms
vibe init --full  # Also migrates existing rules
```

### `vibe sync` - Keep Team in Sync
```bash
vibe sync      # Pull rules from platform directories to vibe/
vibe sync --full  # Sync and remove originals
```

### `vibe status` - Monitor Health
```bash
vibe status    # Quick health check
vibe status --verbose  # Detailed performance metrics
```

## How It Works

Before vibe:
```
project/
├── .cursor/rules/react.mdc     # Sarah's version
├── CLAUDE.md                   # Tom's version  
└── .github/instructions/       # Mike's version
    └── react.md               
```

After vibe:
```
project/
├── vibe/                       # One source of truth
│   ├── react-patterns.md       # Shared by all
│   ├── mongodb-rules.md
│   └── security-standards.md
├── .cursor/rules/vibe.mdc      # → Points to vibe/
├── CLAUDE.md                   # → Points to vibe/
└── .github/instructions/       # → Points to vibe/
    └── vibe.instructions.md
```

## Platform Support

| Platform | Context Window | Config Location |
|----------|---------------|-----------------|
| 🎯 Cursor | 200K tokens | `.cursor/rules/vibe.mdc` |
| 🤖 Claude | 200K tokens | `CLAUDE.md` |
| 🐙 Copilot | 64K tokens | `.github/instructions/vibe.instructions.md` |
| 💎 Gemini | 1M tokens | `GEMINI.md` |

## Common Workflows

### New Project
```bash
vibe analyze   # See what you need
vibe init      # Set it up
# Create the rules identified by analyze
vibe status    # Verify everything works
```

### Team Collaboration
```bash
# After teammate adds rules to .cursor/rules/
vibe sync      # Pull their rules into vibe/
git commit     # Share with team
```

### Check Performance
```bash
vibe status --verbose

# Output:
✅ CURSOR: 1,580 tokens (1% of limit) - Good
⚠️  COPILOT: 1,580 tokens (2% of limit) - Monitor
```

## Why Teams Love Vibe

- **Know Before You Code** - `vibe analyze` shows gaps before writing rules
- **Single Source of Truth** - No more copy-pasting between platforms
- **AI Health Score** - Track your configuration maturity (0-100)
- **Tech-Specific** - Get recommendations for YOUR stack, not generic advice
- **Zero Config** - Works out of the box

## Learn More

- 📺 [Video: See vibe in action](https://youtu.be/MWqZc-JK8VM)
- 📦 [MCP Integration Guide](https://npmjs.com/package/@jinjos/vibe-mcp)

## License

MIT

---

<div align="center">

**🔥 Give your AI tools the perfect vibe 🔥**

</div>
