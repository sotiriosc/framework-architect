import type { AgentRunJournalEntry } from "@/application/agent/agentRunTypes";
import { buildImplementationPlan } from "@/application/planning/buildImplementationPlan";
import { buildBlueprintQualityReview } from "@/application/review/buildBlueprintQualityReview";
import {
  describeFrameworkTemplateForBlueprint,
  type FrameworkTemplateId,
} from "@/application/templates/frameworkTemplates";
import type { MemoryEntry, ProjectBlueprint } from "@/domain/models";
import type { BlueprintRevision } from "@/persistence/revisionTypes";

export type BlueprintLineageSourceKind =
  | "raw-idea"
  | "guided-intake"
  | "conversation-import"
  | "empty-blueprint"
  | "recovered"
  | "seed-example"
  | "unknown";

export type BlueprintLineageNourishmentKind =
  | "template"
  | "conversation-signal"
  | "manual-edit"
  | "safe-fix"
  | "foresight-action"
  | "implementation-action"
  | "agent-run"
  | "validation"
  | "quality-review"
  | "revision"
  | "memory";

export type BlueprintLineageFruitKind =
  | "blueprint"
  | "markdown-export"
  | "codex-prompt"
  | "implementation-plan"
  | "codex-task-pack"
  | "json-export"
  | "mvp-checklist"
  | "agent-run-packet"
  | "agent-result-review";

export type BlueprintLineageTrustLevel =
  | "blueprint-truth"
  | "derived-artifact"
  | "external-report"
  | "advisory";

export type BlueprintLineageSeed = {
  sourceKind: BlueprintLineageSourceKind;
  sourceLabel: string;
  rawIdea: string;
  createdAt: string | null;
};

export type BlueprintLineageOrientation = {
  templateId: FrameworkTemplateId;
  templateLabel: string;
  corePhilosophy: string;
  invariantPriorities: string[];
};

export type BlueprintLineageNourishmentItem = {
  id: string;
  kind: BlueprintLineageNourishmentKind;
  title: string;
  description: string;
  relatedEntityIds: string[];
  source: string;
  createdAt?: string;
};

export type BlueprintLineageFruitItem = {
  id: string;
  kind: BlueprintLineageFruitKind;
  title: string;
  description: string;
  producedFrom: string;
  trustLevel: BlueprintLineageTrustLevel;
};

export type BlueprintLineage = {
  summary: string;
  seed: BlueprintLineageSeed;
  orientation: BlueprintLineageOrientation;
  nourishment: BlueprintLineageNourishmentItem[];
  fruit: BlueprintLineageFruitItem[];
  trustBoundaries: string[];
  blueprintTruthSummary: string;
  externalEvidenceSummary: string;
  warnings: string[];
};

export type BuildBlueprintLineageInput = {
  blueprint: ProjectBlueprint;
  revisions?: BlueprintRevision[];
  agentRunJournal?: AgentRunJournalEntry[];
};

const sourceKindLabels = {
  "raw-idea": "Raw idea",
  "guided-intake": "Guided intake",
  "conversation-import": "Conversation import",
  "empty-blueprint": "Empty blueprint shell",
  recovered: "Recovered project",
  "seed-example": "Seed example",
  unknown: "Unknown source",
} satisfies Record<BlueprintLineageSourceKind, string>;

const trustBoundaries = [
  "Blueprint truth is stored in ProjectBlueprint.",
  "Exports are derived artifacts generated from the current blueprint.",
  "Agent Run Journal records pasted external reports and does not verify code directly.",
  "Revision history records stable saved blueprint snapshots.",
  "Conversation import distillation is reviewable and user-approved before blueprint creation.",
];

const unique = (items: string[]): string[] => [...new Set(items.map((item) => item.trim()).filter(Boolean))];

const includesAny = (value: string, terms: string[]): boolean => {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
};

const textForRevision = (revision: BlueprintRevision): string =>
  [revision.source, revision.summary, revision.reason ?? ""].join(" ");

const allMemoryEntries = (blueprint: ProjectBlueprint): MemoryEntry[] => [
  ...blueprint.memory.projectEntries,
  ...blueprint.memory.structuralEntries,
  ...blueprint.memory.decisionEntries,
];

const sortRevisionsAscending = (revisions: BlueprintRevision[]): BlueprintRevision[] =>
  [...revisions].sort((left, right) => left.revisionNumber - right.revisionNumber || left.createdAt.localeCompare(right.createdAt));

const findConversationImportMemory = (entries: MemoryEntry[]): MemoryEntry | null =>
  entries.find(
    (entry) =>
      entry.tags.some((tag) => tag.toLowerCase() === "conversation-import") ||
      includesAny(`${entry.summary} ${entry.reason}`, ["conversation import", "distilled into guided intake"]),
  ) ?? null;

const hasSeedMarkers = (blueprint: ProjectBlueprint, revisions: BlueprintRevision[], entries: MemoryEntry[]): boolean =>
  revisions.some((revision) => revision.source === "seed") ||
  entries.some(
    (entry) =>
      entry.tags.some((tag) => tag.toLowerCase() === "seed") ||
      includesAny(`${entry.summary} ${entry.reason}`, ["seed blueprint", "seed project", "seed initialization"]),
  ) ||
  blueprint.project.name.toLowerCase().includes("framework architect seed");

const isEmptyBlueprintSnapshot = (blueprint: ProjectBlueprint): boolean =>
  blueprint.actors.length === 0 &&
  blueprint.domains.length === 0 &&
  blueprint.functions.length === 0 &&
  blueprint.components.length === 0 &&
  blueprint.mvpScope.items.length === 0;

const hasEmptyBlueprintMarkers = (blueprint: ProjectBlueprint, revisions: BlueprintRevision[]): boolean =>
  isEmptyBlueprintSnapshot(blueprint) ||
  revisions.some((revision) =>
    includesAny(textForRevision(revision), ["empty blueprint", "empty shell", "manual architecture work"]),
  ) ||
  sortRevisionsAscending(revisions).some((revision, index) => index === 0 && isEmptyBlueprintSnapshot(revision.snapshot));

const hasGuidedMarkers = (blueprint: ProjectBlueprint, revisions: BlueprintRevision[]): boolean =>
  blueprint.decisionLogic.records.some((record) =>
    includesAny(`${record.title} ${record.summary} ${record.reason}`, ["guided intake", "guided creation"]),
  ) ||
  blueprint.project.corePhilosophy.toLowerCase().includes("framework template:") ||
  revisions.some((revision) => includesAny(textForRevision(revision), ["guided intake"]));

const resolveSeed = (
  blueprint: ProjectBlueprint,
  revisions: BlueprintRevision[],
  memoryEntries: MemoryEntry[],
): BlueprintLineageSeed => {
  const conversationMemory = findConversationImportMemory(memoryEntries);
  const recoveryRevision = sortRevisionsAscending(revisions).find((revision) => revision.source === "recoveryRestore");
  const firstRevision = sortRevisionsAscending(revisions)[0] ?? null;

  if (conversationMemory) {
    return {
      sourceKind: "conversation-import",
      sourceLabel: conversationMemory.summary,
      rawIdea: blueprint.project.rawIdea,
      createdAt: conversationMemory.createdAt,
    };
  }

  if (recoveryRevision) {
    return {
      sourceKind: "recovered",
      sourceLabel: recoveryRevision.reason ?? recoveryRevision.summary,
      rawIdea: blueprint.project.rawIdea,
      createdAt: recoveryRevision.createdAt,
    };
  }

  if (hasSeedMarkers(blueprint, revisions, memoryEntries)) {
    const seedMemory = memoryEntries.find((entry) => entry.tags.some((tag) => tag.toLowerCase() === "seed"));
    return {
      sourceKind: "seed-example",
      sourceLabel: seedMemory?.summary ?? "Framework Architect seed example.",
      rawIdea: blueprint.project.rawIdea,
      createdAt: seedMemory?.createdAt ?? firstRevision?.createdAt ?? blueprint.project.createdAt,
    };
  }

  if (hasEmptyBlueprintMarkers(blueprint, revisions)) {
    return {
      sourceKind: "empty-blueprint",
      sourceLabel: firstRevision?.reason ?? "Created as an empty blueprint shell for manual modeling.",
      rawIdea: blueprint.project.rawIdea,
      createdAt: firstRevision?.createdAt ?? blueprint.project.createdAt,
    };
  }

  if (hasGuidedMarkers(blueprint, revisions)) {
    return {
      sourceKind: "guided-intake",
      sourceLabel: firstRevision?.reason ?? "Created from guided intake.",
      rawIdea: blueprint.project.rawIdea,
      createdAt: firstRevision?.createdAt ?? blueprint.project.createdAt,
    };
  }

  if (blueprint.project.rawIdea.trim()) {
    return {
      sourceKind: "raw-idea",
      sourceLabel: firstRevision?.reason ?? "Created from raw idea.",
      rawIdea: blueprint.project.rawIdea,
      createdAt: firstRevision?.createdAt ?? blueprint.project.createdAt,
    };
  }

  return {
    sourceKind: "unknown",
    sourceLabel: "No seed source could be inferred.",
    rawIdea: blueprint.project.rawIdea,
    createdAt: firstRevision?.createdAt ?? blueprint.project.createdAt ?? null,
  };
};

const validationCounts = (blueprint: ProjectBlueprint) =>
  blueprint.validation.checks.reduce(
    (counts, check) => ({
      ...counts,
      [check.status]: counts[check.status] + 1,
    }),
    { pass: 0, warning: 0, fail: 0 },
  );

const classifyRevisionNourishment = (revision: BlueprintRevision): BlueprintLineageNourishmentKind => {
  const text = textForRevision(revision);

  if (includesAny(text, ["safe blueprint quality fix", "blueprint quality fix"])) {
    return "safe-fix";
  }

  if (includesAny(text, ["foresight"])) {
    return "foresight-action";
  }

  if (includesAny(text, ["implementation task", "implementation deferred", "deferred implementation"])) {
    return "implementation-action";
  }

  if (revision.source === "editSave" || revision.source === "manualCheckpoint") {
    return "manual-edit";
  }

  return "revision";
};

const formatRevisionSource = (source: BlueprintRevision["source"]): string => {
  switch (source) {
    case "editSave":
      return "edit save";
    case "manualCheckpoint":
      return "manual checkpoint";
    case "recoveryRestore":
      return "recovery restore";
    default:
      return source;
  }
};

const buildNourishment = (
  blueprint: ProjectBlueprint,
  revisions: BlueprintRevision[],
  agentRunJournal: AgentRunJournalEntry[],
  orientation: BlueprintLineageOrientation,
): BlueprintLineageNourishmentItem[] => {
  const counts = validationCounts(blueprint);
  const qualityReview = buildBlueprintQualityReview(blueprint);
  const memoryEntries = allMemoryEntries(blueprint);
  const conversationMemory = findConversationImportMemory(memoryEntries);
  const items: BlueprintLineageNourishmentItem[] = [
    {
      id: `lineage-template-${orientation.templateId}`,
      kind: "template",
      title: `${orientation.templateLabel} template`,
      description: "Template orientation shapes suggested domains, functions, components, rules, scope, and risk language.",
      relatedEntityIds: [blueprint.project.id],
      source: "template-inference",
      createdAt: blueprint.project.createdAt,
    },
    {
      id: `lineage-validation-${blueprint.validation.lastValidatedAt}`,
      kind: "validation",
      title: "Current validation state",
      description: `Build-ready: ${blueprint.validation.buildReady ? "yes" : "no"}. Checks: ${counts.pass} pass, ${counts.warning} warning, ${counts.fail} fail.`,
      relatedEntityIds: blueprint.validation.checks.flatMap((check) => check.relatedEntityIds),
      source: "validation",
      createdAt: blueprint.validation.lastValidatedAt,
    },
    {
      id: "lineage-quality-review",
      kind: "quality-review",
      title: "Current quality review",
      description: `${qualityReview.summary} Score: ${qualityReview.overallScore}/100 (${qualityReview.grade}).`,
      relatedEntityIds: qualityReview.issues.flatMap((issue) => issue.relatedEntityIds),
      source: "quality-review",
    },
  ];

  if (conversationMemory) {
    items.push({
      id: `${conversationMemory.id}-conversation-signal`,
      kind: "conversation-signal",
      title: "Conversation import source",
      description: `${conversationMemory.summary} ${conversationMemory.reason}`,
      relatedEntityIds: conversationMemory.relatedEntityIds,
      source: conversationMemory.tags.join(", ") || "conversation-import",
      createdAt: conversationMemory.createdAt,
    });
  }

  if (revisions.length > 0) {
    const orderedRevisions = sortRevisionsAscending(revisions);
    const latestRevision = orderedRevisions[orderedRevisions.length - 1];
    items.push({
      id: `lineage-revision-history-${blueprint.project.id}`,
      kind: "revision",
      title: "Revision history",
      description: `${revisions.length} stable saved ${revisions.length === 1 ? "snapshot" : "snapshots"} recorded. Latest: ${latestRevision?.summary ?? "None"}`,
      relatedEntityIds: [blueprint.project.id],
      source: "revision-history",
      createdAt: latestRevision?.createdAt,
    });
  }

  revisions.forEach((revision) => {
    items.push({
      id: `lineage-${revision.id}`,
      kind: classifyRevisionNourishment(revision),
      title: `Revision ${revision.revisionNumber}`,
      description: `${revision.summary}${revision.reason ? ` Reason: ${revision.reason}` : ""}`,
      relatedEntityIds: unique([blueprint.project.id, ...revision.relatedDecisionRecordIds]),
      source: formatRevisionSource(revision.source),
      createdAt: revision.createdAt,
    });
  });

  memoryEntries.forEach((entry) => {
    items.push({
      id: `lineage-${entry.id}`,
      kind: "memory",
      title: entry.summary,
      description: `${entry.reason}${entry.tags.length > 0 ? ` Tags: ${entry.tags.join(", ")}` : ""}`,
      relatedEntityIds: entry.relatedEntityIds,
      source: `memory:${entry.type}`,
      createdAt: entry.createdAt,
    });
  });

  blueprint.decisionLogic.records
    .filter((record) => record.title.toLowerCase().startsWith("foresight:"))
    .forEach((record) => {
      items.push({
        id: `lineage-foresight-${record.id}`,
        kind: "foresight-action",
        title: record.title,
        description: `${record.summary} ${record.reason}`,
        relatedEntityIds: record.relatedEntityIds,
        source: "decision-record",
        createdAt: record.createdAt,
      });
    });

  blueprint.decisionLogic.records
    .filter((record) => record.title.toLowerCase().startsWith("implementation task:"))
    .forEach((record) => {
      items.push({
        id: `lineage-implementation-${record.id}`,
        kind: "implementation-action",
        title: record.title,
        description: `${record.summary} ${record.reason}`,
        relatedEntityIds: record.relatedEntityIds,
        source: "decision-record",
        createdAt: record.createdAt,
      });
    });

  blueprint.expansionScope.futureSignals
    .filter((signal) => includesAny(signal, ["foresight:", "implementation deferred:"]))
    .forEach((signal, index) => {
      items.push({
        id: `lineage-expansion-signal-${index}`,
        kind: signal.toLowerCase().includes("foresight:") ? "foresight-action" : "implementation-action",
        title: signal,
        description: "Accepted into expansion scope as a future signal rather than blueprint MVP truth.",
        relatedEntityIds: [blueprint.expansionScope.id],
        source: "expansion-scope",
        createdAt: blueprint.expansionScope.updatedAt,
      });
    });

  agentRunJournal.forEach((entry) => {
    items.push({
      id: `lineage-agent-run-${entry.id}`,
      kind: "agent-run",
      title: entry.packetSnapshot.taskTitle,
      description: `${entry.notes} Status: ${entry.status}.`,
      relatedEntityIds: [blueprint.project.id],
      source: "agent-run-journal",
      createdAt: entry.createdAt,
    });
  });

  return items;
};

const derivedExportFruit = (blueprint: ProjectBlueprint): BlueprintLineageFruitItem[] => [
  {
    id: "fruit-markdown-export",
    kind: "markdown-export",
    title: "Markdown architecture brief",
    description: "Readable architecture brief derived from the current blueprint.",
    producedFrom: blueprint.project.id,
    trustLevel: "derived-artifact",
  },
  {
    id: "fruit-codex-prompt",
    kind: "codex-prompt",
    title: "Codex prompt",
    description: "Implementation prompt derived from blueprint rules, invariants, scope, validation, and planning context.",
    producedFrom: blueprint.project.id,
    trustLevel: "derived-artifact",
  },
  {
    id: "fruit-implementation-plan",
    kind: "implementation-plan",
    title: "Implementation plan",
    description: `Sequenced implementation plan. Current readiness: ${buildImplementationPlan(blueprint).readiness}.`,
    producedFrom: blueprint.project.id,
    trustLevel: "derived-artifact",
  },
  {
    id: "fruit-codex-task-pack",
    kind: "codex-task-pack",
    title: "Codex task pack",
    description: "Bounded task pack derived from the current implementation plan.",
    producedFrom: blueprint.project.id,
    trustLevel: "derived-artifact",
  },
  {
    id: "fruit-json-export",
    kind: "json-export",
    title: "JSON blueprint export",
    description: "Serialized export of the current ProjectBlueprint.",
    producedFrom: blueprint.project.id,
    trustLevel: "derived-artifact",
  },
  {
    id: "fruit-mvp-checklist",
    kind: "mvp-checklist",
    title: "MVP checklist",
    description: "Checklist derived from MVP scope, mapped functions/components, phases, and validation blockers.",
    producedFrom: blueprint.project.id,
    trustLevel: "derived-artifact",
  },
];

const buildFruit = (
  blueprint: ProjectBlueprint,
  agentRunJournal: AgentRunJournalEntry[],
): BlueprintLineageFruitItem[] => [
  {
    id: "fruit-blueprint",
    kind: "blueprint",
    title: "ProjectBlueprint",
    description: `Current local blueprint truth for ${blueprint.project.name}, version ${blueprint.project.version}.`,
    producedFrom: blueprint.project.id,
    trustLevel: "blueprint-truth",
  },
  ...derivedExportFruit(blueprint),
  ...agentRunJournal.flatMap((entry) => {
    const packetFruit: BlueprintLineageFruitItem = {
      id: `fruit-agent-run-packet-${entry.packetId}`,
      kind: "agent-run-packet",
      title: `Agent run packet: ${entry.packetSnapshot.taskTitle}`,
      description: `Bounded packet for one implementation task from ${entry.packetSnapshot.sourceTaskGroup}.`,
      producedFrom: entry.taskId,
      trustLevel: "derived-artifact",
    };

    if (!entry.resultDraft && !entry.review) {
      return [packetFruit];
    }

    const reviewFruit: BlueprintLineageFruitItem = {
      id: `fruit-agent-result-review-${entry.packetId}`,
      kind: "agent-result-review",
      title: `Agent result review: ${entry.packetSnapshot.taskTitle}`,
      description: entry.review?.reviewSummary ?? entry.resultDraft?.summary ?? "Pasted external report was recorded.",
      producedFrom: entry.packetId,
      trustLevel: "external-report",
    };

    return [packetFruit, reviewFruit];
  }),
];

const buildBlueprintTruthSummary = (blueprint: ProjectBlueprint): string => {
  const counts = validationCounts(blueprint);
  const memoryCount = allMemoryEntries(blueprint).length;

  return `ProjectBlueprint stores ${blueprint.project.name} v${blueprint.project.version}, ${blueprint.decisionLogic.records.length} decision records, ${memoryCount} memory entries, and validation with ${counts.pass} pass / ${counts.warning} warning / ${counts.fail} fail checks.`;
};

const buildExternalEvidenceSummary = (agentRunJournal: AgentRunJournalEntry[]): string => {
  if (agentRunJournal.length === 0) {
    return "No agent run journal entries are recorded for this blueprint.";
  }

  const resultCount = agentRunJournal.filter((entry) => entry.resultDraft || entry.review).length;
  const acceptedCount = agentRunJournal.filter((entry) => entry.review?.overall === "accepted").length;

  return `${agentRunJournal.length} agent run journal ${agentRunJournal.length === 1 ? "entry is" : "entries are"} recorded; ${resultCount} include pasted result evidence and ${acceptedCount} were accepted by report review. These are supporting evidence, not blueprint truth.`;
};

const buildWarnings = (
  seed: BlueprintLineageSeed,
  blueprint: ProjectBlueprint,
  revisions: BlueprintRevision[],
  agentRunJournal: AgentRunJournalEntry[],
): string[] => {
  const warnings: string[] = [
    "Export downloads are deterministic and not persisted as click history; lineage lists available export artifacts and recorded agent packets.",
  ];

  if (seed.sourceKind === "unknown") {
    warnings.push("Seed source could not be inferred from the current local data.");
  }

  if (revisions.length === 0) {
    warnings.push("No revision history was supplied to this lineage view.");
  }

  if (!blueprint.validation.buildReady) {
    warnings.push("Current validation does not mark this blueprint as build-ready.");
  }

  if (agentRunJournal.some((entry) => entry.resultDraft || entry.review)) {
    warnings.push("Agent result reviews are based only on pasted reports; they do not verify repository state or test execution.");
  }

  return warnings;
};

export const buildBlueprintLineage = ({
  blueprint,
  revisions = [],
  agentRunJournal = [],
}: BuildBlueprintLineageInput): BlueprintLineage => {
  const template = describeFrameworkTemplateForBlueprint(blueprint);
  const memoryEntries = allMemoryEntries(blueprint);
  const seed = resolveSeed(blueprint, revisions, memoryEntries);
  const orientation: BlueprintLineageOrientation = {
    templateId: template.id,
    templateLabel: template.label,
    corePhilosophy: blueprint.project.corePhilosophy,
    invariantPriorities: blueprint.project.invariantPriorities,
  };
  const nourishment = buildNourishment(blueprint, revisions, agentRunJournal, orientation);
  const fruit = buildFruit(blueprint, agentRunJournal);
  const blueprintTruthSummary = buildBlueprintTruthSummary(blueprint);
  const externalEvidenceSummary = buildExternalEvidenceSummary(agentRunJournal);
  const summary = `${sourceKindLabels[seed.sourceKind]} shaped by the ${orientation.templateLabel} template, ${nourishment.length} lineage inputs, ${fruit.length} outputs, ${revisions.length} revisions, and ${agentRunJournal.length} agent run journal entries. Blueprint truth remains ProjectBlueprint.`;

  return {
    summary,
    seed,
    orientation,
    nourishment,
    fruit,
    trustBoundaries,
    blueprintTruthSummary,
    externalEvidenceSummary,
    warnings: buildWarnings(seed, blueprint, revisions, agentRunJournal),
  };
};
