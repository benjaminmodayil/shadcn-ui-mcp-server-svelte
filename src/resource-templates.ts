/**
 * Resource templates implementation for the Model Context Protocol (MCP) server.
 * 
 * This file defines resource templates that can be used to dynamically generate
 * resources based on parameters in the URI.
 */

/**
 * Resource template definitions exported to the MCP handler
 * Each template has a name, description, uriTemplate and contentType
 */
export const resourceTemplates = [
  {
    name: 'get_install_script_for_component',
    description: 'Generate installation script for a specific shadcn-svelte component based on package manager',
    uriTemplate: 'resource-template:get_install_script_for_component?packageManager={packageManager}&component={component}',
    contentType: 'text/plain',
  },
  {
    name: 'get_installation_guide',
    description: 'Get the installation guide for shadcn-svelte for SvelteKit with package manager',
    uriTemplate: 'resource-template:get_installation_guide?framework={framework}&packageManager={packageManager}',
    contentType: 'text/plain',
  },
];

// Create a map for easier access in getResourceTemplate
const resourceTemplateMap = {
  'get_install_script_for_component': resourceTemplates[0],
  'get_installation_guide': resourceTemplates[1],
};

/**
 * Extract parameters from URI
 * @param uri URI to extract from
 * @param paramName Name of parameter to extract
 * @returns Parameter value or undefined
 */
function extractParam(uri: string, paramName: string): string | undefined {
  const match = uri.match(new RegExp(`${paramName}=([^&]+)`));
  return match?.[1];
}

/**
 * Gets a resource template handler for a given URI
 * @param uri The URI of the resource template
 * @returns A function that generates the resource
 */
export const getResourceTemplate = (uri: string) => {
  // Component installation script template
  if (uri.startsWith('resource-template:get_install_script_for_component')) {
    return async () => {
      try {
        const packageManager = extractParam(uri, 'packageManager');
        const component = extractParam(uri, 'component');
        
        if (!packageManager) {
          return { 
            content: 'Missing packageManager parameter. Please specify npm, pnpm, or yarn.', 
            contentType: 'text/plain' 
          };
        }
        
        if (!component) {
          return { 
            content: 'Missing component parameter. Please specify the component name.', 
            contentType: 'text/plain' 
          };
        }
        
        // Generate installation script based on package manager
        let installCommand: string;
        
        switch (packageManager.toLowerCase()) {
          case 'npm':
            installCommand = `npx shadcn-svelte@latest add ${component}`;
            break;
          case 'pnpm':
            installCommand = `pnpm dlx shadcn-svelte@latest add ${component}`;
            break;
          case 'yarn':
            installCommand = `yarn dlx shadcn-svelte@latest add ${component}`;
            break;
          case 'bun':
            installCommand = `bunx shadcn-svelte@latest add ${component}`;
            break;
          default:
            installCommand = `npx shadcn-svelte@latest add ${component}`;
        }
        
        return {
          content: installCommand,
          contentType: 'text/plain',
        };
      } catch (error) {
        return {
          content: `Error generating installation script: ${error instanceof Error ? error.message : String(error)}`,
          contentType: 'text/plain',
        };
      }
    };
  }
  
  // Installation guide template
  if (uri.startsWith('resource-template:get_installation_guide')) {
    return async () => {
      try {
        // For shadcn-svelte, we only support SvelteKit
        const framework = 'sveltekit';
        const packageManager = extractParam(uri, 'packageManager');
        
        if (!packageManager) {
          return { 
            content: 'Missing packageManager parameter. Please specify npm, pnpm, or yarn.', 
            contentType: 'text/plain' 
          };
        }
        
        // Generate installation guide for SvelteKit
        const guides = {
          sveltekit: {
            description: "Installation guide for SvelteKit project",
            steps: [
              "Create a new SvelteKit project if you don't have one already:",
              packageManager === 'npm' ? 'npm create svelte@latest my-app' :
              packageManager === 'pnpm' ? 'pnpm create svelte@latest my-app' :
              packageManager === 'yarn' ? 'yarn create svelte@latest my-app' :
              packageManager === 'bun' ? 'bun create svelte@latest my-app' : 'npm create svelte@latest my-app',
              "",
              "Navigate to your project directory:",
              "cd my-app",
              "",
              "Install dependencies:",
              packageManager === 'npm' ? 'npm install' :
              packageManager === 'pnpm' ? 'pnpm install' :
              packageManager === 'yarn' ? 'yarn' :
              packageManager === 'bun' ? 'bun install' : 'npm install',
              "",
              "Set up shadcn-svelte in your project:",
              packageManager === 'npm' ? 'npx shadcn-svelte@latest init' : 
              packageManager === 'pnpm' ? 'pnpm dlx shadcn-svelte@latest init' :
              packageManager === 'yarn' ? 'yarn dlx shadcn-svelte@latest init' :
              packageManager === 'bun' ? 'bunx shadcn-svelte@latest init' : 'npx shadcn-svelte@latest init',
              "",
              "Follow the prompts to select your preferences",
              "- Choose your preferred style (Default/New York)",
              "- Select base color",
              "- Choose CSS variables for theming",
              "",
              "Once initialized, you can add components:",
              packageManager === 'npm' ? 'npx shadcn-svelte@latest add button' : 
              packageManager === 'pnpm' ? 'pnpm dlx shadcn-svelte@latest add button' :
              packageManager === 'yarn' ? 'yarn dlx shadcn-svelte@latest add button' :
              packageManager === 'bun' ? 'bunx shadcn-svelte@latest add button' : 'npx shadcn-svelte@latest add button',
              "",
              "Components will be added to src/lib/components/ui/",
              "",
              "Import and use components in your Svelte files:",
              "```svelte",
              "<script>",
              "  import { Button } from '$lib/components/ui/button';",
              "</script>",
              "",
              "<Button>Click me</Button>",
              "```",
              "",
              "Note: shadcn-svelte requires Svelte 5 and SvelteKit"
            ]
          }
        };
        
        // Use the SvelteKit guide
        const guide = guides.sveltekit;
        
        return {
          content: `# ${guide.description} with ${packageManager}\n\n${guide.steps.join('\n')}`,
          contentType: 'text/plain',
        };
      } catch (error) {
        return {
          content: `Error generating installation guide: ${error instanceof Error ? error.message : String(error)}`,
          contentType: 'text/plain',
        };
      }
    };
  }
  
  return undefined;
};