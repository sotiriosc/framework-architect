import type {
  RevisionComparisonMode,
  RevisionComparisonResult,
} from "@/application/review/buildRevisionComparison";
import type { BlueprintRevision } from "@/persistence/revisionTypes";
import { SectionCard } from "@/ui/components/SectionCard";
import { StructuralDiffSummary } from "@/ui/components/StructuralDiffSummary";

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
                {revision.source === "manualCheckpoint" && revision.reason ? (
                  <span className="muted">note: {revision.reason}</span>
                ) : null}
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

                    {comparison.diff ? (
                      <StructuralDiffSummary
                        diff={comparison.diff}
                        leftLabel={comparison.compareTarget.label}
                        rightLabel={comparison.baseTarget.label}
                      />
                    ) : null}
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
