# Goals and Background Context

## Goals

- Provide a **declarative agent execution engine** built on Vercel AI SDK Core
- Enable **native streaming** for real-time chat responses at the Edge
- Allow developers to define agent workflows via **YAML configurations** instead of hardcoded logic
- Establish an **extensible primitive system** following the Expansion Pack Pattern
- Deliver a **lean, secure parser** that prevents arbitrary code execution

## Background Context

Beddel 2.6 represents a fundamental shift in architecture: from an "agent wrapper" approach to a **Sequential Pipeline Executor**. This redesign addresses the need for streaming-first chat interactions while maintaining the declarative configuration philosophy that makes Beddel accessible to developers.

The core problem being solved is the latency in LLM-powered applications where responses are delivered only after full processing. By leveraging Vercel AI SDK's `streamText` capability, Beddel 2.6 enables instant, token-by-token response delivery.

### Key Concepts

| Concept      | Definition                                    |
|--------------|-----------------------------------------------|
| **Workflow** | A linear list of steps executed sequentially  |
| **Agent**    | Just one step type (`llm`) within the workflow |
| **Streaming**| Native `streamText` support at the Edge       |
