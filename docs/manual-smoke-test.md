# Framework Architect V1 Manual Smoke Test

Use this checklist before deeper manual testing or release packaging.

## V1 Scope Boundaries
- [ ] Confirm the app remains local-first and does not require auth, backend services, cloud sync, billing, or external AI calls.
- [ ] Confirm Agent Run Harness copy says the app reviews pasted reports and does not execute or verify code directly.
- [ ] Treat the Vite chunk-size warning during build as known and non-blocking for V1 unless a functional regression appears.

## Guided Creation
- [ ] Open the dashboard.
- [ ] Create a guided Praxis Feature blueprint.
- [ ] Confirm the generated project opens in the full workspace.
- [ ] Confirm the project card shows the Praxis Feature template, validation summary, build-ready state, and latest revision.

## Conversation Import
- [ ] Open the dashboard.
- [ ] Click Import conversation / notes.
- [ ] Paste the sample Praxis Feature import text below, or another transcript that includes raw idea, target user, problem, MVP, expansion, risks, and must-remain-true items.
- [ ] Click Distill Conversation.
- [ ] Confirm extracted intake fields are editable before save.
- [ ] Confirm extracted signals show confidence, source snippets, and reasons.
- [ ] Confirm Raw idea / seed is visible and filled.
- [ ] Confirm Target user is filled after distillation.
- [ ] Confirm Target user is concise and does not include a needs sentence.
- [ ] Confirm Problem is filled after distillation.
- [ ] Confirm Problem does not start with "that".
- [ ] Confirm Intended outcome is filled after distillation.
- [ ] Confirm Intended outcome does not start with "that I can".
- [ ] Confirm intended outcome text does not appear inside MVP boundary items.
- [ ] Confirm target user/problem prose does not appear inside known risks.
- [ ] Edit one distilled field.
- [ ] Create blueprint from distilled intake.
- [ ] Confirm the generated project opens in the full workspace.
- [ ] Confirm project memory includes a conversation-import entry without storing the full pasted thread as memory text.
- [ ] Confirm validation passes and the normal quality, foresight, implementation plan, and export loop remains available.

## Multi-Template Spot Check
- [ ] Keep the Praxis fixture as the primary full manual smoke test.
- [ ] Open `docs/template-smoke-fixtures.md`.
- [ ] Pick one non-Praxis fixture.
- [ ] Import and distill the fixture through Import conversation / notes.
- [ ] Confirm the suggested template matches the fixture heading.
- [ ] Confirm raw idea, target user, problem, intended outcome, MVP, expansion, risks, and hidden opportunities are populated.
- [ ] Create the blueprint and confirm validation is build-ready.
- [ ] Confirm the Source Lineage panel shows the same template orientation.
- [ ] Export Markdown, Codex Task Pack, MVP Checklist, Lineage Report, and Expansion Roadmap for the spot-check blueprint.
- [ ] Confirm MVP and expansion remain separate in the generated blueprint and exports.

### Sample Praxis Feature Import Text
Use this as the conversation import smoke-test fixture.

```text
Raw idea: Build a Praxis Feature workflow in Framework Architect that turns messy conversation notes into a governed blueprint, implementation plan, Codex task pack, and one bounded Agent Run Packet.
Target user: Praxis builders and feature implementers.
Problem: Praxis feature ideas can move too quickly into implementation, weakening program generation, progression, phase-gating, validation, and user trust.
Intended outcome: Create a build-ready Praxis Feature blueprint that preserves intent, separates MVP from expansion, and reviews pasted Codex results only from reported evidence.

Core principles:
- Preserve intent before implementation
- Structure before code
- Validate before build-ready
- Separate MVP from expansion
- Do not bypass existing app invariants
- Keep coaching clarity and user trust
- Use Codex only through bounded tasks

Must remain true:
- Generated prompts must not weaken existing Praxis program generation logic
- Do not bypass progression logic
- Do not bypass phase gating
- Do not modify generator, progression, repair, or phase-gating logic unless explicitly scoped
- MVP scope and expansion scope must remain separate
- Every implementation task must include acceptance criteria and tests
- Agent Run Harness must not pretend to verify code directly
- Pasted Codex results must be reviewed only from reported evidence

MVP boundary:
- Import conversation or notes
- Distill the thread into editable intake fields
- Create a Praxis Feature blueprint
- Validate structural completeness
- Review quality and apply safe fixes
- Generate foresight suggestions
- Create implementation plan
- Generate Codex Task Pack
- Generate one Agent Run Packet for one implementation task
- Paste a fake Codex result
- Review whether the report satisfies acceptance criteria
- Store the result in the execution journal
- Export Markdown, Codex Prompt, Implementation Plan, Codex Task Pack, JSON, and MVP Checklist

Expansion ideas:
- Direct ChatGPT integration
- Browser extension for sending selected chat text into Framework Architect
- GitHub PR review integration
- Actual code/test verification through a local CLI bridge
- Team collaboration
- Cloud sync
- Reusable Praxis feature template library
- One-click Codex handoff
- Agent result comparison across multiple runs

Known risks:
- Codex may say tests passed when they were not actually run
- A pasted report may say not covered or not run and the harness could accidentally count it as evidence
- The blueprint may become too generic
- The user might confuse quality review with validation
- The app might imply it executes Codex when it only prepares packets
- The MVP checklist might accidentally include future expansion items
- Agent journal entries could be confused with blueprint truth or revisions
- Too many panels could overwhelm the user

Hidden opportunities:
- The app can become a governance harness around AI-assisted development
- Chat can remain the discovery layer while Framework Architect becomes the crystallization layer
- The system can preserve the seed of an idea and show how the thread becomes structure
- The Agent Run Harness can prevent reckless autonomous execution by requiring bounded scope, evidence, and review
- Praxis can use this to build features more safely
```

## Validation, Quality, Foresight, Expansion, Planning, And Agent Harness
- [ ] In the workspace inspector, confirm Validation appears before Quality Review, Foresight appears before Expansion Roadmap, Expansion Roadmap appears before Implementation Plan, Agent Run Harness appears after Implementation Plan, and Export remains available in outputs/provenance.
- [ ] Confirm Validation explains structural correctness and shows build-ready as yes for the guided blueprint.
- [ ] Confirm Quality Review explains usefulness, specificity, template fit, clarity, and implementation readiness.
- [ ] Confirm safe/manual/risky fixes are visible when relevant.
- [ ] Apply Safe Fixes.
- [ ] Confirm validation still passes and quality does not get worse.
- [ ] Confirm Foresight suggests regression tests, do-not-break instructions, an isolated implementation boundary, and a user trust/explanation surface for the Praxis Feature blueprint.
- [ ] Convert one hidden opportunity to expansion.
- [ ] Convert one risk to a decision record.
- [ ] Confirm validation still passes after each foresight action.
- [ ] Open Expansion Roadmap.
- [ ] Confirm an "AI agent" or "Direct ChatGPT integration" style expansion idea becomes a staged governed path rather than only repeated text.
- [ ] Confirm the staged path includes prerequisites, risks, suggested experiments or metrics, and not-yet boundaries.
- [ ] Confirm not-yet autonomous execution, automatic merging, or unscoped edits are clearly deferred for AI-agent paths.
- [ ] Confirm the expansion path is not added to MVP scope and does not change blueprint truth.
- [ ] Open Implementation Plan.
- [ ] Confirm readiness is ready-for-sequencing or ready-for-codex.
- [ ] Confirm task groups include Praxis feature boundary, invariant protection, UI surface, regression coverage, and export/Codex handoff.
- [ ] Copy the first Codex task prompt.
- [ ] Confirm the copied prompt includes scope, likely files, acceptance criteria, tests, do-not-break constraints, and changed-file summary instructions.
- [ ] Open Agent Run Harness.
- [ ] Generate an Agent Run Packet for the first implementation task.
- [ ] Copy the packet prompt and confirm it says to do exactly one task.
- [ ] Paste a fake Codex result with changed files, tests run, acceptance coverage, failures, and followups.
- [ ] Review the pasted result.
- [ ] Confirm missing or covered criteria and tests are shown honestly.
- [ ] Confirm the execution journal stores the packet/review entry.
- [ ] Confirm blueprint validation and revision history are unaffected by packet creation and pasted result review.

## Source Lineage / Seed Provenance
- [ ] Create or import a blueprint.
- [ ] Open Source Lineage after Revision History in the workspace inspector.
- [ ] Confirm Seed shows the source kind, source label, raw idea, and created timestamp when available.
- [ ] Confirm Orientation shows the detected template and core philosophy.
- [ ] Confirm Nourishment shows template, validation, quality review, memory/revision, and conversation or agent signals when present.
- [ ] Confirm Fruit shows ProjectBlueprint, exports, implementation plan, Codex task pack, and any Agent Run Packet / Agent Result Review entries.
- [ ] Confirm trust boundaries state that ProjectBlueprint is blueprint truth and exports are derived artifacts.
- [ ] Confirm pasted agent run reports are labeled as external evidence and are not treated as blueprint truth.
- [ ] Confirm Lineage warnings are understandable and do not imply external code/test verification.

## Save, Revisions, And Memory
- [ ] Save the blueprint with a short save reason.
- [ ] Create a manual checkpoint with a checkpoint note.
- [ ] Confirm revision history shows the save/checkpoint entries.
- [ ] Compare a revision against the current active project.
- [ ] Open Advanced storage and debug tools.
- [ ] Confirm memory snapshots show project, structural, and decision entries.

## Exports
- [ ] Export Markdown.
- [ ] Export Codex Prompt.
- [ ] Export Implementation Plan.
- [ ] Export Codex Task Pack.
- [ ] Export JSON.
- [ ] Export MVP Checklist.
- [ ] Export Lineage Report.
- [ ] Export Expansion Roadmap.
- [ ] Confirm exported text keeps MVP and expansion scope distinct.
- [ ] Confirm the Markdown export includes a concise lineage summary, not the full lineage report.
- [ ] Confirm the Markdown export includes a concise expansion roadmap summary, not the full expansion roadmap report.
- [ ] Confirm the Lineage Report includes seed, orientation, nourishment, fruit, trust boundaries, and warnings.
- [ ] Confirm the Expansion Roadmap export includes stages, prerequisites, risks, and not-yet boundaries.
- [ ] Confirm the Markdown export includes a concise foresight summary.
- [ ] Confirm the Codex Prompt includes rules, invariants, guardrails, validation expectations, recommended future work, and do-not-build-yet guidance.
- [ ] Confirm the Codex Task Pack includes Praxis do-not-break constraints for program generation, progression logic, phase gating, validation, existing tests, and coaching clarity.
- [ ] Confirm the Codex Task Pack includes expected result report format guidance for the Agent Run Harness.
- [ ] Confirm a conversation-imported blueprint can export the Codex Task Pack.
- [ ] Confirm the MVP Checklist does not include later or not-yet foresight items.
- [ ] Confirm the MVP Checklist does not include intended outcome prose as an MVP item.
- [ ] Confirm exports read naturally without awkward fragments like "reach that I can".

## Empty Blueprint Path
- [ ] From the full workspace, create an empty blueprint.
- [ ] Confirm the empty blueprint is not build-ready.
- [ ] Confirm validation shows missing structure blockers.
- [ ] Click Complete missing structure.
- [ ] Confirm the completed blueprint becomes schema-valid and build-ready by validation.

## Relation-Aware Editing
- [ ] Open Functions and Components editors.
- [ ] Confirm relationship fields show entity names instead of only raw IDs.
- [ ] Change one function/domain/component relation.
- [ ] Save the blueprint.
- [ ] Confirm validation still passes.
- [ ] Export the Codex Prompt and confirm mapped names remain correct.

## Quarantine Recovery
- [ ] Open Advanced storage and debug tools.
- [ ] Confirm Quarantine Recovery is visible but secondary.
- [ ] If no quarantine entries exist, confirm the empty state says normal local storage loaded without manual repair.
- [ ] If a quarantine entry exists, export its JSON.
- [ ] Run preview before restore.
- [ ] Confirm restore requires explicit checkbox confirmation.
- [ ] Confirm successful restore does not automatically clear quarantine.
- [ ] Confirm clearing quarantine is explicit.
