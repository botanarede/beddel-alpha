# Core Workflows

## Streaming Chat Flow

The primary workflow for a streaming chat interaction:

```mermaid
sequenceDiagram
    participant Client
    participant API as POST /api/beddel/chat
    participant Loader as YAML Loader
    participant Executor as WorkflowExecutor
    participant LLM as llmPrimitive
    participant SDK as Vercel AI SDK

    Client->>API: { agentId, messages }
    API->>Loader: loadYaml(src/agents/{agentId}.yaml)
    Loader-->>API: ParsedYaml
    API->>Executor: new WorkflowExecutor(yaml)
    API->>Executor: execute({ messages })
    
    loop For each step in workflow
        Executor->>Executor: Get handler from registry
        Executor->>LLM: handler(config, context)
        
        alt stream: true
            LLM->>SDK: streamText(config)
            SDK-->>LLM: StreamResult
            LLM-->>Executor: Response (stream)
            Note over Executor: Break loop immediately
            Executor-->>API: Response
            API-->>Client: Streaming Response
        else stream: false
            LLM->>SDK: generateText(config)
            SDK-->>LLM: TextResult
            LLM-->>Executor: { text, usage }
            Executor->>Executor: Store in context.variables
        end
    end
```

## Tool Loop Flow

When tools are defined, the LLM may invoke them in a multi-step loop:

```mermaid
sequenceDiagram
    participant LLM as llmPrimitive
    participant SDK as streamText
    participant Tools as Tool Registry
    participant Calc as calculator

    LLM->>SDK: streamText({ stopWhen: stepCountIs(5), tools })
    
    loop Until stopWhen condition met
        SDK->>SDK: LLM generates response
        
        alt Tool call requested
            SDK->>Tools: Lookup tool by name
            Tools->>Calc: execute({ expression })
            Calc-->>SDK: { result }
            SDK->>SDK: Continue with tool result
        else No tool call
            Note over SDK: Break loop
        end
    end
    
    SDK-->>LLM: Final StreamResult
```

## Variable Resolution Flow

How variables like `$input.messages` are resolved:

```mermaid
sequenceDiagram
    participant Config as Step Config
    participant Resolver as Variable Resolver
    participant Context as ExecutionContext

    Config->>Resolver: "$input.messages"
    Resolver->>Context: context.input.messages
    Context-->>Resolver: Message[]
    Resolver-->>Config: Resolved value
    
    Config->>Resolver: "$llmOutput.text"
    Resolver->>Context: context.variables.get("llmOutput").text
    Context-->>Resolver: "Hello!"
    Resolver-->>Config: Resolved value
```

## onFinish Lifecycle Hook Flow

How `onFinish` executes after streaming completes (Option B: direct callbacks):

```mermaid
sequenceDiagram
    participant LLM as llmPrimitive
    participant SDK as streamText
    participant Registry as callbackRegistry
    participant Callback as persistConversation

    LLM->>SDK: streamText({ onFinish, onError })
    SDK->>SDK: Stream tokens to client
    
    Note over SDK: Stream completes
    
    SDK->>LLM: onFinish({ text, usage, totalUsage, steps })
    LLM->>LLM: config.onFinish = "persistConversation"
    LLM->>Registry: callbackRegistry["persistConversation"]
    Registry-->>LLM: callback function
    LLM->>Callback: callback({ text, usage, totalUsage, steps })
    Callback->>Callback: Save to database
    Callback-->>LLM: Done
    
    Note over LLM: Response already sent to client
```
