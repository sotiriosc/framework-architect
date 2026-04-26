# Framework Architect V1 Manual Smoke Test

Use this checklist before deeper manual testing or release packaging.

## Guided Creation
- [ ] Open the dashboard.
- [ ] Create a guided Praxis Feature blueprint.
- [ ] Confirm the generated project opens in the full workspace.
- [ ] Confirm the project card shows the Praxis Feature template, validation summary, build-ready state, and latest revision.

## Validation, Quality, And Foresight
- [ ] In the workspace inspector, confirm Validation appears before Quality Review and Foresight appears before Export.
- [ ] Confirm Validation explains structural correctness and shows build-ready as yes for the guided blueprint.
- [ ] Confirm Quality Review explains usefulness, specificity, template fit, clarity, and implementation readiness.
- [ ] Confirm safe/manual/risky fixes are visible when relevant.
- [ ] Apply Safe Fixes.
- [ ] Confirm validation still passes and quality does not get worse.
- [ ] Confirm Foresight suggests regression tests, do-not-break instructions, an isolated implementation boundary, and a user trust/explanation surface for the Praxis Feature blueprint.
- [ ] Convert one hidden opportunity to expansion.
- [ ] Convert one risk to a decision record.
- [ ] Confirm validation still passes after each foresight action.

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
- [ ] Export JSON.
- [ ] Export MVP Checklist.
- [ ] Confirm exported text keeps MVP and expansion scope distinct.
- [ ] Confirm the Markdown export includes a concise foresight summary.
- [ ] Confirm the Codex Prompt includes rules, invariants, guardrails, validation expectations, recommended future work, and do-not-build-yet guidance.
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
