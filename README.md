# Shadcn-Svelte MCP Server

<!-- [![npm version](https://badge.fury.io/js/shadcn-svelte-mcp-server.svg)](https://badge.fury.io/js/shadcn-svelte-mcp-server) -->

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server that provides AI assistants with comprehensive access to [shadcn-svelte](https://shadcn-svelte.com/) components, documentation, and metadata. This server enables AI tools like Claude Desktop, Continue.dev, and other MCP-compatible clients to retrieve and work with shadcn-svelte components for Svelte 5 and SvelteKit projects seamlessly.

## 🚀 Key Features

- **Real-Time Component Fetching**: Fetches actual component source code directly from the shadcn-svelte GitHub repository
- **UI Pattern Composition**: Generate complete UI patterns using multiple shadcn components (login forms, dashboards, etc.)
- **Component Scaffolding**: Create custom components following shadcn patterns and conventions
- **Smart Caching**: Efficient caching with TTL to reduce API calls
- **Retry Logic**: Automatic retry with exponential backoff for better reliability
- **Registry Integration**: Work with the shadcn-svelte registry system
- **Svelte 5 Runes**: Full support for modern Svelte 5 syntax with runes
- **TypeScript Support**: Fully typed components with proper TypeScript definitions

## 📦 Quick Start

### ⚡ Using npx (Recommended)

The fastest way to get started - no installation required!

```bash
# Build the project first
npm install
npm run build

# Basic usage
node build/index.js

# With GitHub token for better rate limits (5000 requests/hour)
node build/index.js --github-api-key ghp_your_token_here

# Short form
node build/index.js -g ghp_your_token_here

# Using environment variable
export GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token_here
node build/index.js
```

**🎯 Try it now**: Run `node build/index.js --help` to see all options!

### 🔧 Command Line Options

```bash
shadcn-svelte-mcp-server [options]

Options:
  --github-api-key, -g <token>    GitHub Personal Access Token
  --help, -h                      Show help message
  --version, -v                   Show version information

Environment Variables:
  GITHUB_PERSONAL_ACCESS_TOKEN    Alternative way to provide GitHub token

Examples:
  node build/index.js --help
  node build/index.js --version
  node build/index.js -g ghp_1234567890abcdef
  GITHUB_PERSONAL_ACCESS_TOKEN=ghp_token node build/index.js
```

## 🔑 GitHub API Token Setup

**Why do you need a token?**

- Without token: Limited to 60 API requests per hour
- With token: Up to 5,000 requests per hour
- Better reliability and faster responses

### 📝 Getting Your Token (2 minutes)

1. **Go to GitHub Settings**:

   - Visit [GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
   - Or: GitHub Profile → Settings → Developer settings → Personal access tokens

2. **Generate New Token**:

   - Click "Generate new token (classic)"
   - Add a note: "shadcn-ui MCP server"
   - **Expiration**: Choose your preference (90 days recommended)
   - **Scopes**: ✅ **No scopes needed!** (public repository access is sufficient)

3. **Copy Your Token**:
   - Copy the generated token (starts with `ghp_`)
   - ⚠️ **Save it securely** - you won't see it again!

### 🚀 Using Your Token

**Method 1: Command Line (Quick testing)**

```bash
# npx @jpisnice/shadcn-ui-mcp-server --github-api-key ghp_your_token_here
node build/index.js --github-api-key ghp_your_token_here
```

**Method 2: Environment Variable (Recommended)**

```bash
# Add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
export GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token_here

# Then simply run:
node build/index.js
```

**Method 3: Claude Desktop Configuration**

```json
{
  "mcpServers": {
    "shadcn-ui": {
      "command": "node",
      "args": ["[LOCAL_PATH]/build/index.js"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

### ✅ Verify Your Setup

```bash
# Test without token (should show rate limit warning)
# npx @jpisnice/shadcn-ui-mcp-server --help
node build/index.js --help

# Test with token (should show success message)
# npx @jpisnice/shadcn-ui-mcp-server --github-api-key ghp_your_token --help
node build/index.js --github-api-key ghp_your_token --help

# Check your current rate limit
curl -H "Authorization: token ghp_your_token" https://api.github.com/rate_limit
```

## 🛠️ Available Tools

The MCP server provides these tools for AI assistants:

### Component Tools

- **`get_component`** - Get actual component source code from GitHub
- **`get_component_demo`** - Get component usage information and documentation
- **`list_components`** - List all available shadcn-svelte components
- **`get_component_metadata`** - Get component dependencies and metadata

### UI Pattern Tools (New!)

- **`compose_ui_pattern`** - Generate complete UI patterns using multiple components

  - Available patterns: login-form, signup-form, profile-card, dashboard-header, data-table-page, settings-page, card-grid, sidebar-layout, navbar-with-menu, footer, hero-section, pricing-cards, contact-form, search-bar, notification-center
  - Options: includeState, includeValidation, responsive, darkMode

- **`scaffold_component`** - Create custom components following shadcn patterns
  - Component types: primitive, composite, layout
  - Support for variants, props, and base component extension

### Repository Tools

- **`get_directory_structure`** - Explore the shadcn-svelte repository structure

**Note**: shadcn-svelte uses a registry-based system instead of blocks. Components are designed to be composed together to build complex UI patterns.

### Example Tool Usage

```typescript
// These tools can be called by AI assistants via MCP protocol

// Get button component source
{
  "tool": "get_component",
  "arguments": { "componentName": "button" }
}

// Generate a login form pattern
{
  "tool": "compose_ui_pattern",
  "arguments": {
    "pattern": "login-form",
    "options": {
      "includeState": true,
      "responsive": true
    }
  }
}

// Create a custom profile card component
{
  "tool": "scaffold_component",
  "arguments": {
    "name": "user-profile-card",
    "type": "composite",
    "baseComponent": "card",
    "variants": ["default", "compact", "detailed"],
    "props": [
      { "name": "userName", "type": "string", "required": true },
      { "name": "avatarUrl", "type": "string" },
      { "name": "bio", "type": "string" }
    ]
  }
}

// List all components
{
  "tool": "list_components",
  "arguments": {}
}

// Get component metadata
{
  "tool": "get_component_metadata",
  "arguments": { "componentName": "button" }
}
```

## 🔗 Integration with AI Tools

### Claude Desktop Integration

**Note**: Since this package is not published to npm, you need to use local paths. Replace `[LOCAL_PATH]` with the absolute path to your local installation.

Add to your Claude Desktop configuration (`~/.config/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "shadcn-svelte": {
      "command": "node",
      "args": ["[LOCAL_PATH]/build/index.js", "--github-api-key", "ghp_your_token_here"]
    }
  }
}
```

Or with environment variable:

```json
{
  "mcpServers": {
    "shadcn-svelte": {
      "command": "node",
      "args": ["[LOCAL_PATH]/build/index.js"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

### Claude Code (claude-code/cline) Integration

For [Claude Code](https://github.com/cline/cline) (formerly Cline) VS Code extension, add to your MCP settings:

**Option 1: In VS Code Settings**

1. Open VS Code Settings (Cmd+, on Mac, Ctrl+, on Windows/Linux)
2. Search for "claude code mcp" or "cline mcp"
3. Add the server configuration:

```json
{
  "mcpServers": {
    "shadcn-svelte": {
      "command": "node",
      "args": ["[LOCAL_PATH]/build/index.js"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

**Option 2: In .vscode/settings.json**
Add to your workspace or user settings:

```json
{
  "mcpServers": {
    "shadcn-svelte": {
      "command": "node",
      "args": ["/absolute/path/to/shadcn-ui-mcp-server-svelte/build/index.js"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

**Option 3: Using the Claude Code UI**

1. Open Claude Code in VS Code
2. Click on the settings/gear icon
3. Navigate to MCP Servers section
4. Add a new server with:
   - Name: `shadcn-svelte`
   - Command: `node`
   - Arguments: `/path/to/your/shadcn-ui-mcp-server-svelte/build/index.js`
   - Environment variables: `GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token`

### Continue.dev Integration

For [Continue.dev](https://continue.dev/), add to your `~/.continue/config.json`:

```json
{
  "mcpServers": [
    {
      "name": "shadcn-svelte",
      "command": "node",
      "args": ["[LOCAL_PATH]/build/index.js"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  ]
}
```

### Using the Tools in Your AI Assistant

Once configured, you can ask your AI assistant to:

**Get Components:**

- "Show me the shadcn button component"
- "Get the source code for the dialog component"
- "What dependencies does the data-table component have?"

**Generate UI Patterns:**

- "Create a login form using shadcn components"
- "Generate a responsive dashboard header"
- "Build a profile card component with Svelte 5"

**Create Custom Components:**

- "Scaffold a new user-avatar component that extends the avatar component"
- "Create a custom card component with compact and expanded variants"
- "Build a new layout component for a sidebar navigation"

The AI will use the appropriate MCP tools automatically to fulfill your requests.

### Verifying Your Setup

After adding the MCP server to your configuration:

1. **Restart your AI tool** (Claude Desktop, VS Code, etc.)
2. **Check if the server is loaded** - Your AI should be able to list available MCP tools
3. **Test with a simple request**: "List all available shadcn-svelte components"
4. **If working correctly**, you should see a list of components like accordion, alert, button, etc.

## 🐛 Troubleshooting

### Common Issues

**"Rate limit exceeded" errors:**

```bash
# Solution: Add GitHub API token
node build/index.js --github-api-key ghp_your_token_here
```

**"Command not found" errors:**

```bash
# Solution: Install Node.js 18+ and ensure npx is available
node --version  # Should be 18+
npx --version   # Should work
```

**Component not found:**

```bash
# Check available components first
# npx @benjaminmodayil/shadcn-svelte-mcp-server
node build/index.js
# Then call list_components tool via your MCP client
```

**Network/proxy issues:**

```bash
# Set proxy if needed
export HTTP_PROXY=http://your-proxy:8080
export HTTPS_PROXY=http://your-proxy:8080
# npx @benjaminmodayil/shadcn-svelte-mcp-server
node build/index.js
```

### Debug Mode

Enable verbose logging:

```bash
# Set debug environment variable
# DEBUG=* npx @benjaminmodayil/shadcn-svelte-mcp-server --github-api-key ghp_your_token
DEBUG=* node build/index.js --github-api-key ghp_your_token
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Recent Improvements

### Enhanced Component Fetching

- **Real-time GitHub Integration**: Components are now fetched directly from the shadcn-svelte GitHub repository
- **Complete Source Code**: All component files including .svelte files and TypeScript definitions
- **Smart Caching**: 1-hour TTL cache to balance freshness with API rate limits
- **Retry Logic**: Automatic retry with exponential backoff for network reliability

### New UI Pattern Generation

- **Pre-built Patterns**: Generate complete UI patterns like login forms, dashboards, and data tables
- **Customizable Options**: Control state management, validation, responsiveness, and dark mode
- **Svelte 5 Syntax**: All patterns use modern Svelte 5 runes and conventions
- **Intelligent Imports**: Automatically generates correct import statements

### Component Scaffolding

- **Custom Components**: Create new components following shadcn design patterns
- **Type Safety**: Full TypeScript support with proper prop types
- **Variant Support**: Define multiple visual variants for your components
- **Base Extension**: Extend existing shadcn components with additional functionality

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- 🐛 [Report Issues](https://github.com/benjaminmodayil/shadcn-ui-mcp-server-svelte/issues)
- 💬 [Discussions](https://github.com/benjaminmodayil/shadcn-ui-mcp-server-svelte/discussions)
- 📖 [Documentation](https://github.com/benjaminmodayil/shadcn-ui-mcp-server-svelte#readme)

## 🔗 Related Projects

- [shadcn-svelte](https://shadcn-svelte.com/) - The Svelte component library this server provides access to
- [shadcn/ui](https://ui.shadcn.com/) - The original React component library
- [Model Context Protocol](https://modelcontextprotocol.io/) - The protocol specification
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - Official MCP SDK

## ⭐ Acknowledgments

- [huntabyte](https://github.com/huntabyte) for creating and maintaining shadcn-svelte
- [shadcn](https://github.com/shadcn) for the original UI component library design
- [Anthropic](https://anthropic.com) for the Model Context Protocol specification
- The Svelte community for their amazing framework and ecosystem

---

**Adapted for Svelte by [Benjamin Modayil](https://github.com/benjaminmodayil)**
**Originally created by [Janardhan Polle](https://github.com/Jpisnice)**

**Star ⭐ this repo if you find it helpful!**
