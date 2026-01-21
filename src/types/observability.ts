/**
 * Beddel Protocol - Observability Type Definitions
 * Types for workflow execution tracing and step lifecycle events
 */

/**
 * Simple observability configuration.
 * v1 only supports enabled flag.
 */
export interface ObservabilityConfig {
  /** Enable/disable observability (default: false) */
  enabled: boolean;
}

/**
 * Base fields for all step events.
 * SECURITY: Contains ONLY structural metadata, never step results.
 */
export interface StepEventBase {
  /** Event type discriminator */
  type: 'step-start' | 'step-complete' | 'step-error';
  /** Unique identifier of the workflow step */
  stepId: string;
  /** Primitive type of the step (e.g., 'chat', 'llm', 'mcp-tool') */
  stepType: string;
  /** Zero-based index of the step in the workflow */
  stepIndex: number;
  /** Total number of steps in the workflow */
  totalSteps: number;
  /** Unix timestamp (milliseconds) when the event was emitted */
  timestamp: number;
}

/**
 * Event emitted when a workflow step begins execution
 */
export interface StepStartEvent extends StepEventBase {
  type: 'step-start';
}

/**
 * Event emitted when a workflow step completes successfully
 */
export interface StepCompleteEvent extends StepEventBase {
  type: 'step-complete';
  /** Execution duration in milliseconds */
  duration: number;
}

/**
 * Event emitted when a workflow step throws an error
 */
export interface StepErrorEvent extends StepEventBase {
  type: 'step-error';
  /** Sanitized error type (never exposes full error message) */
  errorType: 'timeout' | 'auth_failed' | 'validation' | 'network' | 'unknown';
  /** Execution duration in milliseconds until failure */
  duration: number;
}

/**
 * Union type for all step events
 */
export type StepEvent = StepStartEvent | StepCompleteEvent | StepErrorEvent;
