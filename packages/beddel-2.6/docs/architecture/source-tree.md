# Source Tree

```
packages/beddel-2.6/
├── src/
│   ├── core/
│   │   ├── parser.ts             # YAML parsing (FAILSAFE_SCHEMA)
│   │   ├── workflow.ts           # WorkflowExecutor class
│   │   └── variable-resolver.ts  # $variable.path resolution
│   ├── primitives/
│   │   ├── index.ts              # Handler registry (handlerRegistry)
│   │   ├── llm.ts                # streamText/generateText wrapper
│   │   ├── output.ts             # JSON transform primitive
│   │   └── call-agent.ts         # Sub-agent invocation
│   ├── tools/
│   │   └── index.ts              # Tool registry (calculator, getCurrentTime)
│   ├── types/
│   │   └── index.ts              # Type definitions (PrimitiveHandler, ExecutionContext, etc.)
│   └── index.ts                  # Public exports
├── docs/
│   ├── prd/                      # Sharded PRD documents
│   │   ├── index.md
│   │   ├── goals-context.md
│   │   ├── requirements.md
│   │   ├── technical-assumptions.md
│   │   └── epic-list.md
│   └── architecture/             # Sharded Architecture documents
│       ├── index.md
│       ├── high-level-architecture.md
│       ├── tech-stack.md
│       ├── components.md
│       ├── source-tree.md
│       └── core-workflows.md
├── setup.md                      # Implementation guide (Chain-of-Thought prompt)
├── package.json
└── tsconfig.json
```

## Notes

- **`src/index.ts`** exports: `loadYaml`, `WorkflowExecutor`, `handlerRegistry`, `toolRegistry`
- **Consumer application** places YAML agents in `src/agents/` and API route in `app/api/beddel/chat/`
- **No test folder shown** — tests should be co-located or in `__tests__/` per project preference
