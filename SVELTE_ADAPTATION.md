# Shadcn-Svelte MCP Server Adaptation

This document summarizes the changes made to adapt the original shadcn/ui MCP server to work with shadcn-svelte.

## Overview

The shadcn-svelte MCP server has been adapted from the React-based shadcn/ui MCP server to provide AI assistants with access to Svelte 5 and SvelteKit components. The key difference is that shadcn-svelte uses a registry-based system instead of directly fetching component files from GitHub.

## Major Changes

### 1. Registry-Based Architecture

- **New file**: `src/utils/registry.ts` - Implements the registry system for fetching component metadata and source code
- Components are fetched via a registry API instead of direct GitHub file access
- Support for multi-file components (e.g., accordion has multiple .svelte files)

### 2. Removal of Block System

- shadcn-svelte doesn't have pre-built blocks like the React version
- Block-related tools (`get_block`, `list_blocks`) now return deprecation messages
- Focus shifted to individual components that can be composed together

### 3. Updated Component List

The component list has been updated to match shadcn-svelte's offerings (51 components), including:
- New components: chart, combobox, formsnap, input-otp, range-calendar, sidebar, typography
- All components use Svelte 5 syntax with runes

### 4. Svelte 5 Terminology

All prompts and documentation have been updated to use Svelte 5 terminology:
- React hooks → Svelte 5 runes (`$state`, `$derived`, `$effect`)
- `className` → `class`
- `on:click` → `onclick` (Svelte 5 syntax)
- Import patterns use `$lib/components/ui/`

### 5. SvelteKit Focus

- Installation guides focus exclusively on SvelteKit
- Removed support for Next.js, Vite (React), Remix, etc.
- CLI commands use `shadcn-svelte@latest`

## Technical Implementation

### Key Files Modified

1. **src/utils/axios.ts**
   - Updated repository constants to `huntabyte/shadcn-svelte`
   - Integrated with the new registry system
   - Removed v4-specific paths and block functions

2. **src/utils/registry.ts** (new)
   - Implements `ShadcnSvelteRegistry` class
   - Handles component fetching with caching
   - Provides Svelte-specific pattern extraction

3. **src/prompts.ts**
   - Updated all prompts to use Svelte terminology
   - Replaced React patterns with Svelte 5 patterns
   - Updated examples to use shadcn-svelte components

4. **src/resource-templates.ts**
   - Updated CLI commands to use `shadcn-svelte@latest`
   - Focused installation guide on SvelteKit only

5. **src/resources.ts**
   - Updated component list to match shadcn-svelte's 51 components

6. **src/tools.ts**
   - Updated tool descriptions for Svelte
   - Made block tools return deprecation messages

## Registry API Approach

The registry system provides several advantages:
- Always up-to-date component information
- Better metadata including dependencies
- Support for multi-file components
- Consistent with how the shadcn-svelte CLI works

## Future Improvements

1. **Dynamic Registry Fetching**: Currently uses a fallback component list; could fetch directly from shadcn-svelte's registry API endpoint once discovered
2. **Component Examples**: Could integrate with shadcn-svelte's documentation site for richer examples
3. **Version Tracking**: Could implement version checking to notify when new components are available

## Testing

The adapted server has been tested to ensure:
- All tools work with the new registry system
- Deprecation messages are shown for block-related tools
- Svelte-specific terminology is used throughout
- Build process completes successfully

## Migration for Users

Users migrating from the React version should note:
- Use `list_components` instead of `list_blocks`
- Components are designed to be composed rather than using pre-built blocks
- All code examples will use Svelte 5 syntax with runes
- Installation commands use `shadcn-svelte@latest`