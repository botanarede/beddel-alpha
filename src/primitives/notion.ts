/**
 * Beddel Protocol - Notion Primitive
 * 
 * Integrates with Notion API to manage pages, databases, blocks, and search.
 * Uses internal integration tokens for authentication.
 * 
 * Server-only: Uses fetch which requires Node.js.
 * 
 * Supported Actions:
 * - search: Search pages and databases
 * - getPage: Retrieve a page by ID
 * - createPage: Create a new page
 * - updatePage: Update page properties
 * - getDatabase: Retrieve a database schema
 * - queryDatabase: Query database with filters
 * - getBlocks: Get block children of a page/block
 * - appendBlocks: Append blocks to a page/block
 * - createDatabase: Create a new database
 * 
 * @see https://developers.notion.com/reference
 */

import type { StepConfig, ExecutionContext, PrimitiveHandler } from '../types';
import { resolveVariables } from '../core/variable-resolver';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Supported actions for the Notion primitive.
 */
type NotionAction =
    | 'search'
    | 'getPage'
    | 'createPage'
    | 'updatePage'
    | 'getDatabase'
    | 'queryDatabase'
    | 'getBlocks'
    | 'appendBlocks'
    | 'createDatabase';

/**
 * Notion step configuration from YAML.
 */
interface NotionConfig extends StepConfig {
    /** Action to perform */
    action: NotionAction;
    /** Page ID for page operations */
    pageId?: string;
    /** Database ID for database operations */
    databaseId?: string;
    /** Block ID for block operations */
    blockId?: string;
    /** Search query string */
    query?: string;
    /** Filter for search or database query */
    filter?: Record<string, unknown>;
    /** Sort configuration */
    sorts?: Array<Record<string, unknown>>;
    /** Parent for page/database creation */
    parent?: {
        type: 'page_id' | 'database_id' | 'workspace';
        page_id?: string;
        database_id?: string;
    };
    /** Properties for page creation/update */
    properties?: Record<string, unknown>;
    /** Children blocks for page creation or append */
    children?: Array<Record<string, unknown>>;
    /** Icon for page/database */
    icon?: Record<string, unknown>;
    /** Cover for page/database */
    cover?: Record<string, unknown>;
    /** Title for database creation */
    title?: Array<Record<string, unknown>>;
    /** Page size for pagination (default: 100) */
    pageSize?: number;
    /** Start cursor for pagination */
    startCursor?: string;
    /** Block ID to append after */
    after?: string;
}

/**
 * Result from Notion operations.
 */
interface NotionResult {
    success: boolean;
    action: NotionAction;
    data?: unknown;
    error?: string;
    [key: string]: unknown;
}

// ============================================================================
// API Configuration
// ============================================================================

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

/**
 * Get Notion API token from environment.
 */
function getToken(): string {
    const token = process.env.NOTION_TOKEN;
    if (!token) {
        throw new Error(
            '[Beddel Notion] Missing NOTION_TOKEN environment variable. ' +
            'Create an internal integration at https://www.notion.so/profile/integrations'
        );
    }
    return token;
}

// ============================================================================
// API Request Helper
// ============================================================================

/**
 * Make an authenticated request to Notion API.
 */
async function apiRequest<T>(
    endpoint: string,
    options: {
        method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
        body?: unknown;
    } = {}
): Promise<T> {
    const token = getToken();
    const { method = 'GET', body } = options;
    const url = `${NOTION_API_BASE}${endpoint}`;

    const fetchOptions: RequestInit = {
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Notion-Version': NOTION_VERSION,
        },
    };

    if (body) {
        fetchOptions.body = JSON.stringify(body);
    }

    console.log(`[Beddel Notion] ${method} ${endpoint}`);

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { message?: string; code?: string };
        const errorMessage = errorData.message || response.statusText;
        throw new Error(`Notion API error (${response.status}): ${errorMessage}`);
    }

    return response.json() as Promise<T>;
}

// ============================================================================
// Action Implementations
// ============================================================================

/**
 * Search pages and databases.
 */
async function search(config: NotionConfig): Promise<NotionResult> {
    const { query, filter, sorts, pageSize = 100, startCursor } = config;

    try {
        const body: Record<string, unknown> = {};
        if (query) body.query = query;
        if (filter) body.filter = filter;
        if (sorts) body.sort = sorts[0]; // Notion search only supports single sort
        if (pageSize) body.page_size = pageSize;
        if (startCursor) body.start_cursor = startCursor;

        const response = await apiRequest<{
            results: unknown[];
            next_cursor: string | null;
            has_more: boolean;
        }>('/search', { method: 'POST', body });

        return {
            success: true,
            action: 'search',
            data: response,
            results: response.results,
            nextCursor: response.next_cursor,
            hasMore: response.has_more,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, action: 'search', error: message };
    }
}

/**
 * Retrieve a page by ID.
 */
async function getPage(config: NotionConfig): Promise<NotionResult> {
    const { pageId } = config;

    if (!pageId) {
        return { success: false, action: 'getPage', error: 'Missing pageId' };
    }

    try {
        const response = await apiRequest<Record<string, unknown>>(`/pages/${pageId}`);

        return {
            success: true,
            action: 'getPage',
            data: response,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, action: 'getPage', error: message };
    }
}

/**
 * Create a new page.
 */
async function createPage(config: NotionConfig): Promise<NotionResult> {
    const { parent, properties, children, icon, cover } = config;

    if (!parent || !properties) {
        return { success: false, action: 'createPage', error: 'Missing parent or properties' };
    }

    try {
        const body: Record<string, unknown> = { parent, properties };
        if (children) body.children = children;
        if (icon) body.icon = icon;
        if (cover) body.cover = cover;

        const response = await apiRequest<Record<string, unknown>>('/pages', {
            method: 'POST',
            body,
        });

        return {
            success: true,
            action: 'createPage',
            data: response,
            pageId: response.id,
            url: response.url,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, action: 'createPage', error: message };
    }
}

/**
 * Update page properties.
 */
async function updatePage(config: NotionConfig): Promise<NotionResult> {
    const { pageId, properties, icon, cover } = config;

    if (!pageId) {
        return { success: false, action: 'updatePage', error: 'Missing pageId' };
    }

    try {
        const body: Record<string, unknown> = {};
        if (properties) body.properties = properties;
        if (icon) body.icon = icon;
        if (cover) body.cover = cover;

        const response = await apiRequest<Record<string, unknown>>(`/pages/${pageId}`, {
            method: 'PATCH',
            body,
        });

        return {
            success: true,
            action: 'updatePage',
            data: response,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, action: 'updatePage', error: message };
    }
}

/**
 * Retrieve a database schema.
 */
async function getDatabase(config: NotionConfig): Promise<NotionResult> {
    const { databaseId } = config;

    if (!databaseId) {
        return { success: false, action: 'getDatabase', error: 'Missing databaseId' };
    }

    try {
        const response = await apiRequest<Record<string, unknown>>(`/databases/${databaseId}`);

        return {
            success: true,
            action: 'getDatabase',
            data: response,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, action: 'getDatabase', error: message };
    }
}

/**
 * Query a database with filters and sorts.
 */
async function queryDatabase(config: NotionConfig): Promise<NotionResult> {
    const { databaseId, filter, sorts, pageSize = 100, startCursor } = config;

    if (!databaseId) {
        return { success: false, action: 'queryDatabase', error: 'Missing databaseId' };
    }

    try {
        const body: Record<string, unknown> = {};
        if (filter) body.filter = filter;
        if (sorts) body.sorts = sorts;
        if (pageSize) body.page_size = pageSize;
        if (startCursor) body.start_cursor = startCursor;

        const response = await apiRequest<{
            results: unknown[];
            next_cursor: string | null;
            has_more: boolean;
        }>(`/databases/${databaseId}/query`, { method: 'POST', body });

        return {
            success: true,
            action: 'queryDatabase',
            data: response,
            results: response.results,
            nextCursor: response.next_cursor,
            hasMore: response.has_more,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, action: 'queryDatabase', error: message };
    }
}

/**
 * Get block children of a page or block.
 */
async function getBlocks(config: NotionConfig): Promise<NotionResult> {
    const { blockId, pageId, pageSize = 100, startCursor } = config;
    const targetId = blockId || pageId;

    if (!targetId) {
        return { success: false, action: 'getBlocks', error: 'Missing blockId or pageId' };
    }

    try {
        const params = new URLSearchParams();
        if (pageSize) params.set('page_size', String(pageSize));
        if (startCursor) params.set('start_cursor', startCursor);

        const endpoint = `/blocks/${targetId}/children?${params}`;
        const response = await apiRequest<{
            results: unknown[];
            next_cursor: string | null;
            has_more: boolean;
        }>(endpoint);

        return {
            success: true,
            action: 'getBlocks',
            data: response,
            blocks: response.results,
            nextCursor: response.next_cursor,
            hasMore: response.has_more,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, action: 'getBlocks', error: message };
    }
}

/**
 * Append blocks to a page or block.
 */
async function appendBlocks(config: NotionConfig): Promise<NotionResult> {
    const { blockId, pageId, children, after } = config;
    const targetId = blockId || pageId;

    if (!targetId || !children || children.length === 0) {
        return { success: false, action: 'appendBlocks', error: 'Missing blockId/pageId or children' };
    }

    try {
        let endpoint = `/blocks/${targetId}/children`;
        if (after) {
            endpoint += `?after=${after}`;
        }

        const response = await apiRequest<{
            results: unknown[];
        }>(endpoint, {
            method: 'PATCH',
            body: { children },
        });

        return {
            success: true,
            action: 'appendBlocks',
            data: response,
            blocks: response.results,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, action: 'appendBlocks', error: message };
    }
}

/**
 * Create a new database.
 */
async function createDatabase(config: NotionConfig): Promise<NotionResult> {
    const { parent, title, properties, icon, cover } = config;

    if (!parent || !properties) {
        return { success: false, action: 'createDatabase', error: 'Missing parent or properties' };
    }

    try {
        const body: Record<string, unknown> = { parent, properties };
        if (title) body.title = title;
        if (icon) body.icon = icon;
        if (cover) body.cover = cover;

        const response = await apiRequest<Record<string, unknown>>('/databases', {
            method: 'POST',
            body,
        });

        return {
            success: true,
            action: 'createDatabase',
            data: response,
            databaseId: response.id,
            url: response.url,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, action: 'createDatabase', error: message };
    }
}

// ============================================================================
// Main Primitive Handler
// ============================================================================

/**
 * Notion Primitive Handler
 * 
 * Executes Notion API operations based on the action specified.
 * Supports pages, databases, blocks, and search.
 * 
 * @param config - Step configuration from YAML
 * @param context - Execution context with input and variables
 * @returns NotionResult with success status and data or error
 */
export const notionPrimitive: PrimitiveHandler = async (
    config: StepConfig,
    context: ExecutionContext
): Promise<Record<string, unknown>> => {
    const notionConfig = config as NotionConfig;

    // Resolve variables in config
    const resolvedConfig: NotionConfig = {
        ...notionConfig,
        action: notionConfig.action,
        pageId: notionConfig.pageId 
            ? resolveVariables(notionConfig.pageId, context) as string 
            : undefined,
        databaseId: notionConfig.databaseId 
            ? resolveVariables(notionConfig.databaseId, context) as string 
            : undefined,
        blockId: notionConfig.blockId 
            ? resolveVariables(notionConfig.blockId, context) as string 
            : undefined,
        query: notionConfig.query 
            ? resolveVariables(notionConfig.query, context) as string 
            : undefined,
        filter: notionConfig.filter 
            ? resolveVariables(notionConfig.filter, context) as Record<string, unknown> 
            : undefined,
        sorts: notionConfig.sorts 
            ? resolveVariables(notionConfig.sorts, context) as Array<Record<string, unknown>> 
            : undefined,
        parent: notionConfig.parent 
            ? resolveVariables(notionConfig.parent, context) as NotionConfig['parent'] 
            : undefined,
        properties: notionConfig.properties 
            ? resolveVariables(notionConfig.properties, context) as Record<string, unknown> 
            : undefined,
        children: notionConfig.children 
            ? resolveVariables(notionConfig.children, context) as Array<Record<string, unknown>> 
            : undefined,
        icon: notionConfig.icon 
            ? resolveVariables(notionConfig.icon, context) as Record<string, unknown> 
            : undefined,
        cover: notionConfig.cover 
            ? resolveVariables(notionConfig.cover, context) as Record<string, unknown> 
            : undefined,
        title: notionConfig.title 
            ? resolveVariables(notionConfig.title, context) as Array<Record<string, unknown>> 
            : undefined,
        pageSize: notionConfig.pageSize,
        startCursor: notionConfig.startCursor 
            ? resolveVariables(notionConfig.startCursor, context) as string 
            : undefined,
        after: notionConfig.after 
            ? resolveVariables(notionConfig.after, context) as string 
            : undefined,
    };

    // Validate action
    if (!resolvedConfig.action) {
        return { success: false, error: 'Missing required config: action' };
    }

    console.log(`[Beddel Notion] Executing action: ${resolvedConfig.action}`);

    // Route to appropriate action handler
    switch (resolvedConfig.action) {
        case 'search':
            return search(resolvedConfig);

        case 'getPage':
            return getPage(resolvedConfig);

        case 'createPage':
            return createPage(resolvedConfig);

        case 'updatePage':
            return updatePage(resolvedConfig);

        case 'getDatabase':
            return getDatabase(resolvedConfig);

        case 'queryDatabase':
            return queryDatabase(resolvedConfig);

        case 'getBlocks':
            return getBlocks(resolvedConfig);

        case 'appendBlocks':
            return appendBlocks(resolvedConfig);

        case 'createDatabase':
            return createDatabase(resolvedConfig);

        default:
            return {
                success: false,
                error: `Unknown action: ${resolvedConfig.action}. ` +
                    'Supported: search, getPage, createPage, updatePage, getDatabase, queryDatabase, getBlocks, appendBlocks, createDatabase',
            };
    }
};
