import 'server-only';

/**
 * Workflow Executor - Server-only workflow step execution
 * Delegates to individual agent handlers based on step type
 */

import type { ExecutionContext } from '../types/executionContext';
import type { WorkflowStepType } from '../shared/types/agent.types';
import { LEGACY_STEP_TYPE_MAP } from '../shared/types/agent.types';

// Import handlers from each agent
import { executeJokeHandler } from '../agents/joker/joker.handler';
import { executeTranslationHandler } from '../agents/translator/translator.handler';
import { executeImageHandler } from '../agents/image/image.handler';
import { executeMcpToolHandler } from '../agents/mcp-tool/mcp-tool.handler';
import { executeVectorizeHandler } from '../agents/gemini-vectorize/gemini-vectorize.handler';
import { executeChromaDBHandler } from '../agents/chromadb/chromadb.handler';
import { executeGitMcpHandler } from '../agents/gitmcp/gitmcp.handler';
import { executeRagHandler } from '../agents/rag/rag.handler';
import { executeLlmHandler } from '../agents/llm/llm.handler';
import { executeChatHandler } from '../agents/chat/chat.handler';

/**
 * Handler function type - uses any for params to allow flexible handler signatures
 */
type HandlerFunction = (
  params: any,
  props: Record<string, string>,
  context: ExecutionContext
) => Promise<unknown>;

/**
 * Map of workflow step types to their handlers
 * Preferred step type names only - legacy names resolved via LEGACY_STEP_TYPE_MAP
 */
const handlerMap: Record<string, HandlerFunction> = {
  'joke': executeJokeHandler,
  'translation': executeTranslationHandler,
  'image': executeImageHandler,
  'mcp-tool': executeMcpToolHandler,
  'vectorize': executeVectorizeHandler,
  'chromadb': executeChromaDBHandler,
  'gitmcp': executeGitMcpHandler,
  'rag': executeRagHandler,
  'llm': executeLlmHandler,
  'chat': executeChatHandler,
};

/**
 * Resolve step type, handling legacy names with deprecation warning
 */
function resolveStepType(stepType: string, context: ExecutionContext): string {
  if (stepType in LEGACY_STEP_TYPE_MAP) {
    const preferred = LEGACY_STEP_TYPE_MAP[stepType];
    context.log(
      `[DEPRECATION WARNING] Step type '${stepType}' is deprecated. Use '${preferred}' instead.`
    );
    return preferred;
  }
  return stepType;
}

/**
 * Execute a workflow step by delegating to the appropriate handler
 */
export async function executeWorkflowStep(
  stepType: WorkflowStepType | string,
  params: Record<string, unknown>,
  props: Record<string, string>,
  context: ExecutionContext
): Promise<unknown> {
  const resolvedType = resolveStepType(stepType, context);
  const handler = handlerMap[resolvedType];
  if (!handler) {
    throw new Error(`Unknown workflow step type: ${stepType}`);
  }
  return handler(params, props, context);
}

/**
 * Get all available workflow step types
 */
export function getAvailableStepTypes(): string[] {
  return Object.keys(handlerMap);
}

/**
 * Check if a step type is supported (including legacy names)
 */
export function isStepTypeSupported(stepType: string): boolean {
  return stepType in handlerMap || stepType in LEGACY_STEP_TYPE_MAP;
}

// Export individual handlers for direct use
export {
  executeJokeHandler,
  executeTranslationHandler,
  executeImageHandler,
  executeMcpToolHandler,
  executeVectorizeHandler,
  executeChromaDBHandler,
  executeGitMcpHandler,
  executeRagHandler,
  executeLlmHandler,
  executeChatHandler,
};
