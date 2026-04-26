import type { ProjectBlueprint } from "@/domain/models";
import {
  buildBlueprintQualityReview,
  type BlueprintQualityIssue,
  type BlueprintQualitySectionScores,
} from "@/application/review/buildBlueprintQualityReview";
import {
  buildBlueprintImprovementPlan,
  type BlueprintImprovementFix,
} from "@/application/review/buildBlueprintImprovementPlan";
import { SectionCard } from "@/ui/components/SectionCard";
import { formatRelationLabel, type RelationOptionGroups } from "@/ui/relationOptions";

type BlueprintQualityPanelProps = {
  blueprint: ProjectBlueprint;
  relationOptions?: RelationOptionGroups;
  onApplySafeFixes?: () => void;
  onApplyFix?: (fixId: string) => void;
};

const sectionLabel = (key: keyof BlueprintQualitySectionScores): string =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (value) => value.toUpperCase());

const relatedLabels = (issue: BlueprintQualityIssue, relationOptions: RelationOptionGroups | undefined): string => {
  if (issue.relatedEntityIds.length === 0) {
    return "";
  }

  return relationOptions
    ? issue.relatedEntityIds.map((id) => formatRelationLabel(id, relationOptions)).join(", ")
    : issue.relatedEntityIds.join(", ");
};

const relatedFixLabels = (
  fix: BlueprintImprovementFix,
  relationOptions: RelationOptionGroups | undefined,
): string => {
  if (fix.relatedEntityIds.length === 0) {
    return "";
  }

  return relationOptions
    ? fix.relatedEntityIds.map((id) => formatRelationLabel(id, relationOptions)).join(", ")
    : fix.relatedEntityIds.join(", ");
};

const fixSectionTitle = (label: string, fixes: BlueprintImprovementFix[]): string =>
  `${label} (${fixes.length})`;

export const BlueprintQualityPanel = ({
  blueprint,
  relationOptions,
  onApplySafeFixes,
  onApplyFix,
}: BlueprintQualityPanelProps) => {
  const review = buildBlueprintQualityReview(blueprint);
  const improvementPlan = buildBlueprintImprovementPlan(blueprint);

  const renderFixes = (input: {
    label: string;
    fixes: BlueprintImprovementFix[];
    canApply: boolean;
  }) => (
    <details className="quality-detail" open={input.canApply}>
      <summary>{fixSectionTitle(input.label, input.fixes)}</summary>
      {input.fixes.length === 0 ? (
        <p className="muted">No {input.label.toLowerCase()} currently recommended.</p>
      ) : (
        <ul className="stacked-list">
          {input.fixes.map((fix) => (
            <li key={fix.id} className="stacked-list__item">
              <div className="tag-row">
                <span>{fix.category}</span>
                <span>{fix.safety}</span>
                <span>{fix.expectedImpact}</span>
              </div>
              <strong>{fix.title}</strong>
              <p>{fix.description}</p>
              {fix.relatedEntityIds.length > 0 ? (
                <p className="muted">related: {relatedFixLabels(fix, relationOptions)}</p>
              ) : null}
              {input.canApply && onApplyFix ? (
                <button type="button" className="button-secondary" onClick={() => onApplyFix(fix.id)}>
                  Apply Fix
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </details>
  );

  return (
    <SectionCard
      title="Quality review"
      description="Evaluates usefulness, specificity, template fit, clarity, and implementation readiness after validation."
    >
      <div className={`quality-callout quality-callout--${review.grade}`}>
        <div>
          <span className="eyebrow">Overall quality</span>
          <strong>
            {review.overallScore}/100 · {review.grade}
          </strong>
          <p>{review.summary}</p>
        </div>
        <div>
          <span className="eyebrow">Next best fix</span>
          <strong>{review.nextBestFix?.title ?? "No quality fixes pending"}</strong>
          <p>{review.nextBestFix?.recommendation ?? "Keep using stable review when making structural changes."}</p>
        </div>
      </div>

      <div className="quality-improvement-plan">
        <div>
          <span className="eyebrow">Guided fixes</span>
          <strong>{improvementPlan.recommendedFirstAction?.title ?? "No guided fixes pending"}</strong>
          <p>{improvementPlan.planSummary}</p>
          <p className="muted">Estimated impact: {improvementPlan.estimatedImpactScore}/100</p>
          <p className="muted">Automatic repair only applies safe fixes. Manual-review and risky fixes remain advisory.</p>
        </div>
        <button
          type="button"
          disabled={improvementPlan.safeFixes.length === 0 || !onApplySafeFixes}
          onClick={onApplySafeFixes}
        >
          Apply Safe Fixes
        </button>
      </div>

      <div className="quality-section-grid">
        {Object.entries(review.sectionScores).map(([section, score]) => (
          <div key={section} className="quality-score">
            <span>{sectionLabel(section as keyof BlueprintQualitySectionScores)}</span>
            <strong>{score}</strong>
          </div>
        ))}
      </div>

      <details className="quality-detail" open>
        <summary>Strengths</summary>
        {review.strengths.length === 0 ? (
          <p className="muted">No strong sections yet.</p>
        ) : (
          <ul className="compact-list">
            {review.strengths.map((strength) => (
              <li key={strength}>{strength}</li>
            ))}
          </ul>
        )}
      </details>

      <details className="quality-detail" open>
        <summary>Issues</summary>
        {review.issues.length === 0 ? (
          <p className="muted">
            No quality issues detected. Safe fixes are disabled because there is nothing deterministic to repair.
          </p>
        ) : (
          <ul className="stacked-list">
            {review.issues.map((issue) => (
              <li key={issue.code} className="stacked-list__item">
                <div className="tag-row">
                  <span>{issue.type}</span>
                  <span>{issue.impact}</span>
                  <span>{issue.section}</span>
                </div>
                <strong>{issue.title}</strong>
                <p>{issue.message}</p>
                <p>{issue.recommendation}</p>
                {issue.relatedEntityIds.length > 0 ? (
                  <p className="muted">related: {relatedLabels(issue, relationOptions)}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </details>

      {renderFixes({
        label: "Safe fixes",
        fixes: improvementPlan.safeFixes,
        canApply: true,
      })}

      {renderFixes({
        label: "Manual-review fixes",
        fixes: improvementPlan.manualFixes,
        canApply: false,
      })}

      {renderFixes({
        label: "Risky fixes",
        fixes: improvementPlan.riskyFixes,
        canApply: false,
      })}

      <details className="quality-detail">
        <summary>Template fit</summary>
        <div className="quality-template-fit">
          <div>
            <span className="eyebrow">Template</span>
            <strong>{review.templateFit.templateLabel}</strong>
          </div>
          <div>
            <span className="eyebrow">Fit score</span>
            <strong>{review.templateFit.score}/100</strong>
          </div>
        </div>
        <p className="muted">
          Missing domains: {review.templateFit.missingExpectedDomains.join(", ") || "None"}
        </p>
        <p className="muted">
          Missing functions: {review.templateFit.missingExpectedFunctions.join(", ") || "None"}
        </p>
        <p className="muted">
          Missing components: {review.templateFit.missingExpectedComponents.join(", ") || "None"}
        </p>
      </details>
    </SectionCard>
  );
};
