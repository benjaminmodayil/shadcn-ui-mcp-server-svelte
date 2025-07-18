# Migration Guide: Adapting the Shadcn MCP Server for Svelte

This guide provides step-by-step instructions for modifying the existing `shadcn-ui-mcp-server` to work with shadcn-svelte (https://github.com/huntabyte/shadcn-svelte). The goal is to change the data source from the official React repository to the Svelte port's repository and update all React-specific logic and text to their Svelte equivalents.

The Svelte port's repository is `github.com/huntabyte/shadcn-svelte` and its CLI is `shadcn-svelte`.

## Step 1: Update the Core Data Source (`src/utils/axios.ts`)

This is the most critical file. It contains all hardcoded paths to the official `shadcn/ui` GitHub repository.

### 1. Change Repository Constants

Update the repository owner, name, and branch to match the Svelte port.

```typescript
// File: src/utils/axios.ts

// --- BEFORE ---
const REPO_OWNER = 'shadcn-ui';
const REPO_NAME = 'ui';
const REPO_BRANCH = 'main';
const V4_BASE_PATH = 'apps/v4';
const REGISTRY_PATH = `${V4_BASE_PATH}/registry`;
const NEW_YORK_V4_PATH = `${REGISTRY_PATH}/new-york-v4`;

// --- AFTER ---
const REPO_OWNER = 'huntabyte';
const REPO_NAME = 'shadcn-svelte';
const REPO_BRANCH = 'main';

// Note: shadcn-svelte uses a different architecture
// Components are fetched via registry API, not directly from GitHub
// The registry schemas are defined in packages/registry/src/schemas.ts
const REGISTRY_PACKAGE_PATH = 'packages/registry/src';

// Remove all the old v4 paths - they don't apply to shadcn-svelte
// Components in shadcn-svelte are installed to user's project at:
// $lib/components/ui/[component-name]
```

### 2. Major Architecture Change: Registry-Based System

**IMPORTANT**: shadcn-svelte uses a completely different architecture than the React version. Instead of fetching component files directly from GitHub, it uses a registry API system.

#### Understanding the New Architecture

```typescript
// shadcn-svelte doesn't fetch components directly from GitHub paths
// Instead, it uses a registry system where components are defined as:
// 1. Registry items with metadata (name, dependencies, files)
// 2. Components can have multiple .svelte files
// 3. Each component may include an index.ts for exports

// Example: Accordion component structure
// - accordion.svelte
// - accordion-content.svelte
// - accordion-item.svelte
// - accordion-trigger.svelte
// - index.ts (exports all parts)
```

#### Rewrite `getComponentSource()` for Registry System

```typescript
// File: src/utils/axios.ts

// --- BEFORE ---
async function getComponentSource(componentName: string): Promise<string> {
  const componentPath = `${NEW_YORK_V4_PATH}/ui/${componentName.toLowerCase()}.tsx`;
  // ...
}

// --- AFTER ---
// This function needs a complete rewrite to work with the registry API
// The registry provides JSON metadata about components, not direct file access
async function getComponentSource(componentName: string): Promise<string> {
  // shadcn-svelte uses a registry API endpoint
  // You'll need to fetch from the registry API or implement a local registry
  // Components are multi-file, so this needs to handle multiple .svelte files
  
  // Possible approach:
  // 1. Fetch component metadata from registry
  // 2. Extract all .svelte files for the component
  // 3. Combine them into a single response or handle multi-file structure
}
```

#### Rewrite `getComponentDemo()`

```typescript
// File: src/utils/axios.ts

// --- BEFORE ---
async function getComponentDemo(componentName: string): Promise<string> {
  const demoPath = `${NEW_YORK_V4_PATH}/examples/${componentName.toLowerCase()}-demo.tsx`;
  // ...
}

// --- AFTER ---
async function getComponentDemo(componentName: string): Promise<string> {
  // shadcn-svelte demos are typically in the docs site, not the main repo
  // You may need to fetch from the documentation site or registry
  // Consider if demos are even needed for the MCP server functionality
}
```

#### Rewrite `getAvailableComponents()`

```typescript
// File: src/utils/axios.ts

// --- BEFORE ---
async function getAvailableComponents(): Promise<string[]> {
    try {
        const response = await githubApi.get(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${NEW_YORK_V4_PATH}/ui`);
        return response.data
            .filter((item: any) => item.type === 'file' && item.name.endsWith('.tsx'))
            .map((item: any) => item.name.replace('.tsx', ''));
    } // ...
}

// --- AFTER ---
async function getAvailableComponents(): Promise<string[]> {
    // This needs a complete rewrite - shadcn-svelte uses a registry system
    // Options:
    // 1. Fetch the registry metadata and extract component names
    // 2. Use a hardcoded list that matches the shadcn-svelte registry
    // 3. Query the shadcn-svelte API if one exists
    
    // For now, you might need to maintain a static list of available components
    // that matches what's available in shadcn-svelte
}
```

### 3. Rewrite Metadata and Code Analysis Functions

The functions that parse code (`getComponentMetadata`, `extractDependencies`, `extractComponentUsage`) were built for React/TSX and will likely fail or give incorrect results for Svelte.

#### `getComponentMetadata` - Complete Rewrite Required

```typescript
// shadcn-svelte uses a registry system with JSON metadata
// The metadata includes:
// - Component name, type, and description
// - Dependencies (npm packages and other components)
// - Multiple files per component (.svelte files + index.ts)
// - Installation target paths

// You'll need to implement a new approach that works with the registry API
```

#### `extractDependencies` - Svelte-Specific Updates

```typescript
// Svelte import patterns to handle:
// - import { Button } from '$lib/components/ui/button'
// - import * as Accordion from '$lib/components/ui/accordion'
// - Standard npm imports remain the same

// Update regex patterns to handle:
// 1. $lib/ aliases (SvelteKit convention)
// 2. Multi-file component imports (import * as)
// 3. .svelte file extensions in some cases
```

#### `extractComponentUsage` - Svelte Template Syntax

```typescript
// Svelte component usage differs from React:
// - Components use PascalCase like React: <Button>
// - But Svelte also has special syntax:
//   - {#if} {/if} blocks
//   - {#each} {/each} blocks
//   - bind: directives
//   - on: event handlers (Svelte 4) or onclick handlers (Svelte 5)
//   - use: directives

// The basic regex (<([A-Z]\\w+)) will catch components but miss Svelte-specific patterns
```

## Step 2: Update AI Prompts for Svelte (`src/prompts.ts`)

This file's text content guides the AI. It must be updated to use Svelte terminology.

**Key replacements:**

- "React" -> "Svelte 5" or "SvelteKit"
- "React hooks" -> "Svelte 5 runes" (e.g., `$state`, `$derived`, `$effect`)
- "useState" -> "$state"
- "useEffect" -> "$effect"
- "Next.js, Vite, Remix" -> "SvelteKit"
- `react-hook-form` -> Svelte form libraries like `sveltekit-superforms`, `felte`, or `svelte-forms-lib`
- "JSX" -> "Svelte template syntax"
- "props" -> "props using Svelte 5 syntax" (no more `export let`)
- Component events: `on:click` -> `onclick` (Svelte 5 syntax)

#### Example in `build-shadcn-page` prompt:

```typescript
// File: src/prompts.ts

// --- BEFORE ---
/*
2. Build the page following these principles:
   - Use shadcn/ui v4 components and blocks as building blocks
   - Ensure responsive design with Tailwind CSS classes
   - Implement proper TypeScript types
   - Follow React best practices and hooks patterns
*/

// --- AFTER ---
/*
2. Build the page following these principles:
   - Use shadcn-svelte components as building blocks
   - Ensure responsive design with Tailwind CSS classes
   - Implement proper TypeScript types
   - Follow Svelte 5 best practices:
     * Use runes ($state, $derived, $effect) for reactivity
     * Props without 'export let' syntax
     * Event handlers use onclick not on:click
     * Components import from '$lib/components/ui/'
*/
```

**Additional prompt updates needed:**
- Replace "className" with "class" (Svelte uses standard HTML attributes)
- Update import statements to use `$lib/` aliases
- Remove React-specific patterns like "forwardRef", "displayName"
- Add Svelte-specific patterns like slots, snippets (Svelte 5)

## Step 3: Update Resource Templates (`src/resource-templates.ts`)

The installation guides and commands are framework-specific.

### 1. In `get_install_script_for_component`

The CLI command uses `shadcn-svelte` instead of `shadcn`.

```typescript
// File: src/resource-templates.ts

// --- BEFORE ---
case 'npm':
  installCommand = `npx shadcn@latest add ${component}`;
  break;
case 'pnpm':
  installCommand = `pnpm dlx shadcn@latest add ${component}`;
  break;
case 'bun':
  installCommand = `bunx shadcn@latest add ${component}`;
  break;

// --- AFTER ---
case 'npm':
  installCommand = `npx shadcn-svelte@latest add ${component}`;
  break;
case 'pnpm':
  installCommand = `pnpm dlx shadcn-svelte@latest add ${component}`;
  break;
case 'bun':
  installCommand = `bunx shadcn-svelte@latest add ${component}`;
  break;
```

### 2. In `get_installation_guide`

Replace all framework guides with SvelteKit installation process.

```typescript
// File: src/resource-templates.ts

// --- BEFORE ---
// Contains guides for: next, vite, remix, gatsby, astro, laravel, nuxt

// --- AFTER ---
// Replace ALL guides with a single SvelteKit guide:
const guides = {
  sveltekit: {
    description: "Installation guide for SvelteKit project",
    steps: [
      "Create a new SvelteKit project:",
      `${packageManager === 'npm' ? 'npm' : packageManager} create svelte@latest my-app`,
      "",
      "Navigate to your project:",
      "cd my-app",
      "",
      "Install dependencies:",
      `${packageManager === 'npm' ? 'npm install' : packageManager + ' install'}`,
      "",
      "Set up shadcn-svelte:",
      `${packageManager === 'npm' ? 'npx' : packageManager + ' dlx'} shadcn-svelte@latest init`,
      "",
      "You can now add components:",
      `${packageManager === 'npm' ? 'npx' : packageManager + ' dlx'} shadcn-svelte@latest add button`,
      "",
      "Note: shadcn-svelte requires Svelte 5 and SvelteKit"
    ]
  }
};

// Update the default framework to 'sveltekit' instead of 'next'
```

## Step 4: Update Static Resources (`src/resources.ts`)

The `get_components` resource contains a hardcoded list of React components. This should be updated.

```typescript
// File: src/resources.ts

// --- BEFORE ---
const getComponentsList = async () => {
    const components = [
      "accordion",
      "alert",
      "alert-dialog",
      // ... hardcoded React component list
    ];
    //...
};

// --- AFTER ---
const getComponentsList = async () => {
    // Updated list of shadcn-svelte components
    const components = [
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
    
    return {
      content: JSON.stringify(components.sort(), null, 2),
      contentType: 'application/json',
    };
};

// Note: Consider implementing a dynamic fetch from the registry API in the future
```

## Step 5: Update Documentation and Project Files

Update all user-facing documentation and project configuration files to reflect that this is a server for shadcn-svelte.

### `README.md` Updates:
```markdown
# --- BEFORE ---
# shadcn/ui MCP Server

# --- AFTER ---
# shadcn-svelte MCP Server
```

Key changes:
- Replace all references to "shadcn/ui" with "shadcn-svelte"
- Update CLI commands from `npx shadcn@latest` to `npx shadcn-svelte@latest`
- Replace React/Next.js examples with SvelteKit examples
- Update component examples to use Svelte syntax
- Update the repository link to huntabyte/shadcn-svelte

### `package.json` Updates:
```json
{
  "name": "shadcn-svelte-mcp-server",
  "description": "MCP server for integrating shadcn-svelte components with Claude Desktop",
  "keywords": ["mcp", "shadcn-svelte", "svelte", "sveltekit", "components"],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/benjaminmodayil/shadcn-svelte-mcp-server.git"
  }
}
```

### Shell Scripts:
- `examples.sh`: Update example commands to use `shadcn-svelte`
- `test-package.sh`: Update test commands and expected outputs

### Additional Files to Update/Remove:
- Remove `V4_MIGRATION_SUMMARY.md` (React-specific)
- Create `SVELTE_ADAPTATION.md` documenting the changes made
- Update any TypeScript configs to support Svelte file imports

---

## Migration Checklist

### Core Architecture Changes:
- [ ] **Understand the Registry System**: shadcn-svelte uses a registry API, not direct GitHub file access
- [ ] **Multi-file Components**: Components have multiple .svelte files + index.ts

### `src/utils/axios.ts` - Major Rewrite Required:
- [ ] Update repository constants: `huntabyte/shadcn-svelte`
- [ ] Remove all v4-specific paths (no direct component file paths)
- [ ] Rewrite `getComponentSource()` to work with registry API
- [ ] Rewrite `getComponentDemo()` or remove if not needed
- [ ] Rewrite `getAvailableComponents()` to use registry or static list
- [ ] Rewrite `getComponentMetadata()` for registry JSON format
- [ ] Update `extractDependencies()` for `$lib/` imports
- [ ] Update `extractComponentUsage()` for Svelte syntax

### `src/prompts.ts`:
- [ ] Replace "React" → "Svelte 5" / "SvelteKit"
- [ ] Replace hooks → runes (`$state`, `$derived`, `$effect`)
- [ ] Update to Svelte 5 event syntax (`onclick` not `on:click`)
- [ ] Replace "className" → "class"
- [ ] Add Svelte-specific patterns (slots, snippets)

### `src/resource-templates.ts`:
- [ ] Update all CLI commands to `shadcn-svelte@latest`
- [ ] Remove all framework guides except SvelteKit
- [ ] Update installation steps for SvelteKit + shadcn-svelte

### `src/resources.ts`:
- [ ] Update component list to match shadcn-svelte (51 components)
- [ ] Consider implementing dynamic fetch from registry

### Documentation:
- [ ] **`README.md`**: Complete rewrite for shadcn-svelte
- [ ] **`package.json`**: Update name, description, keywords, URLs
- [ ] **Shell scripts**: Update all examples and tests
- [ ] Remove `V4_MIGRATION_SUMMARY.md`
- [ ] Create `SVELTE_ADAPTATION.md`

---

## Special Considerations for shadcn-svelte

### 1. Registry Architecture
Unlike the React version which fetches component files directly from GitHub, shadcn-svelte uses a registry API system. This is a fundamental architectural difference that requires:
- Complete rewrite of data fetching logic
- New approach to component metadata
- Handling of multi-file components

### 2. Svelte 5 (Runes) Syntax
shadcn-svelte requires Svelte 5, which uses the new runes syntax:
- `$state` instead of `let` for reactive variables
- `$derived` for computed values
- `$effect` for side effects
- Props are defined differently (no `export let`)
- Event handlers use `onclick` not `on:click`

### 3. Component Structure
Each component in shadcn-svelte typically consists of:
- Multiple `.svelte` files (e.g., accordion has 4 files)
- An `index.ts` file that exports all parts
- Components are installed to `$lib/components/ui/`

### 4. Import Patterns
```typescript
// Single component
import { Button } from '$lib/components/ui/button'

// Multi-part component
import * as Accordion from '$lib/components/ui/accordion'
```

### 5. Styling Differences
- Use `class` instead of `className`
- Tailwind CSS works the same way
- CSS variables and theming might differ

### 6. Form Libraries
Replace React form libraries with Svelte alternatives:
- `formsnap` (official shadcn-svelte form component)
- `sveltekit-superforms`
- `felte`
- `svelte-forms-lib`

### 7. Testing Approach
Consider that the MCP server might need different testing strategies since:
- Component structure is different
- Registry API needs mocking
- Multi-file components need special handling
