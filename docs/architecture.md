# Architecture Notes

## V1 Direction
Framework Architect is intentionally local-first and architecture-first. The app captures a project idea as a governed blueprint and keeps governance concepts explicit instead of burying them in helper code.

## Top-Level Blueprint Contract
The blueprint document contains:
- project
- intent
- outcomes
- actors
- constraints
- domains
- functions
- components
- flows
- dependencies
- rules
- invariants
- decisionLogic
- failureModes
- guardrails
- phases
- mvpScope
- expansionScope
- validation
- memory

## Memory Layers
V1 includes three persistent memory layers:
- Project memory: raw idea, intended outcome, philosophy, constraints, invariant priorities
- Structural memory: domains, functions, components, dependencies, rules, guardrails, validation snapshots
- Decision memory: change reasons, rejected options, invariant conflicts, scope decisions

## Validation Rules
The validation engine enforces:
- every function maps to at least one outcome
- every component maps to at least one function
- every dependency references valid entities
- every rule has a scope
- every invariant is global or clearly scoped
- every MVP item is distinct from expansion scope
- build-ready status is blocked by critical validation failures

## Persistence Strategy
The app uses a repository interface with a localStorage adapter. That keeps persistence replaceable so a future database layer can be added without rewriting domain, schema, or validation code.

## Storage Evolution Model
- `project.version` tracks blueprint edits inside the domain
- `storageVersion` tracks the persisted document format
- The current storage contract is a versioned wrapper document: `{ storageVersion, storedAt, projects }`

## Migration Flow
- Read the raw persisted payload
- Detect the stored payload version
- Normalize legacy snake_case fields into camelCase
- Upgrade legacy IDs into the prefixed UUID contract
- Fill safe defaults for fields added after the older payload was saved
- Validate the migrated result against the current schema
- Return a valid blueprint set or a structured quarantine result

## Quarantine Behavior
- Unrecoverable payloads are preserved under a quarantine key instead of being dropped
- Quarantine entries keep failure stage, failure category, detected version, migration steps, timestamp, and raw payload
- The app exposes migration/quarantine status in the workspace so recovery is inspectable

## Recovery Flow
- A quarantine inspector reads stored quarantine entries through the repository and application service
- Export serializes the quarantined entry into an inspectable JSON document without mutating storage
- Manual recovery parses pasted or imported JSON, unwraps exported quarantine documents when present, then reuses the normal migration + schema validation path
- Successful recovery writes the recovered projects into active storage
- Failed recovery leaves active storage and quarantine untouched

## Compare / Review Surface
- Recovery preview reuses the same non-mutating hydration path as recovery, but does not write to active storage
- The comparison model lives in the application layer and summarizes architecture-level differences rather than attempting a generic deep diff
- Review focuses on project and intent scalar changes, MVP and expansion scope summaries, and added/removed/changed entities across the main blueprint collections
- The compare surface is a decision aid for quarantine recovery, not revision history

## Adding Future Migrations
- Add a new ordered step to the migration registry
- Keep steps deterministic and explicit
- Preserve editable drafts by limiting migration to shape recovery and safe defaults
- Keep relational governance checks in the validation engine rather than moving them into schema coercion
