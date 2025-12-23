/**
 * Beddel Protocol - Secure YAML Parser
 * Uses FAILSAFE_SCHEMA to prevent code execution attacks
 */

import { readFile } from 'fs/promises';
import yaml, { FAILSAFE_SCHEMA } from 'js-yaml';
import type { ParsedYaml } from '../types';

/**
 * Load and parse a YAML workflow file securely.
 * 
 * Security: Uses FAILSAFE_SCHEMA which only allows:
 * - Strings
 * - Arrays (sequences)
 * - Plain objects (mappings)
 * 
 * This completely blocks dangerous YAML tags:
 * - !!js/function (arbitrary code execution)
 * - !!js/regexp (ReDoS vulnerabilities)
 * - !!js/undefined
 * - Custom tags
 * 
 * @param path - Absolute or relative path to YAML file
 * @returns Parsed YAML as typed ParsedYaml object
 * @throws Error if file cannot be read or YAML is invalid
 */
export async function loadYaml(path: string): Promise<ParsedYaml> {
    const content = await readFile(path, 'utf-8');

    // FAILSAFE_SCHEMA is the most restrictive schema in js-yaml
    // No custom constructors, no type coercion, maximum security
    const parsed = yaml.load(content, { schema: FAILSAFE_SCHEMA }) as ParsedYaml;

    return parsed;
}
