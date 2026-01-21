/**
 * Beddel Protocol - Workflow Executor
 * 
 * Sequential pipeline executor that iterates over workflow steps.
 * 
 * Server-only: Uses primitives that may call external APIs.
 * 
 * CRITICAL BEHAVIOR:
 * - If a handler returns a Response instance (streaming), execution stops
 *   and that Response is returned immediately to the client.
 * - Non-Response results are stored in context.variables for subsequent steps.
 * - If 'return' is defined in YAML, it shapes the final API response.
 * - When observability is enabled, trace events are collected and attached to results.
 */

import type { 
    ParsedYaml, 
    WorkflowStep, 
    ExecutionContext, 
    StepConfig,
    ObservabilityConfig,
    StepEvent,
    StepErrorEvent,
} from '../types';
import { handlerRegistry } from '../primitives';
import { resolveVariables } from './variable-resolver';

export class WorkflowExecutor {
    private steps: WorkflowStep[];
    private returnTemplate?: unknown;
    private observabilityEnabled: boolean;

    /**
     * Create a new WorkflowExecutor from parsed YAML.
     * @param yaml - Parsed YAML document containing workflow steps
     */
    constructor(yaml: ParsedYaml) {
        this.steps = yaml.workflow;
        this.returnTemplate = yaml.return;
        // Type assertion to access observability from metadata
        const metadata = yaml.metadata as { observability?: ObservabilityConfig };
        // FAILSAFE_SCHEMA parses booleans as strings, so check for both
        const enabled = metadata.observability?.enabled as unknown;
        this.observabilityEnabled = enabled === true || enabled === 'true';
    }

    /**
     * Push a trace event to the context (no-op if observability disabled).
     * Errors are caught to prevent trace failures from breaking workflow execution.
     */
    private pushEvent(context: ExecutionContext, event: StepEvent): void {
        if (!context.trace) return;
        try {
            context.trace.push(event);
        } catch (err) {
            console.warn('[Beddel Observability] Failed to push event:', err);
        }
    }

    /**
     * Sanitize error into a safe error type category.
     * SECURITY: Never exposes full error messages, only categorized types.
     */
    private sanitizeErrorType(error: unknown): StepErrorEvent['errorType'] {
        if (error instanceof Error) {
            const msg = error.message.toLowerCase();
            const name = error.name.toLowerCase();
            if (msg.includes('timeout') || name.includes('timeout')) return 'timeout';
            if (msg.includes('auth') || msg.includes('unauthorized')) return 'auth_failed';
            if (msg.includes('valid') || name.includes('validation')) return 'validation';
            if (msg.includes('network') || msg.includes('econnrefused')) return 'network';
        }
        return 'unknown';
    }

    /**
     * Execute the workflow pipeline.
     * 
     * @param input - Input data (e.g., { messages: [...] } for chat)
     * @returns Response if streaming, last step result if no 'result' key, or accumulated variables object
     * 
     * @example
     * ```typescript
     * const executor = new WorkflowExecutor(yaml);
     * const result = await executor.execute({ messages });
     * if (result instanceof Response) {
     *   return result; // Stream to client
     * }
     * return Response.json(result);
     * ```
     */
    async execute(input: unknown): Promise<Response | Record<string, unknown>> {
        const context: ExecutionContext = {
            input,
            variables: new Map(),
            trace: this.observabilityEnabled ? [] : undefined,
        };

        const totalSteps = this.steps.length;
        let lastResult: Record<string, unknown> | null = null;

        // Helper to attach trace to result (no-op if trace is empty/undefined)
        const attachTrace = (result: Record<string, unknown>): Record<string, unknown> => {
            if (context.trace && context.trace.length > 0) {
                return { ...result, __trace: context.trace };
            }
            return result;
        };

        for (let i = 0; i < this.steps.length; i++) {
            const step = this.steps[i];
            const handler = handlerRegistry[step.type];

            if (!handler) {
                throw new Error(
                    `[Beddel] Unknown step type: "${step.type}" in step "${step.id}". ` +
                    `Registered types: ${Object.keys(handlerRegistry).join(', ') || '(none)'}`
                );
            }

            // Emit step-start event
            this.pushEvent(context, {
                type: 'step-start',
                stepId: step.id,
                stepType: step.type,
                stepIndex: i,
                totalSteps,
                timestamp: Date.now(),
            });

            const startTime = Date.now();

            try {
                // Execute the handler with step config and context
                const result = await handler(step.config as StepConfig, context);
                const duration = Date.now() - startTime;

                // Emit step-complete event
                this.pushEvent(context, {
                    type: 'step-complete',
                    stepId: step.id,
                    stepType: step.type,
                    stepIndex: i,
                    totalSteps,
                    timestamp: Date.now(),
                    duration,
                });

                // CRITICAL: If handler returns Response (streaming), return immediately
                // Note: Streaming responses don't include trace (they're streamed directly)
                if (result instanceof Response) {
                    return result;
                }

                // Store result for subsequent steps (if step.result is defined)
                if (step.result) {
                    context.variables.set(step.result, result);
                }

                // Track last result for final return
                lastResult = result;
            } catch (error) {
                const duration = Date.now() - startTime;

                // Emit step-error event
                this.pushEvent(context, {
                    type: 'step-error',
                    stepId: step.id,
                    stepType: step.type,
                    stepIndex: i,
                    totalSteps,
                    timestamp: Date.now(),
                    duration,
                    errorType: this.sanitizeErrorType(error),
                });

                throw error;
            }
        }

        // If last step has no 'result' key, return its output directly
        // This allows the final step to define the API response shape
        const lastStep = this.steps[this.steps.length - 1];
        if (lastStep && !lastStep.result && lastResult) {
            return attachTrace(lastResult);
        }

        // If 'return' template is defined, resolve and return it
        // This provides explicit control over the API response contract
        if (this.returnTemplate !== undefined) {
            const resolved = resolveVariables(this.returnTemplate, context);
            
            // Ensure we return a Record
            if (typeof resolved === 'object' && resolved !== null && !Array.isArray(resolved)) {
                return attachTrace(resolved as Record<string, unknown>);
            }
            
            // Wrap primitives and arrays in an object
            return attachTrace({ value: resolved });
        }

        // Fallback: return accumulated variables as object
        return attachTrace(Object.fromEntries(context.variables));
    }
}
