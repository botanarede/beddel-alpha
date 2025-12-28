
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks must be defined before imports
// We need to mock 'loadYaml' from '../src/core/parser' and 'WorkflowExecutor' from '../src/core/workflow'

// Mocking module dependencies
vi.mock('../../src/core/parser', () => ({
    loadYaml: vi.fn()
}));

// We need to mock WorkflowExecutor class.
// Since it's hoisted, we cannot refer to outer variables.
// We must use vi.fn() inside the factory or return a plain object/function that we can spy on later?
// Or we can import the mocked module and spy on its exports.

vi.mock('../../src/core/workflow', () => {
    const MockExecutor = vi.fn();
    MockExecutor.prototype.execute = vi.fn();
    return {
        WorkflowExecutor: MockExecutor
    };
});

// Mock fs to bypass file existence check
vi.mock('fs/promises', async () => {
    return {
        access: vi.fn().mockResolvedValue(undefined), // file exists
        readFile: vi.fn(),
        writeFile: vi.fn(),
        unlink: vi.fn(),
    };
});

import { callAgentPrimitive } from '../../src/primitives/call-agent';
import { loadYaml } from '../../src/core/parser';
import { WorkflowExecutor } from '../../src/core/workflow';
import { ExecutionContext } from '../../src/types';
import { join } from 'path';

describe('Call Agent Primitive', () => {
    beforeEach(() => {
        vi.mocked(loadYaml).mockReset();
        // Reset the mock implementation of WorkflowExecutor
        vi.mocked(WorkflowExecutor).mockClear();
        // We need to make sure the instance execute method is also reset/mocked correctly
        // But since we create a new instance each time, we need to control what the constructor does?
        // Or just access the mock instance.
    });

    const context: ExecutionContext = {
        input: { data: "test" },
        variables: new Map(),
        currentStepId: "caller"
    };

    it('should load and execute another agent', async () => {
        const config = {
            id: "step1",
            type: "call-agent",
            agentId: "sub-agent",
            input: { foo: "bar" } // explicit input
        };

        // Mock loadYaml to return a dummy workflow
        vi.mocked(loadYaml).mockResolvedValue({
            metadata: { name: "Sub", version: "1" },
            workflow: []
        });

        // Mock execution result
        const mockExecute = vi.fn().mockResolvedValue({ result: "done" });

        // When WorkflowExecutor is instantiated, return an object with execute method
        vi.mocked(WorkflowExecutor).mockImplementation(function() {
            return { execute: mockExecute };
        } as any);

        const result = await callAgentPrimitive(config as any, context);

        // Verify it tried to load the agent
        expect(loadYaml).toHaveBeenCalled();
        const calledPath = vi.mocked(loadYaml).mock.calls[0][0];
        expect(calledPath).toContain('sub-agent.yaml');

        // Verify it initialized executor
        expect(WorkflowExecutor).toHaveBeenCalled();

        // Verify it executed with correct input
        expect(mockExecute).toHaveBeenCalledWith({ foo: "bar" });

        expect(result).toEqual({ result: "done" });
    });

    it('should use context input if no input provided', async () => {
         const config = {
            id: "step1",
            type: "call-agent",
            agentId: "sub-agent"
            // no input
        };

        vi.mocked(loadYaml).mockResolvedValue({ metadata: { name: "Sub", version: "1" }, workflow: [] });

        const mockExecute = vi.fn().mockResolvedValue({});
        vi.mocked(WorkflowExecutor).mockImplementation(function() {
            return { execute: mockExecute };
        } as any);

        await callAgentPrimitive(config as any, context);

        expect(mockExecute).toHaveBeenCalledWith(context.input);
    });
});
