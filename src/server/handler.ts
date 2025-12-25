import { NextRequest } from 'next/server';
import { loadYaml } from '../core/parser';
import { WorkflowExecutor } from '../core/workflow';
import { join, normalize } from 'path';

export interface BeddelHandlerOptions {
    agentsPath?: string;
}

export type BeddelHandler = (request: NextRequest) => Promise<Response>;

/**
 * Validate agentId to prevent path traversal attacks.
 * Only allows alphanumeric characters, hyphens, and underscores.
 * 
 * @param agentId - The agent identifier from request
 * @returns true if valid, false otherwise
 */
function isValidAgentId(agentId: string): boolean {
    // Must be non-empty string
    if (typeof agentId !== 'string' || agentId.length === 0) {
        return false;
    }
    
    // Only allow safe characters: alphanumeric, hyphen, underscore
    // No dots, slashes, or other path characters
    const safePattern = /^[a-zA-Z0-9_-]+$/;
    
    return safePattern.test(agentId);
}

export function createBeddelHandler(options: BeddelHandlerOptions = {}): BeddelHandler {
    const agentsPath = options.agentsPath || 'src/agents';

    return async function POST(request: NextRequest): Promise<Response> {
        try {
            const body = await request.json() as any;
            const { agentId, ...input } = body;

            if (!agentId) {
                return Response.json({ error: 'agentId is required' }, { status: 400 });
            }

            // Security: Validate agentId to prevent path traversal
            if (!isValidAgentId(agentId)) {
                return Response.json(
                    { error: 'Invalid agentId: only alphanumeric characters, hyphens, and underscores allowed' },
                    { status: 400 }
                );
            }

            // Resolve path relative to CWD (usually project root)
            const basePath = join(process.cwd(), agentsPath);
            const fullPath = normalize(join(basePath, `${agentId}.yaml`));
            
            // Double-check: ensure resolved path is within agents directory
            if (!fullPath.startsWith(basePath)) {
                return Response.json({ error: 'Invalid agentId' }, { status: 400 });
            }
            
            const yaml = await loadYaml(fullPath);

            const executor = new WorkflowExecutor(yaml);
            // Pass the entire body (minus agentId) as input ($input)
            const result = await executor.execute(input);

            if (result instanceof Response) {
                return result;
            }

            return Response.json(result);
        } catch (error) {
            console.error('[Beddel] Handler Error:', error);
            return Response.json(
                { error: error instanceof Error ? error.message : 'Internal Server Error' },
                { status: 500 }
            );
        }
    };
}
