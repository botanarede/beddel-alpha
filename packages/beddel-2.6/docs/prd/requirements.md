# Requirements

## Functional Requirements

- **FR1:** The system MUST parse YAML workflow definitions using a secure schema (FAILSAFE_SCHEMA)
- **FR2:** The system MUST execute workflow steps sequentially via `WorkflowExecutor`
- **FR3:** The `llm` primitive MUST support dual-mode operation:
  - `stream: true` → returns `Response` from `streamText`
  - `stream: false` → returns JSON object from `generateText`
- **FR4:** The executor MUST immediately return a `Response` when a primitive returns a stream
- **FR5:** The system MUST resolve variables using `$input.*` and `$stepResult.*` syntax
- **FR6:** The `output-generator` primitive MUST perform deterministic JSON transformation without LLM calls
- **FR7:** The `call-agent` primitive MUST allow recursive invocation of other YAML workflow files
- **FR8:** The system MUST expose a REST endpoint (`POST /api/beddel/chat`) for chat interactions
- **FR9:** The system MUST support tool definitions in YAML with automatic mapping to Vercel AI SDK `tools` object
- **FR10:** The tool registry MUST contain sample implementations: `calculator`, `getCurrentTime`
- **FR11:** The `llmPrimitive` MUST support `onFinish` and `onError` callbacks for post-stream logic

## Non-Functional Requirements

- **NFR1:** YAML parser MUST use `FAILSAFE_SCHEMA` to prevent function instantiation
- **NFR2:** Tool parameters MUST be validated using Zod schemas
- **NFR3:** The package MUST be compatible with Edge runtime (Next.js App Router)
- **NFR4:** Streaming responses MUST follow Vercel AI SDK Data Stream protocol
- **NFR5:** Configuration MUST be strict TypeScript (`tsconfig.json` strict mode)
