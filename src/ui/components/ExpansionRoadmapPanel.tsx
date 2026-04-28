import type { ProjectBlueprint } from "@/domain/models";
import {
  buildExpansionRoadmap,
  type BlueprintExpansionPath,
} from "@/application/expansion/buildExpansionRoadmap";
import { SectionCard } from "@/ui/components/SectionCard";
import { formatRelationLabel, type RelationOptionGroups } from "@/ui/relationOptions";

type ExpansionRoadmapPanelProps = {
  blueprint: ProjectBlueprint;
  relationOptions?: RelationOptionGroups;
};

const titleize = (value: string): string =>
  value
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const compactList = (items: string[], empty: string) =>
  items.length > 0 ? (
    <ul className="compact-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  ) : (
    <p className="muted">{empty}</p>
  );

const relatedLabels = (path: BlueprintExpansionPath, relationOptions: RelationOptionGroups | undefined): string => {
  if (path.relatedEntityIds.length === 0) {
    return "";
  }

  const ids = [...new Set(path.relatedEntityIds)].slice(0, 6);
  return relationOptions
    ? ids.map((id) => formatRelationLabel(id, relationOptions)).join(", ")
    : ids.join(", ");
};

export const ExpansionRoadmapPanel = ({
  blueprint,
  relationOptions,
}: ExpansionRoadmapPanelProps) => {
  const roadmap = buildExpansionRoadmap(blueprint);

  return (
    <SectionCard
      title="Expansion roadmap"
      description="Expansion Roadmap expands future ideas into staged paths. It does not change MVP scope or blueprint truth."
    >
      <div className="quality-callout quality-callout--strong">
        <div>
          <span className="eyebrow">Expansion readiness</span>
          <strong>{titleize(roadmap.expansionReadiness)}</strong>
          <p>{roadmap.summary}</p>
        </div>
        <div>
          <span className="eyebrow">Recommended next expansion</span>
          <strong>{roadmap.recommendedNextExpansion?.title ?? "No expansion path yet"}</strong>
          <p>
            {roadmap.recommendedNextExpansion?.summary ??
              "Add future expansion ideas to stage them without moving them into MVP scope."}
          </p>
        </div>
      </div>

      <details className="quality-detail" open>
        <summary>Paths ({roadmap.paths.length})</summary>
        {roadmap.paths.length === 0 ? (
          <p className="muted">No expansion paths yet.</p>
        ) : (
          <ul className="stacked-list">
            {roadmap.paths.map((path) => (
              <li key={path.id} className="stacked-list__item">
                <div className="tag-row">
                  <span>{path.category}</span>
                  <span>{path.stages.length} stages</span>
                </div>
                <strong>{path.title}</strong>
                <p>{path.summary}</p>
                {relatedLabels(path, relationOptions) ? (
                  <p className="muted">related: {relatedLabels(path, relationOptions)}</p>
                ) : null}
                <details className="quality-detail" open>
                  <summary>Stages</summary>
                  <ul className="compact-list">
                    {path.stages.map((stage) => (
                      <li key={stage.id}>
                        <strong>
                          {stage.sequence}. {stage.title} ({stage.horizon})
                        </strong>
                        <span>{stage.description}</span>
                        <small>Done when: {stage.acceptanceCriteria.slice(0, 2).join(" ")}</small>
                      </li>
                    ))}
                  </ul>
                </details>
                <details className="quality-detail">
                  <summary>Prerequisites</summary>
                  {compactList(path.prerequisites, "No prerequisites listed.")}
                </details>
                <details className="quality-detail">
                  <summary>Risks</summary>
                  {compactList(path.risks, "No risks listed.")}
                </details>
                <details className="quality-detail" open={path.notYet.length > 0}>
                  <summary>Not-yet boundaries</summary>
                  {compactList(path.notYet, "No not-yet boundaries listed.")}
                </details>
              </li>
            ))}
          </ul>
        )}
      </details>

      <details className="quality-detail">
        <summary>Roadmap prerequisites</summary>
        {compactList(roadmap.prerequisites, "No roadmap prerequisites listed.")}
      </details>

      <details className="quality-detail" open={roadmap.riskWarnings.length > 0}>
        <summary>Risk warnings</summary>
        {compactList(roadmap.riskWarnings, "No roadmap risks listed.")}
      </details>

      <details className="quality-detail" open={roadmap.notYet.length > 0}>
        <summary>Not yet</summary>
        {compactList(roadmap.notYet, "No not-yet boundaries listed.")}
      </details>

      <details className="quality-detail" open={roadmap.warnings.length > 0}>
        <summary>Warnings ({roadmap.warnings.length})</summary>
        {compactList(roadmap.warnings, "No expansion roadmap warnings.")}
      </details>
    </SectionCard>
  );
};
