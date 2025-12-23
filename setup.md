# Beddel Protocol - Streaming Pipeline Edition

> **Prompting Strategy**: Chain-of-Thought with Architecture-First Approach  
> Story 1: **Streaming Chat Pipeline** — Declarative YAML flow using Vercel AI SDK Core

---

## 1. Project Context

Beddel Protocol is a **declarative agent execution engine** built on top of Vercel AI SDK Core.

### Architecture Change: "Pipeline Pattern"

Unlike previous versions, Beddel is no longer an "agent wrapper". It is a **Sequential Pipeline Executor**.

| Concept | Definition |
|---------|------------|
| **Workflow** | A linear list of steps |
| **Agent** | Just one step type (`llm`) within the workflow |
| **Streaming** | Native `streamText` support at the Edge |

```
┌─────────────────────────────────────────────────────────┐
│                  WorkflowExecutor                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │           Vercel AI SDK Core                      │  │
│  │  - streamText (streaming mode)                    │  │
│  │  - generateText (blocking mode)                   │  │
│  │  - maxSteps for tool loops                        │  │
│  └───────────────────────────────────────────────────┘  │
│  + YAML parsing (FAILSAFE_SCHEMA)                       │
│  + Variable resolution ($input.*, $stepResult.*)        │
│  + Primitive handlers (llm, output-generator, call-agent)│
│  + REST API (POST /api/beddel/chat)                     │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js / Edge (Next.js App Router) |
| AI Core | Vercel AI SDK 6.x (`ai`, `@ai-sdk/google` or `@ai-sdk/openai`) |
| Security | js-yaml (FAILSAFE_SCHEMA), Zod for validation |
| API | Standard REST (POST `/api/chat`) for Data Streams |

---

## 2. Data Structure (YAML)

The YAML file now defines a **Pipeline**. The concept of "Agent" is encapsulated within the `llm` step configuration.

```yaml
# src/agents/assistant.yaml
metadata:
  name: "Streaming Assistant"
  version: "1.0.0"

workflow:
  # Step 1: The "Brain". Encapsulates ToolLoopAgent if needed.
  - id: "chat-interaction"
    type: "llm"
    config:
      model: "gemini-2.0-flash-exp"
      stream: true  # ENABLES STREAMING
      system: "You are a helpful and concise assistant."
      messages: "$input.messages" # Injects history
      # Tools are defined HERE, exclusive to this step
      tools:
        - name: "calculator"
          description: "Execute math"
      # Lifecycle hooks (Option B: direct callbacks)
      onFinish: "persistConversation"   # Callback name registered by consumer
      onError: "logError"               # Callback name registered by consumer
    result: "llmOutput" # If stream=false, saves here. If true, returns Response.

  # Step 2: Only executes if step 1 didn't return a stream
  - id: "format-log"
    type: "output-generator"
    config:
      template:
        status: "completed"
        tokens: "$llmOutput.usage"
```

---

## 3. Core Primitives (Expansion Pack Pattern)

Beddel primitives follow the **Expansion Pack Pattern** — a modular, extensible architecture inspired by [BMAD-METHOD™](https://github.com/bmadcode/bmad-method). This ensures:

- **Core stays lean**: Only essential primitives ship with the package
- **Domain extensibility**: Custom primitives can be added without modifying core
- **Community innovation**: Third-party packs can extend Beddel capabilities

### Built-in Primitives (MVP)

Three initial primitives, implemented as pure functions:

| Step Type | Purpose | Behavior |
|-----------|---------|----------|
| `llm` | Wrapper for `streamText` (chat) or `generateText` (background tasks) | Supports `maxSteps`, `onFinish`, `onError` callbacks |
| `output-generator` | Deterministic variable mapping (JSON Transform) | No LLM call |
| `call-agent` | Allows a step to invoke another YAML file as a subroutine | Recursive execution |

### Primitive Contract

Every primitive (built-in or custom) must implement the `PrimitiveHandler` interface:

```typescript
type PrimitiveHandler = (
  config: StepConfig,    // YAML step.config parsed
  context: ExecutionContext  // { input, variables }
) => Promise<Response | Record<string, unknown>>;
```

> **Expansion Pack Pattern**: To add custom primitives, register them in `primitiveRegistry` following the same contract. See [BMAD Expansion Packs](https://github.com/bmadcode/bmad-method) for architectural inspiration.

---

## 4. Implementation Plan (Task List)

### Phase 1: Foundation & Core

- [ ] **Task 1.1: Clean Setup**
  - [ ] Install: `ai`, `@ai-sdk/google`, `zod`, `js-yaml`
  - [ ] Remove: GraphQL dependencies (for chat route)
  - [ ] Configure `tsconfig.json` (Strict mode)

- [ ] **Task 1.2: Secure Parser** (`src/core/parser.ts`)
  - [ ] Implement `loadYaml` using `FAILSAFE_SCHEMA` from js-yaml
  - [ ] Ensure functions or instantiated classes don't pass through the parser

- [ ] **Task 1.3: Workflow Executor** (`src/core/workflow.ts`)
  - [ ] Create `WorkflowExecutor` class
  - [ ] Logic: Iterate over `yaml.workflow`
  - [ ] **CRITICAL**: If a handler returns a `Response` or `Stream` instance, the executor must break the loop and return that response immediately to the client

### Phase 2: Primitive Handlers

- [ ] **Task 2.1: Handler & Tool Registries**
  - [ ] Create `src/primitives/index.ts` (Primitive Handler Registry)
    - [ ] Simple map: `Record<string, PrimitiveHandler>`
  - [ ] Create `src/tools/index.ts` (Tool Registry)
    - [ ] Export `toolRegistry: Record<string, ToolImplementation>`
    - [ ] Each tool entry contains `{ description, parameters (Zod schema), execute (function) }`
    - [ ] MVP ships with sample tools: `calculator`, `getCurrentTime`

- [ ] **Task 2.2: LLM Primitive** (`src/primitives/llm.ts`)
  - [ ] **Main Feature**: Dual Mode support via `config.stream: boolean`
  - [ ] Stream Mode: Uses `streamText` → returns `result.toDataStreamResponse()`
  - [ ] Block Mode: Uses `generateText` → returns JSON object
  - [ ] Integration: Map `config.messages` (Beddel format) to `CoreMessage[]` (SDK format)
  - [ ] **Tool Mapping**: Implement `mapTools()` to bridge YAML definitions → Vercel SDK `tools` object
    - [ ] Lookup tool implementation from `toolRegistry` by name
    - [ ] Allow YAML to override `description` if provided

- [ ] **Task 2.3: Output Primitive** (`src/primitives/output.ts`)
  - [ ] Implement variable resolution (e.g., `$input.user.name` or `$prevStep.text`)

- [ ] **Task 2.4: Lifecycle Hooks** (`src/primitives/llm.ts`)
  - [ ] Implement `onFinish` callback support (executes after stream completes)
  - [ ] Implement `onError` callback support (executes on stream error)
  - [ ] Create `callbackRegistry: Record<string, CallbackFn>` for consumer-registered callbacks
  - [ ] Callbacks receive `{ text, usage, totalUsage, steps }` payload

### Phase 3: API & Integration

- [ ] **Task 3.1: API Route** (`app/api/beddel/chat/route.ts`)
  - [ ] Receive JSON `{ agentId, messages }`
  - [ ] Load YAML
  - [ ] Instantiate `WorkflowExecutor`
  - [ ] Execute and return the `Response` (Stream)

- [ ] **Task 3.2: Sample "Assistant"**
  - [ ] Create `src/agents/chat.yaml` following the new pattern
  - [ ] Test with curl or a simple frontend (`useChat`)

---

## 5. Core Code Guide

### LLM Primitive (Heart of the refactoring)

```typescript
// src/primitives/llm.ts
import { streamText, generateText, tool } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { toolRegistry } from '../tools';

/**
 * Maps YAML tool definitions to Vercel AI SDK tool objects.
 * YAML defines intent (name, optional description override).
 * Registry provides implementation (parameters, execute).
 */
function mapTools(toolDefinitions: Array<{ name: string; description?: string }>) {
  const tools: Record<string, ReturnType<typeof tool>> = {};
  
  for (const def of toolDefinitions) {
    const impl = toolRegistry[def.name];
    if (!impl) {
      console.warn(`Tool '${def.name}' not found in registry, skipping.`);
      continue;
    }
    
    tools[def.name] = tool({
      description: def.description || impl.description, // YAML can override
      parameters: impl.parameters,
      execute: impl.execute,
    });
  }
  
  return tools;
}

export const llmPrimitive = async (config: any, context: any) => {
  const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = google(config.model || 'gemini-1.5-flash');

  // Resolve messages from context (e.g., $input.messages)
  const messages = resolveVariables(config.messages, context);

  if (config.stream) {
    // STREAMING MODE: Returns HTTP response directly
    const result = await streamText({
      model,
      messages,
      system: config.system,
      maxSteps: config.tools ? 5 : 1, // Enables Tool Loop if tools exist
      tools: config.tools ? mapTools(config.tools) : undefined,
      // Lifecycle hooks (Option B: direct callbacks)
      onFinish: async ({ text, usage, response, steps, totalUsage }) => {
        if (config.onFinish) {
          const callback = callbackRegistry[config.onFinish];
          if (callback) await callback({ text, usage, totalUsage, steps });
        }
      },
      onError: ({ error }) => {
        if (config.onError) {
          const callback = callbackRegistry[config.onError];
          if (callback) callback({ error });
        }
        console.error('[Beddel] Stream error:', error);
      },
    });
    
    // Executor will detect this and return to client immediately
    return result.toDataStreamResponse(); 
  } else {
    // BLOCKING MODE: Returns data for next workflow step
    const result = await generateText({
      model,
      messages,
      system: config.system,
      tools: config.tools ? mapTools(config.tools) : undefined,
    });
    return { text: result.text, usage: result.usage };
  }
};
```

### Tool Registry

```typescript
// src/tools/index.ts
import { z } from 'zod';

export type ToolImplementation = {
  description: string;
  parameters: z.ZodSchema;
  execute: (args: any) => Promise<any>;
};

export const toolRegistry: Record<string, ToolImplementation> = {
  calculator: {
    description: 'Evaluate a mathematical expression',
    parameters: z.object({
      expression: z.string().describe('The math expression to evaluate'),
    }),
    execute: async ({ expression }) => {
      // Simple eval for MVP - use math.js in production
      return { result: Function(`"use strict"; return (${expression})`)() };
    },
  },
  
  getCurrentTime: {
    description: 'Get the current date and time',
    parameters: z.object({}),
    execute: async () => {
      return { time: new Date().toISOString() };
    },
  },
};
```

### Workflow Executor

```typescript
// src/core/workflow.ts
import type { WorkflowStep, ExecutionContext } from '../types';
import { handlerRegistry } from '../primitives';

export class WorkflowExecutor {
  private steps: WorkflowStep[];
  
  constructor(yamlContent: ParsedYaml) {
    this.steps = yamlContent.workflow;
  }

  async execute(input: any): Promise<Response | any> {
    const context: ExecutionContext = {
      input,
      variables: new Map(),
    };

    for (const step of this.steps) {
      const handler = handlerRegistry[step.type];
      if (!handler) throw new Error(`Unknown step type: ${step.type}`);

      const result = await handler(step.config, context);

      // CRITICAL: If handler returns Response/Stream, return immediately
      if (result instanceof Response) {
        return result;
      }

      // Store result for next steps
      if (step.result) {
        context.variables.set(step.result, result);
      }
    }

    // Return final context if no streaming occurred
    return Object.fromEntries(context.variables);
  }
}
```

---

## 6. Directory Structure

```
packages/beddel/
├── src/
│   ├── index.ts                  # Server exports (Node.js deps)
│   ├── client.ts                 # Client exports (types only, browser-safe)
│   ├── core/
│   │   ├── parser.ts             # YAML parsing (FAILSAFE_SCHEMA)
│   │   ├── workflow.ts           # WorkflowExecutor
│   │   └── variable-resolver.ts  # $variable.path resolution
│   ├── primitives/
│   │   ├── index.ts              # Handler registry
│   │   ├── llm.ts                # streamText/generateText wrapper
│   │   ├── output.ts             # JSON transform
│   │   └── call-agent.ts         # Sub-agent invocation
│   ├── tools/
│   │   └── index.ts              # Tool registry (calculator, getCurrentTime, etc.)
│   └── types/
│       └── index.ts              # Type definitions
├── package.json
└── tsconfig.json
```

### Bundle Separation

| Import Path | Contents | Use Case |
|-------------|----------|----------|
| `beddel` | `loadYaml`, `WorkflowExecutor`, `handlerRegistry` | API Routes, Server Components |
| `beddel/client` | Types only (`ParsedYaml`, `ExecutionContext`, etc.) | Client Components, type-checking |

> **Security**: The `beddel` entry point uses `fs/promises` (Node.js), preventing accidental import in browser bundles. Use `beddel/client` for client-side type imports.

---

## 7. API Route Example

```typescript
// app/api/beddel/chat/route.ts
import { loadYaml } from 'beddel/core/parser';
import { WorkflowExecutor } from 'beddel/core/workflow';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const { agentId, messages } = await request.json();
  
  // Load agent YAML
  const yaml = await loadYaml(`src/agents/${agentId}.yaml`);
  
  // Create executor
  const executor = new WorkflowExecutor(yaml);
  
  // Execute pipeline
  const result = await executor.execute({ messages });
  
  // Result is either a streaming Response or JSON
  if (result instanceof Response) {
    return result;
  }
  
  return Response.json(result);
}
```

---

## 8. Success Verification

| Step | Expected Behavior |
|------|-------------------|
| **Input** | POST `/api/beddel/chat` with messages |
| **Process** | System reads `chat.yaml`, invokes `llmPrimitive` |
| **Output** | Client receives text stream (Streaming) instantly, not a single JSON after 5 seconds |
| **Code** | No "ChatHandlers" with hardcoded business logic. Everything is defined in YAML |

### Test Command

```bash
curl -X POST http://localhost:3000/api/beddel/chat \
  -H "Content-Type: application/json" \
  -d '{"agentId": "assistant", "messages": [{"role": "user", "content": "Hello!"}]}'
```

---

## 9. Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2024-12-23 | 1.0.0 | Streaming Pipeline Edition: WorkflowExecutor with dual-mode LLM primitive (stream/block), REST API for Data Streams |

---

## Future Considerations (Post-MVP)

- [ ] `isolated-vm` for sandboxed JavaScript execution
- [ ] GraphQL layer for complex queries (optional)
- [ ] Additional primitives: `condition`, `loop`, `parallel`
- [ ] Agent registry with auto-discovery
