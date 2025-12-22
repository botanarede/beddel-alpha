# Agent Architecture Refactoring Prompt

## Context

You are refactoring the Beddel protocol's agent architecture to fix responsibility inconsistencies between agents. The codebase is located at `packages/beddel/`.

## Problem Statement

There is a **responsibility leak** between the `chat` and `rag` agents:

### Current (Incorrect) Architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CHAT AGENT                                │
│  - Receives mode: 'simple' | 'rag'                              │
│  - If 'simple': calls RAG agent with mode='simple'              │
│  - If 'rag': orchestrates vectorize → chromadb → RAG            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         RAG AGENT                                │
│  - Also has mode: 'simple' | 'rag'  ← PROBLEM!                  │
│  - 'simple' mode = direct LLM (no documents)                    │
│  - 'rag' mode = uses provided documents                         │
└─────────────────────────────────────────────────────────────────┘
```

### Issues Identified:

1. **RAG agent has 'simple' mode** - This is semantically wrong. RAG = Retrieval-Augmented Generation. A RAG agent without retrieval/augmentation is just an LLM call, not RAG.

2. **Responsibility confusion** - The `chat` agent delegates "simple chat" to `rag` agent, but RAG shouldn't handle simple chat.

3. **Naming inconsistency** - `RagMode = 'rag' | 'simple'` is contradictory. If mode is 'simple', it's not RAG.

4. **Tight coupling** - `chat.handler.ts` directly imports and calls `rag.handler.ts` for simple mode, creating unnecessary dependency.

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CHAT AGENT (Orchestrator)                 │
│  - Receives mode: 'simple' | 'rag'                              │
│  - If 'simple': calls LLM AGENT directly                        │
│  - If 'rag': orchestrates vectorize → chromadb → RAG            │
└─────────────────────────────────────────────────────────────────┘
          │                                    │
          │ mode='simple'                      │ mode='rag'
          ▼                                    ▼
┌─────────────────────┐          ┌─────────────────────────────────┐
│     LLM AGENT       │          │  VECTORIZE → CHROMADB → RAG     │
│  (NEW or renamed)   │          │                                 │
│  - Direct LLM call  │          │  RAG AGENT:                     │
│  - Conversation     │          │  - ALWAYS requires documents    │
│    history support  │          │  - No 'mode' parameter          │
│  - No documents     │          │  - Pure RAG functionality       │
└─────────────────────┘          └─────────────────────────────────┘
```

---

## Refactoring Tasks

### Task 1: Create Simple LLM Agent (or rename existing)

**Option A**: Create new `llm` agent for direct LLM calls
**Option B**: Rename/repurpose existing agent

The agent should:
- Accept `query` and `history` (conversation messages)
- Call LLM directly without document context
- NOT be called "rag" since it's not RAG

### Task 2: Refactor RAG Agent

Remove the `mode` parameter from RAG agent:
- RAG agent should ALWAYS require `context` or `documents`
- Remove `RagMode` type
- Remove `buildSimpleChatPrompt` function
- RAG agent = pure RAG functionality only

### Task 3: Update Chat Agent

Update chat orchestrator to:
- Call new LLM agent for `mode='simple'`
- Call RAG pipeline for `mode='rag'`
- Remove direct dependency on RAG for simple mode

### Task 4: Update Types

- Remove `RagMode` from `rag.types.ts`
- Update `RagHandlerParams` to require `context` or `documents`
- Create types for new LLM agent if needed

### Task 5: Update YAML Manifests

- Update `rag.yaml` to remove mode parameter
- Update `chat.yaml` to reflect new flow
- Create `llm.yaml` if new agent is created

### Task 6: Update Documentation

- Update `AGENTS.md` with new agent structure
- Update architecture diagrams
- Update `beddel-alpha-guide.md`

---

## Files to Analyze

Before implementing, analyze these files:

```
packages/beddel/src/agents/
├── chat/
│   ├── chat.handler.ts    # Orchestrator logic
│   ├── chat.types.ts      # ChatMode type
│   └── chat.yaml          # Agent definition
├── rag/
│   ├── rag.handler.ts     # Has mode='simple' (PROBLEM)
│   ├── rag.types.ts       # RagMode type (PROBLEM)
│   └── rag.yaml           # Agent definition
└── joker/                 # Reference for simple LLM agent pattern
    └── joker.handler.ts
```

---

## Constraints

1. **Backward Compatibility**: Consider if existing API consumers use `rag.execute` with `mode='simple'`
2. **English Only**: All code, comments, and documentation must be in English
3. **Testing**: Ensure all 83 tests continue to pass
4. **Build**: `pnpm --filter beddel build` must succeed

---

## Decision Points (Ask Before Implementing)

1. **New agent vs repurpose**: Should we create a new `llm` agent or repurpose an existing one? (Create a new agent)
2. **Breaking change**: Is it acceptable to remove `mode` from RAG agent (breaking change)? (yes we can)
3. **Deprecation period**: Should we deprecate `mode` parameter first before removing? (just remove, make no sense 'mode' in rag)

---

## Expected Deliverables

1. Refactored agent handlers with clear responsibilities
2. Updated type definitions
3. Updated YAML manifests
4. Updated documentation
5. All tests passing
6. Build successful

---

## Execution Instructions

1. First, analyze all files listed above
2. Present your understanding of the current architecture
3. Propose specific changes for each task
4. Wait for approval before implementing
5. Implement one task at a time, testing after each
6. Update documentation as you go

---

## Additional Inconsistencies to Check

While refactoring, also verify:

1. **Step type naming**: Are all step types using preferred names (`joke`, `translation`, etc.) or legacy names? (Explain it to me better.)
2. **Handler patterns**: Do all handlers follow the same pattern (LLMProviderFactory usage)? (yes)
3. **Error handling**: Is error handling consistent across agents? (check it)
4. **Logging**: Are log prefixes consistent (`[AgentName]` format)? (check it)
5. **Type exports**: Are all types properly exported from index files? (check it)

---

*This prompt uses the Chain-of-Thought technique with explicit decision points to ensure careful analysis before implementation.*
