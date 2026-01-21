# Source Tree

```
packages/beddel/
├── src/
│   ├── index.ts                  # Main server exports (Node.js deps)
│   ├── server.ts                 # Server handler barrel export
│   ├── client.ts                 # Client exports (types only, browser-safe)
│   ├── agents/                   # Built-in agents (bundled with package)
│   │   ├── index.ts              # Built-in agents registry (BUILTIN_AGENT_PATHS)
│   │   ├── chat/                 # Streaming chat assistants
│   │   │   ├── assistant.yaml
│   │   │   ├── assistant-bedrock.yaml
│   │   │   └── assistant-openrouter.yaml
│   │   ├── mcp/                  # MCP server integrations
│   │   │   └── assistant-gitmcp.yaml
│   │   ├── google-business/      # Google Business Profile agents
│   │   │   └── business-analyzer.yaml
│   │   ├── marketing/            # Lead capture, newsletters
│   │   │   └── newsletter-signup.yaml
│   │   ├── utility/              # General-purpose tools
│   │   │   └── text-generator.yaml
│   │   ├── observability/        # Observability demo agents
│   │   │   └── observability-demo.yaml
│   │   └── examples/             # Demo pipelines
│   │       └── multi-step-assistant.yaml
│   ├── core/
│   │   ├── parser.ts             # YAML parsing (FAILSAFE_SCHEMA)
│   │   ├── workflow.ts           # WorkflowExecutor class (with observability)
│   │   └── variable-resolver.ts  # $variable.path resolution
│   ├── primitives/
│   │   ├── index.ts              # Handler registry (handlerRegistry)
│   │   ├── llm-core.ts           # Shared utilities (mapTools, callbacks)
│   │   ├── chat.ts               # Frontend streaming primitive (with trace support)
│   │   ├── llm.ts                # Workflow blocking primitive
│   │   ├── output.ts             # JSON transform primitive
│   │   ├── call-agent.ts         # Sub-agent invocation primitive
│   │   └── mcp-tool.ts           # MCP server tool execution primitive
│   ├── providers/
│   │   └── index.ts              # Provider registry (google, bedrock, openrouter)
│   ├── server/
│   │   └── handler.ts            # createBeddelHandler factory
│   ├── tools/
│   │   └── index.ts              # Tool registry (calculator, getCurrentTime)
│   └── types/
│       ├── index.ts              # Type definitions
│       └── observability.ts      # Observability type definitions
├── docs/
│   ├── architecture/             # Architecture documentation
│   └── prd/                      # Product requirements
├── package.json
└── tsconfig.json
```

---

## Bundle Separation

Beddel exports three distinct bundles to support different runtime environments:

| Import Path | Entry File | Contents | Use Case |
|-------------|------------|----------|----------|
| `beddel` | `index.ts` | Full API: `loadYaml`, `WorkflowExecutor`, registries | Internal usage, custom handlers |
| `beddel/server` | `server.ts` | `createBeddelHandler`, `BeddelHandlerOptions` | Next.js API Routes |
| `beddel/client` | `client.ts` | Types only: `ParsedYaml`, `ExecutionContext`, etc. | Client Components |

> [!IMPORTANT]
> The `beddel` and `beddel/server` entry points use Node.js APIs (`fs/promises`).  
> **Never import these in client/browser code.** Use `beddel/client` for type imports.

---

## Primitives Structure

```
primitives/
├── index.ts          # Registry and exports
├── llm-core.ts       # Shared: mapTools, callbacks, LlmConfig type
├── chat.ts           # type: "chat" — streaming, converts UIMessage
├── llm.ts            # type: "llm" — blocking, uses ModelMessage
├── output.ts         # type: "output-generator" — JSON transform
├── call-agent.ts     # type: "call-agent" — sub-agent invocation
└── mcp-tool.ts       # type: "mcp-tool" — MCP server integration
```

### Primitive Comparison

| Primitive | Streaming | Message Format | Use Case |
|-----------|-----------|----------------|----------|
| `chat` | Always | UIMessage → ModelMessage | Frontend (`useChat`) |
| `llm` | Never | ModelMessage (direct) | Workflows, pipelines |
| `output-generator` | Never | N/A | JSON transform |
| `call-agent` | Depends | Passes through | Sub-agent composition |
| `mcp-tool` | Never | N/A | External MCP servers |

---

## Built-in Agents

Agents bundled with the package, available without configuration. Organized by category:

| Agent ID | Category | Type | Provider | Description |
|----------|----------|------|----------|-------------|
| `assistant` | `chat/` | `chat` | Google | Streaming chat assistant |
| `assistant-bedrock` | `chat/` | `chat` | Bedrock | Llama 3.2 assistant |
| `assistant-openrouter` | `chat/` | `chat` | OpenRouter | Free tier assistant |
| `assistant-gitmcp` | `mcp/` | `mcp-tool` + `chat` | Google + MCP | Documentation assistant via GitMCP |
| `business-analyzer` | `google-business/` | `google-business` + `llm` | Google | Business reviews analyzer |
| `newsletter-signup` | `marketing/` | `llm` + `notion` | Google | Lead capture with Notion |
| `text-generator` | `utility/` | `llm` | Google | Text generation |
| `observability-demo` | `observability/` | `mcp-tool` + `llm` | Google + MCP | Multi-step demo with trace |
| `multi-step-assistant` | `examples/` | `call-agent` + `llm` | Google | 4-step pipeline |

**Agent Categories:**

| Category | Folder | Description |
|----------|--------|-------------|
| Chat | `chat/` | Streaming chat assistants (different providers) |
| MCP | `mcp/` | MCP server integrations (GitMCP, Context7) |
| Google Business | `google-business/` | Google Business Profile API agents |
| Marketing | `marketing/` | Lead capture, newsletters, CRM |
| Utility | `utility/` | General-purpose tools |
| Observability | `observability/` | Agents demonstrating trace collection |
| Examples | `examples/` | Demo pipelines |

**Resolution Order:**
1. User agents (`src/agents/*.yaml`) — allows override
2. Built-in agents (package, via `BUILTIN_AGENT_PATHS` map) — fallback

---

## package.json exports

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./server": {
      "import": "./dist/server.js",
      "types": "./dist/server.d.ts"
    },
    "./client": {
      "import": "./dist/client.js",
      "types": "./dist/client.d.ts"
    }
  }
}
```
