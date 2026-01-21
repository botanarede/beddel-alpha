# API Reference

> **Beddel Protocol v1.0.8** — Complete API documentation for all public exports.

---

## Entry Points

| Import Path | Purpose |
|-------------|---------|
| `beddel` | Full server API — core functions, registries, and extensibility |
| `beddel/server` | Server handler factory for Next.js API routes |
| `beddel/client` | Type-only exports for client-side usage |

---

## `beddel` (Main Entry)

### Core Functions

#### `loadYaml(path: string): Promise<ParsedYaml>`

Load and parse a YAML workflow file securely using `FAILSAFE_SCHEMA`.

```typescript
import { loadYaml } from 'beddel';

const yaml = await loadYaml('./src/agents/assistant.yaml');
console.log(yaml.metadata.name); // "Streaming Assistant"
```

#### `resolveVariables(template: unknown, context: ExecutionContext): unknown`

Resolve variable references (`$input.*`, `$stepResult.*`, `$env.*`) in templates.

```typescript
import { resolveVariables } from 'beddel';

const resolved = resolveVariables('$input.messages', context);
```

---

### Classes

#### `WorkflowExecutor`

Sequential pipeline executor for YAML workflows.

```typescript
import { WorkflowExecutor, loadYaml } from 'beddel';

const yaml = await loadYaml('./src/agents/assistant.yaml');
const executor = new WorkflowExecutor(yaml);

// Execute with input data
const result = await executor.execute({ messages: [...] });

if (result instanceof Response) {
  return result; // Streaming response (from 'chat' primitive)
}
return Response.json(result); // Blocking result (from 'llm' primitive)
```

**Constructor:** `new WorkflowExecutor(yaml: ParsedYaml)`

**Methods:**
- `execute(input: unknown): Promise<Response | Record<string, unknown>>`

---

### Registries

#### `handlerRegistry: Record<string, PrimitiveHandler>`

Map of primitive step types to their handler functions.

**Built-in handlers:**
- `chat` — Frontend chat interface (always streaming, converts UIMessage)
- `llm` — Workflow LLM calls (never streaming, uses ModelMessage directly)
- `output-generator` — Deterministic JSON transform
- `call-agent` — Sub-agent invocation
- `mcp-tool` — External MCP server tool execution
- `google-business` — Google Business Profile API integration
- `notion` — Notion workspace integration (pages, databases, blocks)

#### `toolRegistry: Record<string, ToolImplementation>`

Map of tool names to their implementations for LLM function calling.

**Built-in tools:**
- `calculator` — Evaluate mathematical expressions
- `getCurrentTime` — Get current ISO timestamp

#### `providerRegistry: Record<string, ProviderImplementation>`

Map of provider names to their implementations for LLM model creation.

**Built-in providers:**
- `google` — Google Gemini via `@ai-sdk/google` (requires `GEMINI_API_KEY`)
- `bedrock` — Amazon Bedrock via `@ai-sdk/amazon-bedrock` (requires AWS credentials)
- `openrouter` — OpenRouter via `@ai-sdk/openai` (requires `OPENROUTER_API_KEY`, 400+ models)

---

### Extensibility Functions

#### `registerPrimitive(type: string, handler: PrimitiveHandler): void`

Register a custom primitive handler.

```typescript
import { registerPrimitive } from 'beddel';

registerPrimitive('http-fetch', async (config, context) => {
  const response = await fetch(config.url);
  return { data: await response.json() };
});
```

#### `registerTool(name: string, implementation: ToolImplementation): void`

Register a custom tool for LLM function calling.

```typescript
import { registerTool } from 'beddel';
import { z } from 'zod';

registerTool('weatherLookup', {
  description: 'Get weather for a city',
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => fetchWeather(city),
});
```

#### `registerCallback(name: string, callback: CallbackFn): void`

Register a lifecycle callback for streaming hooks (used by `chat` primitive).

```typescript
import { registerCallback } from 'beddel';

registerCallback('persistConversation', async ({ text, usage }) => {
  await db.saveMessage(text, usage);
});
```

#### `registerProvider(name: string, implementation: ProviderImplementation): void`

Register a custom LLM provider for dynamic model selection.

```typescript
import { registerProvider } from 'beddel';
import { createOpenAI } from '@ai-sdk/openai';

registerProvider('openai', {
  createModel: (config) => {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai(config.model || 'gpt-4');
  },
});
```

#### `createModel(provider: string, config: ProviderConfig): LanguageModel`

Create a LanguageModel instance from a registered provider.

```typescript
import { createModel } from 'beddel';

const model = createModel('google', { model: 'gemini-2.0-flash-exp' });
const bedrockModel = createModel('bedrock', { model: 'anthropic.claude-3-haiku-20240307-v1:0' });
const openrouterModel = createModel('openrouter', { model: 'qwen/qwen3-coder:free' });
```

---

## `beddel/server`

### `createBeddelHandler(options?: BeddelHandlerOptions)`

Factory function for creating Next.js API route handlers.

```typescript
// app/api/beddel/chat/route.ts
import { createBeddelHandler } from 'beddel/server';

export const POST = createBeddelHandler({
  agentsPath: 'src/agents',      // Optional, default: 'src/agents'
  disableBuiltinAgents: false,   // Optional, default: false
});
```

**Options:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `agentsPath` | `string` | `'src/agents'` | Directory containing YAML agent files |
| `disableBuiltinAgents` | `boolean` | `false` | Disable built-in agents bundled with package |

**Request Body (for `chat` primitive):**

```json
{
  "agentId": "assistant",
  "messages": [
    {
      "role": "user",
      "parts": [{ "type": "text", "text": "Hello!" }]
    }
  ]
}
```

**Request Body (for `llm` primitive / workflows):**

```json
{
  "agentId": "text-generator",
  "messages": [
    { "role": "user", "content": "Generate text about cats" }
  ]
}
```

---

## `beddel/client`

Type-only exports safe for client-side bundles (no Node.js dependencies).

```typescript
import type {
  ParsedYaml,
  WorkflowStep,
  StepConfig,
  YamlMetadata,
  ExecutionContext,
  PrimitiveHandler,
  BeddelResponse,
  // Observability types
  ObservabilityConfig,
  StepEvent,
  StepStartEvent,
  StepCompleteEvent,
  StepErrorEvent,
} from 'beddel/client';
```

---

## Observability

Beddel includes native observability support for workflow execution tracing.

### Enabling Observability

Add `observability.enabled: true` to your agent's metadata:

```yaml
metadata:
  name: "My Agent"
  version: "1.0.0"
  observability:
    enabled: true

workflow:
  # ... steps
```

### Response Format

When enabled, the response includes a `__trace` array:

```typescript
interface BeddelResponse<T = unknown> {
  success: boolean;
  data?: T;
  __trace?: StepEvent[];  // Only present when observability is enabled
  error?: string;
}
```

### Event Types

| Event | Description | Extra Fields |
|-------|-------------|--------------|
| `step-start` | Step execution begins | — |
| `step-complete` | Step completed successfully | `duration` (ms) |
| `step-error` | Step threw an error | `duration` (ms), `errorType` |

### Error Types (Sanitized)

For security, error messages are never exposed:

| Error Type | Description |
|------------|-------------|
| `timeout` | Operation timed out |
| `auth_failed` | Authentication/authorization error |
| `validation` | Input validation failed |
| `network` | Network connectivity issue |
| `unknown` | Uncategorized error |

### Streaming with Observability

For `chat` primitives, trace events are sent as transient data before the stream.

> **Note:** Transient data parts are only accessible via the `onData` callback. They do not appear in the `messages` array.

```typescript
// Client-side handling with useChat (AI SDK v6)
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

const [streamTrace, setStreamTrace] = useState<StepEvent[]>([]);

const { messages, sendMessage, status } = useChat({
  transport: new DefaultChatTransport({
    api: '/api/beddel/chat',
    body: { agentId: 'observability-demo-stream' },
  }),
  onData: (dataPart) => {
    if (dataPart.type === 'data-trace') {
      setStreamTrace(dataPart.data.events);
    }
  },
});
```

---

## YAML Workflow Structure

### Explicit Return Template

The `return` property at the workflow level defines the exact shape of the API response. This provides explicit control over the API contract, separating internal workflow state from the public response.

**Without `return`:** API returns all accumulated step variables (internal state exposed)

**With `return`:** API returns only the resolved template (clean contract)

```yaml
metadata:
  name: "Newsletter Signup"
  version: "1.0.0"

workflow:
  - id: "analyze"
    type: "llm"
    config:
      # ... LLM config ...
    result: "analysis"  # Stored internally

  - id: "save"
    type: "notion"
    config:
      # ... Notion config ...
    result: "notionResult"  # Stored internally

# Explicit API response shape
return:
  success: true
  pageId: "$stepResult.notionResult.pageId"
  url: "$stepResult.notionResult.url"
  summary: "$stepResult.analysis.text"
```

**Response:**
```json
{
  "success": true,
  "pageId": "abc123...",
  "url": "https://notion.so/...",
  "summary": "Analysis text..."
}
```

**Return Resolution Order:**
1. If `return` is defined → resolve and return the template
2. If last step has no `result` → return last step's output directly
3. Otherwise → return all accumulated variables

---

## Primitives

### `chat` Primitive

Frontend chat interface. **Always streams** responses for responsive UX.

**Use when:**
- Input comes from `useChat` frontend hook
- Messages are in `UIMessage` format (with `parts` array)

**Behavior:**
- Converts `UIMessage[]` to `ModelMessage[]` automatically
- Returns streaming `Response` via `toUIMessageStreamResponse()`
- Supports `onFinish` and `onError` lifecycle callbacks

```yaml
workflow:
  - id: "chat"
    type: "chat"
    config:
      provider: "google"
      model: "gemini-2.0-flash-exp"
      system: "You are a helpful assistant."
      messages: "$input.messages"
      onFinish: "saveConversation"
```

### `llm` Primitive

Workflow LLM calls. **Never streams** — returns complete result for workflow chaining.

**Use when:**
- Building multi-step workflows
- Result needs to be passed to next step
- Called from `call-agent` or other workflow steps

**Behavior:**
- Uses `ModelMessage[]` format directly (no conversion)
- Returns `{ text, usage }` object
- Result stored in `context.variables` for subsequent steps

```yaml
workflow:
  - id: "generate"
    type: "llm"
    config:
      provider: "google"
      model: "gemini-2.0-flash-exp"
      system: "Generate creative text."
      messages:
        - role: "user"
          content: "$input.prompt"
    result: "generatedText"
```

### `call-agent` Primitive

Invoke another agent's workflow as a sub-routine.

**Use when:**
- Composing complex workflows from simpler agents
- Reusing agent logic across multiple workflows

```yaml
workflow:
  - id: "generate-text"
    type: "call-agent"
    config:
      agentId: "text-generator"
      input:
        messages: "$input.messages"
    result: "generatedText"
```

### `output-generator` Primitive

Deterministic JSON transform using variable resolution. Supports optional JSON parsing from LLM text output.

**Config Options:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `template` | `object` | No | JSON template with variable references |
| `json` | `string` | No | Variable reference to parse as JSON (e.g., `$stepResult.llmOutput.text`) |

**Basic Usage:**

```yaml
workflow:
  - id: "format-output"
    type: "output-generator"
    config:
      template:
        text: "$stepResult.generatedText.text"
        status: "completed"
    result: "finalOutput"
```

**JSON Parsing from LLM Output:**

When LLM returns JSON as text, use the `json` parameter to parse it and access fields via `$json.*`:

```yaml
workflow:
  # Step 1: LLM generates JSON
  - id: "analyze"
    type: "llm"
    config:
      system: "Return JSON: {\"tags\": [\"tag1\"], \"sentiment\": \"Positive\"}"
      messages: "$input.messages"
    result: "analysis"

  # Step 2: Parse JSON and extract fields
  - id: "parse"
    type: "output-generator"
    config:
      json: "$stepResult.analysis.text"
      template:
        tags: "$json.tags"
        sentiment: "$json.sentiment"
    result: "parsed"
```

The `json` parameter:
- Extracts JSON from markdown code blocks if present
- Parses the JSON and makes it available as `$json.*`
- If no template is provided, returns the parsed JSON directly

### `mcp-tool` Primitive

Connect to external MCP servers via SSE and execute tools.

**Use when:**
- Integrating with GitMCP for documentation fetching
- Connecting to Context7 or other MCP services
- Building agents that need external tool access

**Behavior:**
- Lazy loads MCP SDK (optional dependency)
- Connects via SSE transport
- Supports tool discovery via `list_tools`
- Returns `{ success, data, toolNames?, error? }`

**Config Options:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `url` | `string` | Yes | MCP server URL (SSE endpoint) |
| `tool` | `string` | Yes | Tool name to execute (or `list_tools`) |
| `arguments` | `object` | No | Arguments to pass to the tool |
| `timeout` | `number` | No | Timeout in ms (default: 30000) |

```yaml
workflow:
  - id: "fetch-docs"
    type: "mcp-tool"
    config:
      url: "https://gitmcp.io/vercel/ai"
      tool: "fetch_ai_documentation"
      arguments: {}
    result: "mcpDocs"
```

**Multi-step Example (MCP + Chat):**

```yaml
workflow:
  # Step 1: Fetch documentation from GitMCP
  - id: "fetch-docs"
    type: "mcp-tool"
    config:
      url: "https://gitmcp.io/owner/repo"
      tool: "fetch_repo_documentation"
      arguments: {}
    result: "mcpDocs"

  # Step 2: Respond using the fetched documentation
  - id: "respond"
    type: "chat"
    config:
      provider: "google"
      model: "gemini-2.0-flash-exp"
      system: |
        You have access to documentation:
        $stepResult.mcpDocs.data
      messages: "$input.messages"
```

### `notion` Primitive

Integrate with Notion API for pages, databases, blocks, and search.

**Environment Variables:**
- `NOTION_TOKEN` — Internal Integration Secret (starts with `ntn_`)

**Supported Actions:**

| Action | Description | Required Config |
|--------|-------------|-----------------|
| `search` | Search pages and databases | `query?`, `filter?` |
| `getPage` | Retrieve a page by ID | `pageId` |
| `createPage` | Create a new page | `parent`, `properties` |
| `updatePage` | Update page properties | `pageId`, `properties?` |
| `getDatabase` | Retrieve database schema | `databaseId` |
| `queryDatabase` | Query database with filters | `databaseId`, `filter?`, `sorts?` |
| `getBlocks` | Get block children | `blockId` or `pageId` |
| `appendBlocks` | Append blocks to page/block | `blockId` or `pageId`, `children` |
| `createDatabase` | Create a new database | `parent`, `properties`, `title?` |

**Example:**

```yaml
workflow:
  - id: "create-entry"
    type: "notion"
    config:
      action: "createPage"
      parent:
        type: "database_id"
        database_id: "a7661a0a-c5b7-47a0-98f8-fd07789d1647"
      properties:
        Name:
          title:
            - text:
                content: "$input.name"
        Email:
          email: "$input.email"
    result: "notionResult"
```

> See `packages/beddel/docs/primitives/notion-primitive.md` for full documentation.

### `google-business` Primitive

Integrate with Google Business Profile APIs for reviews, posts, Q&A, and metrics.

**Environment Variables:**
- `GOOGLE_CLIENT_ID` — OAuth2 Client ID
- `GOOGLE_CLIENT_SECRET` — OAuth2 Client Secret
- `GOOGLE_REFRESH_TOKEN` — OAuth2 Refresh Token

**Supported Actions:**

| Action | Description |
|--------|-------------|
| `listReviews` | Fetch reviews with auto-pagination |
| `replyReview` | Reply to a specific review |
| `batchGetReviews` | Fetch from multiple locations |
| `createPost` | Create a local post |
| `listPosts` | List all posts |
| `getMetrics` | Fetch performance metrics |
| `listQuestions` | List Q&A |
| `answerQuestion` | Answer a question |

**Example:**

```yaml
workflow:
  - id: "fetch-reviews"
    type: "google-business"
    config:
      action: "listReviews"
      accountId: "$input.accountId"
      locationId: "$input.locationId"
      pageSize: 100
    result: "reviewsData"
```

> See `packages/beddel/docs/primitives/google-business-primitive.md` for full documentation.

---

## Built-in Agents

| Agent ID | Category | Provider | Description |
|----------|----------|----------|-------------|
| `assistant` | `chat/` | Google | Streaming chat assistant |
| `assistant-bedrock` | `chat/` | Bedrock | Llama 3.2 assistant |
| `assistant-openrouter` | `chat/` | OpenRouter | Free tier assistant |
| `assistant-gitmcp` | `mcp/` | Google + MCP | Documentation assistant via GitMCP |
| `business-analyzer` | `google-business/` | Google | Business reviews analyzer |
| `newsletter-signup` | `marketing/` | Google | Lead capture with Notion integration |
| `text-generator` | `utility/` | Google | Text generation (non-streaming) |
| `observability-demo` | `observability/` | Google + MCP | Multi-step demo with trace collection |
| `multi-step-assistant` | `examples/` | Google | 4-step analysis pipeline |

---

## Type Definitions

### `ParsedYaml`

```typescript
interface ParsedYaml {
  metadata: YamlMetadata;
  workflow: WorkflowStep[];
  return?: unknown;  // Optional explicit return template
}
```

### `WorkflowStep`

```typescript
interface WorkflowStep {
  id: string;
  type: string;  // 'chat' | 'llm' | 'output-generator' | 'call-agent' | custom
  config: StepConfig;
  result?: string;
}
```

### `ExecutionContext`

```typescript
interface ExecutionContext {
  input: unknown;
  variables: Map<string, unknown>;
}
```

### `PrimitiveHandler`

```typescript
type PrimitiveHandler = (
  config: StepConfig,
  context: ExecutionContext
) => Promise<Response | Record<string, unknown>>;
```

---

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2024-12-24 | 1.0.0 | Initial API reference |
| 2024-12-24 | 1.0.1 | AI SDK v6 compatibility |
| 2024-12-25 | 1.0.2 | Provider registry, bedrock support |
| 2024-12-26 | 1.0.3 | OpenRouter provider, built-in agents |
| 2024-12-27 | 1.0.4 | Separated `chat` and `llm` primitives, implemented `call-agent` |
| 2024-12-28 | 1.0.5 | Added `mcp-tool` primitive, `assistant-gitmcp` agent, system prompt variable resolution |
| 2024-12-30 | 1.0.6 | Added `google-business` primitive for Google Business Profile API |
| 2026-01-01 | 1.0.7 | Added `notion` primitive for Notion API integration |
| 2026-01-21 | 1.0.8 | Added native observability with workflow tracing and step lifecycle events |
