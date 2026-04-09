import type { BlueprintStructuralDiff } from "@/application/review/diffModel";

type StructuralDiffSummaryProps = {
  diff: BlueprintStructuralDiff;
  leftLabel: string;
  rightLabel: string;
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

export const StructuralDiffSummary = ({
  diff,
  leftLabel,
  rightLabel,
}: StructuralDiffSummaryProps) => {
  if (diff.identical) {
    return (
      <p className="muted">
        {leftLabel} and {rightLabel} match across the shared structural diff model.
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
                  {leftLabel}: {formatValue(change.currentValue)} | {rightLabel}:{" "}
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
                  {leftLabel}: {formatValue(change.currentValue)} | {rightLabel}:{" "}
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
                  {leftLabel}: {formatValue(change.currentValue)} | {rightLabel}:{" "}
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
                  {leftLabel}: {formatValue(change.currentValue)} | {rightLabel}:{" "}
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
                  {leftLabel}: {formatValue(change.currentValue)} | {rightLabel}:{" "}
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
                  <strong>Added in {rightLabel}</strong>
                  <p className="muted">
                    {item.label} ({item.id})
                  </p>
                </li>
              ))}
              {collection.removed.map((item) => (
                <li key={`removed-${item.id}`} className="stacked-list__item">
                  <strong>Removed from {rightLabel}</strong>
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
