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
- structural completeness for actors, domains, functions, components, flows, phases, governance, MVP scope, and decision principles
- every function maps to at least one outcome
- every component maps to at least one function
- every dependency references valid entities
- every rule has a scope
- every invariant is global or clearly scoped
- every MVP item is distinct from expansion scope
- build-ready status is blocked by critical validation failures

Completeness checks are intentionally separate from relational checks. Empty collections are no longer allowed to pass as ready simply because there are no broken references to inspect.

## Guided Intake Composition
Guided intake is an application-layer producer of normal blueprints. It does not introduce a second project model.

- `composeBlueprintFromGuidedIntake(...)` accepts structured intake fields and returns a `ProjectBlueprint`
- It uses the same factory functions from `src/domain/defaults.ts` as the rest of the app
- It creates connected outcomes, actors, domains, functions, components, flow, governance, phases, MVP and expansion scope, decision records, and failure modes
- It runs `validateBlueprint(...)` before returning
- `BlueprintService.createProjectFromGuidedIntake(...)` persists the result through the standard stable save path

Because guided output is saved through `BlueprintService`, it inherits schema parsing, stable change review, local-first persistence, memory snapshot creation, and revision recording.

## Completion Engine
The completion engine is used by the default raw-idea create flow so new projects start as populated framework blueprints instead of empty shells. The old shell-only behavior remains available as an advanced/manual `Create empty blueprint` action.

- `completeBlueprintStructure(...)` clones the input blueprint
- It checks which blueprint sections are empty or incomplete
- It fills missing sections conservatively using deterministic defaults
- It preserves existing user-authored entities instead of replacing them
- It connects generated entities with valid IDs
- It runs `validateBlueprint(...)` before returning

The generated structure includes a primary and secondary actor, core domains, core functions, mapped components, a core flow, internal dependencies, rules, invariants, guardrails, phases, MVP scope items, expansion items, decision records, and failure modes.

`BlueprintService.completeMissingStructure(...)` wraps this engine and then calls the existing stable save path with the reason `Completed missing framework structure.` That means completion still participates in change review, memory capture, revision history, and local persistence rather than writing around them.

`BlueprintService.createProject(...)` composes the raw project, completes missing structure, and then saves through the stable path. `BlueprintService.createEmptyProject(...)` keeps the manual shell-only path for users who explicitly want to fill the architecture model themselves.

## Export Outputs
Export generation is application-layer formatting on top of the current `ProjectBlueprint`. It does not write storage, call a backend, or alter the blueprint.

- `exportBlueprintMarkdown(...)` creates the human-readable architecture brief
- `exportCodexPrompt(...)` creates an implementation prompt that carries governance constraints forward
- `exportBlueprintJson(...)` serializes the current schema-valid blueprint as formatted JSON
- `exportMvpChecklist(...)` creates a checklist from MVP items, phases, functions, and validation blockers

The UI download panel only turns those local strings into files with project-slug filenames. Export behavior remains separate from validation, stable save review, memory, revision history, and quarantine recovery.

## Persistence Strategy
The app uses a repository interface with a localStorage adapter. That keeps persistence replaceable so a future database layer can be added without rewriting domain, schema, or validation code.

## Storage Evolution Model
- `project.version` tracks blueprint edits inside the domain
- `storageVersion` tracks the persisted document format
- The current storage contract is a versioned wrapper document: `{ storageVersion, storedAt, projects }`
- Revision history persists separately from the active project document and quarantine storage

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
- Recovery preview is non-mutating and produces a validated candidate document plus a restore candidate model
- When the candidate document contains multiple projects, the application layer exposes deterministic recovered project selection instead of silently picking one during restore
- Restore only writes the selected recovered project into active storage after explicit confirmation
- Failed recovery leaves active storage and quarantine untouched
- Successful restore leaves quarantine untouched until the user clears it deliberately

## Compare / Review Surface
- Recovery preview reuses the same non-mutating hydration path as recovery, but does not write to active storage
- The comparison model lives in the application layer and summarizes architecture-level differences rather than attempting a generic deep diff
- Review focuses on project and intent scalar changes, MVP and expansion scope summaries, and added/removed/changed entities across the main blueprint collections
- The compare surface is a decision aid for quarantine recovery, not revision history

## Restore Candidate Model
- The restore candidate lives in the application layer, not the UI
- It represents the selected quarantine entry, available recovered projects, selected recovered project, active project, compare summary, restore mode, readiness, and warnings
- Restore modes stay explicit: replace the active project, replace another stored project with the same id, or append the recovered project as a new active project
- Restore is separate from preview so the user can inspect differences before confirming a write to active storage

## Revision History Model
- Revisions are per-project timeline entries, separate from active blueprint persistence and separate from quarantine data
- Each revision stores: id, projectId, revisionNumber, previousRevisionId, createdAt, source, summary, optional reason, optional related decision record ids, snapshot, and structural diff summary
- Sources are explicit: `manualCheckpoint`, `editSave`, `recoveryRestore`, `import`, `seed`, `system`
- Revision ordering is deterministic through `revisionNumber`

## Revision Creation Rules
- The first saved state of a project gets revision `1`
- Meaningful structural changes create a new revision
- No-op saves do not create duplicate revisions
- Draft edits do not create revisions because the repo keeps editable project state in the workspace until an explicit save happens
- Manual checkpoints create revisions with `source = manualCheckpoint` and reuse the same stable-boundary review path as normal saves
- Optional checkpoint notes are stored as revision reasons when the checkpoint succeeds
- Recovery restore records a `recoveryRestore` revision when the restored project differs meaningfully from the latest revision
- Existing projects loaded after this feature can be backfilled with an initial `seed` or `system` revision when no revision history exists yet

## Structural Diff Model
- Revision diffs reuse the same application-layer compare model used for quarantine recovery preview
- Scalar diffs include project fields, intent fields, decision logic summaries, MVP scope summary, and expansion scope summary
- Collection diffs include outcomes, actors, constraints, domains, functions, components, flows, dependencies, rules, invariants, guardrails, phases, MVP scope items, expansion scope items, decision records, and failure modes
- Each changed collection entry keeps IDs, human-readable labels, and changed field names

## Revision Comparison
- Revision comparison is application-layer orchestration on top of persisted revision snapshots and the current active project state
- Supported modes are: selected revision vs previous revision, selected revision vs another selected revision, and selected revision vs current active project
- The selected revision is the focus target; the comparison target is resolved deterministically and then passed through the shared `compareBlueprints(...)` path
- Earliest revisions are handled explicitly when no previous revision exists instead of silently inventing a comparison target
- Revision comparison is separate from quarantine recovery preview even though both features reuse the same structural diff model

## Stable Change Review
- Stable change review is an application-layer gate in front of explicit stable saves
- It does not run on every draft edit; the current repo only invokes it from explicit stable-boundary actions such as save and manual checkpoint
- The review baseline is the current stable saved project plus latest revision metadata when available
- Review diffing reuses the shared `compareBlueprints(...)` path instead of inventing a second diff engine
- Rule and invariant policy metadata now provide the primary declarative inputs for governance severity, confirmation requirements, build-ready blocking, and review guidance

## Change Review Model
- Each review captures: target, source project id, baseline metadata, candidate snapshot, structural diff, affected invariants, affected rules, relevant validation issues, blockers, warnings, notices, recommendations, confirmation requirement, stable save allowance, and build-ready allowance
- Review levels are explicit: `clean`, `warning`, `blocked`
- `blocked` currently means build-ready promotion cannot proceed as requested; it does not mean drafts are trapped forever

## Governance Policy Metadata
- Rules and invariants carry a nested `policy` object in the internal schema
- Policy fields include: `reviewSeverity`, `affectsStableSave`, `affectsCheckpoint`, `affectsBuildReady`, `blocksBuildReady`, `requiresConfirmation`, `overrideAllowed`, `reviewMessage`, `recommendation`, and `rationale`
- Older stored blueprints remain compatible because schema preprocessing derives policy defaults from legacy shapes
- Legacy top-level invariant fields such as `blocksBuildReady` and `overrideAllowed` are normalized into the current policy object during parsing
- Seed/example governance entries now include explicit policy messaging so review output is understandable without hidden lookup tables

## Invariant / Rule Impact Rules
- Direct changes to rules or invariants are always surfaced
- Scoped rules or invariants are surfaced when their scoped entities are touched by the proposed stable change
- Component-linked invariants are surfaced when changed components still reference them
- Global invariants and rules are especially surfaced during build-ready promotion because the user is asking the system to accept stable truth at the highest status
- The review remains deterministic and inspectable; it does not attempt speculative semantic reasoning

## Blockers, Warnings, And Notices
- Policy-driven blocker, warning, and notice behavior now comes primarily from explicit rule/invariant policy metadata plus the shared structural diff
- Blockers currently come from build-ready-critical validation issues, direct changes to build-ready-blocking governance items during build-ready promotion, and the resulting explicit build-ready promotion block
- Warnings come from affected rules, affected invariants, and newly relevant validation issues introduced by the proposed stable save
- Notices are lower-severity informational review items that do not require confirmation by themselves
- Warning or blocker reviews require an explicit confirm action before the stable save is committed

## Save And Revision Interaction
- Draft edits stay in the workspace and do not create review spam
- No-op saves produce a no-change review result and do not create a revision
- No-op checkpoints produce the same no-change result and do not create a revision
- Only completed stable saves create revisions
- Only completed checkpoints create `manualCheckpoint` revisions
- Cancelled review flows do not write active storage and do not create revisions
- If build-ready promotion is blocked, a confirmed save persists the project as `validated` and then records the resulting revision
- If build-ready promotion is blocked during checkpoint review, a confirmed checkpoint also persists as `validated` and records the resulting `manualCheckpoint` revision
- Recovery restore keeps its own preview/confirm flow and is not routed through stable change review

## Save Vs Manual Checkpoint
- `editSave` is the standard stable save path for routine stable edits
- `manualCheckpoint` is an explicit milestone capture of the current draft state
- Both actions share the same baseline selection, diffing, review logic, confirmation rules, persistence path, and revision store
- They remain distinct in revision metadata so the timeline can show stable milestones separately from routine saved edits

## Intentionally Not Included Yet
- No rollback or revert
- No branching or alternate revision graphs
- No collaboration or merge logic
- No mixing of revision history with storage-format migration
- No semantic policy engine beyond declarative governance metadata, deterministic invariant/rule scope review, and validation signals

## Adding Future Migrations
- Add a new ordered step to the migration registry
- Keep steps deterministic and explicit
- Preserve editable drafts by limiting migration to shape recovery and safe defaults
- Keep relational governance checks in the validation engine rather than moving them into schema coercion
