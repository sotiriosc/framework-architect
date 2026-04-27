import { useMemo } from "react";

import type { AgentRunJournalEntry } from "@/application/agent/agentRunTypes";
import {
  buildBlueprintLineage,
  type BlueprintLineageFruitItem,
  type BlueprintLineageNourishmentItem,
} from "@/application/lineage/buildBlueprintLineage";
import type { ProjectBlueprint } from "@/domain/models";
import type { BlueprintRevision } from "@/persistence/revisionTypes";
import { SectionCard } from "@/ui/components/SectionCard";

type BlueprintLineagePanelProps = {
  blueprint: ProjectBlueprint;
  revisions: BlueprintRevision[];
  agentRunJournal: AgentRunJournalEntry[];
};

const formatToken = (value: string): string =>
  value
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const renderNourishment = (item: BlueprintLineageNourishmentItem) => (
  <li key={item.id} className="stacked-list__item">
    <div className="tag-row">
      <span>{formatToken(item.kind)}</span>
      <span>{item.source}</span>
      {item.createdAt ? <span>{item.createdAt}</span> : null}
    </div>
    <strong>{item.title}</strong>
    <p>{item.description}</p>
    {item.relatedEntityIds.length > 0 ? (
      <small className="muted">Related entities: {item.relatedEntityIds.slice(0, 6).join(", ")}</small>
    ) : null}
  </li>
);

const renderFruit = (item: BlueprintLineageFruitItem) => (
  <li key={item.id} className="stacked-list__item">
    <div className="tag-row">
      <span>{formatToken(item.kind)}</span>
      <span>{formatToken(item.trustLevel)}</span>
    </div>
    <strong>{item.title}</strong>
    <p>{item.description}</p>
    <small className="muted">Produced from: {item.producedFrom}</small>
  </li>
);

const simpleList = (items: string[], empty: string) =>
  items.length > 0 ? (
    <ul className="compact-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  ) : (
    <p className="muted">{empty}</p>
  );

export const BlueprintLineagePanel = ({
  blueprint,
  revisions,
  agentRunJournal,
}: BlueprintLineagePanelProps) => {
  const lineage = useMemo(
    () => buildBlueprintLineage({ blueprint, revisions, agentRunJournal }),
    [blueprint, revisions, agentRunJournal],
  );

  return (
    <SectionCard
      title="Source lineage"
      description="Lineage explains where this blueprint came from and what shaped it. It does not change blueprint truth."
    >
      <p>{lineage.summary}</p>

      <div className="validation-summary">
        <div>
          <span className="eyebrow">Seed</span>
          <strong>{formatToken(lineage.seed.sourceKind)}</strong>
          <span className="muted">{lineage.seed.sourceLabel}</span>
        </div>
        <div>
          <span className="eyebrow">Orientation</span>
          <strong>{lineage.orientation.templateLabel}</strong>
          <span className="muted">{lineage.orientation.templateId}</span>
        </div>
        <div>
          <span className="eyebrow">Evidence</span>
          <strong>{agentRunJournal.length} journal entries</strong>
          <span className="muted">Agent reports stay outside blueprint truth.</span>
        </div>
      </div>

      <details className="quality-detail" open>
        <summary>Seed and orientation</summary>
        <p>
          <strong>Raw idea:</strong> {lineage.seed.rawIdea}
        </p>
        <p>
          <strong>Core philosophy:</strong> {lineage.orientation.corePhilosophy || "Not specified."}
        </p>
        {simpleList(lineage.orientation.invariantPriorities, "No invariant priorities listed.")}
      </details>

      <details className="quality-detail" open>
        <summary>Nourishment ({lineage.nourishment.length})</summary>
        <ul className="stacked-list">{lineage.nourishment.map(renderNourishment)}</ul>
      </details>

      <details className="quality-detail" open>
        <summary>Fruit and outputs ({lineage.fruit.length})</summary>
        <ul className="stacked-list">{lineage.fruit.map(renderFruit)}</ul>
      </details>

      <details className="quality-detail" open>
        <summary>Trust boundaries</summary>
        {simpleList(lineage.trustBoundaries, "No trust boundaries listed.")}
      </details>

      <details className="quality-detail" open={lineage.warnings.length > 0}>
        <summary>Warnings ({lineage.warnings.length})</summary>
        {simpleList(lineage.warnings, "No lineage warnings.")}
      </details>
    </SectionCard>
  );
};
