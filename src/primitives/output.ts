/**
 * Beddel Protocol - Output Primitive
 * 
 * Deterministic JSON transform primitive for the workflow engine.
 * Resolves variable references in a template and returns the result.
 * 
 * This is a pure transform - no LLM invocation.
 * 
 * Server-only: Used within WorkflowExecutor during step execution.
 */

import type { StepConfig, ExecutionContext, PrimitiveHandler } from '../types';
import { resolveVariables } from '../core/variable-resolver';

/**
 * Output step configuration from YAML.
 */
interface OutputConfig extends StepConfig {
    /**
     * JSON template with variable references to resolve.
     * 
     * @example
     * template:
     *   status: "completed"
     *   tokens: "$llmOutput.usage"
     *   user: "$input.user.name"
     */
    template: unknown;
}

/**
 * Output Primitive Handler
 * 
 * Resolves all variable references in the template and returns
 * the transformed object for consumption by subsequent steps.
 * 
 * Supported patterns (via resolveVariables):
 * - $input.* → context.input[path]
 * - $stepResult.* → context.variables.get(stepName)[path]
 * - $varName.* → context.variables.get(varName)[path] (legacy)
 * 
 * @param config - Step configuration from YAML (must contain 'template')
 * @param context - Execution context with input and variables
 * @returns Resolved template as Record (never streams)
 */
export const outputPrimitive: PrimitiveHandler = async (
    config: StepConfig,
    context: ExecutionContext
): Promise<Record<string, unknown>> => {
    const outputConfig = config as OutputConfig;

    if (outputConfig.template === undefined) {
        console.warn('[Beddel] output-generator: No template provided, returning empty object.');
        return {};
    }

    const resolved = resolveVariables(outputConfig.template, context);

    // Ensure we return a Record even if template resolves to primitive
    if (typeof resolved !== 'object' || resolved === null) {
        return { value: resolved };
    }

    return resolved as Record<string, unknown>;
};
