# Architecture Fixes - December 2024

## Summary

This document outlines the architectural improvements made to the Beddel protocol to address technical debt and improve maintainability.

## Changes Implemented

### 1. Step Type Nomenclature Cleanup ✅

**Problem**: Step types were named `genkit-*` and `gemini-*` despite using Vercel AI SDK, not Genkit.

**Solution**:
- Renamed step types to provider-agnostic names:
  - `genkit-joke` → `joke`
  - `genkit-translation` → `translation`
  - `genkit-image` → `image`
  - `gemini-vectorize` → `vectorize`
- Maintained backward compatibility with legacy names
- Added deprecation warnings in runtime logs
- Updated `WorkflowStepType` with clear deprecation notices

**Files Modified**:
- `src/shared/types/agent.types.ts` - Added `LEGACY_STEP_TYPE_MAP` and deprecation docs
- `src/runtime/workflowExecutor.ts` - Added `resolveStepType()` with deprecation warnings
- `src/runtime/declarativeAgentRuntime.ts` - Renamed internal methods, added legacy support
- `AGENTS.md` - Updated step type table with deprecation notices
- `docs/architecture/architecture.md` - Updated workflow types documentation

**Breaking Changes**: None (backward compatible)

**Migration Path**: Update YAML manifests to use preferred names before v1.0

---

### 2. LLM Provider Factory ✅

**Problem**: Each handler duplicated provider creation logic, making it hard to:
- Switch between LLM providers
- Centralize API key validation
- Implement retry/fallback logic

**Solution**:
- Created `LLMProviderFactory` class for centralized provider management
- Added `extractProviderConfig()` helper for consistent prop extraction
- Updated ALL handlers to use factory pattern
- Added provider metadata to response objects

**Files Created**:
- `src/runtime/llmProviderFactory.ts` - New factory implementation

**Files Modified**:
- `src/agents/joker/joker.handler.ts` - Uses `LLMProviderFactory`
- `src/agents/joker/joker.types.ts` - Added `provider` field to metadata
- `src/agents/image/image.handler.ts` - Uses `extractProviderConfig()`
- `src/agents/image/image.types.ts` - Added `provider` field to metadata
- `src/agents/translator/translator.handler.ts` - Uses `LLMProviderFactory`
- `src/agents/translator/translator.types.ts` - Added `provider` field to metadata
- `src/agents/rag/rag.handler.ts` - Uses `LLMProviderFactory`
- `src/agents/gemini-vectorize/gemini-vectorize.handler.ts` - Uses `extractProviderConfig()`
- `src/runtime/index.ts` - Exported factory and types

**Benefits**:
- Single point of configuration for all LLM providers
- Easy to add OpenAI, Anthropic, or other providers
- Consistent error handling across agents
- Foundation for retry/fallback logic
- No more `process.env` mutations for API keys

---

### 3. Documentation Updates ✅

**Problem**: Documentation referenced "Genkit Integration" despite using Vercel AI SDK.

**Solution**:
- Updated `AGENTS.md` with:
  - LLMProviderFactory in source tree
  - Deprecation table for step types
  - Clear migration guidance
- Updated `docs/architecture/architecture.md` with:
  - Vercel AI SDK as primary integration
  - LLM Provider Factory in architecture diagrams
  - Updated technology stack section
- Updated `docs/beddel-alpha-guide.md` with:
  - Corrected feature list (LLM Integration, not Genkit)
  - Complete workflow types table with deprecation notices
  - Updated summary table

**Files Modified**:
- `packages/beddel/AGENTS.md`
- `packages/beddel/docs/architecture/architecture.md`
- `packages/beddel/docs/beddel-alpha-guide.md`

---

## Testing

- ✅ Build passes: `pnpm --filter beddel build`
- ✅ All tests pass: `pnpm --filter beddel test` (83/83 tests)
- ✅ Backward compatibility maintained (legacy step types still work)
- ✅ Deprecation warnings logged for legacy usage

---

## Migration Guide for Users

### For YAML Manifests

**Before**:
```yaml
workflow:
  - name: generate_joke
    type: genkit-joke  # DEPRECATED
    action:
      type: generate
```

**After**:
```yaml
workflow:
  - name: generate_joke
    type: joke  # PREFERRED
    action:
      type: generate
```

### For Custom Handlers

**Before**:
```typescript
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const apiKey = props.gemini_api_key;
if (!apiKey) throw new Error('Missing API key');

const google = createGoogleGenerativeAI({ apiKey });
const model = google('models/gemini-2.5-flash');
```

**After**:
```typescript
import { LLMProviderFactory, extractProviderConfig } from 'beddel/runtime';

const providerConfig = extractProviderConfig(props, 'google');
const model = LLMProviderFactory.createLanguageModel(providerConfig);
```

---

## Future Work

1. **Implement additional providers**: Add OpenAI and Anthropic support to `LLMProviderFactory`
2. **Add retry logic**: Implement exponential backoff and fallback provider chains
3. **Centralized props validation**: Move required prop validation to `workflowExecutor` (optional improvement)

---

## Conclusion

All planned architectural improvements have been implemented. The Beddel protocol now:
- Uses accurate, provider-agnostic naming
- Has centralized LLM provider management
- Has up-to-date documentation reflecting the actual implementation
- Maintains full backward compatibility with deprecation warnings

**Next Steps**:
1. Monitor deprecation warnings in production logs
2. Plan v1.0 breaking change to remove legacy step types
3. Implement additional LLM providers as needed
