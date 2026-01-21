/**
 * Beddel Protocol - Type Definitions
 * Core interfaces for the workflow engine
 */

import type { StepEvent, ObservabilityConfig } from './observability';

// Re-export observability types
export type {
  ObservabilityConfig,
  StepEventBase,
  StepStartEvent,
  StepCompleteEvent,
  StepErrorEvent,
  StepEvent,
} from './observability';


/**
 * Metadata from YAML header section
 */
export interface YamlMetadata {
    /** Agent display name */
    name: string;
    /** Semantic version (e.g., "1.0.0") */
    version: string;
    /** Optional description of the agent's purpose */
    description?: string;
    /** Whether this is a built-in agent bundled with the package */
    builtin?: boolean;
    /** Observability configuration for trace collection */
    observability?: ObservabilityConfig;
}

/**
 * Standard response shape for blocking workflows.
 * Generic T represents the shape of the 'data' field.
 * 
 * @example
 * ```typescript
 * import type { BeddelResponse } from 'beddel/client';
 * 
 * interface MyData { results: string[] }
 * type MyResponse = BeddelResponse<MyData>;
 * ```
 */
export interface BeddelResponse<T = unknown> {
    /** Whether the workflow executed successfully */
    success: boolean;
    /** Response data (shape defined by workflow's return template) */
    data?: T;
    /** Execution trace (only present when observability is enabled) */
    __trace?: StepEvent[];
    /** Error message (only present on failure) */
    error?: string;
}

/**
 * Configuration for a workflow step
 * Contents vary by step type (llm, output-generator, call-agent)
 */
export interface StepConfig {
    [key: string]: unknown;
}

/**
 * Individual workflow step definition
 */
export interface WorkflowStep {
    /** Unique identifier for this step */
    id: string;
    /** Step type: 'llm' | 'output-generator' | 'call-agent' */
    type: string;
    /** Step-specific configuration */
    config: StepConfig;
    /** Optional variable name to store step result */
    result?: string;
}

/**
 * Complete parsed YAML document structure
 */
export interface ParsedYaml {
    metadata: YamlMetadata;
    workflow: WorkflowStep[];
    /** Optional explicit return template for API response shaping */
    return?: unknown;
}

/**
 * Execution context passed to primitive handlers
 * Holds input data and accumulated step results
 */
export interface ExecutionContext {
    /** Original input passed to WorkflowExecutor.execute() */
    input: unknown;
    /** Map of step results keyed by step.result name */
    variables: Map<string, unknown>;
    /** Trace array for observability (only present when enabled) */
    trace?: StepEvent[];
}

/**
 * Contract for primitive handlers (llm, output-generator, call-agent)
 * Handlers may return Response (streaming) or Record (data for next step)
 */
export type PrimitiveHandler = (
    config: StepConfig,
    context: ExecutionContext
) => Promise<Response | Record<string, unknown>>;
