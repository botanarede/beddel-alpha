/**
 * Shared Agent Types - Safe for client and server
 * These types contain no sensitive data and can be used in both environments
 */

/**
 * Agent metadata - safe for client display
 */
export interface AgentMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  route: string;
  tags?: string[];
}

/**
 * Generic agent response wrapper
 */
export interface AgentResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
}

/**
 * Execution step tracking for workflow visualization
 */
export interface ExecutionStep {
  agent: string;
  action: string;
  status: 'running' | 'success' | 'error';
  startTime: number;
  endTime?: number;
  duration?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  description?: string;
  phase?: 'orchestration' | 'vectorization' | 'storage' | 'retrieval' | 'ingestion' | 'generation';
}

/**
 * Workflow step types supported by the runtime
 *
 * PREFERRED: Use the English step type names (joke, translation, image, vectorize)
 *
 * DEPRECATED: The following legacy names are supported for backward compatibility
 * but will be removed in a future major version:
 * - genkit-joke → use 'joke'
 * - genkit-translation → use 'translation'
 * - genkit-image → use 'image'
 * - gemini-vectorize → use 'vectorize'
 */
export type WorkflowStepType =
  // Preferred step types (use these)
  | 'joke'
  | 'translation'
  | 'image'
  | 'vectorize'
  | 'mcp-tool'
  | 'chromadb'
  | 'gitmcp'
  | 'rag'
  | 'llm'
  | 'chat'
  | 'output-generator'
  | 'builtin-agent'
  | 'custom-action'
  // Legacy step types (deprecated - will be removed in v1.0)
  | 'genkit-joke'
  | 'genkit-translation'
  | 'genkit-image'
  | 'gemini-vectorize';

/**
 * Maps legacy step type names to their preferred equivalents
 * @deprecated Use preferred step type names directly
 */
export const LEGACY_STEP_TYPE_MAP: Record<string, WorkflowStepType> = {
  'genkit-joke': 'joke',
  'genkit-translation': 'translation',
  'genkit-image': 'image',
  'gemini-vectorize': 'vectorize',
};

/**
 * Agent categories for organization
 */
export type AgentCategory =
  | 'utility'
  | 'translation'
  | 'image'
  | 'mcp'
  | 'vectorization'
  | 'storage'
  | 'retrieval'
  | 'orchestration';
