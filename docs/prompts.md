# Beddel Protocol - Implementation Prompts

> **Usage:** Copy each prompt into a new Claude/Gemini session  
> **MCP:** Use `context7` to fetch latest AI SDK docs when needed

---

## Task 1.1: Clean Setup

```
You are implementing Task 1.1 of Beddel Protocol.

**Objective:** Create a properly configured TypeScript package.

**Context:**
- Working directory: packages/beddel/
- Consult @[packages/beddel/setup.md] for architecture overview

**Steps:**
1. Initialize package.json with:
   - "name": "beddel"
   - "type": "module"
   - Dependencies: "ai", "@ai-sdk/google", "zod", "js-yaml"
   - DevDependencies: "typescript", "@types/node", "@types/js-yaml"

2. Create tsconfig.json with:
   - strict: true
   - moduleResolution: "bundler"
   - target: "ES2022"

3. Create src/index.ts as entry point (empty export for now)

**MCP Instructions:**
- Use context7 to verify latest versions of "ai" and "@ai-sdk/google"

**Acceptance Criteria:**
- [ ] Package includes: ai, @ai-sdk/google, zod, js-yaml
- [ ] tsconfig.json configured with strict mode
- [ ] No GraphQL dependencies in the package
```

---

## Task 1.2: Secure Parser

```
You are implementing Task 1.2 of Beddel Protocol.

**Objective:** Create a secure YAML parser that prevents code execution.

**Context:**
- Working directory: packages/beddel/
- Consult @[packages/beddel/setup.md] Section 4.1.2

**Steps:**
1. Create src/core/parser.ts with:
   - Import js-yaml with FAILSAFE_SCHEMA
   - loadYaml(path: string): Promise<ParsedYaml>
   - Read file from filesystem
   - Parse YAML with FAILSAFE_SCHEMA only

2. Create src/types/index.ts with:
   - ParsedYaml interface (metadata, workflow array)
   - WorkflowStep interface (id, type, config, result?)

**Security Requirements:**
- FAILSAFE_SCHEMA blocks: !!js/function, !!js/regexp, custom tags
- No custom constructors allowed

**MCP Instructions:**
- Use context7 MCP to verify js-yaml FAILSAFE_SCHEMA usage

**Acceptance Criteria:**
- [ ] loadYaml function uses FAILSAFE_SCHEMA from js-yaml
- [ ] Functions and class instances are rejected by the parser
- [ ] Parser returns typed ParsedYaml object
```

---

## Task 1.3: Workflow Executor

```
You are implementing Task 1.3 of Beddel Protocol.

**Objective:** Create the WorkflowExecutor class that iterates over steps.

**Context:**
- Working directory: packages/beddel/
- Consult @[packages/beddel/setup.md] Section 5 (Core Code Guide)

**Steps:**
1. Create src/core/workflow.ts with:
   - WorkflowExecutor class
   - constructor(yaml: ParsedYaml)
   - execute(input: any): Promise<Response | Record<string, unknown>>

2. Implement execute method:
   - Create ExecutionContext: { input, variables: Map }
   - Loop over this.steps
   - Get handler from handlerRegistry (import from ../primitives)
   - If handler returns Response instance, break and return immediately
   - Otherwise, store result in context.variables.set(step.result, result)

3. Create src/core/variable-resolver.ts:
   - resolveVariables(template: any, context: ExecutionContext): any
   - Handle $input.* and $stepResult.* patterns

**CRITICAL:**
- If handler returns Response/Stream, return IMMEDIATELY (streaming mode)

**Acceptance Criteria:**
- [ ] WorkflowExecutor iterates over yaml.workflow steps
- [ ] If a handler returns a Response instance, execution stops and returns immediately
- [ ] Step results are stored in context.variables for use by subsequent steps
```

---

## Task 2.1: Handler & Tool Registries

```
You are implementing Task 2.1 of Beddel Protocol.

**Objective:** Create extensible registries for primitives and tools.

**Context:**
- Working directory: packages/beddel/
- Consult @[packages/beddel/setup.md] Section 3 (Core Primitives)

**Steps:**
1. Create src/primitives/index.ts:
   - PrimitiveHandler type
   - handlerRegistry: Record<string, PrimitiveHandler>
   - Register: 'llm', 'output-generator', 'call-agent' (placeholders)

2. Create src/tools/index.ts:
   - ToolImplementation interface: { description, parameters: ZodSchema, execute }
   - toolRegistry: Record<string, ToolImplementation>
   - Sample tools: calculator, getCurrentTime

**MCP Instructions:**
- Use context7 to check Zod schema patterns for tool parameters

**Sample Calculator Tool:**
```typescript
calculator: {
  description: 'Evaluate a mathematical expression',
  parameters: z.object({
    expression: z.string().describe('The math expression to evaluate'),
  }),
  execute: async ({ expression }) => {
    return { result: Function(`"use strict"; return (${expression})`)() };
  },
}
```

**Acceptance Criteria:**
- [ ] primitiveRegistry: Record<string, PrimitiveHandler> exists
- [ ] toolRegistry: Record<string, ToolImplementation> exists
- [ ] MVP includes calculator and getCurrentTime sample tools
```

---

## Task 2.2: LLM Primitive

```
You are implementing Task 2.2 of Beddel Protocol.

**Objective:** Create the core LLM primitive with dual-mode support.

**Context:**
- Working directory: packages/beddel/
- Consult @[packages/beddel/setup.md] Section 5 (LLM Primitive code)

**MCP Instructions:**
- Use context7 to fetch Vercel AI SDK docs for streamText and generateText
- Verify toDataStreamResponse() API

**Steps:**
1. Create src/primitives/llm.ts:
   - Import streamText, generateText, tool from 'ai'
   - Import createGoogleGenerativeAI from '@ai-sdk/google'
   - Import toolRegistry from '../tools'

2. Implement mapTools():
   - Takes YAML tool definitions
   - Maps to Vercel AI SDK tool objects
   - Uses toolRegistry for implementation lookup

3. Implement llmPrimitive():
   - Dual mode via config.stream: boolean
   - stream: true → streamText → result.toDataStreamResponse()
   - stream: false → generateText → { text, usage }
   - maxSteps: 5 when tools present

**Environment:**
- Requires GEMINI_API_KEY environment variable

**Acceptance Criteria:**
- [ ] stream: true uses streamText and returns result.toDataStreamResponse()
- [ ] stream: false uses generateText and returns JSON object
- [ ] config.tools maps to Vercel AI SDK tools via mapTools() function
- [ ] maxSteps is set to 5 when tools are present
```

---

## Task 2.3: Output Primitive

```
You are implementing Task 2.3 of Beddel Protocol.

**Objective:** Create the output-generator primitive for JSON transforms.

**Context:**
- Working directory: packages/beddel/
- Consult @[packages/beddel/setup.md] Section 4.2.3

**Steps:**
1. Create src/primitives/output.ts:
   - outputPrimitive(config: StepConfig, context: ExecutionContext)
   - Uses resolveVariables from ../core/variable-resolver
   - Returns the resolved template object

2. Variable resolution patterns:
   - $input.* → context.input[path]
   - $stepResult.* → context.variables.get(stepName)[path]

**Example:**
```yaml
config:
  template:
    status: "completed"
    tokens: "$llmOutput.usage"
```

**Acceptance Criteria:**
- [ ] Variable resolution supports $input.* and $stepResult.* syntax
- [ ] Template is a pure JSON transform (no LLM invocation)
- [ ] Returns the transformed object for next step consumption
```

---

## Task 2.4: Lifecycle Hooks

```
You are implementing Task 2.4 of Beddel Protocol.

**Objective:** Add onFinish and onError callback support to llmPrimitive.

**Context:**
- Working directory: packages/beddel/
- Consult @[packages/beddel/setup.md] Section 5 (updated llmPrimitive code)
- Consult @[packages/beddel/docs/architecture/core-workflows.md] for flow diagram

**MCP Instructions:**
- Use context7 to verify onFinish callback signature in AI SDK streamText

**Steps:**
1. Create src/callbacks/index.ts:
   - CallbackFn type: (payload: any) => Promise<void> | void
   - callbackRegistry: Record<string, CallbackFn>
   - registerCallback(name: string, fn: CallbackFn)

2. Update src/primitives/llm.ts:
   - Add onFinish callback to streamText options
   - Lookup callback name from config.onFinish in callbackRegistry
   - Execute callback with { text, usage, totalUsage, steps }
   - Add onError callback similarly

**YAML Usage:**
```yaml
config:
  onFinish: "persistConversation"
  onError: "logError"
```

**Acceptance Criteria:**
- [ ] onFinish callback executes after stream completes
- [ ] onError callback executes when stream errors
- [ ] Callbacks are registered via callbackRegistry
- [ ] YAML references callback by name string
```

---

## Task 3.1: API Route

```
You are implementing Task 3.1 of Beddel Protocol.

**Objective:** Create a REST endpoint for chat interactions.

**Context:**
- This task creates a SAMPLE route for consumers to copy
- Working directory: packages/beddel/
- Consult @[packages/beddel/setup.md] Section 7 (API Route Example)

**Steps:**
1. Create examples/api-route.ts (not in src/):
   - POST handler receiving { agentId, messages }
   - Import loadYaml and WorkflowExecutor from beddel
   - Load YAML from src/agents/{agentId}.yaml
   - Execute workflow
   - Return Response or JSON

2. Document in README that consumers copy this pattern

**Code Pattern:**
```typescript
export async function POST(request: NextRequest) {
  const { agentId, messages } = await request.json();
  const yaml = await loadYaml(`src/agents/${agentId}.yaml`);
  const executor = new WorkflowExecutor(yaml);
  const result = await executor.execute({ messages });
  
  if (result instanceof Response) {
    return result;
  }
  return Response.json(result);
}
```

**Acceptance Criteria:**
- [ ] POST /api/beddel/chat accepts { agentId, messages }
- [ ] Loads YAML from src/agents/{agentId}.yaml
- [ ] Returns streaming Response or JSON based on workflow output
```

---

## Task 3.2: Sample Assistant

```
You are implementing Task 3.2 of Beddel Protocol.

**Objective:** Create a working example agent YAML file.

**Context:**
- Working directory: packages/beddel/
- Consult @[packages/beddel/setup.md] Section 2 (Data Structure)

**Steps:**
1. Create examples/agents/assistant.yaml:
   - metadata: name, version
   - workflow with llm step
   - stream: true
   - Include calculator tool
   - Add onFinish hook example

2. Update README.md with:
   - Quick start guide
   - curl test command

**YAML Content:**
```yaml
metadata:
  name: "Streaming Assistant"
  version: "1.0.0"

workflow:
  - id: "chat-interaction"
    type: "llm"
    config:
      model: "gemini-2.0-flash-exp"
      stream: true
      system: "You are a helpful and concise assistant."
      messages: "$input.messages"
      tools:
        - name: "calculator"
          description: "Execute math"
      onFinish: "logUsage"
    result: "llmOutput"
```

**Test Command:**
```bash
curl -X POST http://localhost:3000/api/beddel/chat \
  -H "Content-Type: application/json" \
  -d '{"agentId": "assistant", "messages": [{"role": "user", "content": "Hello!"}]}'
```

**Acceptance Criteria:**
- [ ] src/agents/assistant.yaml is provided with streaming enabled
- [ ] Includes at least one tool definition (calculator)
- [ ] curl command successfully receives streamed response
```
