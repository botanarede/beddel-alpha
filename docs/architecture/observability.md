# Observability

> **Beddel Protocol v1.0.8** — Native workflow tracing and step lifecycle events.

---

## Overview

Beddel includes built-in observability support that provides visibility into workflow execution without requiring external instrumentation. When enabled, the system collects step lifecycle events and attaches them to the response.

**Key Features:**
- Zero-config setup (just enable in YAML metadata)
- Step-level granularity (start, complete, error events)
- Security-first design (sanitized error types, no sensitive data exposure)
- Streaming support (trace events sent as transient data)

---

## Enabling Observability

Add `observability.enabled: true` to your agent's metadata:

```yaml
metadata:
  name: "My Agent"
  version: "1.0.0"
  observability:
    enabled: true

workflow:
  - id: "step-1"
    type: "llm"
    # ...
```

---

## Response Format

### Blocking Workflows (llm, output-generator, etc.)

When observability is enabled, the response includes a `__trace` array:

```json
{
  "success": true,
  "data": { ... },
  "__trace": [
    {
      "type": "step-start",
      "stepId": "fetch-docs",
      "stepType": "mcp-tool",
      "stepIndex": 0,
      "totalSteps": 3,
      "timestamp": 1705849200000
    },
    {
      "type": "step-complete",
      "stepId": "fetch-docs",
      "stepType": "mcp-tool",
      "stepIndex": 0,
      "totalSteps": 3,
      "timestamp": 1705849201500,
      "duration": 1500
    },
    {
      "type": "step-start",
      "stepId": "analyze",
      "stepType": "llm",
      "stepIndex": 1,
      "totalSteps": 3,
      "timestamp": 1705849201501
    }
  ]
}
```

### Streaming Workflows (chat primitive)

For streaming responses, trace events are sent as transient data before the stream begins.

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

## Event Types

### StepStartEvent

Emitted when a workflow step begins execution.

```typescript
interface StepStartEvent {
  type: 'step-start';
  stepId: string;      // Unique step identifier from YAML
  stepType: string;    // Primitive type (chat, llm, mcp-tool, etc.)
  stepIndex: number;   // Zero-based index in workflow
  totalSteps: number;  // Total steps in workflow
  timestamp: number;   // Unix timestamp (ms)
}
```

### StepCompleteEvent

Emitted when a workflow step completes successfully.

```typescript
interface StepCompleteEvent {
  type: 'step-complete';
  stepId: string;
  stepType: string;
  stepIndex: number;
  totalSteps: number;
  timestamp: number;
  duration: number;    // Execution time in milliseconds
}
```

### StepErrorEvent

Emitted when a workflow step throws an error.

```typescript
interface StepErrorEvent {
  type: 'step-error';
  stepId: string;
  stepType: string;
  stepIndex: number;
  totalSteps: number;
  timestamp: number;
  duration: number;
  errorType: 'timeout' | 'auth_failed' | 'validation' | 'network' | 'unknown';
}
```

---

## Error Type Sanitization

For security, error messages are never exposed in trace events. Instead, errors are categorized into safe types:

| Error Type | Detection Pattern |
|------------|-------------------|
| `timeout` | Error message/name contains "timeout" |
| `auth_failed` | Error message contains "auth" or "unauthorized" |
| `validation` | Error message/name contains "valid" or "validation" |
| `network` | Error message contains "network" or "econnrefused" |
| `unknown` | Default for uncategorized errors |

This ensures that sensitive information (API keys, internal paths, etc.) is never leaked through observability data.

---

## Type Definitions

All observability types are exported from `beddel/client` for client-side usage:

```typescript
import type {
  ObservabilityConfig,
  StepEvent,
  StepStartEvent,
  StepCompleteEvent,
  StepErrorEvent,
  StepEventBase,
} from 'beddel/client';
```

### BeddelResponse with Trace

```typescript
interface BeddelResponse<T = unknown> {
  success: boolean;
  data?: T;
  __trace?: StepEvent[];  // Only present when observability is enabled
  error?: string;
}
```

---

## Implementation Details

### WorkflowExecutor

The `WorkflowExecutor` class handles observability:

1. Reads `metadata.observability.enabled` from parsed YAML
2. Creates `context.trace` array when enabled
3. Emits `step-start` before each handler call
4. Emits `step-complete` or `step-error` after handler returns
5. Attaches trace to final response via `attachTrace()` helper

### Chat Primitive

The `chat` primitive handles streaming with observability:

1. Checks if `context.trace` has events
2. Uses `createUIMessageStream` to send trace as transient data
3. Merges LLM stream after trace data

---

## Built-in Demo Agent

The `observability-demo` agent demonstrates trace collection:

```yaml
# src/agents/observability/observability-demo.yaml
metadata:
  name: "Beddel Protocol Expert"
  version: "1.0.0"
  observability:
    enabled: true

workflow:
  - id: "fetch-docs"
    type: "mcp-tool"
    config:
      url: "https://gitmcp.io/botanarede/beddel"
      tool: "fetch_beddel_documentation"
    result: "beddelDocs"

  - id: "search-docs"
    type: "mcp-tool"
    config:
      url: "https://gitmcp.io/botanarede/beddel"
      tool: "search_beddel_documentation"
      arguments:
        query: "$input.query"
    result: "searchResults"

  - id: "generate-response"
    type: "llm"
    config:
      provider: "google"
      model: "gemini-2.0-flash-exp"
      system: |
        You are an expert assistant specialized in the Beddel Protocol.
        Use the documentation provided to answer questions accurately.
        
        ## Documentation
        $stepResult.beddelDocs.data
        
        ## Search Results
        $stepResult.searchResults.data
      messages:
        - role: "user"
          content: "$input.query"
    result: "expertResponse"

return:
  success: true
  data: "$stepResult.expertResponse"
```

---

## Best Practices

1. **Enable in development** — Use observability to debug workflow execution
2. **Disable in production** — Consider disabling for performance-critical paths
3. **Monitor durations** — Use `duration` field to identify slow steps
4. **Handle errors gracefully** — Use `errorType` to categorize failures
5. **Client-side visualization** — Build dashboards using trace data

---

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2026-01-21 | 1.0.8 | Initial observability implementation |
