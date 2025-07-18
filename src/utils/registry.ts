import { Axios } from "axios";
import * as fs from "fs/promises";
import * as path from "path";

// Registry-based system for shadcn-svelte
// Unlike the React version, shadcn-svelte uses a registry API

// Component metadata structure based on shadcn-svelte registry schema
interface ComponentFile {
  path: string;
  content?: string;
  type?: string;
  target?: string;
}

interface ComponentMetadata {
  name: string;
  type: string;
  files: ComponentFile[];
  dependencies?: string[];
  registryDependencies?: string[];
  tailwind?: {
    config?: any;
  };
  cssVars?: any;
  description?: string;
}

interface RegistryIndex {
  [componentName: string]: ComponentMetadata;
}

// Cache for registry data with TTL
class RegistryCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly TTL = 1000 * 60 * 60; // 1 hour cache

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Fallback component list for shadcn-svelte
const SHADCN_SVELTE_COMPONENTS = [
  "accordion",
  "alert",
  "alert-dialog",
  "aspect-ratio",
  "avatar",
  "badge",
  "breadcrumb",
  "button",
  "calendar",
  "card",
  "carousel",
  "chart",
  "checkbox",
  "collapsible",
  "combobox",
  "command",
  "context-menu",
  "data-table",
  "date-picker",
  "dialog",
  "drawer",
  "dropdown-menu",
  "formsnap",
  "hover-card",
  "input",
  "input-otp",
  "label",
  "menubar",
  "navigation-menu",
  "pagination",
  "popover",
  "progress",
  "radio-group",
  "range-calendar",
  "resizable",
  "scroll-area",
  "select",
  "separator",
  "sheet",
  "sidebar",
  "skeleton",
  "slider",
  "sonner",
  "switch",
  "table",
  "tabs",
  "textarea",
  "toggle",
  "toggle-group",
  "tooltip",
  "typography"
];

export class ShadcnSvelteRegistry {
  private cache = new RegistryCache();
  private httpClient: Axios;
  private githubClient: Axios;
  private registryIndex: RegistryIndex | null = null;
  
  // GitHub repository information
  private readonly githubRepo = {
    owner: "huntabyte",
    repo: "shadcn-svelte",
    branch: "main",
    basePath: "docs/src/lib/registry/ui"
  };
  
  // Registry URL for shadcn-svelte.com
  private readonly registryBaseUrl = process.env.SHADCN_SVELTE_REGISTRY_URL || 
    "https://shadcn-svelte.com/registry";
  
  constructor() {
    this.httpClient = new Axios({
      baseURL: this.registryBaseUrl,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; ShadcnSvelteMcpServer/1.0.0)",
      },
      timeout: 30000,
      transformResponse: [(data) => {
        try {
          return JSON.parse(data);
        } catch {
          return data;
        }
      }],
    });
    
    // GitHub API client
    this.githubClient = new Axios({
      baseURL: "https://api.github.com",
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "ShadcnSvelteMcpServer/1.0.0",
        ...(process.env.GITHUB_API_KEY && {
          "Authorization": `token ${process.env.GITHUB_API_KEY}`
        })
      },
      timeout: 30000,
      transformResponse: [(data) => {
        try {
          return JSON.parse(data);
        } catch {
          return data;
        }
      }],
    });
  }

  /**
   * Fetch and parse the registry.json file from GitHub
   */
  private async fetchRegistryIndex(): Promise<RegistryIndex> {
    if (this.registryIndex) return this.registryIndex;
    
    const cached = this.cache.get('registry-index');
    if (cached) {
      this.registryIndex = cached;
      return cached;
    }
    
    try {
      const response = await this.fetchWithRetry(async () => {
        return await this.githubClient.get(
          `/repos/${this.githubRepo.owner}/${this.githubRepo.repo}/contents/docs/registry.json?ref=${this.githubRepo.branch}`
        );
      });
      
      if (response && response.data && response.data.content) {
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        const registry = JSON.parse(content);
        
        // Transform registry items into an index
        const index: RegistryIndex = {};
        if (registry.items && Array.isArray(registry.items)) {
          registry.items.forEach((item: any) => {
            if (item.type === 'registry:ui' && item.name) {
              index[item.name] = {
                name: item.name,
                type: item.type,
                files: item.files || [],
                dependencies: item.dependencies || [],
                registryDependencies: item.registryDependencies || [],
                description: `${item.name} component from shadcn-svelte`
              };
            }
          });
        }
        
        this.registryIndex = index;
        this.cache.set('registry-index', index);
        return index;
      }
    } catch (error) {
      console.error('Failed to fetch registry index from GitHub:', error);
    }
    
    // Fallback to empty index
    return {};
  }
  
  /**
   * Get list of available components
   */
  async getAvailableComponents(): Promise<string[]> {
    const cached = this.cache.get('components-list');
    if (cached) return cached;

    try {
      const index = await this.fetchRegistryIndex();
      const components = Object.keys(index);
      
      if (components.length > 0) {
        this.cache.set('components-list', components);
        return components;
      }
    } catch (error) {
      console.warn('Failed to fetch component list, using fallback', error);
    }

    // Fallback to static list
    this.cache.set('components-list', SHADCN_SVELTE_COMPONENTS);
    return SHADCN_SVELTE_COMPONENTS;
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry<T>(
    fetcher: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<T | null> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fetcher();
      } catch (error: any) {
        const isLastAttempt = i === retries - 1;
        
        // Check for rate limit
        if (error.response?.status === 403 && error.response?.data?.message?.includes('rate limit')) {
          const resetTime = error.response.headers?.['x-ratelimit-reset'];
          if (resetTime) {
            const resetDate = new Date(parseInt(resetTime) * 1000);
            console.error(`GitHub API rate limit exceeded. Resets at: ${resetDate.toISOString()}`);
          }
          throw new Error('GitHub API rate limit exceeded. Please set GITHUB_API_KEY environment variable or wait.');
        }
        
        // Don't retry on 404s
        if (error.response?.status === 404) {
          throw error;
        }
        
        if (!isLastAttempt) {
          console.warn(`Attempt ${i + 1} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        } else {
          throw error;
        }
      }
    }
    return null;
  }
  
  /**
   * Fetch component file content from GitHub
   */
  private async fetchFileContent(filePath: string): Promise<string> {
    try {
      // Convert registry path to GitHub path
      const githubPath = filePath.replace('src/lib/registry/', 'docs/src/lib/registry/');
      
      const response = await this.fetchWithRetry(async () => {
        return await this.githubClient.get(
          `/repos/${this.githubRepo.owner}/${this.githubRepo.repo}/contents/${githubPath}?ref=${this.githubRepo.branch}`
        );
      });
      
      if (response && response.data && response.data.content) {
        return Buffer.from(response.data.content, 'base64').toString('utf-8');
      }
    } catch (error: any) {
      console.error(`Failed to fetch file ${filePath}:`, error.message || error);
    }
    
    return '';
  }
  
  /**
   * Get component metadata and files with actual content
   */
  async getComponent(componentName: string): Promise<ComponentMetadata | null> {
    const cacheKey = `component-${componentName}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const index = await this.fetchRegistryIndex();
      const componentMeta = index[componentName];
      
      if (componentMeta) {
        // Fetch actual file contents
        const filesWithContent = await Promise.all(
          componentMeta.files.map(async (file) => {
            const content = await this.fetchFileContent(file.path);
            return {
              ...file,
              content
            };
          })
        );
        
        const completeComponent: ComponentMetadata = {
          ...componentMeta,
          files: filesWithContent
        };
        
        this.cache.set(cacheKey, completeComponent);
        return completeComponent;
      }
    } catch (error) {
      console.warn(`Failed to fetch component ${componentName}`, error);
    }

    // Fallback: construct basic metadata
    if (SHADCN_SVELTE_COMPONENTS.includes(componentName)) {
      const fallbackData: ComponentMetadata = {
        name: componentName,
        type: "registry:ui",
        files: [
          {
            path: `$lib/components/ui/${componentName}`,
            type: "registry:ui",
          }
        ],
        dependencies: [],
        description: `${componentName} component from shadcn-svelte`
      };
      this.cache.set(cacheKey, fallbackData);
      return fallbackData;
    }

    return null;
  }

  /**
   * Get component source code (combining all files)
   */
  async getComponentSource(componentName: string): Promise<string> {
    const component = await this.getComponent(componentName);
    if (!component) {
      throw new Error(`Component "${componentName}" not found in shadcn-svelte registry`);
    }

    // Combine all component files into a single response
    let combinedSource = `// ${component.name} component from shadcn-svelte\n`;
    combinedSource += `// Install with: npx shadcn-svelte@latest add ${componentName}\n\n`;

    if (component.dependencies && component.dependencies.length > 0) {
      combinedSource += `// Dependencies:\n`;
      component.dependencies.forEach(dep => {
        combinedSource += `// - ${dep}\n`;
      });
      combinedSource += '\n';
    }

    // Add file contents if available
    for (const file of component.files) {
      const fileName = path.basename(file.path);
      combinedSource += `// File: ${fileName}\n`;
      if (file.content) {
        combinedSource += file.content;
      } else {
        combinedSource += `// Content not available\n`;
      }
      combinedSource += '\n\n';
    }

    return combinedSource;
  }

  /**
   * Get component dependencies
   */
  async getComponentDependencies(componentName: string): Promise<{
    npm: string[];
    registry: string[];
  }> {
    const component = await this.getComponent(componentName);
    if (!component) {
      return { npm: [], registry: [] };
    }

    return {
      npm: component.dependencies || [],
      registry: component.registryDependencies || []
    };
  }

  /**
   * Extract Svelte-specific imports and usage patterns
   */
  extractSveltePatterns(code: string): {
    imports: string[];
    components: string[];
    runes: string[];
    stores: string[];
  } {
    const patterns = {
      imports: [] as string[],
      components: [] as string[],
      runes: [] as string[],
      stores: [] as string[]
    };

    // Extract imports (including $lib aliases)
    const importRegex = /import\s+(?:{[^}]+}|\w+)\s+from\s+['"]([@$\w\/\-\.]+)['"]/g;
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      patterns.imports.push(match[1]);
    }

    // Extract Svelte components (PascalCase in templates)
    const componentRegex = /<([A-Z]\w+)/g;
    while ((match = componentRegex.exec(code)) !== null) {
      patterns.components.push(match[1]);
    }

    // Extract Svelte 5 runes
    const runeRegex = /\$(?:state|derived|effect|props|bindable|inspect|host)\b/g;
    while ((match = runeRegex.exec(code)) !== null) {
      patterns.runes.push(match[0]);
    }

    // Extract Svelte stores
    const storeRegex = /\$[\w]+(?:\.\w+)*/g;
    while ((match = storeRegex.exec(code)) !== null) {
      if (!patterns.runes.includes(match[0])) {
        patterns.stores.push(match[0]);
      }
    }

    // Remove duplicates
    Object.keys(patterns).forEach(key => {
      patterns[key as keyof typeof patterns] = [...new Set(patterns[key as keyof typeof patterns])];
    });

    return patterns;
  }

  /**
   * Search for components by query
   */
  async searchComponents(query: string): Promise<string[]> {
    const components = await this.getAvailableComponents();
    const searchTerm = query.toLowerCase();
    
    return components.filter(component => 
      component.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Get installation command for a component
   */
  getInstallCommand(componentName: string, packageManager: 'npm' | 'pnpm' | 'bun' = 'npm'): string {
    const commands = {
      npm: `npx shadcn-svelte@latest add ${componentName}`,
      pnpm: `pnpm dlx shadcn-svelte@latest add ${componentName}`,
      bun: `bunx shadcn-svelte@latest add ${componentName}`
    };
    
    return commands[packageManager];
  }

  /**
   * Clear the registry cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Check if a component exists
   */
  async componentExists(componentName: string): Promise<boolean> {
    const components = await this.getAvailableComponents();
    return components.includes(componentName.toLowerCase());
  }

  /**
   * Get component metadata for AI context
   */
  async getComponentContext(componentName: string): Promise<string> {
    const component = await this.getComponent(componentName);
    if (!component) {
      return `Component "${componentName}" not found in shadcn-svelte registry.`;
    }

    let context = `# ${component.name} Component\n\n`;
    context += `Type: ${component.type}\n`;
    
    if (component.description) {
      context += `Description: ${component.description}\n`;
    }

    context += `\n## Installation\n\`\`\`bash\n${this.getInstallCommand(componentName)}\n\`\`\`\n`;

    if (component.files && component.files.length > 0) {
      context += `\n## Files\n`;
      component.files.forEach(file => {
        context += `- ${file.path}\n`;
      });
    }

    if (component.dependencies && component.dependencies.length > 0) {
      context += `\n## NPM Dependencies\n`;
      component.dependencies.forEach(dep => {
        context += `- ${dep}\n`;
      });
    }

    if (component.registryDependencies && component.registryDependencies.length > 0) {
      context += `\n## Required Components\n`;
      component.registryDependencies.forEach(dep => {
        context += `- ${dep}\n`;
      });
    }

    context += `\n## Import Pattern\n`;
    context += `\`\`\`typescript\n`;
    if (component.files.length === 1) {
      context += `import { ${this.toPascalCase(componentName)} } from '$lib/components/ui/${componentName}'\n`;
    } else {
      context += `import * as ${this.toPascalCase(componentName)} from '$lib/components/ui/${componentName}'\n`;
    }
    context += `\`\`\`\n`;

    return context;
  }

  /**
   * Convert kebab-case to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }
}

// Export a singleton instance
export const registry = new ShadcnSvelteRegistry();