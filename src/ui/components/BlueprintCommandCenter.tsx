import { useMemo } from "react";

import type { AgentRunJournalEntry } from "@/application/agent/agentRunTypes";
import { exportBlueprintMarkdown } from "@/application/export/exportBlueprintMarkdown";
import { exportCodexTaskPack } from "@/application/export/exportCodexTaskPack";
import { buildBlueprintLineage, type BlueprintLineageSourceKind } from "@/application/lineage/buildBlueprintLineage";
import {
  buildImplementationPlan,
  listImplementationPlanTasks,
  type BlueprintImplementationReadiness,
} from "@/application/planning/buildImplementationPlan";
import { buildBlueprintForesight } from "@/application/review/buildBlueprintForesight";
import { buildBlueprintImprovementPlan } from "@/application/review/buildBlueprintImprovementPlan";
import { buildBlueprintQualityReview } from "@/application/review/buildBlueprintQualityReview";
import { describeFrameworkTemplateForBlueprint } from "@/application/templates/frameworkTemplates";
import type { ProjectBlueprint } from "@/domain/models";
import type { BlueprintRevision } from "@/persistence/revisionTypes";
import { SectionCard } from "@/ui/components/SectionCard";

export type BlueprintCommandCenterActionId =
  | "apply-safe-fixes"
  | "view-implementation-plan"
  | "generate-agent-run-packet"
  | "export-codex-task-pack"
  | "export-markdown-brief";

export type BlueprintCommandCenterAction = {
  id: BlueprintCommandCenterActionId;
  label: string;
  description: string;
};

export type BlueprintCommandCenterModel = {
  templateLabel: string;
  buildReadyLabel: string;
  qualityLabel: string;
  implementationReadiness: BlueprintImplementationReadiness;
  implementationReadinessLabel: string;
  nextBestFixTitle: string;
  nextBestFixDescription: string;
  recommendedNextMoveTitle: string;
  recommendedNextMoveDescription: string;
  firstImplementationTaskId: string | null;
  firstImplementationTaskTitle: string;
  firstImplementationTaskDescription: string;
  agentHarnessStatus: string;
  lineageSourceKind: BlueprintLineageSourceKind;
  lineageSourceLabel: string;
  exportReadiness: string;
  primaryActions: BlueprintCommandCenterAction[];
};

type BuildBlueprintCommandCenterModelInput = {
  blueprint: ProjectBlueprint;
  revisions?: BlueprintRevision[];
  agentRunJournal?: AgentRunJournalEntry[];
};

type BlueprintCommandCenterProps = BuildBlueprintCommandCenterModelInput & {
  onApplySafeFixes: () => void;
  onCreateAgentRunPacket: (taskId: string) => AgentRunJournalEntry | null;
  onViewImplementationPlan?: () => void;
};

const titleize = (value: string): string =>
  value
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const latestJournalEntry = (entries: AgentRunJournalEntry[]): AgentRunJournalEntry | null =>
  entries.reduce<AgentRunJournalEntry | null>(
    (latest, entry) => (!latest || entry.createdAt.localeCompare(latest.createdAt) > 0 ? entry : latest),
    null,
  );

const action = (
  id: BlueprintCommandCenterActionId,
  label: string,
  description: string,
): BlueprintCommandCenterAction => ({ id, label, description });

const downloadTextFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const filenameFor = (blueprint: ProjectBlueprint, suffix: string): string =>
  `${blueprint.project.slug || "framework-blueprint"}-${suffix}.md`;

export const buildBlueprintCommandCenterModel = ({
  blueprint,
  revisions = [],
  agentRunJournal = [],
}: BuildBlueprintCommandCenterModelInput): BlueprintCommandCenterModel => {
  const template = describeFrameworkTemplateForBlueprint(blueprint);
  const quality = buildBlueprintQualityReview(blueprint);
  const improvementPlan = buildBlueprintImprovementPlan(blueprint);
  const foresight = buildBlueprintForesight(blueprint);
  const implementationPlan = buildImplementationPlan(blueprint);
  const implementationTasks = listImplementationPlanTasks(implementationPlan);
  const firstTask = implementationTasks[0] ?? null;
  const lineage = buildBlueprintLineage({ blueprint, revisions, agentRunJournal });
  const latestEntry = latestJournalEntry(agentRunJournal);
  const safeFixCount = improvementPlan.safeFixes.length;
  const hasCodexPack = implementationPlan.codexTaskPack.length > 0;

  const nextBestFix = improvementPlan.recommendedFirstAction ?? quality.nextBestFix;
  const nextBestFixTitle =
    !blueprint.validation.buildReady
      ? "Resolve validation blockers"
      : nextBestFix?.title ?? "No guided quality fix pending";
  let nextBestFixDescription = "Keep using stable review when making structural changes.";

  if (!blueprint.validation.buildReady) {
    nextBestFixDescription = "Complete missing structure before treating the blueprint as build-ready.";
  } else if (nextBestFix && "recommendation" in nextBestFix) {
    nextBestFixDescription = nextBestFix.recommendation;
  } else if (nextBestFix) {
    nextBestFixDescription = nextBestFix.description;
  }

  const recommendedNextMoveTitle =
    !blueprint.validation.buildReady
      ? "Complete missing structure"
      : safeFixCount > 0
        ? "Apply safe fixes"
        : implementationPlan.readiness === "not-ready"
          ? "Review implementation readiness"
          : agentRunJournal.length === 0 && firstTask
            ? "Generate the first agent packet"
            : foresight.recommendedNextMove?.title ?? "Export the current handoff";

  const recommendedNextMoveDescription =
    !blueprint.validation.buildReady
      ? "Use validation details to fill required blueprint structure first."
      : safeFixCount > 0
        ? `${safeFixCount} deterministic quality fix${safeFixCount === 1 ? "" : "es"} can be applied now.`
        : implementationPlan.readiness === "not-ready"
          ? "Use the implementation plan details to clear sequencing blockers."
          : agentRunJournal.length === 0 && firstTask
            ? `Start with: ${firstTask.title}.`
            : foresight.recommendedNextMove?.whyNowOrLater ?? "Download a Markdown brief or Codex task pack from this blueprint.";

  const agentHarnessStatus = latestEntry
    ? `${agentRunJournal.length} journal ${agentRunJournal.length === 1 ? "entry" : "entries"}; latest is ${titleize(latestEntry.status)} for ${latestEntry.packetSnapshot.taskTitle}.`
    : "No agent run packets yet.";

  const exportReadiness =
    blueprint.validation.buildReady && implementationPlan.readiness !== "not-ready" && hasCodexPack
      ? "Markdown brief and Codex task pack are ready."
      : blueprint.validation.buildReady
        ? "Markdown brief is exportable; review implementation readiness before handoff."
        : "Exports are available for review, but validation should pass before handoff.";

  const primaryActions: BlueprintCommandCenterAction[] = [];

  if (safeFixCount > 0) {
    primaryActions.push(action(
      "apply-safe-fixes",
      "Apply Safe Fixes",
      "Run deterministic quality repairs.",
    ));
  }

  primaryActions.push(action(
    "view-implementation-plan",
    "View Implementation Plan",
    "Jump to sequencing and task details.",
  ));

  if (firstTask) {
    primaryActions.push(action(
      "generate-agent-run-packet",
      "Generate Agent Run Packet",
      "Create one bounded packet for the first task.",
    ));
  }

  primaryActions.push(
    action("export-codex-task-pack", "Export Codex Task Pack", "Download task prompts and report format."),
    action("export-markdown-brief", "Export Markdown Brief", "Download the architecture brief."),
  );

  return {
    templateLabel: template.label,
    buildReadyLabel: blueprint.validation.buildReady ? "Build-ready" : "Needs structure",
    qualityLabel: `${quality.grade} (${quality.overallScore}/100)`,
    implementationReadiness: implementationPlan.readiness,
    implementationReadinessLabel: titleize(implementationPlan.readiness),
    nextBestFixTitle,
    nextBestFixDescription,
    recommendedNextMoveTitle,
    recommendedNextMoveDescription,
    firstImplementationTaskId: firstTask?.id ?? null,
    firstImplementationTaskTitle: firstTask?.title ?? "No implementation task available",
    firstImplementationTaskDescription: firstTask?.description ?? "Resolve validation and quality gaps before sequencing tasks.",
    agentHarnessStatus,
    lineageSourceKind: lineage.seed.sourceKind,
    lineageSourceLabel: lineage.seed.sourceLabel,
    exportReadiness,
    primaryActions: primaryActions.slice(0, 5),
  };
};

export const BlueprintCommandCenter = ({
  blueprint,
  revisions = [],
  agentRunJournal = [],
  onApplySafeFixes,
  onCreateAgentRunPacket,
  onViewImplementationPlan,
}: BlueprintCommandCenterProps) => {
  const model = useMemo(
    () => buildBlueprintCommandCenterModel({ blueprint, revisions, agentRunJournal }),
    [blueprint, revisions, agentRunJournal],
  );

  const handleAction = (actionId: BlueprintCommandCenterActionId) => {
    switch (actionId) {
      case "apply-safe-fixes":
        onApplySafeFixes();
        break;
      case "view-implementation-plan":
        onViewImplementationPlan?.();
        break;
      case "generate-agent-run-packet":
        if (model.firstImplementationTaskId) {
          onCreateAgentRunPacket(model.firstImplementationTaskId);
        }
        break;
      case "export-codex-task-pack":
        downloadTextFile(
          filenameFor(blueprint, "codex-task-pack"),
          exportCodexTaskPack(blueprint),
          "text/markdown",
        );
        break;
      case "export-markdown-brief":
        downloadTextFile(
          filenameFor(blueprint, "architecture-brief"),
          exportBlueprintMarkdown(blueprint, { revisions, agentRunJournal }),
          "text/markdown",
        );
        break;
    }
  };

  return (
    <SectionCard
      title="Blueprint command center"
      description="A guided status surface for readiness, next action, execution handoff, lineage, and exports."
    >
      <div className="command-center__summary">
        <div>
          <span className="eyebrow">Template</span>
          <strong>{model.templateLabel}</strong>
        </div>
        <div>
          <span className="eyebrow">Build status</span>
          <strong>{model.buildReadyLabel}</strong>
        </div>
        <div>
          <span className="eyebrow">Quality</span>
          <strong>{model.qualityLabel}</strong>
        </div>
        <div>
          <span className="eyebrow">Implementation</span>
          <strong>{model.implementationReadinessLabel}</strong>
        </div>
      </div>

      <div className="command-center__next">
        <div>
          <span className="eyebrow">Recommended next move</span>
          <strong>{model.recommendedNextMoveTitle}</strong>
          <p>{model.recommendedNextMoveDescription}</p>
        </div>
        <div>
          <span className="eyebrow">Fix first</span>
          <strong>{model.nextBestFixTitle}</strong>
          <p>{model.nextBestFixDescription}</p>
        </div>
      </div>

      <div className="button-row command-center__actions">
        {model.primaryActions.map((primaryAction) => (
          <button
            key={primaryAction.id}
            type="button"
            className={primaryAction.id === "apply-safe-fixes" ? undefined : "button-secondary"}
            title={primaryAction.description}
            onClick={() => handleAction(primaryAction.id)}
          >
            {primaryAction.label}
          </button>
        ))}
      </div>

      <div className="command-center__status-grid">
        <div className="readiness-group">
          <span className="eyebrow">First task</span>
          <strong>{model.firstImplementationTaskTitle}</strong>
          <p>{model.firstImplementationTaskDescription}</p>
        </div>
        <div className="readiness-group">
          <span className="eyebrow">Agent harness</span>
          <strong>{model.agentHarnessStatus}</strong>
          <p>Journal reports stay outside blueprint truth.</p>
        </div>
        <div className="readiness-group">
          <span className="eyebrow">Lineage</span>
          <strong>{titleize(model.lineageSourceKind)}</strong>
          <p>{model.lineageSourceLabel}</p>
        </div>
        <div className="readiness-group">
          <span className="eyebrow">Exports</span>
          <strong>{model.exportReadiness}</strong>
          <p>Exports are derived from the current blueprint.</p>
        </div>
      </div>
    </SectionCard>
  );
};
