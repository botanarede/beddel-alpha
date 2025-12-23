# Technical Assumptions

## Repository Structure

- **Structure:** Monorepo package (`packages/beddel/`)
- **Package Manager:** npm or pnpm (workspace-compatible)

## Service Architecture

- **Pattern:** Sequential Pipeline Executor (not microservices)
- **Runtime:** Node.js / Edge (Next.js App Router)
- **No GraphQL for chat:** REST-only for streaming compatibility

## Technology Stack

| Category     | Technology          | Purpose                              |
|--------------|---------------------|--------------------------------------|
| AI Core      | `ai` (6.x)          | Vercel AI SDK Core for LLM calls     |
| AI Provider  | `@ai-sdk/google`    | Google Gemini integration            |
| Validation   | `zod`               | Schema validation for tools          |
| YAML Parser  | `js-yaml`           | Secure YAML parsing (FAILSAFE)       |
| Runtime      | Next.js App Router  | Edge-compatible API routes           |

## Testing Requirements

- **Unit Tests:** Required for core modules (parser, workflow, primitives)
- **Integration Tests:** Required for API route with mock LLM responses
- **Manual Verification:** curl command to test streaming responses

## Additional Technical Assumptions

- Environment variable `GEMINI_API_KEY` is required for LLM calls
- TypeScript strict mode is mandatory
- No database dependencies (stateless execution)
- Tool implementations are synchronous or return Promises
