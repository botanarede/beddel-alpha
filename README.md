# Beddel: Secure, Declarative, and Extensible Agent Runtimes

[![NPM Version](https://img.shields.io/npm/v/beddel.svg)](https://www.npmjs.com/package/beddel)
[![License](https://img.shields.io/npm/l/beddel.svg)](https://github.com/botanarede/beddel-alpha/blob/main/LICENSE)

**Repos:** código-fonte em `https://github.com/botanarede/beddel-alpha` e app de exemplo Next.js em `https://github.com/botanarede/beddel-alpha-example`.

## Usage Exemplo

> Declaração YAML + interpretação segura para que quem visita o perfil do pacote no npm entenda o fluxo em poucos segundos.

```yaml
# joker-agent.yaml
agent:
  id: joker
  protocol: beddel-declarative-protocol/v2.0
metadata:
  name: Joker Agent
schema:
  input:
    type: "object"
    properties: {}
    required: []
  output:
    type: "object"
    properties:
      response:
        type: "string"
    required: ["response"]
logic:
  workflow:
    - name: generate-joke
      type: genkit-joke
      action:
        type: joke
        prompt: "Conte uma piada curta e original que funcione para qualquer público."
        result: jokerResult

    - name: deliver-response
      type: output-generator
      action:
        type: generate
        output:
          response: "$jokerResult.texto"
```

```typescript
import {
  SecureYamlParser,
  DeclarativeAgentInterpreter,
  SecureYamlRuntime,
  IsolatedRuntimeManager,
  type ExecutionContext,
} from "beddel";
import { readFileSync } from "node:fs";

const yamlManifest = readFileSync("joker-agent.yaml", "utf8");

const parser = new SecureYamlParser({ filename: "joker-agent.yaml" });
const manifest = parser.parseSecure(yamlManifest); // FAILSAFE_SCHEMA + depth/size limits

const context: ExecutionContext = {
  logs: [],
  status: "running",
  output: null,
  log: console.log,
  setOutput: (output) => (context.output = output),
  setError: (err) => console.error(err),
};

const interpreter = new DeclarativeAgentInterpreter();
const agentResult = await interpreter.interpret({
  yamlContent: yamlManifest,
  input: {},
  props: {
    gemini_api_key: process.env.GEMINI_API_KEY ?? "",
  },
  context,
});

const secureRuntime = new SecureYamlRuntime(new IsolatedRuntimeManager());
const execution = await secureRuntime.parseYamlSecureRuntime(yamlManifest, {
  tenantId: "tenant-42",
  securityProfile: "tenant-isolated",
  validateSecurity: true,
});
```

- `SecureYamlParser` garante o parsing estritamente FAILSAFE com validação de profundidade, tamanho e UTF-8.
- `DeclarativeAgentInterpreter` executa apenas steps declarativos (`output-generator`, `genkit-joke`, `genkit-translation`, `genkit-image`) e mantém toda a validação em Zod (sem `eval`/`Function`).
- `SecureYamlRuntime` conecta parser, scanner e `isolated-vm` para entregar auditoria, limites de tempo/memória e perfis multi-tenant.

Beddel is a security-first toolkit that combines:

- A hardened YAML parser that only exposes the YAML FAILSAFE schema.
- Multiple execution strategies powered by `isolated-vm`.
- Declarative agent utilities, compliance helpers, performance monitors, and Firebase multi-tenant orchestration.

### Declarative agents shipped with Gemini Flash helpers

The declarative runtime now exposes three Genkit-based helpers—`callGeminiFlashText`, `callGeminiFlashTranslation`, and `callGeminiFlashImage`—which proxy `generateText`/`generateImage` calls to `google("models/gemini-flash-latest")`. Each helper validates the presence of `props.gemini_api_key`, builds friendly prompts, and returns consistent metadata (`modelo_utilizado`, `tempo_processamento`, etc.).

| Agent | Method | Description | Inputs | Outputs | Required props |
| --- | --- | --- | --- | --- | --- |
| Joker Agent | `joker.execute` | Gera uma piada curta e original usando Gemini Flash. | — | `response` | `gemini_api_key` |
| Translator Agent | `translator.execute` | Traduz textos via Gemini Flash com Genkit. | `texto`, `idioma_origem`, `idioma_destino` | `texto_traduzido`, `metadados` | `gemini_api_key` |
| Image Generator Agent | `image.generate` | Cria imagens nos estilos `watercolor`, `neon` ou `sketch`. | `descricao`, `estilo`, `resolucao` | `image_url`, `image_base64`, `media_type`, `prompt_utilizado`, `metadados` | `gemini_api_key` |

> ⚠️ Todos os agentes embutidos dependem da prop `gemini_api_key`. Sem ela o runtime aborta a execução com uma mensagem amigável.

The code that backs this README lives under `packages/beddel/src` and is what the npm package exposes.

## Package map

| Capability | Entry point / module | Notes |
| --- | --- | --- |
| Secure YAML parsing | `SecureYamlParser` (`src/parser/secure-yaml-parser.ts`) | FAILSAFE schema, depth/size limits, UTF-8 validation, sync + async helpers. |
| Sandboxed execution | `IsolatedRuntimeManager`, `SimpleIsolatedRuntimeManager` (`src/runtime`) | Uses `isolated-vm` with configurable security profiles, pool management, metrics. |
| Declarative YAML interpretation | `DeclarativeAgentInterpreter`, `AgentRegistry` (`src/runtime/declarativeAgentRuntime.ts`, `src/agents/agentRegistry.ts`) | Executes YAML agents with variables plus `output-generator`, `genkit-joke`, `genkit-translation` e `genkit-image` steps (Gemini Flash). |
| Security posture | `SecurityScanner`, `ThreatDetectionEngine`, validation utilities (`src/security`) | Static scanning, scoring, and threat inference the rest of the package consumes. |
| Compliance & audit | `GDPRCompliance`, `LGPDCompliance`, `AuditTrail`, `AuditService` (`src/compliance`, `src/audit`, `src/runtime/audit.ts`) | Hash-based logging, anonymization helpers, compliance verification. |
| Performance & autoscaling | `PerformanceMonitor`, `AutoScaler`, benchmarking helpers (`src/performance`) | Track execution time/memory, raise violations, recommend scaling actions. |
| Firebase multi-tenancy | `MultiTenantFirebaseManager` (`src/firebase/tenantManager.ts`) | Per-tenant app bootstrap, isolation policies, audit logging hooks. |

Everything is re-exported via `src/index.ts`, so you can import from `beddel` directly.

## Installation

```bash
npm install beddel
```

Ensure Node.js 18+ (per `package.json`) and install optional peer dependencies you plan to use (e.g., `firebase-admin` is already included).

## Project-agnostic guarantees

- No upstream app files are required—the npm tarball only ships `dist/` and the audited TypeScript sources exported through `beddel`.
- `ExecutionContext` and every runtime type live inside the package, de-coupling consumers from any upstream monorepo or example app internals.
- No secrets, API tokens, or environment-specific constants are embedded in the code or build output; everything is configured via your own runtime props.
- Optional tools (Firebase, Upstash, benchmarking scripts) are defensive helpers; you decide which ones to instantiate depending on project size.

## Usage examples

### Parse YAML with strict fail-safes

```typescript
import { SecureYamlParser } from "beddel";

const parser = new SecureYamlParser({
  maxDepth: 200,
  filename: "agent-manifest",
});

const manifest = parser.parseSecure(`
agent:
  id: joker
schema:
  input: {}
  output: {}
logic:
  workflow:
    - name: noop
      type: output-generator
      action:
        type: generate
        output:
          response: "lol"
`);

console.log(manifest.agent.id); // joker
```

Behind the scenes, `SecureYamlParser` enforces depth, size, UTF-8, and allowed primitive types before returning the parsed object.

### Execute JavaScript in an isolate

```typescript
import { IsolatedRuntimeManager } from "beddel";

const runtimeManager = new IsolatedRuntimeManager();

const result = await runtimeManager.execute({
  code: `
    const secret = "sandboxed";
    ({ success: true, value: secret.length });
  `,
  securityProfile: "ultra-secure",
  timeout: 2000,
});

if (!result.success) {
  throw result.error;
}

console.log(result.result); // { success: true, value: 9 }
```

The manager bootstraps `isolated-vm` contexts, strips dangerous globals (`require`, `eval`, timers), enforces memory/time limits, records metrics, and can emit audit/security signals.

### Interpret a declarative YAML agent

```typescript
import { DeclarativeAgentInterpreter } from "beddel";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const interpreter = new DeclarativeAgentInterpreter();
const yamlContent = readFileSync(join(process.cwd(), "joker-agent.yaml"), "utf8");

const result = await interpreter.interpret({
  yamlContent,
  input: {},
  props: {},
  context: {
    log: console.log,
    setError: console.error,
  },
});

console.log(result.response); // lol
```

Current interpreter capabilities:

- Validates protocol (`beddel-declarative-protocol/v2.0`), schema presence, workflow size.
- Supports string/number/boolean/object variables and literal/variable references.
- Executes `output-generator` workflow steps that map variables to response objects.

For projects that want auto-registration, instantiate `AgentRegistry` (bundled with the `joker` agent) and call `executeAgent("joker.execute", …)`.

### Automatic schema validation

Every declarative agent must now declare `schema.input` and `schema.output` blocks that map directly to Zod primitives (`string`, `number`, `boolean`), objects (with `properties` + `required` arrays), and arrays (via `items`). The runtime compiles those YAML definitions into Zod schemas through the `DeclarativeSchemaCompiler`, caches the result per manifest, and runs validation twice per execution:

- **Before workflow execution** – payloads that are missing required fields, contain unexpected properties (objects are `strict` by default), or provide the wrong primitive types raise a `DeclarativeSchemaValidationError` and call `ExecutionContext.setError`.
- **Before returning output** – the workflow result must match `schema.output`; mismatches are rejected, the error propagates through the same structured exception, and oversize payloads (>1 MB) are blocked.

Authors can opt into arrays by adding `type: "array"` + an `items` definition, mark optional fields by omitting them from `required`, and set `additionalProperties: true` only when extra keys should be allowed. Errors surface in GraphQL responses (and logs) as `Input validation failed: …` or `Output validation failed: …`, making it obvious which path failed.

### Parse + execute inside the secure runtime

Combine the parser, security scanner, and isolate manager through `SecureYamlRuntime`:

```typescript
import { SecureYamlRuntime, IsolatedRuntimeManager } from "beddel";

const runtime = new SecureYamlRuntime(new IsolatedRuntimeManager());
const { success, result } = await runtime.parseYamlSecureRuntime(someYamlString, {
  tenantId: "tenant-123",
  securityProfile: "tenant-isolated",
  validateSecurity: true,
});
```

The helper performs pre-scan checks, runs within the requested profile, enforces performance targets, and produces audit hashes you can persist.

## Architectural reference

- `src/parser`: Secure YAML parsing primitives.
- `src/runtime`: `IsolatedRuntimeManager`, `SimpleIsolatedRuntimeManager`, auditing utilities, declarative interpreter, monitoring, and security hooks.
- `src/security`: Validation, scoring, threat detection, dashboards.
- `src/compliance`: GDPR/LGPD tooling, anonymization, export helpers.
- `src/performance`: Monitoring, autoscaling, streaming metrics.
- `src/firebase`: Tenant isolation via Firebase Admin SDK.
- `src/agents`: Registry helpers and sample `joker-agent.yaml`.
- `src/integration`: Glue code that wires parsing + runtime + scanner.

Every module is documented inline with TypeScript types to make IDE discovery straightforward.

## Development workflow

```bash
# Build the package
pnpm --filter beddel build

# Lint and test
pnpm --filter beddel lint
pnpm --filter beddel test
```

When contributing, keep README + `AGENTS.md` synchronized with any new exports or behavioral changes in `src`.

## Docs/beddel roadmap coverage

The product briefs under `docs/beddel` describe a richer future-state language/runtime. The current package intentionally ships a smaller, auditable subset. Notable gaps you will still find only in documentation:

- **Advanced declarative language constructs** (`map-filter-reduce` pipelines, state machines, rule engines, temporal conditions, and loop semantics) are not implemented yet—the interpreter only supports literal variables and `output-generator` steps.
- **Behavior marketplace & registry extensibility** (behaviors with versions, capabilities, restrictions, and monetization hooks) are not available. Only the bundled `joker` agent is registered by default.
- **Automatic behavioral integrations and external API pipelines** (`integrations`, `decisions`, `behaviors` blocks described in `docs/beddel/brief.md`) have no runtime support.
- **Marketplace/compliance automation flows** mentioned in the PRD (pre-built business behaviors, Firebase deployment recipes, global consent orchestration) are still roadmap items, even though compliance helpers exist as standalone utilities.
- **High-level orchestration features** like parallel execution controls, resource policies (per-step concurrency, retry semantics), and auto-generated documentation have not been wired into the runtime.

Use this section as a living checklist whenever you pull features from `docs/beddel` into the actual codebase.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
