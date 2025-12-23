/**
 * Beddel Protocol - Streaming Pipeline Edition
 * Server Entry Point
 * 
 * This is the main entry point for server-side usage.
 * Contains Node.js dependencies (fs) - DO NOT import in client code.
 * 
 * For client-safe types, use: import type { ... } from 'beddel/client';
 */

// Core (server-only)
export { loadYaml } from './core/parser';
export { WorkflowExecutor } from './core/workflow';
export { resolveVariables } from './core/variable-resolver';

// Primitives registry (for custom handler registration)
export { handlerRegistry, registerPrimitive } from './primitives';

// Tools registry (for custom tool registration)
export { toolRegistry, registerTool } from './tools';
export type { ToolImplementation } from './tools';

// Types (re-exported for convenience, also available via beddel/client)
export type {
    ParsedYaml,
    WorkflowStep,
    StepConfig,
    YamlMetadata,
    ExecutionContext,
    PrimitiveHandler,
} from './types';

