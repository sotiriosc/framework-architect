# Architecture Notes

## V1 Direction
Framework Architect is intentionally local-first and architecture-first. The app captures a project idea as a governed blueprint and keeps governance concepts explicit instead of burying them in helper code.

## Current V1 Product Loop
Conversation / Notes -> Distilled Intake -> Template -> Blueprint -> Validation -> Quality Review -> Safe Fixes -> Foresight -> Implementation Plan -> Agent Run Packet -> External Execution -> Result Review -> Execution Journal -> Export.

The primary UI path follows that order: dashboard import or guided intake creates a reviewable intake draft, blueprint creation produces a populated blueprint, the workspace shows structural validation first, quality review and safe fixes second, foresight third, implementation planning fourth, the agent harness after planning, exports after that, and revision history after the current working state. Persistence status, quarantine recovery, memory snapshots, and raw blueprint JSON remain available as advanced diagnostics rather than the default read path.

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
- It resolves the framework type through the local template registry in `src/application/templates/frameworkTemplates.ts`
- It creates connected outcomes, actors, domains, functions, components, flow, governance, phases, MVP and expansion scope, decision records, and failure modes
- It runs `validateBlueprint(...)` before returning
- `BlueprintService.createProjectFromGuidedIntake(...)` persists the result through the standard stable save path

Because guided output is saved through `BlueprintService`, it inherits schema parsing, stable change review, local-first persistence, memory snapshot creation, and revision recording.

## Conversation Import And Thread Distillation
Conversation import is an application-layer producer of editable guided intake fields. It does not store a second blueprint model and does not write project truth until the user approves creation.

- `conversationImportTypes.ts` defines import drafts, distilled intake, signals, confidence, and result types
- `distillConversationToIntake(...)` uses deterministic local heuristics: section headings, bullets, labels, repeated cues, and keywords such as problem, goal, user, client, audience, MVP, later, future, risk, must, should, invariant, and do not break
- Extracted signals retain source snippets and reasons so the user can inspect why a field was suggested
- Missing or weak extraction produces warnings instead of hallucinated fields
- The review UI keeps extracted fields editable before blueprint creation
- Creating a blueprint from distilled intake calls the same guided creation service path and therefore preserves schema validation, stable save review, local persistence, memory snapshots, revision history, and quarantine behavior
- Source memory records that the blueprint came from a conversation import with source type and optional label, but avoids storing the full pasted transcript in memory

## Framework Template Layer
The template layer is deterministic application logic above the domain model. It shapes generation without changing the `ProjectBlueprint` schema or bypassing validation.

- Supported templates are Software App, Praxis Feature, Business System, Coaching System, Content / Brand Framework, Book / White Paper, SOP / Workflow, and Generic Framework
- Each template defines suggested domains, functions, components, rules, invariants, guardrails, phases, MVP items, expansion items, and failure modes
- Custom framework type text is matched to the closest supported template with local keyword rules
- The user's guided intake remains the source of truth; template suggestions fill and shape structure rather than replacing supplied problem, audience, outcome, MVP, expansion, or risk text
- Template metadata is recoverable from the generated project philosophy and is shown in the dashboard and export outputs
- Markdown and Codex exports mention the detected template; the Codex prompt includes template-specific implementation emphasis

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
- `exportImplementationPlan(...)` serializes the ordered implementation plan, task groups, risks, tests, commit plan, and acceptance checklist
- `exportCodexTaskPack(...)` serializes multiple small task prompts designed for bounded Codex work and includes expected result report format guidance for harness review

Markdown and Codex exports can include concise quality, foresight, and implementation plan summaries, but they still only serialize the current local state. The MVP checklist remains scoped to MVP work and does not include later, not-yet, or deferred implementation items.

The UI download panel only turns those local strings into files with project-slug filenames. Export behavior remains separate from validation, stable save review, memory, revision history, foresight actions, and quarantine recovery.

## Quality Review And Improvement Actions
Quality review is deterministic application logic above validation. It does not change the schema and does not decide build-ready status.

- Validation checks structural correctness, required sections, references, governance scope, and build-ready blockers
- Quality review scores usefulness, specificity, template fit, clarity, MVP/expansion separation, and export readiness
- Improvement planning groups findings into safe, manual-review, and risky fixes
- Safe fixes may rename generic invariants, fill empty descriptions, add mitigations, add or remap export surfaces, separate duplicate expansion names, add thin template structure, or add high-risk guardrails
- Safe fixes are applied through `BlueprintService`, then parsed, validated, reviewed, saved, snapshotted in memory, and recorded in revision history
- Manual-review and risky fixes are displayed but not auto-applied because they may require product judgment or could overwrite user-authored structure

## Strategic Foresight And Opportunity Radar
Foresight is deterministic application logic above validation and quality review. It anticipates useful next moves without changing the blueprint by default.

- `buildBlueprintForesight(...)` returns strategic position, now/next/later/not-yet items, hidden opportunities, risks, experiments, metrics, tests, and Codex task seeds
- It uses only the current blueprint, detected template, validation state, quality review, and improvement plan
- Template-specific patterns shape suggestions without changing the `ProjectBlueprint` schema
- Praxis Feature foresight emphasizes regression tests, do-not-break instructions, isolated implementation boundaries, user trust, and safety guardrails
- Software App foresight emphasizes onboarding, empty/error states, persistence audit, smoke tests, analytics, and local-first account deferral
- Business System, Coaching System, Content / Brand, Book / White Paper, SOP / Workflow, and Generic Framework each get matching deterministic opportunity and risk patterns
- Suggestions are advisory unless the user selects a single action
- `BlueprintService.addForesightItemToExpansion(...)` appends one selected item to expansion scope through the stable save path
- `BlueprintService.addForesightItemAsDecision(...)` records one selected item as a decision record through the stable save path
- Both service actions parse, validate, review, persist, snapshot memory, and record revision history

## Implementation Planner And Codex Task Pack
Implementation planning is deterministic application logic above foresight. It turns the current blueprint into a staged build sequence without mutating the blueprint by default.

- `buildImplementationPlan(...)` returns readiness, build order, task groups, Codex task pack, tests, risks, dependency warnings, do-not-break constraints, deferred items, branch names, commit plan, and final acceptance checklist
- Readiness is derived from validation, quality, exports, MVP scope, functions, components, governance, and test signals
- Template-specific task groups keep implementation focused: Praxis Feature emphasizes feature boundary, invariant protection, UI surface, regression tests, and Codex handoff; Software App emphasizes workflow, UI, data/persistence, validation, export/share, and tests; the other templates map to their own implementation concerns
- Codex task prompts include goal, scope, likely files, acceptance criteria, tests to run, do-not-break constraints, and a changed-file summary instruction
- Deferred expansion items and not-yet foresight remain outside MVP task groups
- `BlueprintService.addImplementationTaskAsDecision(...)` records one selected task as a decision record through the stable save path
- `BlueprintService.addImplementationDeferredItemToExpansion(...)` appends one selected deferred item to expansion scope through the stable save path
- Both service actions preserve validation, stable save review, local persistence, memory snapshots, revision history, and quarantine behavior

## Agent Run Harness And Execution Journal
The agent harness is deterministic workflow support around external execution. It is not an autonomous agent and does not run Codex directly.

- `buildAgentRunPacket(...)` uses the implementation plan to find one selected task and returns a strict packet with project context, task scope, likely files, acceptance criteria, suggested tests, do-not-break constraints, do-not-touch guidance, risk notes, a prompt, and an expected report format
- `parseAgentRunResult(...)` extracts changed files, tests run, reported failures, followups, and summary from pasted text using simple heading and bullet heuristics
- `reviewAgentRunResult(...)` compares the pasted report against the packet and returns accepted, needs-followup, or unclear based only on reported evidence
- The reviewer is intentionally conservative: missing changed files, missing tests, missing acceptance coverage, unexpected files, or do-not-break concerns prevent blind acceptance
- `LocalAgentRunJournalRepository` stores journal entries under a separate localStorage key from projects, revisions, and quarantine
- `BlueprintService.createAgentRunPacket(...)` and `BlueprintService.reviewAgentRunResult(...)` write journal entries only; they do not mutate the `ProjectBlueprint`, create revisions, or change validation state
- Any future action that converts a reviewed run into a blueprint decision or scope item should use the existing stable save path

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
