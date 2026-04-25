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
- First-class per-project revision history with structural diffs
- Validation rules for structural governance checks
- Guided intake that turns structured project answers into a populated governed blueprint
- Deterministic missing-structure completion for raw-idea projects
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

## Revision History
- Revision history is separate from active blueprint storage and separate from quarantine recovery
- Revisions are tracked per project and persisted in their own local store
- Each revision keeps metadata, a blueprint snapshot, and a structural diff summary
- Revisions are created only at stable boundaries in this repo: explicit project saves, manual checkpoints, recovery restores, and initial seed/system backfill
- No-op saves do not create duplicates, and draft edits in the workspace do not create per-keystroke revision spam
- Recovery restore writes a revision with `source = recoveryRestore` when the restored snapshot differs meaningfully from the latest revision
- Edit-driven revisions use `source = editSave`
- Manual milestone captures use `source = manualCheckpoint` and can carry an optional checkpoint note on the resulting revision
- Revision history is intentionally not rollback, branching, or collaboration yet

## Manual Checkpoints
- A manual checkpoint is an explicit milestone capture of the current draft as stable truth
- It uses the same stable review path as normal save, including invariant/rule impact review and validation-aware build-ready gating
- Manual checkpoints are distinct from normal saves in revision metadata, so the timeline can show deliberate milestone captures separately from routine edits
- Checkpoint notes are lightweight and optional; when provided they are stored on the resulting `manualCheckpoint` revision
- No-op checkpoints do not create duplicate revisions

## Revision Comparison
- The history panel can compare a selected revision against the immediately previous revision, another selected revision, or the current active project state
- All revision comparisons reuse the same shared structural diff path used by recovery preview; there is still one diff truth layer
- Current active comparison is useful for inspecting unsaved drift in the active workspace without creating a revision
- Revision comparison is an inspection feature only. Revert/rollback remains intentionally out of scope for this step

## Stable Change Review
- Stable change review runs at explicit save boundaries, not on every draft edit
- The review compares the current stable project against the proposed save using the same shared structural diff path used elsewhere in the app
- It then inspects affected invariants, affected rules, and relevant validation signals before the save is accepted as project truth
- Invariant and rule behavior is now driven primarily by explicit governance policy metadata on those entities rather than being buried in service heuristics
- Policy metadata includes review severity, save/checkpoint/build-ready applicability, build-ready blocking, confirmation requirements, override visibility, review messaging, recommendations, and rationale
- Reviews classify findings into blockers, warnings, and notices with explicit recommendations
- Warning-level reviewed saves require an explicit confirm action before persistence
- Warning-level reviewed checkpoints require the same explicit confirm action before persistence
- Blocker-level review currently blocks build-ready promotion, but still allows a confirmed save to persist as `validated` so drafts do not get trapped
- No-op saves do not open review and do not create duplicate revisions
- Change review is separate from schema validation, separate from revision history, and separate from quarantine recovery

## Guided Blueprint Creation
- The guided builder collects raw idea, project name, framework type, target user, problem, intended outcome, principles, non-negotiables, MVP boundary, expansion ideas, and known risks
- `composeBlueprintFromGuidedIntake(...)` converts those answers into a normal `ProjectBlueprint`
- The composer uses the existing domain factory functions and creates connected outcomes, actors, domains, functions, components, flows, governance, scope, decisions, and failure modes
- Generated MVP and expansion items reference valid outcome/function/component IDs so schema validation and relational validation remain meaningful
- Guided creation still saves through `BlueprintService`, so schema parsing, validation, stable save review, local persistence, memory snapshots, and revision history are preserved

## Deterministic Completion Engine
- Raw-idea project creation can intentionally start small with project, intent, and outcome
- `completeBlueprintStructure(...)` fills missing blueprint sections without replacing existing user-authored entities
- Completion is conservative: empty collections are populated, empty MVP/expansion summaries are filled, and existing content is left in place
- Generated structure includes actors, domains, functions, components, flows, dependencies, rules, invariants, guardrails, phases, MVP scope, expansion scope, decision records, and failure modes
- `BlueprintService.completeMissingStructure(...)` runs completion and then saves through the same stable save path with the reason `Completed missing framework structure.`
- The UI exposes this as `Complete Missing Structure` in the full workspace near save and checkpoint actions

## Structural Completeness Validation
- Validation no longer treats empty collections as build-ready just because relational checks pass vacuously
- Missing domains, functions, components, or MVP scope produce critical failures and block `buildReady`
- Missing actors, flows, phases, governance, and decision principles produce high-severity completeness failures
- Existing relational validation remains intact: function-outcome mapping, component-function mapping, dependency/reference checks, governance scope checks, and MVP/expansion separation still run

## Governance Policy Metadata
- Rules and invariants carry explicit `policy` metadata in the domain schema
- The app keeps camelCase internally and still accepts older stored entities without `policy` by deriving safe defaults during schema parsing
- Older invariants that used top-level `blocksBuildReady` and `overrideAllowed` still hydrate into the current nested policy shape
- Seed governance examples now include explicit policy messages and rationale so the review surface is inspectable from day one
- This is not a second validation engine; it is a declarative layer that guides stable save review using the same shared diff path and existing validation output

## Quarantine Recovery
- Quarantined entries can be inspected in-app with failure reason, stage, detected version, and raw payload preview
- Export writes an inspectable JSON file containing the quarantined metadata and raw payload without mutating the stored entry
- Manual recovery accepts pasted JSON or an imported JSON file, then runs that payload through the same migration and schema validation path as normal load
- Recovery preview is non-mutating and must succeed before restore is allowed
- When a recovered candidate contains multiple projects, the user can choose which recovered project to review and restore
- Restore requires explicit confirmation and only writes the selected recovered project from the validated preview candidate
- Active storage is only updated after preview succeeds and restore is confirmed
- Restoring does not clear quarantine; quarantine remains available until the user clears it deliberately
- Clearing quarantine entries is explicit and never automatic

## Recovery Preview And Compare
- Recovery preview is non-mutating: it hydrates a candidate through the same migration and schema validation path without writing to active storage
- The compare surface summarizes meaningful structural changes against the current active blueprint instead of showing a full generic JSON diff
- Compared sections include project and intent scalar fields, MVP and expansion scope summaries, and entity collections such as domains, functions, components, dependencies, rules, and phases
- Preview review helps decide whether to restore or clear quarantine; it is not revision history
- The restore target is explicit: the UI shows which recovered project is selected, what restore will do, and any warnings before confirmation

## Revision Diff Summary
- Revision diffs reuse the same architecture-oriented compare model as recovery preview
- Captured changes include project and intent scalar fields, decision logic summaries, MVP and expansion scope summaries, and added/removed/changed entities across the main blueprint collections
- Scope item collections, decision records, and failure modes are also tracked so meaningful blueprint changes do not disappear into a no-op save
- Revision-to-revision and revision-to-current comparison use the same summary shape, so the history UI and recovery preview do not diverge

## What Change Review Does Not Do Yet
- It does not evaluate semantics beyond explicit policy metadata, invariant/rule scope, build-ready blocking flags, and validation output
- It does not revert or roll back anything
- It does not add branching, collaboration, or policy automation

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
