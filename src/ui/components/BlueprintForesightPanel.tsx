import { useState } from "react";

import type { ProjectBlueprint } from "@/domain/models";
import {
  buildBlueprintForesight,
  type BlueprintForesightItem,
} from "@/application/review/buildBlueprintForesight";
import { SectionCard } from "@/ui/components/SectionCard";
import { formatRelationLabel, type RelationOptionGroups } from "@/ui/relationOptions";

type BlueprintForesightPanelProps = {
  blueprint: ProjectBlueprint;
  relationOptions?: RelationOptionGroups;
  onAddToExpansion?: (foresightItemId: string) => void;
  onAddAsDecision?: (foresightItemId: string) => void;
};

const positionLabel = (value: string): string =>
  value
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const relatedLabels = (item: BlueprintForesightItem, relationOptions: RelationOptionGroups | undefined): string => {
  const ids = [...item.prerequisiteEntityIds, ...item.relatedEntityIds];
  if (ids.length === 0) {
    return "";
  }

  const uniqueIds = [...new Set(ids)].slice(0, 6);
  return relationOptions
    ? uniqueIds.map((id) => formatRelationLabel(id, relationOptions)).join(", ")
    : uniqueIds.join(", ");
};

export const BlueprintForesightPanel = ({
  blueprint,
  relationOptions,
  onAddToExpansion,
  onAddAsDecision,
}: BlueprintForesightPanelProps) => {
  const foresight = buildBlueprintForesight(blueprint);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);

  const copyPromptSeed = async (item: BlueprintForesightItem) => {
    if (!navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(item.codexPromptSeed);
    setCopiedItemId(item.id);
  };

  const renderItems = (label: string, items: BlueprintForesightItem[], open = false) => (
    <details className="quality-detail" open={open}>
      <summary>
        {label} ({items.length})
      </summary>
      {items.length === 0 ? (
        <p className="muted">No {label.toLowerCase()} suggestions right now.</p>
      ) : (
        <ul className="stacked-list">
          {items.map((item) => (
            <li key={item.id} className="stacked-list__item">
              <div className="tag-row">
                <span>{item.category}</span>
                <span>{item.horizon}</span>
                <span>{item.impact} impact</span>
                <span>{item.effort} effort</span>
              </div>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              <p className="muted">{item.whyNowOrLater}</p>
              {item.acceptanceCriteria.length > 0 ? (
                <p className="muted">Done when: {item.acceptanceCriteria.slice(0, 2).join(" ")}</p>
              ) : null}
              {relatedLabels(item, relationOptions) ? (
                <p className="muted">related: {relatedLabels(item, relationOptions)}</p>
              ) : null}
              <div className="button-row">
                <button
                  type="button"
                  className="button-secondary"
                  disabled={!onAddToExpansion}
                  onClick={() => onAddToExpansion?.(item.id)}
                >
                  Add to expansion
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  disabled={!onAddAsDecision}
                  onClick={() => onAddAsDecision?.(item.id)}
                >
                  Record decision
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => void copyPromptSeed(item)}
                >
                  {copiedItemId === item.id ? "Copied seed" : "Copy Codex seed"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </details>
  );

  return (
    <SectionCard
      title="Foresight radar"
      description="Suggests future work, hidden opportunities, and risks from the current blueprint. These are advisory until you choose one action."
    >
      <div className="quality-callout quality-callout--strong">
        <div>
          <span className="eyebrow">Strategic position</span>
          <strong>{positionLabel(foresight.strategicPosition)}</strong>
          <p>{foresight.overallSummary}</p>
        </div>
        <div>
          <span className="eyebrow">Recommended next move</span>
          <strong>{foresight.recommendedNextMove?.title ?? "No foresight action pending"}</strong>
          <p>
            {foresight.recommendedNextMove?.whyNowOrLater ??
              "Keep validation, quality review, and exports current as the blueprint changes."}
          </p>
        </div>
      </div>

      <details className="quality-detail">
        <summary>Template signals</summary>
        <ul className="compact-list">
          {foresight.templateSignals.map((signal) => (
            <li key={signal}>{signal}</li>
          ))}
        </ul>
      </details>

      {renderItems("Now", foresight.now, true)}
      {renderItems("Next", foresight.next)}
      {renderItems("Later", foresight.later)}
      {renderItems("Hidden opportunities", foresight.hiddenOpportunities)}
      {renderItems("Risks to watch", foresight.risksToWatch)}
      {renderItems("Not yet", foresight.notYet)}
      {renderItems("Suggested experiments", foresight.suggestedExperiments)}
      {renderItems("Suggested metrics", foresight.suggestedMetrics)}
      {renderItems("Suggested tests", foresight.suggestedTests)}
      {renderItems("Suggested Codex tasks", foresight.suggestedCodexTasks)}
    </SectionCard>
  );
};
