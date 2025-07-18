import { Axios } from "axios";
import { registry } from './registry.js';

// Constants for shadcn-svelte repository
const REPO_OWNER = 'huntabyte';
const REPO_NAME = 'shadcn-svelte';
const REPO_BRANCH = 'main';

// Note: shadcn-svelte uses a registry-based system, not direct file access
// Components are managed through the registry API

// GitHub API for accessing repository structure and metadata
const githubApi = new Axios({
    baseURL: "https://api.github.com",
    headers: {
        "Content-Type": "application/json",
        "Accept": "application/vnd.github+json",
        "User-Agent": "Mozilla/5.0 (compatible; ShadcnUiMcpServer/1.0.0)",
        ...(process.env.GITHUB_PERSONAL_ACCESS_TOKEN && {
            "Authorization": `Bearer ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`
        })
    },
    timeout: 30000, // Increased from 15000 to 30000 (30 seconds)
    transformResponse: [(data) => {
        try {
            return JSON.parse(data);
        } catch {
            return data;
        }
    }],
});

// GitHub Raw for documentation/examples (shadcn-svelte uses different structure)
const githubRaw = new Axios({
    baseURL: `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}`,
    headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ShadcnSvelteMcpServer/1.0.0)",
    },
    timeout: 30000,
    transformResponse: [(data) => data], // Return raw data
});

/**
 * Fetch component source code from the shadcn-svelte registry
 * @param componentName Name of the component
 * @returns Promise with component source code
 */
async function getComponentSource(componentName: string): Promise<string> {
    try {
        return await registry.getComponentSource(componentName);
    } catch (error) {
        throw new Error(`Component "${componentName}" not found in shadcn-svelte registry`);
    }
}

/**
 * Fetch component demo/example - Note: shadcn-svelte demos are on the docs site
 * @param componentName Name of the component
 * @returns Promise with component usage information
 */
async function getComponentDemo(componentName: string): Promise<string> {
    // shadcn-svelte doesn't store demos in the main repo
    // Return usage information instead
    try {
        const context = await registry.getComponentContext(componentName);
        return context + '\n\nFor full examples, visit: https://shadcn-svelte.com/docs/components/' + componentName;
    } catch (error) {
        throw new Error(`Component "${componentName}" not found in shadcn-svelte registry`);
    }
}

/**
 * Fetch all available components from the shadcn-svelte registry
 * @returns Promise with list of component names
 */
async function getAvailableComponents(): Promise<string[]> {
    try {
        return await registry.getAvailableComponents();
    } catch (error) {
        throw new Error('Failed to fetch available components from shadcn-svelte registry');
    }
}

/**
 * Fetch component metadata from the shadcn-svelte registry
 * @param componentName Name of the component
 * @returns Promise with component metadata
 */
async function getComponentMetadata(componentName: string): Promise<any> {
    try {
        const component = await registry.getComponent(componentName);
        if (!component) return null;
        
        // Transform to match expected format
        return {
            name: component.name,
            type: component.type,
            dependencies: component.dependencies || [],
            registryDependencies: component.registryDependencies || [],
            description: component.description,
            files: component.files
        };
    } catch (error) {
        console.error(`Error getting metadata for ${componentName}:`, error);
        return null;
    }
}

/**
 * Recursively builds a directory tree structure from a GitHub repository
 * @param owner Repository owner
 * @param repo Repository name  
 * @param path Path within the repository to start building the tree from
 * @param branch Branch name
 * @returns Promise resolving to the directory tree structure
 */
async function buildDirectoryTree(
    owner: string = REPO_OWNER,
    repo: string = REPO_NAME,
    path: string = 'packages',
    branch: string = REPO_BRANCH
): Promise<any> {
    try {
        const response = await githubApi.get(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`);
        
        if (!response.data) {
            throw new Error('No data received from GitHub API');
        }

        const contents = response.data;
        
        // Handle different response types from GitHub API
        if (!Array.isArray(contents)) {
            // Check if it's an error response (like rate limit)
            if (contents.message) {
                if (contents.message.includes('rate limit exceeded')) {
                    throw new Error(`GitHub API rate limit exceeded. ${contents.message} Consider setting GITHUB_PERSONAL_ACCESS_TOKEN environment variable for higher rate limits.`);
                } else if (contents.message.includes('Not Found')) {
                    throw new Error(`Path not found: ${path}. The path may not exist in the repository.`);
                } else {
                    throw new Error(`GitHub API error: ${contents.message}`);
                }
            }
            
            // If contents is not an array, it might be a single file
            if (contents.type === 'file') {
                return {
                    path: contents.path,
                    type: 'file',
                    name: contents.name,
                    url: contents.download_url,
                    sha: contents.sha,
                };
            } else {
                throw new Error(`Unexpected response type from GitHub API: ${JSON.stringify(contents)}`);
            }
        }
        
        // Build tree node for this level (directory with multiple items)
        const result: Record<string, any> = {
            path,
            type: 'directory',
            children: {},
        };

        // Process each item
        for (const item of contents) {
            if (item.type === 'file') {
                // Add file to this directory's children
                result.children[item.name] = {
                    path: item.path,
                    type: 'file',
                    name: item.name,
                    url: item.download_url,
                    sha: item.sha,
                };
            } else if (item.type === 'dir') {
                // Recursively process subdirectory (limit depth to avoid infinite recursion)
                if (path.split('/').length < 8) {
                    try {
                        const subTree = await buildDirectoryTree(owner, repo, item.path, branch);
                        result.children[item.name] = subTree;
                    } catch (error) {
                        console.warn(`Failed to fetch subdirectory ${item.path}:`, error);
                        result.children[item.name] = {
                            path: item.path,
                            type: 'directory',
                            error: 'Failed to fetch contents'
                        };
                    }
                }
            }
        }

        return result;
    } catch (error: any) {
        console.error(`Error building directory tree for ${path}:`, error);
        
        // Check if it's already a well-formatted error from above
        if (error.message && (error.message.includes('rate limit') || error.message.includes('GitHub API error'))) {
            throw error;
        }
        
        // Provide more specific error messages for HTTP errors
        if (error.response) {
            const status = error.response.status;
            const responseData = error.response.data;
            const message = responseData?.message || 'Unknown error';
            
            if (status === 404) {
                throw new Error(`Path not found: ${path}. The path may not exist in the repository.`);
            } else if (status === 403) {
                if (message.includes('rate limit')) {
                    throw new Error(`GitHub API rate limit exceeded: ${message} Consider setting GITHUB_PERSONAL_ACCESS_TOKEN environment variable for higher rate limits.`);
                } else {
                    throw new Error(`Access forbidden: ${message}`);
                }
            } else if (status === 401) {
                throw new Error(`Authentication failed. Please check your GITHUB_PERSONAL_ACCESS_TOKEN if provided.`);
            } else {
                throw new Error(`GitHub API error (${status}): ${message}`);
            }
        }
        
        throw error;
    }
}

/**
 * Provides a basic directory structure for shadcn-svelte without API calls
 * This is used as a fallback when API rate limits are hit
 */
function getBasicSvelteStructure(): any {
    return {
        path: 'packages',
        type: 'directory',
        note: 'Basic structure provided due to API limitations',
        children: {
            'cli': {
                path: 'packages/cli',
                type: 'directory',
                description: 'shadcn-svelte CLI tool',
                note: 'Command-line interface for adding components'
            },
            'registry': {
                path: 'packages/registry',
                type: 'directory', 
                description: 'Component registry and metadata',
                note: 'Registry system for component definitions'
            }
        },
        additional_info: 'Components are installed to your project at $lib/components/ui/'
    };
}

/**
 * Extract description from block code comments
 * @param code The source code to analyze
 * @returns Extracted description or null
 */
function extractBlockDescription(code: string): string | null {
    // Look for JSDoc comments or description comments
    const descriptionRegex = /\/\*\*[\s\S]*?\*\/|\/\/\s*(.+)/;
    const match = code.match(descriptionRegex);
    if (match) {
        // Clean up the comment
        const description = match[0]
            .replace(/\/\*\*|\*\/|\*|\/\//g, '')
            .trim()
            .split('\n')[0]
            .trim();
        return description.length > 0 ? description : null;
    }
    
    // Look for component name as fallback
    const componentRegex = /export\s+(?:default\s+)?function\s+(\w+)/;
    const componentMatch = code.match(componentRegex);
    if (componentMatch) {
        return `${componentMatch[1]} - A reusable UI component`;
    }
    
    return null;
}

/**
 * Extract dependencies from import statements (Svelte-aware)
 * @param code The source code to analyze
 * @returns Array of dependency names
 */
function extractDependencies(code: string): string[] {
    const dependencies: string[] = [];
    
    // Match import statements (including $lib aliases)
    const importRegex = /import\s+.*?\s+from\s+['"]([@$\w\/\-\.]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(code)) !== null) {
        const dep = match[1];
        // Exclude relative imports and $lib aliases (SvelteKit convention)
        if (!dep.startsWith('./') && !dep.startsWith('../') && !dep.startsWith('$lib/') && !dep.startsWith('$app/')) {
            dependencies.push(dep);
        }
    }
    
    return [...new Set(dependencies)]; // Remove duplicates
}

/**
 * Extract component usage from code (Svelte-aware)
 * @param code The source code to analyze
 * @returns Array of component names used
 */
function extractComponentUsage(code: string): string[] {
    const patterns = registry.extractSveltePatterns(code);
    
    // Return unique component names
    return [...new Set([
        ...patterns.components,
        // Also include imported components
        ...patterns.imports
            .filter(imp => imp.includes('$lib/components/'))
            .map(imp => {
                const match = imp.match(/\/([^/]+)$/);
                return match ? match[1] : '';
            })
            .filter(Boolean)
    ])];
}

/**
 * Generate usage instructions for complex blocks
 * @param blockName Name of the block
 * @param structure Structure information
 * @returns Usage instructions string
 */
function generateComplexBlockUsage(blockName: string, structure: any[]): string {
    const hasComponents = structure.some(item => item.name === 'components');
    
    let usage = `To use the ${blockName} block:\n\n`;
    usage += `1. Copy the main files to your project:\n`;
    
    structure.forEach(item => {
        if (item.type === 'file') {
            usage += `   - ${item.name}\n`;
        } else if (item.type === 'directory' && item.name === 'components') {
            usage += `   - components/ directory (${item.count} files)\n`;
        }
    });
    
    if (hasComponents) {
        usage += `\n2. Copy the components to your components directory\n`;
        usage += `3. Update import paths as needed\n`;
        usage += `4. Ensure all dependencies are installed\n`;
    } else {
        usage += `\n2. Update import paths as needed\n`;
        usage += `3. Ensure all dependencies are installed\n`;
    }
    
    return usage;
}

/**
 * Enhanced buildDirectoryTree with fallback for rate limits
 */
async function buildDirectoryTreeWithFallback(
    owner: string = REPO_OWNER,
    repo: string = REPO_NAME,
    path: string = 'packages',
    branch: string = REPO_BRANCH
): Promise<any> {
    try {
        return await buildDirectoryTree(owner, repo, path, branch);
    } catch (error: any) {
        // If it's a rate limit error, provide fallback
        if (error.message && error.message.includes('rate limit')) {
            console.warn('Using fallback directory structure due to rate limit');
            return getBasicSvelteStructure();
        }
        // Re-throw other errors
        throw error;
    }
}

/**
 * Note: shadcn-svelte doesn't have blocks like the React version
 * This function is kept for compatibility but returns component information instead
 */
async function getBlockCode(blockName: string, includeComponents: boolean = true): Promise<any> {
    // For compatibility, treat block requests as component requests
    return {
        error: 'Blocks are not available in shadcn-svelte',
        suggestion: 'Use the list_components and get_component tools instead',
        info: 'shadcn-svelte provides individual components that can be composed together'
    };
}

// Stub function for compatibility
async function getAvailableBlocks(category?: string): Promise<any> {
    return {
        error: 'Blocks are not available in shadcn-svelte',
        suggestion: 'Use the list_components tool to see available components',
        info: 'shadcn-svelte provides individual components rather than pre-built blocks',
        availableComponents: await registry.getAvailableComponents()
    };
}

// Original block function removed - keeping stubs above for compatibility
async function _removedGetBlockCode(blockName: string, includeComponents: boolean = true): Promise<any> {
    const blocksPath = 'removed';
    
    try {
        // First, check if it's a simple block file (.tsx)
        try {
            const simpleBlockResponse = await githubRaw.get(`/${blocksPath}/${blockName}.tsx`);
            if (simpleBlockResponse.status === 200) {
                const code = simpleBlockResponse.data;
                
                // Extract useful information from the code
                const description = extractBlockDescription(code);
                const dependencies = extractDependencies(code);
                const components = extractComponentUsage(code);
                
                return {
                    name: blockName,
                    type: 'simple',
                    description: description || `Simple block: ${blockName}`,
                    code: code,
                    dependencies: dependencies,
                    componentsUsed: components,
                    size: code.length,
                    lines: code.split('\n').length,
                    usage: `Import and use directly in your application:\n\nimport { ${blockName.charAt(0).toUpperCase() + blockName.slice(1).replace(/-/g, '')} } from './blocks/${blockName}'`
                };
            }
        } catch (error) {
            // Continue to check for complex block directory
        }
        
        // Check if it's a complex block directory
        const directoryResponse = await githubApi.get(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${blocksPath}/${blockName}?ref=${REPO_BRANCH}`);
        
        if (!directoryResponse.data) {
            throw new Error(`Block "${blockName}" not found`);
        }
        
        const blockStructure: any = {
            name: blockName,
            type: 'complex',
            description: `Complex block: ${blockName}`,
            files: {},
            structure: [],
            totalFiles: 0,
            dependencies: new Set(),
            componentsUsed: new Set()
        };
        
        // Process the directory contents
        if (Array.isArray(directoryResponse.data)) {
            blockStructure.totalFiles = directoryResponse.data.length;
            
            for (const item of directoryResponse.data) {
                if (item.type === 'file') {
                    // Get the main page file
                    const fileResponse = await githubRaw.get(`/${item.path}`);
                    const content = fileResponse.data;
                    
                    // Extract information from the file
                    const description = extractBlockDescription(content);
                    const dependencies = extractDependencies(content);
                    const components = extractComponentUsage(content);
                    
                    blockStructure.files[item.name] = {
                        path: item.name,
                        content: content,
                        size: content.length,
                        lines: content.split('\n').length,
                        description: description,
                        dependencies: dependencies,
                        componentsUsed: components
                    };
                    
                    // Add to overall dependencies and components
                    dependencies.forEach((dep: string) => blockStructure.dependencies.add(dep));
                    components.forEach((comp: string) => blockStructure.componentsUsed.add(comp));
                    
                    blockStructure.structure.push({
                        name: item.name,
                        type: 'file',
                        size: content.length,
                        description: description || `${item.name} - Main block file`
                    });
                    
                    // Use the first file's description as the block description if available
                    if (description && blockStructure.description === `Complex block: ${blockName}`) {
                        blockStructure.description = description;
                    }
                } else if (item.type === 'dir' && item.name === 'components' && includeComponents) {
                    // Get component files
                    const componentsResponse = await githubApi.get(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${item.path}?ref=${REPO_BRANCH}`);
                    
                    if (Array.isArray(componentsResponse.data)) {
                        blockStructure.files.components = {};
                        const componentStructure: any[] = [];
                        
                        for (const componentItem of componentsResponse.data) {
                            if (componentItem.type === 'file') {
                                const componentResponse = await githubRaw.get(`/${componentItem.path}`);
                                const content = componentResponse.data;
                                
                                const dependencies = extractDependencies(content);
                                const components = extractComponentUsage(content);
                                
                                blockStructure.files.components[componentItem.name] = {
                                    path: `components/${componentItem.name}`,
                                    content: content,
                                    size: content.length,
                                    lines: content.split('\n').length,
                                    dependencies: dependencies,
                                    componentsUsed: components
                                };
                                
                                // Add to overall dependencies and components
                                dependencies.forEach((dep: string) => blockStructure.dependencies.add(dep));
                                components.forEach((comp: string) => blockStructure.componentsUsed.add(comp));
                                
                                componentStructure.push({
                                    name: componentItem.name,
                                    type: 'component',
                                    size: content.length
                                });
                            }
                        }
                        
                        blockStructure.structure.push({
                            name: 'components',
                            type: 'directory',
                            files: componentStructure,
                            count: componentStructure.length
                        });
                    }
                }
            }
        }
        
        // Convert Sets to Arrays for JSON serialization
        blockStructure.dependencies = Array.from(blockStructure.dependencies);
        blockStructure.componentsUsed = Array.from(blockStructure.componentsUsed);
        
        // Add usage instructions
        blockStructure.usage = generateComplexBlockUsage(blockName, blockStructure.structure);
        
        return blockStructure;
        
    } catch (error: any) {
        if (error.response?.status === 404) {
            throw new Error(`Block "${blockName}" not found. Available blocks can be found in the v4 blocks directory.`);
        }
        throw error;
    }
}

// Removed duplicate - see stub function above
async function _removedGetAvailableBlocks(category?: string): Promise<any> {
    const blocksPath = 'removed';
    
    try {
        const response = await githubApi.get(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${blocksPath}?ref=${REPO_BRANCH}`);
        
        if (!Array.isArray(response.data)) {
            throw new Error('Unexpected response from GitHub API');
        }
        
        const blocks: any = {
            calendar: [],
            dashboard: [],
            login: [],
            sidebar: [],
            products: [],
            authentication: [],
            charts: [],
            mail: [],
            music: [],
            other: []
        };
        
        for (const item of response.data) {
            const blockInfo: any = {
                name: item.name.replace('.tsx', ''),
                type: item.type === 'file' ? 'simple' : 'complex',
                path: item.path,
                size: item.size || 0,
                lastModified: item.download_url ? 'Available' : 'Directory'
            };
            
            // Add description based on name patterns
            if (item.name.includes('calendar')) {
                blockInfo.description = 'Calendar component for date selection and scheduling';
                blocks.calendar.push(blockInfo);
            } else if (item.name.includes('dashboard')) {
                blockInfo.description = 'Dashboard layout with charts, metrics, and data display';
                blocks.dashboard.push(blockInfo);
            } else if (item.name.includes('login') || item.name.includes('signin')) {
                blockInfo.description = 'Authentication and login interface';
                blocks.login.push(blockInfo);
            } else if (item.name.includes('sidebar')) {
                blockInfo.description = 'Navigation sidebar component';
                blocks.sidebar.push(blockInfo);
            } else if (item.name.includes('products') || item.name.includes('ecommerce')) {
                blockInfo.description = 'Product listing and e-commerce components';
                blocks.products.push(blockInfo);
            } else if (item.name.includes('auth')) {
                blockInfo.description = 'Authentication related components';
                blocks.authentication.push(blockInfo);
            } else if (item.name.includes('chart') || item.name.includes('graph')) {
                blockInfo.description = 'Data visualization and chart components';
                blocks.charts.push(blockInfo);
            } else if (item.name.includes('mail') || item.name.includes('email')) {
                blockInfo.description = 'Email and mail interface components';
                blocks.mail.push(blockInfo);
            } else if (item.name.includes('music') || item.name.includes('player')) {
                blockInfo.description = 'Music player and media components';
                blocks.music.push(blockInfo);
            } else {
                blockInfo.description = `${item.name} - Custom UI block`;
                blocks.other.push(blockInfo);
            }
        }
        
        // Sort blocks within each category
        Object.keys(blocks).forEach(key => {
            blocks[key].sort((a: any, b: any) => a.name.localeCompare(b.name));
        });
        
        // Filter by category if specified
        if (category) {
            const categoryLower = category.toLowerCase();
            if (blocks[categoryLower]) {
                return {
                    category,
                    blocks: blocks[categoryLower],
                    total: blocks[categoryLower].length,
                    description: `${category.charAt(0).toUpperCase() + category.slice(1)} blocks available in shadcn/ui v4`,
                    usage: `Use 'get_block' tool with the block name to get the full source code and implementation details.`
                };
            } else {
                return {
                    category,
                    blocks: [],
                    total: 0,
                    availableCategories: Object.keys(blocks).filter(key => blocks[key].length > 0),
                    suggestion: `Category '${category}' not found. Available categories: ${Object.keys(blocks).filter(key => blocks[key].length > 0).join(', ')}`
                };
            }
        }
        
        // Calculate totals
        const totalBlocks = Object.values(blocks).flat().length;
        const nonEmptyCategories = Object.keys(blocks).filter(key => blocks[key].length > 0);
        
        return {
            categories: blocks,
            totalBlocks,
            availableCategories: nonEmptyCategories,
            summary: Object.keys(blocks).reduce((acc: any, key) => {
                if (blocks[key].length > 0) {
                    acc[key] = blocks[key].length;
                }
                return acc;
            }, {}),
            usage: "Use 'get_block' tool with a specific block name to get full source code and implementation details.",
            examples: nonEmptyCategories.slice(0, 3).map(cat => 
                blocks[cat][0] ? `${cat}: ${blocks[cat][0].name}` : ''
            ).filter(Boolean)
        };
        
    } catch (error: any) {
        if (error.response?.status === 404) {
            throw new Error('Blocks directory not found in the v4 registry');
        }
        throw error;
    }
}

/**
 * Set or update GitHub API key for higher rate limits
 * @param apiKey GitHub Personal Access Token
 */
function setGitHubApiKey(apiKey: string): void {
    // Update the Authorization header for the GitHub API instance
    if (apiKey && apiKey.trim()) {
        (githubApi.defaults.headers as any)['Authorization'] = `Bearer ${apiKey.trim()}`;
        console.log('GitHub API key updated successfully');
    } else {
        // Remove authorization header if empty key provided
        delete (githubApi.defaults.headers as any)['Authorization'];
        console.log('GitHub API key removed - using unauthenticated requests');
    }
}

/**
 * Get current GitHub API rate limit status
 * @returns Promise with rate limit information
 */
async function getGitHubRateLimit(): Promise<any> {
    try {
        const response = await githubApi.get('/rate_limit');
        return response.data;
    } catch (error: any) {
        throw new Error(`Failed to get rate limit info: ${error.message}`);
    }
}

/**
 * Generate UI pattern using multiple shadcn components
 * @param pattern Pattern name to generate
 * @param options Additional generation options
 * @returns Generated pattern code
 */
async function generateUIPattern(pattern: string, options: any = {}): Promise<string> {
    const { includeState = true, includeValidation = true, responsive = true, darkMode = false } = options;
    
    // Pattern templates for common UI patterns
    const patterns: Record<string, () => Promise<string>> = {
        'login-form': async () => {
            const components = ['card', 'button', 'input', 'label', 'alert'];
            const imports = await generateImports(components);
            
            return `<script lang="ts">
${imports}
${includeState ? `
  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);
  
  async function handleSubmit(e: Event) {
    e.preventDefault();
    loading = true;
    error = '';
    
    try {
      // Your login logic here
      await login(email, password);
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }` : ''}
</script>

<Card class="${responsive ? 'w-full max-w-md mx-auto' : 'w-96'}">
  <CardHeader>
    <CardTitle>Login</CardTitle>
    <CardDescription>Enter your credentials to access your account</CardDescription>
  </CardHeader>
  <form onsubmit={handleSubmit}>
    <CardContent class="space-y-4">
      {#if error}
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      {/if}
      
      <div class="space-y-2">
        <Label for="email">Email</Label>
        <Input 
          id="email" 
          type="email" 
          bind:value={email}
          required
          placeholder="you@example.com"
        />
      </div>
      
      <div class="space-y-2">
        <Label for="password">Password</Label>
        <Input 
          id="password" 
          type="password" 
          bind:value={password}
          required
        />
      </div>
    </CardContent>
    <CardFooter>
      <Button type="submit" class="w-full" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </Button>
    </CardFooter>
  </form>
</Card>`;
        },
        
        'profile-card': async () => {
            const components = ['card', 'avatar', 'button', 'badge'];
            const imports = await generateImports(components);
            
            return `<script lang="ts">
${imports}
  
  export let name: string;
  export let role: string = '';
  export let avatarUrl: string = '';
  export let bio: string = '';
  export let tags: string[] = [];
</script>

<Card class="${responsive ? 'w-full max-w-sm' : 'w-80'}">
  <CardHeader class="text-center">
    <Avatar class="w-24 h-24 mx-auto mb-4">
      <AvatarImage src={avatarUrl} alt={name} />
      <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
    <CardTitle>{name}</CardTitle>
    {#if role}
      <CardDescription>{role}</CardDescription>
    {/if}
  </CardHeader>
  {#if bio || tags.length > 0}
    <CardContent>
      {#if bio}
        <p class="text-sm text-muted-foreground mb-4">{bio}</p>
      {/if}
      {#if tags.length > 0}
        <div class="flex flex-wrap gap-2">
          {#each tags as tag}
            <Badge variant="secondary">{tag}</Badge>
          {/each}
        </div>
      {/if}
    </CardContent>
  {/if}
  <CardFooter class="flex gap-2">
    <Button class="flex-1">Follow</Button>
    <Button variant="outline" class="flex-1">Message</Button>
  </CardFooter>
</Card>`;
        },
        
        'data-table-page': async () => {
            const components = ['table', 'button', 'input', 'select', 'badge'];
            const imports = await generateImports(components);
            
            return `<script lang="ts">
${imports}
${includeState ? `
  type DataItem = {
    id: string;
    name: string;
    status: 'active' | 'inactive' | 'pending';
    date: string;
  };
  
  let data = $state<DataItem[]>([
    { id: '1', name: 'Item 1', status: 'active', date: '2024-01-01' },
    { id: '2', name: 'Item 2', status: 'pending', date: '2024-01-02' },
    { id: '3', name: 'Item 3', status: 'inactive', date: '2024-01-03' },
  ]);
  
  let searchQuery = $state('');
  let statusFilter = $state<string>('all');
  
  const filteredData = $derived(() => {
    return data.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  });` : ''}
</script>

<div class="space-y-4">
  <div class="flex ${responsive ? 'flex-col sm:flex-row' : 'flex-row'} gap-4">
    <Input 
      type="search" 
      placeholder="Search..." 
      bind:value={searchQuery}
      class="${responsive ? 'w-full sm:max-w-xs' : 'max-w-xs'}"
    />
    <Select bind:value={statusFilter}>
      <SelectTrigger class="${responsive ? 'w-full sm:w-48' : 'w-48'}">
        <SelectValue placeholder="Filter by status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Statuses</SelectItem>
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="pending">Pending</SelectItem>
        <SelectItem value="inactive">Inactive</SelectItem>
      </SelectContent>
    </Select>
    <Button class="${responsive ? 'w-full sm:w-auto' : ''}">
      Add New
    </Button>
  </div>
  
  <div class="${responsive ? 'overflow-x-auto' : ''}">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
          <TableHead class="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each filteredData() as item}
          <TableRow>
            <TableCell>{item.name}</TableCell>
            <TableCell>
              <Badge variant={item.status === 'active' ? 'default' : item.status === 'pending' ? 'secondary' : 'outline'}>
                {item.status}
              </Badge>
            </TableCell>
            <TableCell>{item.date}</TableCell>
            <TableCell class="text-right">
              <Button variant="ghost" size="sm">Edit</Button>
              <Button variant="ghost" size="sm">Delete</Button>
            </TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  </div>
</div>`;
        }
    };
    
    const generator = patterns[pattern];
    if (!generator) {
        throw new Error(`Unknown UI pattern: ${pattern}. Available patterns: ${Object.keys(patterns).join(', ')}`);
    }
    
    return await generator();
}

/**
 * Generate import statements for components
 * @param components Array of component names
 * @returns Import statements string
 */
async function generateImports(components: string[]): Promise<string> {
    const imports: string[] = [];
    
    for (const component of components) {
        const metadata = await registry.getComponent(component);
        if (metadata && metadata.files.length > 0) {
            // Extract component exports from index.ts file if available
            const indexFile = metadata.files.find(f => f.path.endsWith('index.ts'));
            if (indexFile && indexFile.content) {
                // Parse exports from index.ts
                const exportMatches = indexFile.content.matchAll(/export\s*{\s*([^}]+)\s*}/g);
                for (const match of exportMatches) {
                    const exports = match[1].split(',').map(e => e.trim()).filter(Boolean);
                    if (exports.length > 0) {
                        imports.push(`  import { ${exports.join(', ')} } from "$lib/components/ui/${component}";`);
                    }
                }
            } else {
                // Fallback to Pascal case import
                const pascalCase = component.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
                imports.push(`  import { ${pascalCase} } from "$lib/components/ui/${component}";`);
            }
        }
    }
    
    return imports.join('\n');
}

/**
 * Scaffold a new component following shadcn patterns
 * @param config Component configuration
 * @returns Scaffolded component code
 */
async function scaffoldComponent(config: {
    name: string;
    type: 'primitive' | 'composite' | 'layout';
    baseComponent?: string;
    variants?: string[];
    props?: Array<{ name: string; type: string; required?: boolean; default?: string }>;
}): Promise<string> {
    const { name, type, baseComponent, variants = ['default'], props = [] } = config;
    const pascalCase = name.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
    
    let imports = `  import { type HTMLAttributes } from 'svelte/elements';\n  import { cn } from '$lib/utils';\n`;
    let baseImports = '';
    
    if (baseComponent) {
        const baseMeta = await registry.getComponent(baseComponent);
        if (baseMeta) {
            const indexFile = baseMeta.files.find(f => f.path.endsWith('index.ts'));
            if (indexFile && indexFile.content) {
                const exportMatches = indexFile.content.matchAll(/export\s*{\s*([^}]+)\s*}/g);
                for (const match of exportMatches) {
                    const exports = match[1].split(',').map(e => e.trim()).filter(Boolean);
                    if (exports.length > 0) {
                        baseImports = `  import { ${exports.join(', ')} } from '$lib/components/ui/${baseComponent}';\n`;
                    }
                }
            }
        }
    }
    
    // Build props type
    const propsType = props.map(p => {
        const typeStr = p.required ? p.type : `${p.type} | undefined`;
        const defaultStr = p.default ? ` = ${p.default}` : '';
        return `    ${p.name}${p.required ? '' : '?'}: ${typeStr};`;
    }).join('\n');
    
    // Build variants object if specified
    const variantsObj = variants.length > 1 ? `
  const variants = {
${variants.map(v => `    ${v}: '${getVariantClasses(v, type)}'`).join(',\n')}
  };` : '';
    
    return `<script lang="ts">
${imports}${baseImports}
  
  type Props = {
${propsType}
    variant?: ${variants.map(v => `'${v}'`).join(' | ')};
    class?: string;
  } & HTMLAttributes<HTMLDivElement>;
  
  let {
${props.map(p => `    ${p.name}${p.default ? ` = ${p.default}` : ''}`).join(',\n')},
    variant = 'default',
    class: className,
    ...restProps
  }: Props = $props();
${variantsObj}
</script>

${generateComponentTemplate(name, type, baseComponent, variants.length > 1)}

<style>
  /* Add any component-specific styles here */
</style>`;
}

/**
 * Get variant classes based on variant name and component type
 */
function getVariantClasses(variant: string, type: string): string {
    const baseClasses: Record<string, string> = {
        primitive: 'inline-flex items-center justify-center',
        composite: 'flex flex-col gap-4',
        layout: 'relative w-full'
    };
    
    const variantClasses: Record<string, string> = {
        default: '',
        outline: 'border border-input bg-background',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground'
    };
    
    return `${baseClasses[type] || ''} ${variantClasses[variant] || ''}`.trim();
}

/**
 * Generate component template based on type
 */
function generateComponentTemplate(name: string, type: string, baseComponent?: string, hasVariants: boolean = false): string {
    const variantClass = hasVariants ? '{variants[variant]}' : '';
    
    switch (type) {
        case 'primitive':
            return baseComponent ? 
`<${baseComponent} class={cn(${variantClass ? `${variantClass}, ` : ''}className)} {...restProps}>
  <slot />
</${baseComponent}>` :
`<div class={cn("${getVariantClasses('default', type)}", ${variantClass ? `${variantClass}, ` : ''}className)} {...restProps}>
  <slot />
</div>`;
            
        case 'composite':
            return `<div class={cn("${getVariantClasses('default', type)}", ${variantClass ? `${variantClass}, ` : ''}className)} {...restProps}>
  <slot name="header" />
  <div class="flex-1">
    <slot />
  </div>
  <slot name="footer" />
</div>`;
            
        case 'layout':
            return `<div class={cn("${getVariantClasses('default', type)}", ${variantClass ? `${variantClass}, ` : ''}className)} {...restProps}>
  <slot name="sidebar" />
  <main class="flex-1">
    <slot />
  </main>
  <slot name="aside" />
</div>`;
            
        default:
            return `<div class={cn(${variantClass ? `${variantClass}, ` : ''}className)} {...restProps}>
  <slot />
</div>`;
    }
}

export const axios = {
    githubRaw,
    githubApi,
    buildDirectoryTree: buildDirectoryTreeWithFallback, // Use fallback version by default
    buildDirectoryTreeWithFallback,
    getComponentSource,
    getComponentDemo,
    getAvailableComponents,
    getComponentMetadata,
    getBlockCode, // Kept for compatibility - returns error message
    getAvailableBlocks, // Kept for compatibility - returns error message
    setGitHubApiKey,
    getGitHubRateLimit,
    generateUIPattern,
    scaffoldComponent,
    // Registry functions (new)
    registry,
    // Path constants for easy access
    paths: {
        REPO_OWNER,
        REPO_NAME,
        REPO_BRANCH
    }
}