import type { ChangeReviewReady, ChangeReviewTarget } from "@/application/review/buildChangeReview";
import { SectionCard } from "@/ui/components/SectionCard";
import { StructuralDiffSummary } from "@/ui/components/StructuralDiffSummary";

type ChangeReviewPanelProps = {
  review: ChangeReviewReady;
  onConfirm: () => void;
  onCancel: () => void;
};

const formatReviewTarget = (target: ChangeReviewTarget): string => {
  switch (target) {
    case "manualCheckpoint":
      return "Manual checkpoint";
    case "buildReadyTransition":
      return "Build-ready transition";
    default:
      return "Stable save";
  }
};

export const ChangeReviewPanel = ({
  review,
  onConfirm,
  onCancel,
}: ChangeReviewPanelProps) => {
  const confirmLabel =
    review.requestedProjectStatus === "build-ready" && review.effectiveProjectStatus !== "build-ready"
      ? `Save as ${review.effectiveProjectStatus}`
      : review.saveSource === "manualCheckpoint"
        ? "Confirm checkpoint"
        : "Confirm save";

  return (
    <SectionCard
      title="Change review"
      description="Review invariant, rule, and validation impacts before this stable project change becomes truth."
    >
      <div className={`status-banner status-banner--${review.level === "blocked" ? "error" : "success"}`}>
        {review.message}
      </div>

      <div className="validation-summary">
        <div>
          <span className="eyebrow">Target</span>
          <strong>{formatReviewTarget(review.reviewTarget)}</strong>
          <span className="muted">{review.saveSource === "manualCheckpoint" ? "manual checkpoint" : "edit save"}</span>
        </div>
        <div>
          <span className="eyebrow">Baseline</span>
          <strong>{review.baseline.label}</strong>
          <span className="muted">{review.baseline.detail}</span>
        </div>
        <div>
          <span className="eyebrow">Requested status</span>
          <strong>{review.requestedProjectStatus}</strong>
          <span className="muted">
            {review.effectiveProjectStatus === review.requestedProjectStatus
              ? "No status downgrade required."
              : `Will be saved as ${review.effectiveProjectStatus}.`}
          </span>
        </div>
      </div>

      {review.blockers.length > 0 ? (
        <div className="compare-section">
          <h3>Blockers</h3>
          <ul className="stacked-list">
            {review.blockers.map((issue) => (
              <li key={`${issue.code}-${issue.title}`} className="stacked-list__item">
                <strong>{issue.title}</strong>
                <p className="muted">{issue.reason}</p>
                {issue.recommendation ? <p className="muted">recommendation: {issue.recommendation}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {review.warnings.length > 0 ? (
        <div className="compare-section">
          <h3>Warnings</h3>
          <ul className="stacked-list">
            {review.warnings.map((issue) => (
              <li key={`${issue.code}-${issue.title}`} className="stacked-list__item">
                <strong>{issue.title}</strong>
                <p className="muted">{issue.reason}</p>
                {issue.recommendation ? <p className="muted">recommendation: {issue.recommendation}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {review.notices.length > 0 ? (
        <div className="compare-section">
          <h3>Notices</h3>
          <ul className="stacked-list">
            {review.notices.map((issue) => (
              <li key={`${issue.code}-${issue.title}`} className="stacked-list__item">
                <strong>{issue.title}</strong>
                <p className="muted">{issue.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {review.affectedInvariants.length > 0 ? (
        <div className="compare-section">
          <h3>Affected invariants</h3>
          <ul className="stacked-list">
            {review.affectedInvariants.map((invariant) => (
              <li key={invariant.id} className="stacked-list__item">
                <strong>{invariant.name}</strong>
                <p className="muted">
                  {invariant.scope} scope | priority {invariant.priority} | build-ready blocker{" "}
                  {invariant.blocksBuildReady ? "yes" : "no"}
                </p>
                <p className="muted">{invariant.triggers.join(" ")}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {review.affectedRules.length > 0 ? (
        <div className="compare-section">
          <h3>Affected rules</h3>
          <ul className="stacked-list">
            {review.affectedRules.map((rule) => (
              <li key={rule.id} className="stacked-list__item">
                <strong>{rule.name}</strong>
                <p className="muted">{rule.scope} scope</p>
                <p className="muted">{rule.triggers.join(" ")}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {review.relevantValidationIssues.length > 0 ? (
        <div className="compare-section">
          <h3>Relevant validation issues</h3>
          <ul className="stacked-list">
            {review.relevantValidationIssues.map((check) => (
              <li key={check.id} className="stacked-list__item">
                <strong>{check.code}</strong>
                <p className="muted">
                  {check.severity} {check.status}
                </p>
                <p className="muted">{check.message}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="compare-section">
        <h3>Structural diff</h3>
        <StructuralDiffSummary
          diff={review.structuralDiff}
          leftLabel={review.baseline.label}
          rightLabel="Proposed save"
        />
      </div>

      {review.recommendations.length > 0 ? (
        <div className="compare-section">
          <h3>Recommendations</h3>
          <ul className="stacked-list">
            {review.recommendations.map((recommendation) => (
              <li key={recommendation} className="stacked-list__item">
                <p className="muted">{recommendation}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="button-row">
        <button type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button" className="button-secondary" onClick={onCancel}>
          Cancel review
        </button>
      </div>
    </SectionCard>
  );
};
