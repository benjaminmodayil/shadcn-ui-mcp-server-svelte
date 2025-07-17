# Local MCP Server Setup Guide

This guide explains how to run the shadcn-svelte MCP server locally with Claude Desktop.

## Prerequisites

1. Node.js 18+ installed
2. Claude Desktop application
3. This repository cloned locally

## Setup Steps

### 1. Build the Project

First, build the TypeScript project:

```bash
# Navigate to the project directory
cd /path/to/shadcn-svelte-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

### 2. Make the Script Executable

```bash
chmod +x build/index.js
```

### 3. Configure Claude Desktop

Open your Claude Desktop configuration file:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Add the following configuration (replace `[YOUR_ABSOLUTE_PATH]` with the actual path):

```json
{
  "mcpServers": {
    "shadcn-svelte": {
      "command": "node",
      "args": [
        "[YOUR_ABSOLUTE_PATH]/shadcn-svelte-mcp-server/build/index.js"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

Example with real paths:

```json
{
  "mcpServers": {
    "shadcn-svelte": {
      "command": "node",
      "args": [
        "/Users/username/projects/shadcn-svelte-mcp-server/build/index.js"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

### 4. Alternative: Using npx with Local Path

You can also use npx to run the local package:

```json
{
  "mcpServers": {
    "shadcn-svelte": {
      "command": "npx",
      "args": [
        "--yes",
        "[YOUR_ABSOLUTE_PATH]/shadcn-svelte-mcp-server"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

### 5. Restart Claude Desktop

After saving the configuration, restart Claude Desktop for the changes to take effect.

## Verifying the Setup

1. Open Claude Desktop
2. Start a new conversation
3. You should see "shadcn-svelte" in the available MCP servers
4. Try using a tool like: "Use the list_components tool to show available shadcn-svelte components"

## Debugging

### Check Logs

If the server isn't working, check the logs:

- General MCP logs: `~/Library/Logs/Claude/mcp.log`
- Server-specific logs: `~/Library/Logs/Claude/mcp-server-shadcn-svelte.log`

### Common Issues

1. **"Command not found"**: Ensure Node.js is in your PATH
2. **"Module not found"**: Make sure you ran `npm install` and `npm run build`
3. **Rate limiting**: Add a GitHub token to the environment variables
4. **Permission denied**: Make sure the build file is executable (`chmod +x`)

### Testing Outside Claude

You can test the server directly:

```bash
# Without token
node /path/to/shadcn-svelte-mcp-server/build/index.js --help

# With token
node /path/to/shadcn-svelte-mcp-server/build/index.js --github-api-key ghp_your_token
```

## Development Workflow

For development, you can use a wrapper script:

1. Create `run-local.sh`:

```bash
#!/bin/bash
cd /path/to/shadcn-svelte-mcp-server
npm run build
node build/index.js "$@"
```

2. Make it executable:

```bash
chmod +x run-local.sh
```

3. Update Claude config to use the wrapper:

```json
{
  "mcpServers": {
    "shadcn-svelte": {
      "command": "/path/to/shadcn-svelte-mcp-server/run-local.sh",
      "args": [],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

This way, the server rebuilds automatically each time Claude starts it.

## Publishing to npm (Future)

When ready to publish to npm:

1. Update `package.json` with your npm scope
2. Run `npm publish`
3. Users can then use `npx @yourscope/shadcn-svelte-mcp-server`

## Additional Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Claude Desktop MCP Guide](https://modelcontextprotocol.io/quickstart/user)
- [shadcn-svelte Documentation](https://shadcn-svelte.com/)