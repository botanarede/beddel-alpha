# AGENTS.md — Beddel Protocol

> **Language Policy**: The native language of the Beddel protocol is **English**. All code, comments, commit messages, documentation, and agent manifests **must be written in English**. This ensures consistency, broader accessibility, and seamless integration with AI agents.

This document provides essential context for AI agents and developers working on the `packages/beddel` codebase. It complements `README.md` with implementation details, navigation guides, and operational instructions.

---

## 1. Project Overview

**Beddel** is a security-hardened YAML execution toolkit for building declarative AI agents. It provides:

- **Secure YAML parsing** with strict schema validation
- **Isolated runtime environments** with sandboxed execution
- **Declarative agent definitions** via YAML manifests
- **Built-in compliance** (GDPR/LGPD) and audit trails
- **Provider-agnostic multi-tenant support** with swappable backends (Firebase, in-memory, etc.)

**Target Users**: Backend teams embedding declarative YAML agents in Node.js services.

---

## 2. Source Tree Structure

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `src/parser` | Secure YAML parsing with FAILSAFE schema | `SecureYamlParser` |
| `src/runtime` | Isolated execution, declarative interpreter, workflow executor | `DeclarativeAgentInterpreter`, `workflowExecutor` |
| `src/agents` | Agent registry and sharded agent modules | `AgentRegistry`, `*/index.ts`, `*/*.handler.ts` |
| `src/shared` | Client-safe types and utilities | `types/`, `utils/` |
| `src/client` | Client-safe exports | `index.ts`, `types.ts` |
| `src/security` | Threat detection, scoring, hardening | `SecurityScanner` |
| `src/compliance` | GDPR/LGPD compliance engines | `GDPRCompliance`, `LGPDCompliance` |
| `src/audit` | Hash-based audit trail logging | `AuditTrail` |
| `src/tenant` | Provider-agnostic multi-tenant management | `TenantManager`, `ITenantProvider`, `ProviderFactory` |
| `src/firebase` | Firebase-specific tenant provider (**deprecated**) | `MultiTenantFirebaseManager` |
| `src/performance` | Monitoring, autoscaling, benchmarking | `PerformanceMonitor` |
| `src/integration` | High-level runtime glue | `SecureYamlRuntime` |

All exports are centralized in `src/index.ts`.

> ⚠️ **Deprecation Notice**: `src/firebase/tenantManager.ts` is deprecated. Use `src/tenant/TenantManager` with the appropriate provider instead.

---

## 3. Setup Commands

```bash
# Install dependencies
pnpm install

# Build the package
pnpm --filter beddel build

# Run tests
pnpm --filter beddel test

# Run linting
pnpm --filter beddel lint
```

---

## 4. Code Style Guidelines

### General Rules

- **Language**: All code, comments, and documentation must be in English
- **TypeScript**: Use strict typing; avoid `any` unless absolutely necessary
- **Naming**: Use camelCase for variables/functions, PascalCase for classes/interfaces
- **Imports**: Prefer named exports; group imports by external/internal

### YAML Parsing Rules

- Always use `js-yaml` with `FAILSAFE_SCHEMA` — never enable custom tags
- Respect `YAMLParserConfig` limits (depth, keys, string length, UTF-8 validation)
- Any relaxation of limits requires justification and new tests

### Runtime Rules

- `IsolatedRuntimeManager` maintains an isolate pool; dangerous globals (`require`, `eval`, timers) are stripped
- New module allowlists must be added to `securityProfiles` with explicit justification
- `SimpleIsolatedRuntimeManager` is for low-overhead scenarios; keep it minimal

### Security Rules

- `SecurityScanner` is synchronous — avoid I/O heavy operations in hot paths
- Compliance engines assume `AuditTrail` is available; pass singletons when possible
- Never store raw secrets in audit logs; use `sanitizeForAudit`

---

## 5. Agent Development

### Declarative Agent Structure

Agent manifests live in `src/agents/{agent-name}/` with a sharded structure:

```
src/agents/joker/
├── joker.yaml           # Agent definition
├── joker.handler.ts     # Server-only execution logic
├── joker.schema.ts      # Zod validation schemas
├── joker.types.ts       # TypeScript type definitions
└── index.ts             # Public exports (client-safe)
```

### Supported Workflow Step Types

| Step Type | Description | Required Props |
|-----------|-------------|----------------|
| `output-generator` | Returns literal or computed values | — |
| `joke` | Generates jokes via Gemini | `gemini_api_key` |
| `translation` | Translates text via Gemini | `gemini_api_key` |
| `image` | Generates images via Gemini | `gemini_api_key` |
| `mcp-tool` | Invokes MCP server tools | — |
| `vectorize` | Generates text embeddings | `gemini_api_key` |
| `chromadb` | Vector storage and retrieval | — |
| `gitmcp` | Fetches GitHub documentation | — |
| `rag` | RAG answer generation (requires documents) | `gemini_api_key` |
| `llm` | Direct LLM chat (no documents) | `gemini_api_key` |
| `chat` | Orchestrates RAG or LLM based on mode | `gemini_api_key` |
| `custom-action` | Executes custom TypeScript functions | Varies |

> **Note**: Legacy step type names (`genkit-joke`, `genkit-translation`, `genkit-image`, `gemini-vectorize`) are deprecated. Use the preferred names above.

### Built-in Agents

| Agent | Method | Required Props | Description |
|-------|--------|----------------|-------------|
| `joker/joker.yaml` | `joker.execute` | `gemini_api_key` | Generates short jokes |
| `translator/translator.yaml` | `translator.execute` | `gemini_api_key` | Text translation with metadata |
| `image/image.yaml` | `image.generate` | `gemini_api_key` | Image generation with base64 output |
| `mcp-tool/mcp-tool.yaml` | `mcp-tool.execute` | — | MCP server tool invocation |
| `gemini-vectorize/gemini-vectorize.yaml` | `gemini-vectorize.execute` | `gemini_api_key` | Text embeddings |
| `chromadb/chromadb.yaml` | `chromadb.execute` | — | Vector storage/retrieval |
| `gitmcp/gitmcp.yaml` | `gitmcp.execute` | — | GitHub documentation fetching |
| `rag/rag.yaml` | `rag.execute` | `gemini_api_key` | RAG answer generation (requires document context) |
| `llm/llm.yaml` | `llm.execute` | `gemini_api_key` | Direct LLM chat with conversation history |
| `chat/chat.yaml` | `chat.execute` | `gemini_api_key` | Chat orchestrator (RAG or direct LLM) |

### Agent Architecture

The chat system follows a clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CHAT AGENT (Orchestrator)                 │
│  - Receives mode: 'simple' | 'rag'                              │
│  - If 'simple': calls LLM agent directly                        │
│  - If 'rag': orchestrates vectorize → chromadb → RAG            │
└─────────────────────────────────────────────────────────────────┘
          │                                    │
          │ mode='simple'                      │ mode='rag'
          ▼                                    ▼
┌─────────────────────┐          ┌─────────────────────────────────┐
│     LLM AGENT       │          │  VECTORIZE → CHROMADB → RAG     │
│  - Direct LLM call  │          │                                 │
│  - Conversation     │          │  RAG AGENT:                     │
│    history support  │          │  - ALWAYS requires documents    │
│  - No documents     │          │  - Pure RAG functionality       │
└─────────────────────┘          └─────────────────────────────────┘
```

- **LLM Agent**: Direct LLM interaction without document context
- **RAG Agent**: Retrieval-Augmented Generation (always requires documents)
- **Chat Agent**: Orchestrator that routes to LLM or RAG based on mode

### Custom Agents

Custom agents can be created in the application's `/agents` directory:

1. Create a YAML manifest defining the agent schema and workflow
2. Create a corresponding TypeScript file for custom logic
3. The `AgentRegistry` automatically loads agents from `/agents` with higher priority than built-in agents

---

## 6. GraphQL API Integration

This section explains how to create a GraphQL endpoint to expose Beddel agents in your Next.js application.

### API Route Implementation

Create a file at `src/app/api/graphql/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { executeChatHandler } from "beddel/agents/chat/chat.handler";
import { executeLlmHandler } from "beddel/agents/llm/llm.handler";
import { executeRagHandler } from "beddel/agents/rag/rag.handler";
import type { ExecutionContext } from "beddel";
import type { ChatHandlerParams } from "beddel/agents/chat";

interface GraphQLRequest {
  query: string;
  variables?: {
    input?: ChatHandlerParams;
  };
}

interface ExecuteMethodResult {
  success: boolean;
  data?: unknown;
  error?: string | null;
  executionTime?: number;
}

// Create execution context for the handler
function createExecutionContext(): ExecutionContext {
  const context: ExecutionContext = {
    logs: [],
    status: "running",
    output: null,
    error: undefined,
    log: (message: string) => {
      context.logs.push(`[${new Date().toISOString()}] ${message}`);
      console.log(message);
    },
    setOutput: (data: unknown) => {
      context.output = data;
      context.status = "success";
    },
    setError: (err: string) => {
      context.error = err;
      context.status = "error";
    },
  };
  return context;
}

// Get props from environment variables
function getPropsFromEnv(): Record<string, string> {
  return {
    gemini_api_key: process.env.GEMINI_API_KEY || "",
    chromadb_tenant: process.env.CHROMADB_TENANT || "",
    chromadb_api_key: process.env.CHROMADB_API_KEY || "",
    chromadb_database: process.env.CHROMADB_DATABASE || "",
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: GraphQLRequest = await request.json();
    const { variables } = body;
    const params = variables?.input;

    if (!params || !params.messages) {
      return NextResponse.json(
        { errors: [{ message: "Missing required input.messages parameter" }] },
        { status: 400 }
      );
    }

    const context = createExecutionContext();
    const props = getPropsFromEnv();

    // Execute chat handler (orchestrates LLM or RAG based on mode)
    const result = await executeChatHandler(params, props, context);

    const executeMethodResult: ExecuteMethodResult = {
      success: true,
      data: result,
      error: null,
      executionTime: Date.now() - startTime,
    };

    return NextResponse.json({
      data: { executeMethod: executeMethodResult },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      data: {
        executeMethod: {
          success: false,
          data: null,
          error: message,
          executionTime: Date.now() - startTime,
        },
      },
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
```

### Client-Side API Helper

Create a file at `src/lib/chat-api.ts`:

```typescript
import type { ConversationMessage, ChatHandlerResult, ExecutionStep } from "beddel";

export type { ConversationMessage as Message, ChatHandlerResult, ExecutionStep };

export interface ApiResponse {
  success: boolean;
  data?: ChatHandlerResult;
  error?: string;
  executionTime?: number;
}

const GRAPHQL_QUERY = `
mutation ExecuteChat($input: JSON!) {
  executeMethod(
    methodName: "chat.execute",
    params: $input,
    props: {}
  ) {
    success
    data
    error
    executionTime
  }
}
`;

export type ChatMode = 'rag' | 'simple';

export async function sendChatMessage(
  messages: ConversationMessage[],
  mode: ChatMode = 'rag'
): Promise<ApiResponse> {
  try {
    const response = await fetch("/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: GRAPHQL_QUERY,
        variables: { input: { messages, mode } },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || `HTTP error! status: ${response.status}`,
      };
    }

    const json = await response.json();

    if (json.errors) {
      return { success: false, error: json.errors[0]?.message || "GraphQL Error" };
    }

    const result = json.data?.executeMethod;
    if (!result) {
      return { success: false, error: "Invalid GraphQL response structure" };
    }

    return {
      success: result.success,
      data: result.data as ChatHandlerResult,
      error: result.error,
      executionTime: result.executionTime,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send message";
    return { success: false, error: message };
  }
}
```

### Usage Example

```typescript
import { sendChatMessage, type Message } from "@/lib/chat-api";

// Simple mode: Direct LLM chat (no document context)
const simpleResponse = await sendChatMessage(
  [{ role: "user", content: "Hello, how are you?" }],
  "simple"
);

// RAG mode: Knowledge-based answers (default)
const ragResponse = await sendChatMessage(
  [{ role: "user", content: "What is the Beddel protocol?" }],
  "rag"
);

// With conversation history
const messages: Message[] = [
  { role: "user", content: "What is TypeScript?" },
  { role: "assistant", content: "TypeScript is a typed superset of JavaScript..." },
  { role: "user", content: "How do I use interfaces?" },
];
const response = await sendChatMessage(messages, "simple");
```

### Environment Variables

Configure the following environment variables in your `.env.local`:

```bash
# Required for LLM/RAG functionality
GEMINI_API_KEY=your_gemini_api_key

# Optional: ChromaDB for RAG mode
CHROMADB_TENANT=your_tenant
CHROMADB_API_KEY=your_chromadb_key
CHROMADB_DATABASE=your_database
```

### GraphQL Schema Reference

The Beddel GraphQL API uses the following schema:

```graphql
type Query {
  ping: String!
}

type Mutation {
  executeMethod(
    methodName: String!
    params: JSON!
    props: JSON!
  ): ExecutionResult!
}

type ExecutionResult {
  success: Boolean!
  data: JSON
  error: String
  executionTime: Int!
}

scalar JSON
```

### Available Methods

| Method Name | Description | Mode |
|-------------|-------------|------|
| `chat.execute` | Chat orchestrator (recommended) | `simple` or `rag` |
| `llm.execute` | Direct LLM chat | — |
| `rag.execute` | RAG with documents | — |
| `joker.execute` | Joke generation | — |
| `translator.execute` | Text translation | — |

---

## 7. Testing Instructions

### Test Commands

```bash
# Run all tests
pnpm --filter beddel test

# Run specific test files
node packages/beddel/tests/test-runtime.js
node packages/beddel/tests/test-runtime-security.js
```

### Test Requirements

- Add regression tests for any runtime changes in `tests/`
- Mock `firebase-admin` or guard tests behind environment checks
- Security-focused tests (`test-runtime-security.js`, `test-session*`) cover threat detection and isolation
- Schema validation changes require tests for caching, invalid payloads, and output rejection

---

## 8. Boundaries and Guardrails

### What Agents SHOULD Do

- ✅ Use existing utilities from `src/` before creating new ones
- ✅ Follow the YAML FAILSAFE schema strictly
- ✅ Add tests for any new functionality
- ✅ Update documentation when modifying APIs

### What Agents SHOULD NOT Do

- ❌ Modify security profiles without explicit approval
- ❌ Enable custom YAML tags or relax parsing limits without justification
- ❌ Store secrets or sensitive data in logs
- ❌ Create new directories without checking if functionality fits existing concerns
- ❌ Write code or documentation in languages other than English

### Files Requiring Caution

- `src/security/*` — Core security logic; changes require thorough review
- `src/parser/SecureYamlParser.ts` — Parsing security; modifications need justification
- `src/runtime/IsolatedRuntimeManager.ts` — Sandbox isolation; high-risk changes
- `src/tenant/*` — Multi-tenant isolation; provider changes require review

---

## 9. Documentation Sync Duties

When making changes, ensure documentation stays synchronized:

| Change Type | Update Required |
|-------------|-----------------|
| Code changes | Update `README.md` and `AGENTS.md` |
| API changes | Update `docs/` and export list in `src/index.ts` |
| New agents | Add to agent catalog in this file |
| Spec changes | Reflect in `docs/beddel` |
| Schema changes | Document in interpreter section |

---

## 10. Contribution Checklist

Before submitting changes:

- [ ] Code and comments are in English
- [ ] Understand the modules being modified (see source tree)
- [ ] Tests added or updated for changes
- [ ] `README.md` and `AGENTS.md` updated
- [ ] `pnpm --filter beddel build` passes
- [ ] `pnpm --filter beddel lint` passes
- [ ] Roadmap gaps documented in README

---

## 11. Handling Uncertainty

When encountering ambiguous requirements or edge cases:

1. **Ask clarifying questions** before implementing
2. **Propose a plan** and wait for approval on significant changes
3. **Document assumptions** in code comments and commit messages
4. **Create draft PRs** with implementation notes for review

---

## 12. Git Workflow

### Commit Message Format

```
<type>: <short description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

### Branch Naming

- Features: `feat/<description>`
- Fixes: `fix/<description>`
- Documentation: `docs/<description>`

---

*This document is living documentation. Update it as the codebase evolves.*
