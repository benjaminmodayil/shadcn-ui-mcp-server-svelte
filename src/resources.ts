/**
 * Resources implementation for the Model Context Protocol (MCP) server.
 * 
 * This file defines the resources that can be returned by the server based on client requests.
 * Resources are static content or dynamically generated content referenced by URIs.
 */

/**
 * Resource definitions exported to the MCP handler
 * Each resource has a name, description, uri and contentType
 */
export const resources = [
  {
    name: 'get_components',
    description: 'List of available shadcn-svelte components that can be used in the project',
    uri: 'resource:get_components',
    contentType: 'text/plain',
  }
];

/**
 * Handler for the get_components resource
 * @returns List of available shadcn-svelte components
 */
const getComponentsList = async () => {
  try {
    // List of available components in shadcn-svelte
    // This list matches the components available at https://shadcn-svelte.com/docs/components
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
      content: JSON.stringify(components, null, 2),
      contentType: 'application/json',
    };
  } catch (error) {
    console.error("Error fetching components list:", error);
    return {
      content: JSON.stringify({
        error: "Failed to fetch components list",
        message: error instanceof Error ? error.message : String(error)
      }, null, 2),
      contentType: 'application/json',
    };
  }
};

/**
 * Map of resource URIs to their handler functions
 * Each handler function returns the resource content when requested
 */
export const resourceHandlers = {
  'resource:get_components': getComponentsList,
};