/**
 * Beddel 2.6 - Type Definitions
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
