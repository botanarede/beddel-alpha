/**
 * Beddel Protocol - Variable Resolver
 * 
 * Resolves template variables in step configurations.
 * Patterns: $input.path.to.value, $stepResult.path.to.value
 * 
 * Server-only: Used within WorkflowExecutor during step execution.
 */

import type { ExecutionContext } from '../types';

/**
 * Resolve a path like "foo.bar.baz" on an object.
 * Returns undefined if path doesn't exist.
 */
function resolvePath(obj: unknown, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
        if (current === null || current === undefined) {
            return undefined;
        }
        if (typeof current === 'object') {
            current = (current as Record<string, unknown>)[part];
        } else {
            return undefined;
        }
    }

    return current;
}

/**
 * Resolve variable references in a template value.
 * 
 * Supports:
 * - "$input.messages" → context.input.messages
 * - "$stepResult.llmOutput.text" → context.variables.get('llmOutput').text
 * - Nested objects/arrays are resolved recursively
 * 
 * @param template - Value to resolve (string, object, array, or primitive)
 * @param context - Execution context with input and variables
 * @returns Resolved value with all variable references replaced
 */
export function resolveVariables(template: unknown, context: ExecutionContext): unknown {
    // Handle null/undefined
    if (template === null || template === undefined) {
        return template;
    }

    // Handle string patterns
    if (typeof template === 'string') {
        // Check for $input.* pattern
        if (template.startsWith('$input.')) {
            const path = template.slice(7); // Remove "$input."
            return resolvePath(context.input, path);
        }

        // Check for $stepResult.* pattern (references step.result names)
        if (template.startsWith('$stepResult.')) {
            const fullPath = template.slice(12); // Remove "$stepResult."
            const dotIndex = fullPath.indexOf('.');

            if (dotIndex === -1) {
                // Just the variable name, e.g., "$stepResult.llmOutput"
                return context.variables.get(fullPath);
            }

            // Variable name + path, e.g., "$stepResult.llmOutput.text"
            const varName = fullPath.slice(0, dotIndex);
            const restPath = fullPath.slice(dotIndex + 1);
            const varValue = context.variables.get(varName);
            return resolvePath(varValue, restPath);
        }

        // Check for legacy $varName.* pattern (direct variable reference)
        if (template.startsWith('$') && !template.startsWith('$$')) {
            const fullPath = template.slice(1); // Remove "$"
            const dotIndex = fullPath.indexOf('.');

            if (dotIndex === -1) {
                // Just the variable name, e.g., "$llmOutput"
                return context.variables.get(fullPath);
            }

            // Variable name + path, e.g., "$llmOutput.text"
            const varName = fullPath.slice(0, dotIndex);
            const restPath = fullPath.slice(dotIndex + 1);
            const varValue = context.variables.get(varName);
            return resolvePath(varValue, restPath);
        }

        // No pattern match, return as-is
        return template;
    }

    // Handle arrays - resolve each element
    if (Array.isArray(template)) {
        return template.map(item => resolveVariables(item, context));
    }

    // Handle objects - resolve each value
    if (typeof template === 'object') {
        const resolved: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(template)) {
            resolved[key] = resolveVariables(value, context);
        }
        return resolved;
    }

    // Primitives (number, boolean) - return as-is
    return template;
}
