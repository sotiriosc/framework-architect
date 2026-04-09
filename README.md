# Framework Architect

Framework Architect is a TypeScript web app that turns a raw project idea into a governed project blueprint before implementation begins.

## Core Purpose
The app accepts a rough idea, extracts the intended outcome, and stores a structured project blueprint with explicit governance:
- intended outcome
- domains
- required functions
- components
- dependencies
- rules
- invariants
- guardrails
- phases
- MVP scope
- expansion scope

## V1 Includes
- Strong TypeScript domain types and Zod schemas
- Local-first persistence for projects, blueprint data, and memory
- Versioned storage migration with quarantine for unrecoverable payloads
- Validation rules for structural governance checks
- Minimal UI for project creation, intent/outcome editing, blueprint viewing, memory viewing, and validation review
- A seed example blueprint for inspection and iteration

## Architecture Layers
- `schema`: Zod contracts for every entity and the top-level blueprint
- `domain`: shared types, defaults, and entity metadata
- `application`: intake, validation, and persistence workflows
- `persistence`: repository interface and localStorage adapter
- `ui`: minimal React components and workspace flow

## Storage Versioning And Migration
- Persistence uses an explicit `storageVersion` on the stored document, separate from `project.version`
- The current app expects a wrapped document: `{ storageVersion, storedAt, projects }`
- Older payloads are loaded through a deterministic migration pipeline before schema validation
- Legacy snake_case payloads are normalized to camelCase during migration
- Legacy unprefixed IDs are upgraded to the current prefixed UUID format before referential validation

## Failure And Quarantine Behavior
- The load path is: read raw payload -> detect storage version -> migrate -> validate against the current schema
- If migration or validation fails, the original raw payload is copied into quarantine metadata instead of being dropped
- Quarantine entries keep the original payload, failure stage, detected version, migration steps, and timestamp
- The active persistence key is never silently reseeded over quarantined data

## Adding Future Migrations
1. Add a new `fromVersion -> toVersion` step in `src/persistence/migrations.ts`
2. Keep the step deterministic and focused on data shape evolution
3. Preserve data when uncertain; prefer quarantine over destructive inference
4. Leave governance validation in the validation engine rather than hiding it inside schema coercion

## Local Setup
```bash
npm install
npm run dev
```

## Verification
```bash
npm run build
npm run test
```

## Notes
- The app is deliberately local-first and transparent.
- Validation logic lives outside the UI.
- AI orchestration and code generation are intentionally out of scope for this version.
