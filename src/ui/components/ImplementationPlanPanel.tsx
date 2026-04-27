import { useState } from "react";

import type { ProjectBlueprint } from "@/domain/models";
import {
  buildImplementationPlan,
  type BlueprintDeferredImplementationItem,
  type BlueprintImplementationTask,
  type BlueprintImplementationTaskGroup,
} from "@/application/planning/buildImplementationPlan";
import { SectionCard } from "@/ui/components/SectionCard";
import { formatRelationLabel, type RelationOptionGroups } from "@/ui/relationOptions";

type ImplementationPlanPanelProps = {
  blueprint: ProjectBlueprint;
  relationOptions?: RelationOptionGroups;
  onAddTaskAsDecision?: (taskId: string) => void;
  onAddDeferredToExpansion?: (deferredItemId: string) => void;
};

const titleize = (value: string): string =>
  value
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const labelsFor = (ids: string[], relationOptions: RelationOptionGroups | undefined): string => {
  if (ids.length === 0) {
    return "";
  }

  const uniqueIds = [...new Set(ids)].slice(0, 6);
  return relationOptions
    ? uniqueIds.map((id) => formatRelationLabel(id, relationOptions)).join(", ")
    : uniqueIds.join(", ");
};

const fullTaskPackText = (tasks: { title: string; prompt: string }[]): string =>
  tasks.map((task, index) => `## Task ${index + 1}: ${task.title}\n\n${task.prompt}`).join("\n\n");

export const ImplementationPlanPanel = ({
  blueprint,
  relationOptions,
  onAddTaskAsDecision,
  onAddDeferredToExpansion,
}: ImplementationPlanPanelProps) => {
  const plan = buildImplementationPlan(blueprint);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = async (key: string, value: string) => {
    if (!navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
  };

  const renderTask = (task: BlueprintImplementationTask) => (
    <li key={task.id} className="stacked-list__item">
      <div className="tag-row">
        <span>{task.estimatedScope}</span>
        <span>{task.recommendedBranchName}</span>
      </div>
      <strong>{task.title}</strong>
      <p>{task.description}</p>
      <p className="muted">Acceptance: {task.acceptanceCriteria.slice(0, 2).join(" ")}</p>
      <p className="muted">Tests: {task.suggestedTests.slice(0, 2).join(" ")}</p>
      {labelsFor(task.relatedEntityIds, relationOptions) ? (
        <p className="muted">related: {labelsFor(task.relatedEntityIds, relationOptions)}</p>
      ) : null}
      <div className="button-row">
        <button
          type="button"
          className="button-secondary"
          onClick={() => void copyText(task.id, task.codexPrompt)}
        >
          {copiedKey === task.id ? "Copied prompt" : "Copy task prompt"}
        </button>
        <button
          type="button"
          className="button-secondary"
          disabled={!onAddTaskAsDecision}
          onClick={() => onAddTaskAsDecision?.(task.id)}
        >
          Record decision
        </button>
      </div>
    </li>
  );

  const renderGroup = (group: BlueprintImplementationTaskGroup) => (
    <li key={group.id} className="stacked-list__item">
      <div className="tag-row">
        <span>{group.phase}</span>
        <span>{group.priority}</span>
      </div>
      <strong>{group.title}</strong>
      <p>{group.description}</p>
      {labelsFor(group.relatedEntityIds, relationOptions) ? (
        <p className="muted">related: {labelsFor(group.relatedEntityIds, relationOptions)}</p>
      ) : null}
      <ul className="stacked-list">{group.tasks.map(renderTask)}</ul>
    </li>
  );

  const renderDeferredItem = (item: BlueprintDeferredImplementationItem) => (
    <li key={item.id} className="stacked-list__item">
      <div className="tag-row">
        <span>{item.source}</span>
      </div>
      <strong>{item.title}</strong>
      <p>{item.description}</p>
      {labelsFor(item.relatedEntityIds, relationOptions) ? (
        <p className="muted">related: {labelsFor(item.relatedEntityIds, relationOptions)}</p>
      ) : null}
      <button
        type="button"
        className="button-secondary"
        disabled={!onAddDeferredToExpansion}
        onClick={() => onAddDeferredToExpansion?.(item.id)}
      >
        Add to expansion
      </button>
    </li>
  );

  return (
    <SectionCard
      title="Implementation plan"
      description="Turns the blueprint into ordered, bounded build tasks and Codex-ready prompts. Use the Agent Run Harness below when you want a stricter one-task execution packet."
    >
      <div className="quality-callout quality-callout--strong">
        <div>
          <span className="eyebrow">Readiness</span>
          <strong>{titleize(plan.readiness)}</strong>
          <p>{plan.planSummary}</p>
        </div>
        <div>
          <span className="eyebrow">Suggested branch</span>
          <strong>{plan.suggestedBranchName}</strong>
          <p>{plan.recommendedBuildOrder[0] ?? "Resolve validation before sequencing implementation."}</p>
        </div>
      </div>

      <div className="button-row">
        <button
          type="button"
          className="button-secondary"
          onClick={() => void copyText("full-pack", fullTaskPackText(plan.codexTaskPack))}
        >
          {copiedKey === "full-pack" ? "Copied task pack" : "Copy full Codex task pack"}
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={() => void copyText("acceptance", plan.finalAcceptanceChecklist.map((item) => `- [ ] ${item}`).join("\n"))}
        >
          {copiedKey === "acceptance" ? "Copied checklist" : "Copy final checklist"}
        </button>
      </div>

      <details className="quality-detail" open>
        <summary>Recommended build order</summary>
        <ul className="compact-list">
          {plan.recommendedBuildOrder.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>

      <details className="quality-detail" open>
        <summary>Task groups ({plan.taskGroups.length})</summary>
        <ul className="stacked-list">{plan.taskGroups.map(renderGroup)}</ul>
      </details>

      <details className="quality-detail">
        <summary>Codex task pack ({plan.codexTaskPack.length})</summary>
        <ul className="stacked-list">
          {plan.codexTaskPack.map((item) => (
            <li key={item.id} className="stacked-list__item">
              <strong>{item.title}</strong>
              <pre className="json-preview">{item.prompt}</pre>
              <button
                type="button"
                className="button-secondary"
                onClick={() => void copyText(item.id, item.prompt)}
              >
                {copiedKey === item.id ? "Copied prompt" : "Copy prompt"}
              </button>
            </li>
          ))}
        </ul>
      </details>

      <details className="quality-detail">
        <summary>Test plan</summary>
        <ul className="compact-list">
          {plan.testPlan.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>

      <details className="quality-detail">
        <summary>Risk controls</summary>
        <ul className="compact-list">
          {plan.riskControls.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>

      <details className="quality-detail">
        <summary>Dependency warnings</summary>
        <ul className="compact-list">
          {plan.dependencyWarnings.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>

      <details className="quality-detail">
        <summary>Do not break</summary>
        <ul className="compact-list">
          {plan.doNotBreak.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>

      <details className="quality-detail">
        <summary>Deferred items ({plan.deferredItems.length})</summary>
        <ul className="stacked-list">{plan.deferredItems.map(renderDeferredItem)}</ul>
      </details>

      <details className="quality-detail">
        <summary>Final acceptance checklist</summary>
        <ul className="compact-list">
          {plan.finalAcceptanceChecklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
    </SectionCard>
  );
};
