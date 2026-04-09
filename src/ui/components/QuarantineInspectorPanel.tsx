import type { ChangeEvent } from "react";

import type { QuarantinePreviewResult } from "@/application/services/blueprintService";
import type { QuarantinedPayload } from "@/persistence/types";
import { SectionCard } from "@/ui/components/SectionCard";

type QuarantineFeedback = {
  tone: "success" | "error";
  message: string;
} | null;

type QuarantineInspectorPanelProps = {
  quarantinedPayloads: QuarantinedPayload[];
  selectedEntry: QuarantinedPayload | null;
  recoveryDraft: string;
  previewResult: QuarantinePreviewResult | null;
  showPreviewJson: boolean;
  feedback: QuarantineFeedback;
  onSelectEntry: (quarantineId: string | null) => void;
  onRecoveryDraftChange: (value: string) => void;
  onImportFile: (file: File) => Promise<void> | void;
  onExport: (quarantineId: string | null) => { fileName: string; content: string } | null;
  onPreview: () => void;
  onTogglePreviewJson: () => void;
  onRecover: () => void;
  onClear: (quarantineId?: string) => void;
};

const formatPayload = (value: unknown): string => JSON.stringify(value, null, 2) ?? "null";
const formatValue = (value: string | number | boolean | string[] | null): string => {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (value === null) {
    return "none";
  }

  return String(value);
};

export const QuarantineInspectorPanel = ({
  quarantinedPayloads,
  selectedEntry,
  recoveryDraft,
  previewResult,
  showPreviewJson,
  feedback,
  onSelectEntry,
  onRecoveryDraftChange,
  onImportFile,
  onExport,
  onPreview,
  onTogglePreviewJson,
  onRecover,
  onClear,
}: QuarantineInspectorPanelProps) => {
  const handleExport = () => {
    const exported = onExport(selectedEntry?.id ?? null);
    if (!exported || typeof window === "undefined") {
      return;
    }

    const blob = new Blob([exported.content], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = exported.fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await onImportFile(file);
    event.target.value = "";
  };

  return (
    <SectionCard
      title="Quarantine recovery"
      description="Inspect failed local payloads, export them, repair the JSON, and retry recovery deliberately."
    >
      {quarantinedPayloads.length === 0 ? (
        <p className="muted">No quarantined payloads are waiting for recovery.</p>
      ) : (
        <>
          <div className="form-grid">
            <label className="field field--full">
              <span>Quarantine entry</span>
              <select
                value={selectedEntry?.id ?? ""}
                onChange={(event) => onSelectEntry(event.target.value || null)}
              >
                {quarantinedPayloads.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.failureCategory} / {entry.failureStage} / {entry.createdAt}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedEntry ? (
            <>
              <div className="validation-summary">
                <div>
                  <span className="eyebrow">Failure</span>
                  <strong>{selectedEntry.failureCategory}</strong>
                </div>
                <div>
                  <span className="eyebrow">Stage</span>
                  <strong>{selectedEntry.failureStage}</strong>
                </div>
                <div>
                  <span className="eyebrow">Detected version</span>
                  <strong>{selectedEntry.detectedStorageVersion ?? "unknown"}</strong>
                </div>
              </div>

              <p className="muted">{selectedEntry.reason}</p>

              {selectedEntry.migrationSteps.length > 0 ? (
                <ul className="stacked-list">
                  {selectedEntry.migrationSteps.map((step) => (
                    <li key={step} className="stacked-list__item">
                      {step}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="button-row">
                <button type="button" onClick={handleExport}>
                  Export quarantine JSON
                </button>
                <button type="button" className="button-secondary" onClick={() => onClear(selectedEntry.id)}>
                  Clear entry
                </button>
              </div>

              <label className="field field--full">
                <span>Raw payload preview</span>
                <pre className="json-viewer">{formatPayload(selectedEntry.rawPayload)}</pre>
              </label>

              <div className="form-grid">
                <label className="field field--full">
                  <span>Repair JSON</span>
                  <textarea
                    rows={14}
                    value={recoveryDraft}
                    onChange={(event) => onRecoveryDraftChange(event.target.value)}
                  />
                </label>
                <label className="field field--full">
                  <span>Import repaired file</span>
                  <input type="file" accept=".json,application/json" onChange={handleFileChange} />
                </label>
              </div>

              <div className="button-row">
                <button type="button" className="button-secondary" onClick={onPreview}>
                  Preview recovery compare
                </button>
              </div>

              {previewResult ? (
                previewResult.success ? (
                  <>
                    <div className="status-banner status-banner--success">{previewResult.message}</div>
                    <div className="validation-summary">
                      <div>
                        <span className="eyebrow">Active baseline</span>
                        <strong>{previewResult.compare.activeProjectName ?? "None selected"}</strong>
                      </div>
                      <div>
                        <span className="eyebrow">Recovered candidate</span>
                        <strong>{previewResult.compare.candidateProjectName ?? "No recovered project"}</strong>
                      </div>
                      <div>
                        <span className="eyebrow">Total changes</span>
                        <strong>{previewResult.compare.totalChangeCount}</strong>
                      </div>
                    </div>

                    {previewResult.compare.identical ? (
                      <p className="muted">
                        The recovered candidate matches the current active blueprint for the compared fields and entity
                        collections.
                      </p>
                    ) : (
                      <>
                        {previewResult.compare.projectChanges.length > 0 ? (
                          <div className="compare-section">
                            <h3>Project changes</h3>
                            <ul className="stacked-list">
                              {previewResult.compare.projectChanges.map((change) => (
                                <li key={change.field} className="stacked-list__item">
                                  <strong>{change.field}</strong>
                                  <p className="muted">
                                    current: {formatValue(change.currentValue)} | candidate:{" "}
                                    {formatValue(change.candidateValue)}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {previewResult.compare.intentChanges.length > 0 ? (
                          <div className="compare-section">
                            <h3>Intent changes</h3>
                            <ul className="stacked-list">
                              {previewResult.compare.intentChanges.map((change) => (
                                <li key={change.field} className="stacked-list__item">
                                  <strong>{change.field}</strong>
                                  <p className="muted">
                                    current: {formatValue(change.currentValue)} | candidate:{" "}
                                    {formatValue(change.candidateValue)}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {previewResult.compare.mvpScopeChanges.length > 0 ? (
                          <div className="compare-section">
                            <h3>MVP scope changes</h3>
                            <ul className="stacked-list">
                              {previewResult.compare.mvpScopeChanges.map((change) => (
                                <li key={change.field} className="stacked-list__item">
                                  <strong>{change.field}</strong>
                                  <p className="muted">
                                    current: {formatValue(change.currentValue)} | candidate:{" "}
                                    {formatValue(change.candidateValue)}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {previewResult.compare.expansionScopeChanges.length > 0 ? (
                          <div className="compare-section">
                            <h3>Expansion scope changes</h3>
                            <ul className="stacked-list">
                              {previewResult.compare.expansionScopeChanges.map((change) => (
                                <li key={change.field} className="stacked-list__item">
                                  <strong>{change.field}</strong>
                                  <p className="muted">
                                    current: {formatValue(change.currentValue)} | candidate:{" "}
                                    {formatValue(change.candidateValue)}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {previewResult.compare.collections
                          .filter((collection) => collection.hasChanges)
                          .map((collection) => (
                            <div key={collection.key} className="compare-section">
                              <h3>{collection.label}</h3>
                              <div className="tag-row">
                                <span>added {collection.added.length}</span>
                                <span>removed {collection.removed.length}</span>
                                <span>changed {collection.changed.length}</span>
                              </div>
                              <ul className="stacked-list">
                                {collection.added.map((item) => (
                                  <li key={`added-${item.id}`} className="stacked-list__item">
                                    <strong>Added</strong>
                                    <p className="muted">
                                      {item.label} ({item.id})
                                    </p>
                                  </li>
                                ))}
                                {collection.removed.map((item) => (
                                  <li key={`removed-${item.id}`} className="stacked-list__item">
                                    <strong>Removed</strong>
                                    <p className="muted">
                                      {item.label} ({item.id})
                                    </p>
                                  </li>
                                ))}
                                {collection.changed.map((item) => (
                                  <li key={`changed-${item.id}`} className="stacked-list__item">
                                    <strong>Changed</strong>
                                    <p className="muted">
                                      {item.label} ({item.id})
                                    </p>
                                    <p className="muted">fields: {item.changedFields.join(", ")}</p>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                      </>
                    )}

                    <div className="button-row">
                      <button type="button" className="button-secondary" onClick={onTogglePreviewJson}>
                        {showPreviewJson ? "Hide recovered JSON" : "Show recovered JSON"}
                      </button>
                    </div>

                    {showPreviewJson ? (
                      <label className="field field--full">
                        <span>Recovered candidate JSON</span>
                        <pre className="json-viewer">{formatPayload(previewResult.candidateDocument)}</pre>
                      </label>
                    ) : null}
                  </>
                ) : (
                  <div className="status-banner status-banner--error">
                    Preview failed at {previewResult.failureStage} / {previewResult.failureCategory}:{" "}
                    {previewResult.reason}
                  </div>
                )
              ) : (
                <p className="muted">
                  Run a preview to compare the repaired candidate against the current active blueprint before you
                  restore or clear quarantine.
                </p>
              )}

              {feedback ? (
                <div className={`status-banner status-banner--${feedback.tone}`}>{feedback.message}</div>
              ) : null}

              <p className="muted">
                Recovery reuses the same migration and schema validation path as normal load. Successful recovery does
                not auto-clear quarantine.
              </p>

              <div className="button-row">
                <button type="button" onClick={onRecover}>
                  Retry recovery
                </button>
                <button type="button" className="button-secondary" onClick={() => onClear()}>
                  Clear all quarantine
                </button>
              </div>
            </>
          ) : null}
        </>
      )}
    </SectionCard>
  );
};
