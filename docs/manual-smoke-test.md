# Framework Architect V1 Manual Smoke Test

Use this checklist before deeper manual testing or release packaging.

## Guided Creation
- [ ] Open the dashboard.
- [ ] Create a guided Praxis Feature blueprint.
- [ ] Confirm the generated project opens in the full workspace.
- [ ] Confirm the project card shows the Praxis Feature template, validation summary, build-ready state, and latest revision.

## Conversation Import
- [ ] Open the dashboard.
- [ ] Click Import conversation / notes.
- [ ] Paste a transcript that includes raw idea, target user, problem, MVP, expansion, risks, and must-remain-true items.
- [ ] Click Distill Conversation.
- [ ] Confirm extracted intake fields are editable before save.
- [ ] Confirm extracted signals show confidence, source snippets, and reasons.
- [ ] Edit one distilled field.
- [ ] Create blueprint from distilled intake.
- [ ] Confirm the generated project opens in the full workspace.
- [ ] Confirm project memory includes a conversation-import entry without storing the full pasted thread as memory text.
- [ ] Confirm validation passes and the normal quality, foresight, implementation plan, and export loop remains available.

## Validation, Quality, Foresight, Planning, And Agent Harness
- [ ] In the workspace inspector, confirm Validation appears before Quality Review, Foresight appears before Implementation Plan, Agent Run Harness appears after Implementation Plan, and Export appears after the harness.
- [ ] Confirm Validation explains structural correctness and shows build-ready as yes for the guided blueprint.
- [ ] Confirm Quality Review explains usefulness, specificity, template fit, clarity, and implementation readiness.
- [ ] Confirm safe/manual/risky fixes are visible when relevant.
- [ ] Apply Safe Fixes.
- [ ] Confirm validation still passes and quality does not get worse.
- [ ] Confirm Foresight suggests regression tests, do-not-break instructions, an isolated implementation boundary, and a user trust/explanation surface for the Praxis Feature blueprint.
- [ ] Convert one hidden opportunity to expansion.
- [ ] Convert one risk to a decision record.
- [ ] Confirm validation still passes after each foresight action.
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
- [ ] Confirm exported text keeps MVP and expansion scope distinct.
- [ ] Confirm the Markdown export includes a concise foresight summary.
- [ ] Confirm the Codex Prompt includes rules, invariants, guardrails, validation expectations, recommended future work, and do-not-build-yet guidance.
- [ ] Confirm the Codex Task Pack includes Praxis do-not-break constraints for program generation, progression logic, phase gating, validation, existing tests, and coaching clarity.
- [ ] Confirm the Codex Task Pack includes expected result report format guidance for the Agent Run Harness.
- [ ] Confirm a conversation-imported blueprint can export the Codex Task Pack.
- [ ] Confirm the MVP Checklist does not include later or not-yet foresight items.

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
