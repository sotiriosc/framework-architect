import { useState } from "react";

import type { ProjectBlueprint } from "@/domain/models";
import { CollectionEditor } from "@/ui/components/CollectionEditor";
import { IntentOutcomeEditor } from "@/ui/components/IntentOutcomeEditor";
import { MemoryViewer } from "@/ui/components/MemoryViewer";
import { BlueprintViewer } from "@/ui/components/BlueprintViewer";
import { ProjectForm } from "@/ui/components/ProjectForm";
import { PersistenceStatusPanel } from "@/ui/components/PersistenceStatusPanel";
import { QuarantineInspectorPanel } from "@/ui/components/QuarantineInspectorPanel";
import { RevisionHistoryPanel } from "@/ui/components/RevisionHistoryPanel";
import { SectionCard } from "@/ui/components/SectionCard";
import { ValidationPanel } from "@/ui/components/ValidationPanel";
import {
  actorFields,
  componentFields,
  constraintFields,
  createEntityFactories,
  decisionRecordFields,
  dependencyFields,
  domainFields,
  failureModeFields,
  flowFields,
  functionFields,
  guardrailFields,
  invariantFields,
  phaseFields,
  ruleFields,
  scopeItemFields,
} from "@/ui/editorConfig";
import { useBlueprintWorkspace } from "@/ui/hooks/useBlueprintWorkspace";

const joinLines = (items: string[]): string => items.join("\n");
const parseLines = (value: string): string[] =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const updateCurrent = (
  blueprint: ProjectBlueprint | null,
  updater: (current: ProjectBlueprint) => ProjectBlueprint,
): ProjectBlueprint | null => {
  if (!blueprint) {
    return null;
  }

  return updater(blueprint);
};

const App = () => {
  const workspace = useBlueprintWorkspace();
  const [saveReason, setSaveReason] = useState("Manual blueprint update.");

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Framework Architect</p>
          <h1>Project blueprint foundation</h1>
          <p className="muted">
            Capture the raw idea, keep the governance model explicit, and persist memory from v1.
          </p>
        </div>
        <div className="header-controls">
          <label className="field">
            <span>Current project</span>
            <select
              value={workspace.selectedProjectId ?? ""}
              onChange={(event) => workspace.selectProject(event.target.value || null)}
              disabled={workspace.projects.length === 0}
            >
              {workspace.projects.map((project) => (
                <option key={project.project.id} value={project.project.id}>
                  {project.project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field field--wide">
            <span>Save reason</span>
            <input value={saveReason} onChange={(event) => setSaveReason(event.target.value)} />
          </label>
          <button
            type="button"
            disabled={!workspace.draftBlueprint}
            onClick={() => workspace.saveCurrentProject(saveReason)}
          >
            Save blueprint
          </button>
        </div>
      </header>

      {workspace.error ? (
        <div className="status-banner status-banner--error">{workspace.error}</div>
      ) : null}

      <main className="workspace-grid">
        <div className="workspace-grid__editor">
          <ProjectForm
            createDraft={workspace.createDraft}
            onCreateDraftChange={workspace.updateCreateDraft}
            onCreateProject={workspace.createProject}
            project={workspace.draftBlueprint?.project ?? null}
            onProjectChange={(project) =>
              workspace.updateDraftBlueprint((current) => ({
                ...current,
                project,
              }))
            }
          />

          {workspace.draftBlueprint ? (
            <>
              <IntentOutcomeEditor
                intent={workspace.draftBlueprint.intent}
                outcomes={workspace.draftBlueprint.outcomes}
                onIntentChange={(intent) =>
                  workspace.updateDraftBlueprint((current) => ({
                    ...current,
                    intent,
                  }))
                }
                onOutcomesChange={(outcomes) =>
                  workspace.updateDraftBlueprint((current) => ({
                    ...current,
                    outcomes,
                  }))
                }
                onExtract={workspace.reextractIntent}
              />

              <SectionCard title="Decision logic" description="Edit the explicit decision principles and open questions.">
                <div className="form-grid">
                  <label className="field field--full">
                    <span>Principles</span>
                    <textarea
                      rows={4}
                      value={joinLines(workspace.draftBlueprint.decisionLogic.principles)}
                      onChange={(event) =>
                        workspace.updateDraftBlueprint((current) => ({
                          ...current,
                          decisionLogic: {
                            ...current.decisionLogic,
                            principles: parseLines(event.target.value),
                          },
                        }))
                      }
                    />
                  </label>
                  <label className="field field--full">
                    <span>Open questions</span>
                    <textarea
                      rows={4}
                      value={joinLines(workspace.draftBlueprint.decisionLogic.openQuestions)}
                      onChange={(event) =>
                        workspace.updateDraftBlueprint((current) => ({
                          ...current,
                          decisionLogic: {
                            ...current.decisionLogic,
                            openQuestions: parseLines(event.target.value),
                          },
                        }))
                      }
                    />
                  </label>
                </div>
              </SectionCard>

              <CollectionEditor
                title="Actors"
                description="Actors clarify who the blueprint is built for and who uses it."
                items={workspace.draftBlueprint.actors}
                fields={actorFields}
                createItem={createEntityFactories.actors}
                onChange={(actors) =>
                  workspace.updateDraftBlueprint((current) => ({
                    ...current,
                    actors,
                  }))
                }
              />

              <CollectionEditor
                title="Constraints"
                description="Constraints are part of project memory and guide scope."
                items={workspace.draftBlueprint.constraints}
                fields={constraintFields}
                createItem={createEntityFactories.constraints}
                onChange={(constraints) =>
                  workspace.updateDraftBlueprint((current) => ({
                    ...current,
                    constraints,
                  }))
                }
              />

              <CollectionEditor
                title="Domains"
                items={workspace.draftBlueprint.domains}
                fields={domainFields}
                createItem={createEntityFactories.domains}
                onChange={(domains) =>
                  workspace.updateDraftBlueprint((current) => ({
                    ...current,
                    domains,
                  }))
                }
              />

              <CollectionEditor
                title="Functions"
                items={workspace.draftBlueprint.functions}
                fields={functionFields}
                createItem={createEntityFactories.functions}
                onChange={(functions) =>
                  workspace.updateDraftBlueprint((current) => ({
                    ...current,
                    functions,
                  }))
                }
              />

              <CollectionEditor
                title="Components"
                items={workspace.draftBlueprint.components}
                fields={componentFields}
                createItem={createEntityFactories.components}
                onChange={(components) =>
                  workspace.updateDraftBlueprint((current) => ({
                    ...current,
                    components,
                  }))
                }
              />

              <CollectionEditor
                title="Flows"
                items={workspace.draftBlueprint.flows}
                fields={flowFields}
                createItem={createEntityFactories.flows}
                onChange={(flows) =>
                  workspace.updateDraftBlueprint((current) => ({
                    ...current,
                    flows,
                  }))
                }
              />

              <CollectionEditor
                title="Dependencies"
                items={workspace.draftBlueprint.dependencies}
                fields={dependencyFields}
                createItem={createEntityFactories.dependencies}
                onChange={(dependencies) =>
                  workspace.updateDraftBlueprint((current) => ({
                    ...current,
                    dependencies,
                  }))
                }
              />

              <CollectionEditor
                title="Rules"
                items={workspace.draftBlueprint.rules}
                fields={ruleFields}
                createItem={createEntityFactories.rules}
                onChange={(rules) =>
                  workspace.updateDraftBlueprint((current) => ({
                    ...current,
                    rules,
                  }))
                }
              />

              <CollectionEditor
                title="Invariants"
                items={workspace.draftBlueprint.invariants}
                fields={invariantFields}
                createItem={createEntityFactories.invariants}
                onChange={(invariants) =>
                  workspace.updateDraftBlueprint((current) => ({
                    ...current,
                    invariants,
                  }))
                }
              />

              <CollectionEditor
                title="Guardrails"
                items={workspace.draftBlueprint.guardrails}
                fields={guardrailFields}
                createItem={createEntityFactories.guardrails}
                onChange={(guardrails) =>
                  workspace.updateDraftBlueprint((current) => ({
                    ...current,
                    guardrails,
                  }))
                }
              />

              <CollectionEditor
                title="Phases"
                items={workspace.draftBlueprint.phases}
                fields={phaseFields}
                createItem={createEntityFactories.phases}
                onChange={(phases) =>
                  workspace.updateDraftBlueprint((current) => ({
                    ...current,
                    phases,
                  }))
                }
              />

              <SectionCard title="MVP scope" description="Define what belongs in the first buildable version.">
                <div className="form-grid">
                  <label className="field field--full">
                    <span>Summary</span>
                    <textarea
                      rows={3}
                      value={workspace.draftBlueprint.mvpScope.summary}
                      onChange={(event) =>
                        workspace.updateDraftBlueprint((current) => ({
                          ...current,
                          mvpScope: {
                            ...current.mvpScope,
                            summary: event.target.value,
                          },
                        }))
                      }
                    />
                  </label>
                  <label className="field field--full">
                    <span>Success definition</span>
                    <textarea
                      rows={3}
                      value={workspace.draftBlueprint.mvpScope.successDefinition}
                      onChange={(event) =>
                        workspace.updateDraftBlueprint((current) => ({
                          ...current,
                          mvpScope: {
                            ...current.mvpScope,
                            successDefinition: event.target.value,
                          },
                        }))
                      }
                    />
                  </label>
                </div>
              </SectionCard>

              <CollectionEditor
                title="MVP scope items"
                items={workspace.draftBlueprint.mvpScope.items}
                fields={scopeItemFields}
                createItem={createEntityFactories.mvpItems}
                onChange={(items) =>
                  workspace.updateDraftBlueprint((current) => ({
                    ...current,
                    mvpScope: {
                      ...current.mvpScope,
                      items,
                    },
                  }))
                }
              />

              <SectionCard title="Expansion scope" description="Capture what comes after MVP without mixing the scopes.">
                <div className="form-grid">
                  <label className="field field--full">
                    <span>Summary</span>
                    <textarea
                      rows={3}
                      value={workspace.draftBlueprint.expansionScope.summary}
                      onChange={(event) =>
                        workspace.updateDraftBlueprint((current) => ({
                          ...current,
                          expansionScope: {
                            ...current.expansionScope,
                            summary: event.target.value,
                          },
                        }))
                      }
                    />
                  </label>
                  <label className="field field--full">
                    <span>Future signals</span>
                    <textarea
                      rows={4}
                      value={joinLines(workspace.draftBlueprint.expansionScope.futureSignals)}
                      onChange={(event) =>
                        workspace.updateDraftBlueprint((current) => ({
                          ...current,
                          expansionScope: {
                            ...current.expansionScope,
                            futureSignals: parseLines(event.target.value),
                          },
                        }))
                      }
                    />
                  </label>
                </div>
              </SectionCard>

              <CollectionEditor
                title="Expansion scope items"
                items={workspace.draftBlueprint.expansionScope.items}
                fields={scopeItemFields}
                createItem={createEntityFactories.expansionItems}
                onChange={(items) =>
                  workspace.updateDraftBlueprint((current) => ({
                    ...current,
                    expansionScope: {
                      ...current.expansionScope,
                      items,
                    },
                  }))
                }
              />

              <CollectionEditor
                title="Decision records"
                items={workspace.draftBlueprint.decisionLogic.records}
                fields={decisionRecordFields}
                createItem={createEntityFactories.decisionRecords}
                getItemLabel={(item) => String(item.title)}
                onChange={(records) =>
                  workspace.updateDraftBlueprint((current) => ({
                    ...current,
                    decisionLogic: {
                      ...current.decisionLogic,
                      records,
                    },
                  }))
                }
              />

              <CollectionEditor
                title="Failure modes"
                items={workspace.draftBlueprint.failureModes}
                fields={failureModeFields}
                createItem={createEntityFactories.failureModes}
                onChange={(failureModes) =>
                  workspace.updateDraftBlueprint((current) => ({
                    ...current,
                    failureModes,
                  }))
                }
              />
            </>
          ) : null}
        </div>

        <div className="workspace-grid__inspector">
          <PersistenceStatusPanel
            loadReport={workspace.loadReport}
            quarantinedPayloads={workspace.quarantinedPayloads}
          />
          <QuarantineInspectorPanel
            quarantinedPayloads={workspace.quarantinedPayloads}
            selectedEntry={
              workspace.selectedQuarantineId
                ? workspace.quarantinedPayloads.find((entry) => entry.id === workspace.selectedQuarantineId) ?? null
                : null
            }
            recoveryDraft={workspace.recoveryDraft}
            previewResult={workspace.quarantinePreview}
            restoreConfirmationChecked={workspace.restoreConfirmationChecked}
            showPreviewJson={workspace.showPreviewJson}
            feedback={workspace.quarantineFeedback}
            onSelectEntry={workspace.selectQuarantinedPayload}
            onRecoveryDraftChange={workspace.updateRecoveryDraft}
            onImportFile={workspace.importRecoveryDraftFile}
            onExport={workspace.exportQuarantinedPayload}
            onPreview={workspace.previewSelectedQuarantine}
            onSelectRecoveredProject={workspace.selectRecoveredProjectForPreview}
            onRestoreConfirmationChange={workspace.setRestoreConfirmationChecked}
            onTogglePreviewJson={workspace.togglePreviewJson}
            onRestore={workspace.restorePreviewCandidate}
            onClear={workspace.clearQuarantinedPayload}
          />
          {workspace.draftBlueprint ? (
            <>
              <ValidationPanel
                validation={workspace.draftBlueprint.validation}
                projectStatus={workspace.draftBlueprint.project.status}
              />
              <RevisionHistoryPanel
                revisions={workspace.projectRevisions}
                selectedRevision={
                  workspace.selectedRevisionId
                    ? workspace.projectRevisions.find((revision) => revision.id === workspace.selectedRevisionId) ??
                      null
                    : null
                }
                showSnapshotJson={workspace.showRevisionSnapshotJson}
                onSelectRevision={workspace.selectRevision}
                onToggleSnapshotJson={workspace.toggleRevisionSnapshotJson}
              />
              <MemoryViewer memory={workspace.draftBlueprint.memory} />
              <BlueprintViewer blueprint={workspace.draftBlueprint} />
            </>
          ) : (
            <SectionCard title="No project selected" description="Create or select a project to begin." />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
