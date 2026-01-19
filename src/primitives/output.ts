/**
 * Beddel Protocol - Output Primitive
 * 
 * Deterministic JSON transform primitive for the workflow engine.
 * Resolves variable references in a template and returns the result.
 * 
 * Supports optional JSON parsing from LLM text output via 'json' parameter.
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
    template?: unknown;

    /**
     * Optional: Parse JSON from a variable reference before applying template.
     * The parsed JSON will be available as $json.* in the template.
     * 
     * @example
     * json: "$stepResult.llmOutput.text"
     * template:
     *   tags: "$json.tags"
     *   sentiment: "$json.sentiment"
     */
    json?: string;
}

/**
 * Extract JSON from text that may contain markdown or other content.
 */
function extractJson(text: string): string {
    // Try to find JSON in markdown code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
        return codeBlockMatch[1].trim();
    }
    
    // Try to find JSON object or array
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
        return jsonMatch[1].trim();
    }
    
    // Return original text if no JSON found
    return text.trim();
}

/**
 * Safely parse JSON with error handling.
 */
function safeJsonParse(text: string): { success: boolean; data?: unknown; error?: string } {
    try {
        const jsonText = extractJson(text);
        const data = JSON.parse(jsonText);
        return { success: true, data };
    } catch (error) {
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown parse error' 
        };
    }
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
 * - $json.* → parsed JSON from 'json' parameter (if provided)
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

    // If 'json' parameter is provided, parse it and add to context
    if (outputConfig.json) {
        const jsonSource = resolveVariables(outputConfig.json, context);
        
        if (typeof jsonSource === 'string') {
            const parseResult = safeJsonParse(jsonSource);
            
            if (parseResult.success) {
                // Add parsed JSON to variables as 'json' for template resolution
                context.variables.set('json', parseResult.data);
                console.log('[Beddel] output-generator: Parsed JSON successfully');
            } else {
                console.warn(`[Beddel] output-generator: JSON parse failed - ${parseResult.error}`);
                // Set empty object so $json.* references don't break
                context.variables.set('json', {});
            }
        } else if (typeof jsonSource === 'object' && jsonSource !== null) {
            // Already an object, use directly
            context.variables.set('json', jsonSource);
        } else {
            console.warn('[Beddel] output-generator: json parameter did not resolve to string or object');
            context.variables.set('json', {});
        }
    }

    if (outputConfig.template === undefined) {
        // If no template but json was parsed, return the parsed json
        if (outputConfig.json) {
            const jsonData = context.variables.get('json');
            if (typeof jsonData === 'object' && jsonData !== null) {
                return jsonData as Record<string, unknown>;
            }
        }
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
