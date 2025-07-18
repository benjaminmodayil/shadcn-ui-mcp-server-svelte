/**
 * Tools implementation for the Model Context Protocol (MCP) server.
 * 
 * This file defines the tools that can be called by the AI model through the MCP protocol.
 * Each tool has a schema that defines its parameters and a handler function that implements its logic.
 * 
 * Updated for shadcn/ui v4 with improved error handling and cleaner implementation.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { axios } from './utils/axios.js';
import { z } from "zod";

/**
 * Creates a standardized success response
 * @param data Data to include in the response
 * @returns Formatted response object
 */
function createSuccessResponse(data: any) {
  return {
    content: [
      {
        type: "text",
        text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Creates a standardized error response
 * @param message Error message
 * @param code Error code
 * @returns Formatted error response
 */
function createErrorResponse(message: string, code: ErrorCode = ErrorCode.InternalError) {
  throw new McpError(code, message);
}

/**
 * Define an MCP server for our tools
 */
export const server = new McpServer({
  name: "ShadcnUI v4 Tools",
  version: "2.0.0"
});

// Tool: get_component - Fetch component source code
server.tool("get_component",
  'Get the source code for a specific shadcn-svelte component',
  { 
    componentName: z.string().describe('Name of the shadcn/ui component (e.g., "accordion", "button")') 
  },
  async ({ componentName }) => {
    try {
      const sourceCode = await axios.getComponentSource(componentName);
      return {
        content: [{ type: "text", text: sourceCode }]
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get component "${componentName}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);

// Tool: get_component_demo - Fetch component demo/example
server.tool("get_component_demo",
  'Get documentation and usage information for a shadcn-svelte component',
  { 
    componentName: z.string().describe('Name of the shadcn/ui component (e.g., "accordion", "button")') 
  },
  async ({ componentName }) => {
    try {
      const demoCode = await axios.getComponentDemo(componentName);
      return {
        content: [{ type: "text", text: demoCode }]
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get demo for component "${componentName}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);

// Tool: list_components - Get all available components
server.tool("list_components",
  'Get all available shadcn-svelte components',
  {},
  async () => {
    try {
      const components = await axios.getAvailableComponents();
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({ 
            components: components.sort(),
            total: components.length 
          }, null, 2) 
        }]
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list components: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);

// Tool: get_component_metadata - Get component metadata
server.tool("get_component_metadata",
  'Get metadata for a specific shadcn-svelte component',
  { 
    componentName: z.string().describe('Name of the shadcn/ui component (e.g., "accordion", "button")') 
  },
  async ({ componentName }) => {
    try {
      const metadata = await axios.getComponentMetadata(componentName);
      if (!metadata) {
        throw new McpError(ErrorCode.InvalidRequest, `Metadata not found for component "${componentName}"`);
      }
      
      return {
        content: [{ type: "text", text: JSON.stringify(metadata, null, 2) }]
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get metadata for component "${componentName}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);

// Tool: get_directory_structure - Get repository directory structure
server.tool("get_directory_structure",
  'Get the directory structure of the shadcn-ui v4 repository',
  { 
    path: z.string().optional().describe('Path within the repository (default: v4 registry)'),
    owner: z.string().optional().describe('Repository owner (default: "shadcn-ui")'),
    repo: z.string().optional().describe('Repository name (default: "ui")'),
    branch: z.string().optional().describe('Branch name (default: "main")')
  },
  async ({ path, owner, repo, branch }) => {
    try {
      const directoryTree = await axios.buildDirectoryTree(
        owner || axios.paths.REPO_OWNER,
        repo || axios.paths.REPO_NAME,
        path || 'packages',
        branch || axios.paths.REPO_BRANCH
      );
      
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify(directoryTree, null, 2)
        }]
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get directory structure: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);

// Tool: get_block - Deprecated for shadcn-svelte
server.tool("get_block",
  '[DEPRECATED] shadcn-svelte uses individual components instead of blocks. Use get_component tool instead.',
  { 
    blockName: z.string().describe('Name of the block (e.g., "calendar-01", "dashboard-01", "login-02")'),
    includeComponents: z.boolean().optional().describe('Whether to include component files for complex blocks (default: true)')
  },
  async ({ blockName, includeComponents = true }) => {
    try {
      const blockData = await axios.getBlockCode(blockName, includeComponents);
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify(blockData, null, 2)
        }]
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get block "${blockName}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);

// Tool: list_blocks - Deprecated for shadcn-svelte
server.tool("list_blocks",
  '[DEPRECATED] shadcn-svelte uses individual components instead of blocks. Use list_components tool instead.',
  {
    category: z.string().optional().describe('Filter by category (calendar, dashboard, login, sidebar, products)')
  },
  async ({ category }) => {
    try {
      const blocks = await axios.getAvailableBlocks(category);
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify(blocks, null, 2)
        }]
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list blocks: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);

// Export tools for backward compatibility
export const tools = {
  'get_component': {
    name: 'get_component',
    description: 'Get the source code for a specific shadcn-svelte component',
    inputSchema: {
      type: 'object',
      properties: {
        componentName: {
          type: 'string',
          description: 'Name of the shadcn/ui component (e.g., "accordion", "button")',
        },
      },
      required: ['componentName'],
    },
  },
  'get_component_demo': {
    name: 'get_component_demo',
    description: 'Get documentation and usage information for a shadcn-svelte component',
    inputSchema: {
      type: 'object',
      properties: {
        componentName: {
          type: 'string',
          description: 'Name of the shadcn/ui component (e.g., "accordion", "button")',
        },
      },
      required: ['componentName'],
    },
  },
  'list_components': {
    name: 'list_components',
    description: 'Get all available shadcn-svelte components',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  'get_component_metadata': {
    name: 'get_component_metadata',
    description: 'Get metadata for a specific shadcn-svelte component',
    inputSchema: {
      type: 'object',
      properties: {
        componentName: {
          type: 'string',
          description: 'Name of the shadcn/ui component (e.g., "accordion", "button")',
        },
      },
      required: ['componentName'],
    },
  },
  'get_directory_structure': {
    name: 'get_directory_structure',
    description: 'Get the directory structure of the shadcn-ui v4 repository',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path within the repository (default: v4 registry)',
        },
        owner: {
          type: 'string',
          description: 'Repository owner (default: "shadcn-ui")',
        },
        repo: {
          type: 'string',
          description: 'Repository name (default: "ui")',
        },
        branch: {
          type: 'string',
          description: 'Branch name (default: "main")',
        },
      },
    },
  },
  'get_block': {
    name: 'get_block',
    description: '[DEPRECATED] shadcn-svelte uses individual components instead of blocks',
    inputSchema: {
      type: 'object',
      properties: {
        blockName: {
          type: 'string',
          description: 'Name of the block (e.g., "calendar-01", "dashboard-01", "login-02")',
        },
        includeComponents: {
          type: 'boolean',
          description: 'Whether to include component files for complex blocks (default: true)',
        },
      },
      required: ['blockName'],
    },
  },
  'list_blocks': {
    name: 'list_blocks',
    description: '[DEPRECATED] shadcn-svelte uses individual components instead of blocks',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by category (calendar, dashboard, login, sidebar, products)',
        },
      },
    },
  },
};

// Export tool handlers for backward compatibility
export const toolHandlers = {
  "get_component": async ({ componentName }: { componentName: string }) => {
    const sourceCode = await axios.getComponentSource(componentName);
    return createSuccessResponse(sourceCode);
  },
  "get_component_demo": async ({ componentName }: { componentName: string }) => {
    const demoCode = await axios.getComponentDemo(componentName);
    return createSuccessResponse(demoCode);
  },
  "list_components": async () => {
    const components = await axios.getAvailableComponents();
    return createSuccessResponse({ 
      components: components.sort(),
      total: components.length 
    });
  },
  "get_component_metadata": async ({ componentName }: { componentName: string }) => {
    const metadata = await axios.getComponentMetadata(componentName);
    return createSuccessResponse(metadata);
  },
  "get_directory_structure": async ({ 
    path, 
    owner = axios.paths.REPO_OWNER, 
    repo = axios.paths.REPO_NAME, 
    branch = axios.paths.REPO_BRANCH 
  }: { 
    path?: string, 
    owner?: string, 
    repo?: string, 
    branch?: string 
  }) => {
    const directoryTree = await axios.buildDirectoryTree(
      owner,
      repo,
      path || 'packages',
      branch
    );
    return createSuccessResponse(directoryTree);
  },
  "get_block": async ({ blockName, includeComponents = true }: { blockName: string, includeComponents?: boolean }) => {
    const blockData = await axios.getBlockCode(blockName, includeComponents);
    return createSuccessResponse(blockData);
  },
  "list_blocks": async ({ category }: { category?: string }) => {
    const blocks = await axios.getAvailableBlocks(category);
    return createSuccessResponse(blocks);
  },
};