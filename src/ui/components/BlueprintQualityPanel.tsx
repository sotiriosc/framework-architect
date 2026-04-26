import type { ProjectBlueprint } from "@/domain/models";
import {
  buildBlueprintQualityReview,
  type BlueprintQualityIssue,
  type BlueprintQualitySectionScores,
} from "@/application/review/buildBlueprintQualityReview";
import { SectionCard } from "@/ui/components/SectionCard";
import { formatRelationLabel, type RelationOptionGroups } from "@/ui/relationOptions";

type BlueprintQualityPanelProps = {
  blueprint: ProjectBlueprint;
  relationOptions?: RelationOptionGroups;
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

export const BlueprintQualityPanel = ({ blueprint, relationOptions }: BlueprintQualityPanelProps) => {
  const review = buildBlueprintQualityReview(blueprint);

  return (
    <SectionCard title="Blueprint quality" description="A deterministic review of usefulness beyond validation.">
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
          <p className="muted">No quality issues detected.</p>
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
