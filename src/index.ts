#!/usr/bin/env node
/**
 * Shadcn-Svelte MCP Server
 * 
 * A Model Context Protocol server for shadcn-svelte components.
 * Provides AI assistants with access to component source code, documentation, and metadata for Svelte 5 and SvelteKit projects.
 * 
 * Usage:
 *   node build/index.js
 *   node build/index.js --github-api-key YOUR_TOKEN
 *   node build/index.js -g YOUR_TOKEN
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setupHandlers } from './handler.js';
import { axios } from './utils/axios.js';

/**
 * Parse command line arguments
 */
async function parseArgs() {
  const args = process.argv.slice(2);
  
  // Help flag
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Shadcn-Svelte MCP Server

Usage:
  node build/index.js [options]

Options:
  --github-api-key, -g <token>    GitHub Personal Access Token for API access
  --help, -h                      Show this help message
  --version, -v                   Show version information

Examples:
  node build/index.js
  node build/index.js --github-api-key ghp_your_token_here
  node build/index.js -g ghp_your_token_here

Environment Variables:
  GITHUB_PERSONAL_ACCESS_TOKEN    Alternative way to provide GitHub token

For more information, visit: https://github.com/benjaminmodayil/shadcn-svelte-mcp-server
`);
    process.exit(0);
  }

  // Version flag
  if (args.includes('--version') || args.includes('-v')) {
    // Read version from package.json
    try {
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const packagePath = path.join(__dirname, '..', 'package.json');
      
      const packageContent = fs.readFileSync(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      console.log(`shadcn-svelte-mcp-server v${packageJson.version}`);
    } catch (error) {
      console.log('shadcn-svelte-mcp-server v1.0.0');
    }
    process.exit(0);
  }

  // GitHub API key
  const githubApiKeyIndex = args.findIndex(arg => arg === '--github-api-key' || arg === '-g');
  let githubApiKey = null;
  
  if (githubApiKeyIndex !== -1 && args[githubApiKeyIndex + 1]) {
    githubApiKey = args[githubApiKeyIndex + 1];
  } else if (process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
    githubApiKey = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  }

  return { githubApiKey };
}

/**
 * Main function to start the MCP server
 */
async function main() {
  try {
    const { githubApiKey } = await parseArgs();

    // Configure GitHub API key if provided
    if (githubApiKey) {
      axios.setGitHubApiKey(githubApiKey);
      console.error('GitHub API key configured successfully');
    } else {
      console.error('Warning: No GitHub API key provided. Rate limited to 60 requests/hour.');
      console.error('Use --github-api-key flag or set GITHUB_PERSONAL_ACCESS_TOKEN environment variable.');
    }

    // Initialize the MCP server with metadata and capabilities
    const server = new Server(
      {
        name: "shadcn-svelte-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          resources: {},      // Will be filled with registered resources
          prompts: {},        // Will be filled with registered prompts
          tools: {},          // Will be filled with registered tools
        },
      }
    );

    // Set up request handlers and register components (tools, resources, etc.)
    setupHandlers(server);

    // Start server using stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('Shadcn-Svelte MCP Server started successfully');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});