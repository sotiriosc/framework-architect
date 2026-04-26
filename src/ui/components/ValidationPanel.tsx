import type { ValidationCheck, ValidationState } from "@/domain/models";
import { SectionCard } from "@/ui/components/SectionCard";
import { formatRelationLabel, type RelationOptionGroups } from "@/ui/relationOptions";

type ValidationPanelProps = {
  validation: ValidationState;
  projectStatus: string;
  relationOptions?: RelationOptionGroups;
};

const groupChecks = (checks: ValidationCheck[]) => ({
  blockers: checks.filter((check) => check.status === "fail"),
  warnings: checks.filter((check) => check.status === "warning"),
  passes: checks.filter((check) => check.status === "pass"),
});

const renderRelatedIds = (ids: string[], relationOptions: RelationOptionGroups | undefined) =>
  relationOptions ? ids.map((id) => formatRelationLabel(id, relationOptions)).join(", ") : ids.join(", ");

const renderCheckGroup = (
  title: string,
  checks: ValidationCheck[],
  relationOptions: RelationOptionGroups | undefined,
) => (
  <div className="readiness-group">
    <div className="readiness-group__header">
      <strong>{title}</strong>
      <span>{checks.length}</span>
    </div>
    {checks.length === 0 ? (
      <p className="muted">None</p>
    ) : (
      <ul className="compact-list">
        {checks.map((check) => (
          <li key={check.id}>
            <span>{check.code}</span>
            <small>{check.message}</small>
            {check.relatedEntityIds.length > 0 ? (
              <small>Related: {renderRelatedIds(check.relatedEntityIds, relationOptions)}</small>
            ) : null}
          </li>
        ))}
      </ul>
    )}
  </div>
);

export const ValidationPanel = ({ validation, projectStatus, relationOptions }: ValidationPanelProps) => {
  const summary = validation.checks.reduce(
    (counts, check) => {
      counts[check.status] += 1;
      return counts;
    },
    { pass: 0, warning: 0, fail: 0 },
  );
  const grouped = groupChecks(validation.checks);
  const nextRecommendedFix = grouped.blockers[0] ?? grouped.warnings[0] ?? null;

  return (
    <SectionCard
      title="Validation"
      description="Checks structural correctness: required sections, valid references, governance scope, and build-ready blockers."
    >
      <div className={`readiness-callout${validation.buildReady ? " readiness-callout--ready" : ""}`}>
        <div>
          <span className="eyebrow">Readiness summary</span>
          <strong>
            {validation.buildReady
              ? "Build-ready by validation"
              : `${grouped.blockers.length} blocker${grouped.blockers.length === 1 ? "" : "s"} need attention`}
          </strong>
          <p>
            {validation.buildReady
              ? "The blueprint has connected outcomes, functions, components, scope, and governance references."
              : "Resolve blocker checks before treating this blueprint as ready for implementation."}
          </p>
        </div>
        <div>
          <span className="eyebrow">Next recommended fix</span>
          <strong>{nextRecommendedFix?.code ?? "No fixes pending"}</strong>
          {nextRecommendedFix ? (
            <p>{nextRecommendedFix.recommendation || nextRecommendedFix.message}</p>
          ) : (
            <p>Keep using stable review when making structural changes.</p>
          )}
        </div>
      </div>

      <div className="validation-summary">
        <div>
          <span className="eyebrow">Current status</span>
          <strong>{projectStatus}</strong>
        </div>
        <div>
          <span className="eyebrow">Build-ready</span>
          <strong>{validation.buildReady ? "Yes" : "No"}</strong>
        </div>
        <div>
          <span className="eyebrow">Checks</span>
          <strong>
            {summary.pass} pass / {summary.warning} warning / {summary.fail} fail
          </strong>
        </div>
      </div>

      <div className="readiness-grid">
        {renderCheckGroup("Blockers", grouped.blockers, relationOptions)}
        {renderCheckGroup("Warnings", grouped.warnings, relationOptions)}
        {renderCheckGroup("Passes", grouped.passes, relationOptions)}
      </div>

      <details className="raw-validation" open>
        <summary>Raw validation checks</summary>
        <ul className="stacked-list">
          {validation.checks.map((check) => (
            <li key={check.id} className={`stacked-list__item stacked-list__item--${check.status}`}>
              <div className="tag-row">
                <span>{check.code}</span>
                <span>{check.status}</span>
                <span>{check.severity}</span>
              </div>
              <strong>{check.message}</strong>
              {check.recommendation ? <p>{check.recommendation}</p> : null}
              {check.relatedEntityIds.length > 0 ? (
                <p className="muted">related: {renderRelatedIds(check.relatedEntityIds, relationOptions)}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </details>
    </SectionCard>
  );
};
