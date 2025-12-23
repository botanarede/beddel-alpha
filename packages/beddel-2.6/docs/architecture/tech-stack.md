# Tech Stack

## Technology Stack Table

| Category       | Technology           | Version | Purpose                              | Rationale                                    |
|----------------|----------------------|---------|--------------------------------------|----------------------------------------------|
| **Language**   | TypeScript           | 5.x     | Primary development language         | Strict typing, excellent tooling             |
| **Runtime**    | Node.js / Edge       | 20+     | JavaScript runtime                   | Next.js App Router Edge compatibility        |
| **AI Core**    | `ai`                 | 6.x     | Vercel AI SDK Core                   | Native `streamText`/`generateText` support   |
| **AI Provider**| `@ai-sdk/google`     | 1.x     | Google Gemini integration            | Default LLM provider                         |
| **Validation** | `zod`                | 3.x     | Schema validation for tools          | Type-safe runtime validation                 |
| **YAML Parser**| `js-yaml`            | 4.x     | Secure YAML parsing                  | FAILSAFE_SCHEMA prevents code execution      |
| **Framework**  | Next.js App Router   | 14+     | API route hosting                    | Required by consumers, not bundled           |

## Cloud Infrastructure

- **Provider:** N/A — Beddel is a library, not a deployed service
- **Key Services:** Consumer's responsibility
- **Deployment Regions:** Consumer's responsibility

## Notes

- Beddel 2.6 is a **package**, not a standalone application
- Next.js dependency is for consumers, not bundled in the package
- The package exposes TypeScript modules for consumption in Edge or Node.js environments
