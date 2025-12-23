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
 */

import type { ParsedYaml, WorkflowStep, ExecutionContext, StepConfig } from '../types';
import { handlerRegistry } from '../primitives';

export class WorkflowExecutor {
    private steps: WorkflowStep[];

    /**
     * Create a new WorkflowExecutor from parsed YAML.
     * @param yaml - Parsed YAML document containing workflow steps
     */
    constructor(yaml: ParsedYaml) {
        this.steps = yaml.workflow;
    }

    /**
     * Execute the workflow pipeline.
     * 
     * @param input - Input data (e.g., { messages: [...] } for chat)
     * @returns Response if streaming, or accumulated variables object
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
        }

        // No streaming occurred - return accumulated variables as object
        return Object.fromEntries(context.variables);
    }
}
