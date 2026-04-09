import type { ValidationState } from "@/domain/models";
import { SectionCard } from "@/ui/components/SectionCard";

type ValidationPanelProps = {
  validation: ValidationState;
  projectStatus: string;
};

export const ValidationPanel = ({ validation, projectStatus }: ValidationPanelProps) => {
  const summary = validation.checks.reduce(
    (counts, check) => {
      counts[check.status] += 1;
      return counts;
    },
    { pass: 0, warning: 0, fail: 0 },
  );

  return (
    <SectionCard title="Validation panel" description="Structural checks stay centralized outside the UI layer.">
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
              <p className="muted">related: {check.relatedEntityIds.join(", ")}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
};
