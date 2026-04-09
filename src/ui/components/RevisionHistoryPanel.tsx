import type {
  RevisionComparisonMode,
  RevisionComparisonResult,
} from "@/application/review/buildRevisionComparison";
import type { BlueprintRevision } from "@/persistence/revisionTypes";
import { SectionCard } from "@/ui/components/SectionCard";

type RevisionHistoryPanelProps = {
  revisions: BlueprintRevision[];
  selectedRevision: BlueprintRevision | null;
  compareMode: RevisionComparisonMode;
  selectedCompareRevisionId: string | null;
  comparison: RevisionComparisonResult | null;
  showSnapshotJson: boolean;
  onSelectRevision: (revisionId: string | null) => void;
  onCompareModeChange: (mode: RevisionComparisonMode) => void;
  onCompareRevisionChange: (revisionId: string | null) => void;
  onToggleSnapshotJson: () => void;
};

const formatPayload = (value: unknown): string => JSON.stringify(value, null, 2) ?? "null";
const formatSourceLabel = (source: BlueprintRevision["source"]): string => {
  switch (source) {
    case "editSave":
      return "edit save";
    case "manualCheckpoint":
      return "manual checkpoint";
    case "recoveryRestore":
      return "recovery restore";
    default:
      return source;
  }
};

const formatValue = (value: string | number | boolean | string[] | null): string => {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (value === null) {
    return "none";
  }

  return String(value);
};

const renderDiffSummary = (input: {
  comparison: RevisionComparisonResult;
  leftLabel: string;
  rightLabel: string;
}) => {
  if (!input.comparison.diff) {
    return null;
  }

  const { diff } = input.comparison;

  if (diff.identical) {
    return (
      <p className="muted">
        {input.leftLabel} and {input.rightLabel} match across the shared structural diff model.
      </p>
    );
  }

  return (
    <>
      {diff.projectChanges.length > 0 ? (
        <div className="compare-section">
          <h3>Project changes</h3>
          <ul className="stacked-list">
            {diff.projectChanges.map((change) => (
              <li key={change.field} className="stacked-list__item">
                <strong>{change.field}</strong>
                <p className="muted">
                  {input.leftLabel}: {formatValue(change.currentValue)} | {input.rightLabel}:{" "}
                  {formatValue(change.candidateValue)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {diff.intentChanges.length > 0 ? (
        <div className="compare-section">
          <h3>Intent changes</h3>
          <ul className="stacked-list">
            {diff.intentChanges.map((change) => (
              <li key={change.field} className="stacked-list__item">
                <strong>{change.field}</strong>
                <p className="muted">
                  {input.leftLabel}: {formatValue(change.currentValue)} | {input.rightLabel}:{" "}
                  {formatValue(change.candidateValue)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {diff.decisionLogicChanges.length > 0 ? (
        <div className="compare-section">
          <h3>Decision logic changes</h3>
          <ul className="stacked-list">
            {diff.decisionLogicChanges.map((change) => (
              <li key={change.field} className="stacked-list__item">
                <strong>{change.field}</strong>
                <p className="muted">
                  {input.leftLabel}: {formatValue(change.currentValue)} | {input.rightLabel}:{" "}
                  {formatValue(change.candidateValue)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {diff.mvpScopeChanges.length > 0 ? (
        <div className="compare-section">
          <h3>MVP scope changes</h3>
          <ul className="stacked-list">
            {diff.mvpScopeChanges.map((change) => (
              <li key={change.field} className="stacked-list__item">
                <strong>{change.field}</strong>
                <p className="muted">
                  {input.leftLabel}: {formatValue(change.currentValue)} | {input.rightLabel}:{" "}
                  {formatValue(change.candidateValue)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {diff.expansionScopeChanges.length > 0 ? (
        <div className="compare-section">
          <h3>Expansion scope changes</h3>
          <ul className="stacked-list">
            {diff.expansionScopeChanges.map((change) => (
              <li key={change.field} className="stacked-list__item">
                <strong>{change.field}</strong>
                <p className="muted">
                  {input.leftLabel}: {formatValue(change.currentValue)} | {input.rightLabel}:{" "}
                  {formatValue(change.candidateValue)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {diff.collections
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
                  <strong>Added in {input.rightLabel}</strong>
                  <p className="muted">
                    {item.label} ({item.id})
                  </p>
                </li>
              ))}
              {collection.removed.map((item) => (
                <li key={`removed-${item.id}`} className="stacked-list__item">
                  <strong>Removed from {input.rightLabel}</strong>
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
  );
};

export const RevisionHistoryPanel = ({
  revisions,
  selectedRevision,
  compareMode,
  selectedCompareRevisionId,
  comparison,
  showSnapshotJson,
  onSelectRevision,
  onCompareModeChange,
  onCompareRevisionChange,
  onToggleSnapshotJson,
}: RevisionHistoryPanelProps) => (
  <SectionCard
    title="Revision history"
    description="Track structural blueprint changes over time. Revision history is separate from storage recovery and quarantine."
  >
    {revisions.length === 0 ? (
      <p className="muted">No revisions recorded for the active project yet.</p>
    ) : (
      <>
        <ul className="stacked-list">
          {revisions.map((revision) => (
            <li
              key={revision.id}
              className={`stacked-list__item revision-list__item${
                selectedRevision?.id === revision.id ? " revision-list__item--selected" : ""
              }`}
            >
              <button
                type="button"
                className="revision-list__button"
                onClick={() => onSelectRevision(revision.id)}
              >
                <strong>Revision {revision.revisionNumber}</strong>
                <span className="muted">
                  {formatSourceLabel(revision.source)} | {revision.createdAt}
                </span>
                <span>{revision.summary}</span>
              </button>
            </li>
          ))}
        </ul>

        {selectedRevision ? (
          <>
            <div className="validation-summary">
              <div>
                <span className="eyebrow">Revision</span>
                <strong>{selectedRevision.revisionNumber}</strong>
              </div>
              <div>
                <span className="eyebrow">Source</span>
                <strong>{formatSourceLabel(selectedRevision.source)}</strong>
              </div>
              <div>
                <span className="eyebrow">Created</span>
                <strong>{selectedRevision.createdAt}</strong>
              </div>
            </div>

            <p className="muted">{selectedRevision.summary}</p>
            {selectedRevision.reason ? <p className="muted">reason: {selectedRevision.reason}</p> : null}
            {selectedRevision.relatedDecisionRecordIds.length > 0 ? (
              <p className="muted">
                related decisions: {selectedRevision.relatedDecisionRecordIds.join(", ")}
              </p>
            ) : null}

            <div className="form-grid">
              <label className="field">
                <span>Compare selected revision against</span>
                <select
                  value={compareMode}
                  onChange={(event) =>
                    onCompareModeChange(event.target.value as RevisionComparisonMode)
                  }
                >
                  <option value="previous">Previous revision</option>
                  <option value="revision">Another revision</option>
                  <option value="current">Current active project</option>
                </select>
              </label>

              {compareMode === "revision" ? (
                <label className="field field--wide">
                  <span>Comparison target revision</span>
                  <select
                    value={selectedCompareRevisionId ?? ""}
                    onChange={(event) => onCompareRevisionChange(event.target.value || null)}
                    disabled={!comparison || comparison.availableRevisionTargets.length === 0}
                  >
                    {comparison?.availableRevisionTargets.length ? (
                      comparison.availableRevisionTargets.map((target) => (
                        <option key={target.revisionId ?? target.label} value={target.revisionId ?? ""}>
                          {target.label} | {target.detail}
                        </option>
                      ))
                    ) : (
                      <option value="">No other revisions available</option>
                    )}
                  </select>
                </label>
              ) : null}
            </div>

            {comparison ? (
              <>
                {comparison.status === "ready" && comparison.baseTarget && comparison.compareTarget ? (
                  <>
                    <div className="validation-summary">
                      <div>
                        <span className="eyebrow">Reference target</span>
                        <strong>{comparison.compareTarget.label}</strong>
                        <span className="muted">{comparison.compareTarget.detail}</span>
                      </div>
                      <div>
                        <span className="eyebrow">Selected revision</span>
                        <strong>{comparison.baseTarget.label}</strong>
                        <span className="muted">{comparison.baseTarget.detail}</span>
                      </div>
                      <div>
                        <span className="eyebrow">Total changes</span>
                        <strong>{comparison.diff?.totalChangeCount ?? 0}</strong>
                        <span className="muted">{comparison.message}</span>
                      </div>
                    </div>

                    {renderDiffSummary({
                      comparison,
                      leftLabel: comparison.compareTarget.label,
                      rightLabel: comparison.baseTarget.label,
                    })}
                  </>
                ) : comparison.status === "invalid" ? (
                  <div className="status-banner status-banner--error">{comparison.message}</div>
                ) : (
                  <p className="muted">{comparison.message}</p>
                )}
              </>
            ) : null}

            <div className="button-row">
              <button type="button" className="button-secondary" onClick={onToggleSnapshotJson}>
                {showSnapshotJson ? "Hide revision snapshot" : "Show revision snapshot"}
              </button>
            </div>

            {showSnapshotJson ? (
              <label className="field field--full">
                <span>Revision snapshot JSON</span>
                <pre className="json-viewer">{formatPayload(selectedRevision.snapshot)}</pre>
              </label>
            ) : null}
          </>
        ) : null}
      </>
    )}
  </SectionCard>
);
