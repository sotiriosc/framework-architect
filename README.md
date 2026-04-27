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

## Current V1 Product Loop
Conversation / Notes -> Distilled Intake -> Template -> Blueprint -> Validation -> Quality Review -> Safe Fixes -> Foresight -> Implementation Plan -> Agent Run Packet -> External Execution -> Result Review -> Execution Journal -> Source Lineage -> Export.

The default path is guided and populated: users can paste a messy conversation or start from a raw idea, review editable intake fields, choose or infer a template, generate a governed blueprint, review structural validation, inspect quality and next-best fixes, apply deterministic safe fixes when useful, review strategic foresight suggestions, sequence the MVP into bounded implementation tasks, generate one-task agent run packets, review pasted external execution reports, then export implementation artifacts and Codex-ready task packs. The full editor remains available for manual architecture work, including the advanced empty-blueprint path.

## V1 Includes
- Strong TypeScript domain types and Zod schemas
- Local-first persistence for projects, blueprint data, and memory
- Versioned storage migration with quarantine for unrecoverable payloads
- First-class per-project revision history with structural diffs
- Validation rules for structural governance checks
- Guided intake that turns structured project answers into a populated governed blueprint
- Conversation import and deterministic thread distillation into editable guided intake fields
- Template-guided generation for software apps, Praxis features, business systems, coaching systems, content/brand frameworks, books/white papers, SOP/workflows, and generic frameworks
- Deterministic missing-structure completion for raw-idea projects
- Relation-aware editing that shows human-readable entity names while preserving stored IDs
- Export outputs for Markdown architecture briefs, Codex prompts, JSON, and MVP checklists
- Blueprint quality review and deterministic safe quality fixes
- Strategic foresight and opportunity radar for future work, risks, experiments, metrics, tests, and Codex task seeds
- Implementation task planner and Codex task pack exports
- Agent Run Harness and local execution journal for bounded external Codex runs and pasted result review
- Source Lineage / Seed Provenance view and export for seed, template orientation, shaping inputs, produced artifacts, trust boundaries, and warnings
- Multi-template calibration fixtures for Software App, Business System, Coaching System, Content / Brand Framework, Book / White Paper, SOP / Workflow, and Generic Framework seeds
- Minimal UI for dashboard, guided creation, full editing, validation, quality review, foresight, implementation planning, agent runs, exports, lineage, revision history, memory, and quarantine recovery
- A seed example blueprint for inspection and iteration

## V1 Scope / Out Of Scope
In scope for this branch:
- Local-first blueprint creation and editing
- Deterministic governance, validation, quality review, foresight, implementation planning, agent run harness, and exports
- Guided generation from raw ideas or distilled conversations
- Stable save review, memory snapshots, revision history, migration, and quarantine recovery

Out of scope for this branch:
- Autonomous execution or in-app code running
- Backend collaboration, cloud sync, or database persistence
- Real code verification beyond user-pasted reports and deterministic checks
- Account system, authentication, billing, or external AI calls

## Architecture Layers
- `schema`: Zod contracts for every entity and the top-level blueprint
- `domain`: shared types, defaults, and entity metadata
- `application`: intake, validation, lineage, export, review, planning, agent harness, and persistence workflows
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
- Framework type is resolved through a local deterministic template registry, with a custom type field that falls back to closest-template keyword matching
- `composeBlueprintFromGuidedIntake(...)` converts those answers into a normal `ProjectBlueprint`
- The composer uses the existing domain factory functions and creates connected outcomes, actors, domains, functions, components, flows, governance, scope, decisions, and failure modes
- Selected templates shape generated domains, functions, components, rules, invariants, guardrails, phases, MVP items, expansion items, and failure modes while preserving the user's intake text
- Generated MVP and expansion items reference valid outcome/function/component IDs so schema validation and relational validation remain meaningful
- Guided creation still saves through `BlueprintService`, so schema parsing, validation, stable save review, local persistence, memory snapshots, and revision history are preserved

## Conversation Import And Thread Distillation
- Conversation import accepts pasted transcripts, notes, brainstorms, meetings, and other messy source text
- Distillation is deterministic and local: it uses headings, bullets, repeated language, and keywords such as problem, goal, user, MVP, later, risk, must, should, and do not break
- The distiller produces editable guided intake candidates, traceable extracted signals, confidence, and warnings
- It does not create or mutate a blueprint until the user reviews the fields and chooses to create one
- Conversation-created blueprints still use `BlueprintService.createProjectFromGuidedIntake(...)`, then validation, stable save review, memory snapshots, revision history, local persistence, and exports
- Source memory records source type and optional label without storing the full pasted thread in memory, avoiding localStorage bloat

## Source Lineage / Seed Provenance
- `buildBlueprintLineage(...)` derives a read-only lineage view from the current blueprint, memory, revision history, validation, quality review, implementation planning, and Agent Run Journal
- Lineage identifies the likely seed source: raw idea, guided intake, conversation import, empty blueprint, recovery restore, seed example, or unknown
- Orientation records the detected template, template label, core philosophy, and invariant priorities without adding fields to `ProjectBlueprint`
- Nourishment items explain what shaped the blueprint: template signals, conversation source memory, stable revisions, memory snapshots, validation, quality review, selected foresight or implementation actions, and agent runs
- Fruit items separate the current blueprint from derived artifacts such as Markdown, Codex Prompt, Implementation Plan, Codex Task Pack, JSON, MVP Checklist, Agent Run Packets, and Agent Result Reviews
- Trust boundaries stay explicit: ProjectBlueprint is truth, exports are derived artifacts, agent reports are pasted external evidence, revisions are stable saved snapshots, and conversation import is reviewed before blueprint creation
- The Lineage panel and Lineage Report are deterministic, local-only, and non-mutating

## Framework Templates
- Template definitions live in `src/application/templates/frameworkTemplates.ts`
- Supported templates are Software App, Praxis Feature, Business System, Coaching System, Content / Brand Framework, Book / White Paper, SOP / Workflow, and Generic Framework
- Templates are deterministic seed patterns: they shape different kinds of blueprints through local guidance for domains, functions, components, governance, scope, risks, planning, and exports
- Template inference is local and deterministic; there are no external AI calls or backend dependencies
- Template metadata is surfaced in project cards and exports without changing the core `ProjectBlueprint` schema
- Canonical multi-template smoke fixtures live in `docs/template-smoke-fixtures.md` and reusable test fixtures live in `tests/fixtures/templateSmokeFixtures.ts`

## Deterministic Completion Engine
- Raw-idea project creation now completes missing structure by default so new users do not start from an empty shell
- Advanced/manual creation is still available through `Create empty blueprint` for users who want to model every section themselves
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

## Export Outputs
- Completed blueprints can be exported locally from the workspace without a backend
- Markdown export creates a full architecture brief with intent, structure, governance, scope, decisions, risks, validation, quality, and foresight summary
- Codex prompt export turns the blueprint into an implementation prompt that preserves rules, invariants, MVP scope, validation expectations, template-specific implementation emphasis, recommended first task, and do-not-build-yet future work
- JSON export writes the current `ProjectBlueprint` as formatted JSON
- MVP checklist export creates a practical checklist from MVP scope items, phases, required functions, and validation blockers
- Implementation Plan export writes the ordered task groups, test plan, risk controls, commit plan, and acceptance checklist
- Codex Task Pack export writes multiple small implementation prompts with scope, likely files, tests, acceptance criteria, do-not-break constraints, and expected result report format guidance
- Lineage Report export writes seed, orientation, nourishment, fruit, trust boundaries, and warnings
- Markdown export includes only a concise lineage summary, not the full report

## Quality Review And Safe Fixes
- Validation answers whether the blueprint is structurally correct and build-ready
- Quality review answers whether the blueprint is specific, useful, template-aligned, clear, and implementation-ready
- Safe quality fixes are deterministic local actions that add or clarify without deleting user-authored content
- Manual-review and risky fixes are surfaced for judgment but are not auto-applied
- Safe fixes still save through `BlueprintService`, so validation, stable change review, memory snapshots, and revision history remain intact

## Strategic Foresight And Opportunity Radar
- Foresight answers what the blueprint should watch, test, defer, or prepare next
- It is deterministic and uses only the current blueprint, detected template, validation state, quality review, and improvement plan
- Foresight suggestions are advisory by default; the engine does not silently mutate the blueprint
- Selected foresight items can be added to expansion scope or recorded as decision records through `BlueprintService`
- Those selected actions still validate, pass through stable save review, update memory, and record revision history
- Template-specific patterns keep suggestions practical: Praxis features emphasize regression tests and do-not-break guidance, software apps emphasize onboarding/persistence/testing, business systems emphasize offer/customer/delivery/revenue validation, and other templates get matching next-step signals

## Implementation Planning And Codex Task Packs
- Implementation planning answers how to build the current validated blueprint in small, ordered steps
- It is deterministic and uses the blueprint, template, validation, quality review, improvement plan, and foresight
- The planner returns readiness, recommended build order, task groups, per-task Codex prompts, test guidance, risk controls, dependency warnings, do-not-break constraints, deferred items, branch names, commit plan, and final acceptance checklist
- Codex prompts are intentionally bounded: each prompt names goal, scope, likely files, acceptance criteria, tests, do-not-break constraints, and asks Codex to summarize changed files
- Deferred expansion and not-yet work stays out of MVP task groups and the MVP checklist
- Selected planner items can be recorded as decision records or added to expansion scope through `BlueprintService`, preserving stable save review, validation, memory, and revision history

## Agent Run Harness And Execution Journal
- The harness turns one implementation task into a stricter Agent Run Packet with one-task scope, likely files, acceptance criteria, suggested tests, do-not-break constraints, do-not-touch guidance, risk notes, and an exact result report format
- The app does not execute Codex, inspect the working tree, verify code, or merge changes; users copy the packet to an external agent and paste the result report back
- The result parser extracts changed files, tests run, reported failures, followups, and summary from the pasted text
- The result reviewer compares only the pasted evidence against the packet, marking missing tests, missing acceptance criteria, unexpected touched files, and do-not-break concerns honestly
- Journal entries are stored in a separate localStorage key from active blueprints and revisions, so packet creation and result review do not mutate blueprint truth

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

The current Vite production build can emit a chunk-size warning. This is known and non-blocking for V1; no major code-splitting work is planned on this stabilization branch.

## Manual Smoke Test
Use `docs/manual-smoke-test.md` for the V1 release-readiness checklist.

## Notes
- The app is deliberately local-first and transparent.
- Validation logic lives outside the UI.
- AI orchestration and code generation are intentionally out of scope for this version.
