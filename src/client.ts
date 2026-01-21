/**
 * Beddel Protocol - Client Bundle
 * 
 * This entry point exports ONLY types and utilities safe for client-side use.
 * No Node.js dependencies (fs, crypto, etc.) are included here.
 * 
 * Usage: import type { ParsedYaml, BeddelResponse } from 'beddel/client';
 */

// Types only - safe for client bundles
export type {
    ParsedYaml,
    WorkflowStep,
    StepConfig,
    YamlMetadata,
    ExecutionContext,
    PrimitiveHandler,
    BeddelResponse,
} from './types';

// Observability types - safe for client bundles (no Node.js deps)
export type {
    ObservabilityConfig,
    StepEvent,
    StepStartEvent,
    StepCompleteEvent,
    StepErrorEvent,
} from './types/observability';
