/**
 * Built-in Agents Registry
 * 
 * Lists all agents bundled with the beddel package.
 * These are available automatically without user configuration.
 * 
 * Agents are organized by category:
 * - chat/         Streaming chat assistants (different providers)
 * - mcp/          MCP server integrations (GitMCP, Context7, etc.)
 * - google-business/  Google Business Profile agents
 * - marketing/    Lead capture, newsletters, CRM
 * - utility/      General-purpose tools
 * - examples/     Demo pipelines showing multi-step workflows
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory where built-in agents are located
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Built-in agent definitions with their category paths
 */
export const BUILTIN_AGENT_PATHS: Record<string, string> = {
  // Chat assistants
  'assistant': 'chat/assistant.yaml',
  'assistant-bedrock': 'chat/assistant-bedrock.yaml',
  'assistant-openrouter': 'chat/assistant-openrouter.yaml',
  
  // MCP integrations
  'assistant-gitmcp': 'mcp/assistant-gitmcp.yaml',
  
  // Google Business
  'business-analyzer': 'google-business/business-analyzer.yaml',
  
  // Marketing
  'newsletter-signup': 'marketing/newsletter-signup.yaml',
  
  // Utility
  'text-generator': 'utility/text-generator.yaml',
  
  // Examples
  'multi-step-assistant': 'examples/multi-step-assistant.yaml',
};

/**
 * List of built-in agent IDs available in the package
 */
export const BUILTIN_AGENTS = Object.keys(BUILTIN_AGENT_PATHS) as readonly string[];

export type BuiltinAgentId = keyof typeof BUILTIN_AGENT_PATHS;

/**
 * Get the absolute path to the built-in agents directory
 */
export function getBuiltinAgentsPath(): string {
  return __dirname;
}

/**
 * Check if an agent ID is a built-in agent
 */
export function isBuiltinAgent(agentId: string): agentId is BuiltinAgentId {
  return agentId in BUILTIN_AGENT_PATHS;
}

/**
 * Get the full path to a built-in agent YAML file
 */
export function getBuiltinAgentPath(agentId: string): string | null {
  const relativePath = BUILTIN_AGENT_PATHS[agentId];
  if (!relativePath) return null;
  return join(__dirname, relativePath);
}

/**
 * Get all agents in a specific category
 */
export function getAgentsByCategory(category: string): string[] {
  return Object.entries(BUILTIN_AGENT_PATHS)
    .filter(([_, path]) => path.startsWith(`${category}/`))
    .map(([id]) => id);
}

/**
 * Available categories
 */
export const AGENT_CATEGORIES = [
  'chat',
  'mcp', 
  'google-business',
  'marketing',
  'utility',
  'examples',
] as const;

export type AgentCategory = typeof AGENT_CATEGORIES[number];
