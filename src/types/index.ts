/**
 * Beddel Protocol - Type Definitions
 * Core interfaces for the workflow engine
 */

/**
 * Metadata from YAML header section
 */
export interface YamlMetadata {
    name: string;
    version: string;
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
}

/**
 * Contract for primitive handlers (llm, output-generator, call-agent)
 * Handlers may return Response (streaming) or Record (data for next step)
 */
export type PrimitiveHandler = (
    config: StepConfig,
    context: ExecutionContext
) => Promise<Response | Record<string, unknown>>;
