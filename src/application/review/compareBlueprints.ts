import type { DecisionRecord, ProjectBlueprint, ScopeItem } from "@/domain/models";

import type {
  BlueprintStructuralDiff,
  CollectionCompareSummary,
  CollectionItemChange,
  CompareScalarValue,
  ScalarFieldChange,
  StructuralDiffCollectionKey,
} from "@/application/review/diffModel";

const compareFieldValue = (value: unknown): CompareScalarValue => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value === null || value === undefined) {
    return null;
  }

  return JSON.stringify(value);
};

const stableSerialize = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value ?? null);
};

const valuesMatch = (left: unknown, right: unknown): boolean =>
  stableSerialize(compareFieldValue(left)) === stableSerialize(compareFieldValue(right));

const compareScalarFields = (
  current: Record<string, unknown> | null,
  candidate: Record<string, unknown> | null,
  fields: string[],
): ScalarFieldChange[] =>
  fields.reduce<ScalarFieldChange[]>((changes, field) => {
    const currentValue = current?.[field];
    const candidateValue = candidate?.[field];

    if (valuesMatch(currentValue, candidateValue)) {
      return changes;
    }

    changes.push({
      field,
      currentValue: compareFieldValue(currentValue),
      candidateValue: compareFieldValue(candidateValue),
    });

    return changes;
  }, []);

const compareCollection = <T extends { id: string } & Record<string, unknown>>(input: {
  key: StructuralDiffCollectionKey;
  label: string;
  currentItems: T[];
  candidateItems: T[];
  getLabel: (item: T) => string;
}): CollectionCompareSummary => {
  const currentMap = new Map(input.currentItems.map((item) => [item.id, item]));
  const candidateMap = new Map(input.candidateItems.map((item) => [item.id, item]));

  const added = input.candidateItems
    .filter((item) => !currentMap.has(item.id))
    .map((item) => ({ id: item.id, label: input.getLabel(item) }));
  const removed = input.currentItems
    .filter((item) => !candidateMap.has(item.id))
    .map((item) => ({ id: item.id, label: input.getLabel(item) }));

  const changed = input.candidateItems.reduce<CollectionItemChange[]>((changes, candidateItem) => {
    const currentItem = currentMap.get(candidateItem.id);

    if (!currentItem) {
      return changes;
    }

    const changedFields = Array.from(
      new Set([...Object.keys(currentItem), ...Object.keys(candidateItem)]),
    )
      .filter((field) => !["id", "createdAt", "updatedAt"].includes(field))
      .sort()
      .filter((field) => !valuesMatch(currentItem[field], candidateItem[field]));

    if (changedFields.length === 0) {
      return changes;
    }

    changes.push({
      id: candidateItem.id,
      label: input.getLabel(candidateItem),
      changedFields,
    });

    return changes;
  }, []);

  return {
    key: input.key,
    label: input.label,
    added,
    removed,
    changed,
    hasChanges: added.length > 0 || removed.length > 0 || changed.length > 0,
  };
};

const namedLabel = <T extends { name: string }>(item: T): string => item.name;
const decisionRecordLabel = (item: DecisionRecord): string => item.title;
const scopeItemLabel = (item: ScopeItem): string => item.name;

const createComparableBlueprintView = (blueprint: ProjectBlueprint | null): Record<string, unknown> | null => {
  if (!blueprint) {
    return null;
  }

  return {
    project: {
      name: blueprint.project.name,
      slug: blueprint.project.slug,
      status: blueprint.project.status,
      rawIdea: blueprint.project.rawIdea,
      corePhilosophy: blueprint.project.corePhilosophy,
      invariantPriorities: blueprint.project.invariantPriorities,
    },
    intent: {
      summary: blueprint.intent.summary,
      problemStatement: blueprint.intent.problemStatement,
      targetAudience: blueprint.intent.targetAudience,
      valueHypothesis: blueprint.intent.valueHypothesis,
      extractedFromRawIdea: blueprint.intent.extractedFromRawIdea,
    },
    outcomes: blueprint.outcomes,
    actors: blueprint.actors,
    constraints: blueprint.constraints,
    domains: blueprint.domains,
    functions: blueprint.functions,
    components: blueprint.components,
    flows: blueprint.flows,
    dependencies: blueprint.dependencies,
    rules: blueprint.rules,
    invariants: blueprint.invariants,
    guardrails: blueprint.guardrails,
    phases: blueprint.phases,
    decisionLogic: {
      principles: blueprint.decisionLogic.principles,
      openQuestions: blueprint.decisionLogic.openQuestions,
      records: blueprint.decisionLogic.records,
    },
    failureModes: blueprint.failureModes,
    mvpScope: {
      summary: blueprint.mvpScope.summary,
      successDefinition: blueprint.mvpScope.successDefinition,
      items: blueprint.mvpScope.items,
    },
    expansionScope: {
      summary: blueprint.expansionScope.summary,
      futureSignals: blueprint.expansionScope.futureSignals,
      items: blueprint.expansionScope.items,
    },
  };
};

export const createBlueprintMeaningfulFingerprint = (blueprint: ProjectBlueprint | null): string =>
  stableSerialize(createComparableBlueprintView(blueprint));

export const compareBlueprints = (input: {
  activeBlueprint: ProjectBlueprint | null;
  candidateBlueprint: ProjectBlueprint | null;
}): BlueprintStructuralDiff => {
  const active = input.activeBlueprint;
  const candidate = input.candidateBlueprint;

  const projectChanges = compareScalarFields(
    active?.project ? (active.project as Record<string, unknown>) : null,
    candidate?.project ? (candidate.project as Record<string, unknown>) : null,
    ["name", "slug", "status", "rawIdea", "corePhilosophy", "invariantPriorities"],
  );
  const intentChanges = compareScalarFields(
    active?.intent ? (active.intent as Record<string, unknown>) : null,
    candidate?.intent ? (candidate.intent as Record<string, unknown>) : null,
    ["summary", "problemStatement", "targetAudience", "valueHypothesis", "extractedFromRawIdea"],
  );
  const decisionLogicChanges = compareScalarFields(
    active?.decisionLogic ? (active.decisionLogic as Record<string, unknown>) : null,
    candidate?.decisionLogic ? (candidate.decisionLogic as Record<string, unknown>) : null,
    ["principles", "openQuestions"],
  );
  const mvpScopeChanges = compareScalarFields(
    active?.mvpScope ? (active.mvpScope as Record<string, unknown>) : null,
    candidate?.mvpScope ? (candidate.mvpScope as Record<string, unknown>) : null,
    ["summary", "successDefinition"],
  );
  const expansionScopeChanges = compareScalarFields(
    active?.expansionScope ? (active.expansionScope as Record<string, unknown>) : null,
    candidate?.expansionScope ? (candidate.expansionScope as Record<string, unknown>) : null,
    ["summary", "futureSignals"],
  );

  const collections: CollectionCompareSummary[] = [
    compareCollection({
      key: "outcomes",
      label: "Outcomes",
      currentItems: active?.outcomes ?? [],
      candidateItems: candidate?.outcomes ?? [],
      getLabel: namedLabel,
    }),
    compareCollection({
      key: "actors",
      label: "Actors",
      currentItems: active?.actors ?? [],
      candidateItems: candidate?.actors ?? [],
      getLabel: namedLabel,
    }),
    compareCollection({
      key: "constraints",
      label: "Constraints",
      currentItems: active?.constraints ?? [],
      candidateItems: candidate?.constraints ?? [],
      getLabel: namedLabel,
    }),
    compareCollection({
      key: "domains",
      label: "Domains",
      currentItems: active?.domains ?? [],
      candidateItems: candidate?.domains ?? [],
      getLabel: namedLabel,
    }),
    compareCollection({
      key: "functions",
      label: "Functions",
      currentItems: active?.functions ?? [],
      candidateItems: candidate?.functions ?? [],
      getLabel: namedLabel,
    }),
    compareCollection({
      key: "components",
      label: "Components",
      currentItems: active?.components ?? [],
      candidateItems: candidate?.components ?? [],
      getLabel: namedLabel,
    }),
    compareCollection({
      key: "flows",
      label: "Flows",
      currentItems: active?.flows ?? [],
      candidateItems: candidate?.flows ?? [],
      getLabel: namedLabel,
    }),
    compareCollection({
      key: "dependencies",
      label: "Dependencies",
      currentItems: active?.dependencies ?? [],
      candidateItems: candidate?.dependencies ?? [],
      getLabel: namedLabel,
    }),
    compareCollection({
      key: "rules",
      label: "Rules",
      currentItems: active?.rules ?? [],
      candidateItems: candidate?.rules ?? [],
      getLabel: namedLabel,
    }),
    compareCollection({
      key: "invariants",
      label: "Invariants",
      currentItems: active?.invariants ?? [],
      candidateItems: candidate?.invariants ?? [],
      getLabel: namedLabel,
    }),
    compareCollection({
      key: "guardrails",
      label: "Guardrails",
      currentItems: active?.guardrails ?? [],
      candidateItems: candidate?.guardrails ?? [],
      getLabel: namedLabel,
    }),
    compareCollection({
      key: "phases",
      label: "Phases",
      currentItems: active?.phases ?? [],
      candidateItems: candidate?.phases ?? [],
      getLabel: namedLabel,
    }),
    compareCollection({
      key: "mvpScopeItems",
      label: "MVP scope items",
      currentItems: active?.mvpScope.items ?? [],
      candidateItems: candidate?.mvpScope.items ?? [],
      getLabel: scopeItemLabel,
    }),
    compareCollection({
      key: "expansionScopeItems",
      label: "Expansion scope items",
      currentItems: active?.expansionScope.items ?? [],
      candidateItems: candidate?.expansionScope.items ?? [],
      getLabel: scopeItemLabel,
    }),
    compareCollection({
      key: "decisionRecords",
      label: "Decision records",
      currentItems: active?.decisionLogic.records ?? [],
      candidateItems: candidate?.decisionLogic.records ?? [],
      getLabel: decisionRecordLabel,
    }),
    compareCollection({
      key: "failureModes",
      label: "Failure modes",
      currentItems: active?.failureModes ?? [],
      candidateItems: candidate?.failureModes ?? [],
      getLabel: namedLabel,
    }),
  ];

  const totalChangeCount =
    projectChanges.length +
    intentChanges.length +
    decisionLogicChanges.length +
    mvpScopeChanges.length +
    expansionScopeChanges.length +
    collections.reduce(
      (count, collection) => count + collection.added.length + collection.removed.length + collection.changed.length,
      0,
    );

  return {
    identical: totalChangeCount === 0,
    hasActiveBlueprint: Boolean(active),
    activeProjectId: active?.project.id ?? null,
    activeProjectName: active?.project.name ?? null,
    candidateProjectId: candidate?.project.id ?? null,
    candidateProjectName: candidate?.project.name ?? null,
    projectChanges,
    intentChanges,
    decisionLogicChanges,
    mvpScopeChanges,
    expansionScopeChanges,
    collections,
    totalChangeCount,
  };
};
