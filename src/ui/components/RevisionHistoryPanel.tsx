import type { BlueprintRevision } from "@/persistence/revisionTypes";
import { SectionCard } from "@/ui/components/SectionCard";

type RevisionHistoryPanelProps = {
  revisions: BlueprintRevision[];
  selectedRevision: BlueprintRevision | null;
  showSnapshotJson: boolean;
  onSelectRevision: (revisionId: string | null) => void;
  onToggleSnapshotJson: () => void;
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

export const RevisionHistoryPanel = ({
  revisions,
  selectedRevision,
  showSnapshotJson,
  onSelectRevision,
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
                  {revision.source} | {revision.createdAt}
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
                <strong>{selectedRevision.source}</strong>
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

            {selectedRevision.structuralDiff.identical ? (
              <p className="muted">
                This revision is the baseline snapshot for this project. There was no previous revision to compare
                against.
              </p>
            ) : (
              <>
                {selectedRevision.structuralDiff.projectChanges.length > 0 ? (
                  <div className="compare-section">
                    <h3>Project changes</h3>
                    <ul className="stacked-list">
                      {selectedRevision.structuralDiff.projectChanges.map((change) => (
                        <li key={change.field} className="stacked-list__item">
                          <strong>{change.field}</strong>
                          <p className="muted">
                            previous: {formatValue(change.currentValue)} | current:{" "}
                            {formatValue(change.candidateValue)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {selectedRevision.structuralDiff.intentChanges.length > 0 ? (
                  <div className="compare-section">
                    <h3>Intent changes</h3>
                    <ul className="stacked-list">
                      {selectedRevision.structuralDiff.intentChanges.map((change) => (
                        <li key={change.field} className="stacked-list__item">
                          <strong>{change.field}</strong>
                          <p className="muted">
                            previous: {formatValue(change.currentValue)} | current:{" "}
                            {formatValue(change.candidateValue)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {selectedRevision.structuralDiff.decisionLogicChanges.length > 0 ? (
                  <div className="compare-section">
                    <h3>Decision logic changes</h3>
                    <ul className="stacked-list">
                      {selectedRevision.structuralDiff.decisionLogicChanges.map((change) => (
                        <li key={change.field} className="stacked-list__item">
                          <strong>{change.field}</strong>
                          <p className="muted">
                            previous: {formatValue(change.currentValue)} | current:{" "}
                            {formatValue(change.candidateValue)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {selectedRevision.structuralDiff.mvpScopeChanges.length > 0 ? (
                  <div className="compare-section">
                    <h3>MVP scope changes</h3>
                    <ul className="stacked-list">
                      {selectedRevision.structuralDiff.mvpScopeChanges.map((change) => (
                        <li key={change.field} className="stacked-list__item">
                          <strong>{change.field}</strong>
                          <p className="muted">
                            previous: {formatValue(change.currentValue)} | current:{" "}
                            {formatValue(change.candidateValue)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {selectedRevision.structuralDiff.expansionScopeChanges.length > 0 ? (
                  <div className="compare-section">
                    <h3>Expansion scope changes</h3>
                    <ul className="stacked-list">
                      {selectedRevision.structuralDiff.expansionScopeChanges.map((change) => (
                        <li key={change.field} className="stacked-list__item">
                          <strong>{change.field}</strong>
                          <p className="muted">
                            previous: {formatValue(change.currentValue)} | current:{" "}
                            {formatValue(change.candidateValue)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {selectedRevision.structuralDiff.collections
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
