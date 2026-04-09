import type { ProjectBlueprint } from "@/domain/models";

export type CompareScalarValue = string | number | boolean | string[] | null;

export type ScalarFieldChange = {
  field: string;
  currentValue: CompareScalarValue;
  candidateValue: CompareScalarValue;
};

export type CollectionKey =
  | "outcomes"
  | "actors"
  | "constraints"
  | "domains"
  | "functions"
  | "components"
  | "flows"
  | "dependencies"
  | "rules"
  | "invariants"
  | "guardrails"
  | "phases";

export type CollectionItemSummary = {
  id: string;
  label: string;
};

export type CollectionItemChange = CollectionItemSummary & {
  changedFields: string[];
};

export type CollectionCompareSummary = {
  key: CollectionKey;
  label: string;
  added: CollectionItemSummary[];
  removed: CollectionItemSummary[];
  changed: CollectionItemChange[];
  hasChanges: boolean;
};

export type BlueprintCompareSummary = {
  identical: boolean;
  hasActiveBlueprint: boolean;
  activeProjectId: string | null;
  activeProjectName: string | null;
  candidateProjectId: string | null;
  candidateProjectName: string | null;
  projectChanges: ScalarFieldChange[];
  intentChanges: ScalarFieldChange[];
  mvpScopeChanges: ScalarFieldChange[];
  expansionScopeChanges: ScalarFieldChange[];
  collections: CollectionCompareSummary[];
  totalChangeCount: number;
};

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

const valuesMatch = (left: unknown, right: unknown): boolean =>
  JSON.stringify(compareFieldValue(left)) === JSON.stringify(compareFieldValue(right));

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

const compareCollection = <
  T extends {
    id: string;
    name: string;
  } & Record<string, unknown>,
>(
  input: {
    key: CollectionKey;
    label: string;
    currentItems: T[];
    candidateItems: T[];
  },
): CollectionCompareSummary => {
  const currentMap = new Map(input.currentItems.map((item) => [item.id, item]));
  const candidateMap = new Map(input.candidateItems.map((item) => [item.id, item]));

  const added = input.candidateItems
    .filter((item) => !currentMap.has(item.id))
    .map((item) => ({ id: item.id, label: item.name }));
  const removed = input.currentItems
    .filter((item) => !candidateMap.has(item.id))
    .map((item) => ({ id: item.id, label: item.name }));

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
      label: candidateItem.name,
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

export const compareBlueprints = (input: {
  activeBlueprint: ProjectBlueprint | null;
  candidateBlueprint: ProjectBlueprint | null;
}): BlueprintCompareSummary => {
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
    }),
    compareCollection({
      key: "actors",
      label: "Actors",
      currentItems: active?.actors ?? [],
      candidateItems: candidate?.actors ?? [],
    }),
    compareCollection({
      key: "constraints",
      label: "Constraints",
      currentItems: active?.constraints ?? [],
      candidateItems: candidate?.constraints ?? [],
    }),
    compareCollection({
      key: "domains",
      label: "Domains",
      currentItems: active?.domains ?? [],
      candidateItems: candidate?.domains ?? [],
    }),
    compareCollection({
      key: "functions",
      label: "Functions",
      currentItems: active?.functions ?? [],
      candidateItems: candidate?.functions ?? [],
    }),
    compareCollection({
      key: "components",
      label: "Components",
      currentItems: active?.components ?? [],
      candidateItems: candidate?.components ?? [],
    }),
    compareCollection({
      key: "flows",
      label: "Flows",
      currentItems: active?.flows ?? [],
      candidateItems: candidate?.flows ?? [],
    }),
    compareCollection({
      key: "dependencies",
      label: "Dependencies",
      currentItems: active?.dependencies ?? [],
      candidateItems: candidate?.dependencies ?? [],
    }),
    compareCollection({
      key: "rules",
      label: "Rules",
      currentItems: active?.rules ?? [],
      candidateItems: candidate?.rules ?? [],
    }),
    compareCollection({
      key: "invariants",
      label: "Invariants",
      currentItems: active?.invariants ?? [],
      candidateItems: candidate?.invariants ?? [],
    }),
    compareCollection({
      key: "guardrails",
      label: "Guardrails",
      currentItems: active?.guardrails ?? [],
      candidateItems: candidate?.guardrails ?? [],
    }),
    compareCollection({
      key: "phases",
      label: "Phases",
      currentItems: active?.phases ?? [],
      candidateItems: candidate?.phases ?? [],
    }),
  ];

  const totalChangeCount =
    projectChanges.length +
    intentChanges.length +
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
    mvpScopeChanges,
    expansionScopeChanges,
    collections,
    totalChangeCount,
  };
};
