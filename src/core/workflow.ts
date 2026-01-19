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
 */

import type { ParsedYaml, WorkflowStep, ExecutionContext, StepConfig } from '../types';
import { handlerRegistry } from '../primitives';
import { resolveVariables } from './variable-resolver';

export class WorkflowExecutor {
    private steps: WorkflowStep[];
    private returnTemplate?: unknown;

    /**
     * Create a new WorkflowExecutor from parsed YAML.
     * @param yaml - Parsed YAML document containing workflow steps
     */
    constructor(yaml: ParsedYaml) {
        this.steps = yaml.workflow;
        this.returnTemplate = yaml.return;
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
        };

        let lastResult: Record<string, unknown> | null = null;

        for (const step of this.steps) {
            const handler = handlerRegistry[step.type];

            if (!handler) {
                throw new Error(
                    `[Beddel] Unknown step type: "${step.type}" in step "${step.id}". ` +
                    `Registered types: ${Object.keys(handlerRegistry).join(', ') || '(none)'}`
                );
            }

            // Execute the handler with step config and context
            const result = await handler(step.config as StepConfig, context);

            // CRITICAL: If handler returns Response (streaming), return immediately
            if (result instanceof Response) {
                return result;
            }

            // Store result for subsequent steps (if step.result is defined)
            if (step.result) {
                context.variables.set(step.result, result);
            }

            // Track last result for final return
            lastResult = result;
        }

        // If last step has no 'result' key, return its output directly
        // This allows the final step to define the API response shape
        const lastStep = this.steps[this.steps.length - 1];
        if (lastStep && !lastStep.result && lastResult) {
            return lastResult;
        }

        // If 'return' template is defined, resolve and return it
        // This provides explicit control over the API response contract
        if (this.returnTemplate !== undefined) {
            const resolved = resolveVariables(this.returnTemplate, context);
            
            // Ensure we return a Record
            if (typeof resolved === 'object' && resolved !== null && !Array.isArray(resolved)) {
                return resolved as Record<string, unknown>;
            }
            
            // Wrap primitives and arrays in an object
            return { value: resolved };
        }

        // Fallback: return accumulated variables as object
        return Object.fromEntries(context.variables);
    }
}
