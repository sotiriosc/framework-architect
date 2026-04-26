import type { ProjectBlueprint } from "@/domain/models";

export type RelationType =
  | "outcomes"
  | "actors"
  | "domains"
  | "functions"
  | "components"
  | "dependencies"
  | "rules"
  | "invariants"
  | "guardrails"
  | "phases"
  | "flows"
  | "scopeItems"
  | "decisionRecords"
  | "failureModes"
  | "allEntities"
  | "scopeEntities";

export type RelationOption = {
  id: string;
  label: string;
  type: string;
  description?: string;
};

export type RelationOptionGroups = Record<Exclude<RelationType, "scopeEntities">, RelationOption[]>;

const option = (input: RelationOption): RelationOption => input;

export const buildRelationOptionGroups = (blueprint: ProjectBlueprint): RelationOptionGroups => {
  const outcomes = blueprint.outcomes.map((item) =>
    option({ id: item.id, label: item.name, type: "Outcome", description: item.description }),
  );
  const actors = blueprint.actors.map((item) =>
    option({ id: item.id, label: item.name, type: "Actor", description: item.role || item.description }),
  );
  const constraints = blueprint.constraints.map((item) =>
    option({ id: item.id, label: item.name, type: "Constraint", description: item.description }),
  );
  const domains = blueprint.domains.map((item) =>
    option({ id: item.id, label: item.name, type: "Domain", description: item.responsibility || item.description }),
  );
  const functions = blueprint.functions.map((item) =>
    option({ id: item.id, label: item.name, type: "Function", description: item.description }),
  );
  const components = blueprint.components.map((item) =>
    option({ id: item.id, label: item.name, type: "Component", description: item.purpose || item.description }),
  );
  const dependencies = blueprint.dependencies.map((item) =>
    option({ id: item.id, label: item.name, type: "Dependency", description: item.description }),
  );
  const rules = blueprint.rules.map((item) =>
    option({ id: item.id, label: item.name, type: "Rule", description: item.description }),
  );
  const invariants = blueprint.invariants.map((item) =>
    option({ id: item.id, label: item.name, type: "Invariant", description: item.description }),
  );
  const guardrails = blueprint.guardrails.map((item) =>
    option({ id: item.id, label: item.name, type: "Guardrail", description: item.protectedAgainst || item.description }),
  );
  const phases = blueprint.phases.map((item) =>
    option({ id: item.id, label: item.name, type: "Phase", description: item.objective || item.description }),
  );
  const flows = blueprint.flows.map((item) =>
    option({ id: item.id, label: item.name, type: "Flow", description: item.stepSummary || item.description }),
  );
  const scopeItems = [
    ...blueprint.mvpScope.items.map((item) =>
      option({ id: item.id, label: item.name, type: "MVP scope item", description: item.description || item.rationale }),
    ),
    ...blueprint.expansionScope.items.map((item) =>
      option({
        id: item.id,
        label: item.name,
        type: "Expansion scope item",
        description: item.description || item.rationale,
      }),
    ),
  ];
  const decisionRecords = blueprint.decisionLogic.records.map((item) =>
    option({ id: item.id, label: item.title, type: "Decision record", description: item.summary }),
  );
  const failureModes = blueprint.failureModes.map((item) =>
    option({ id: item.id, label: item.name, type: "Failure mode", description: item.description }),
  );
  const project = option({
    id: blueprint.project.id,
    label: blueprint.project.name,
    type: "Project",
    description: blueprint.project.rawIdea,
  });
  const intent = option({
    id: blueprint.intent.id,
    label: blueprint.intent.summary,
    type: "Intent",
    description: blueprint.intent.problemStatement,
  });

  return {
    outcomes,
    actors,
    domains,
    functions,
    components,
    dependencies,
    rules,
    invariants,
    guardrails,
    phases,
    flows,
    scopeItems,
    decisionRecords,
    failureModes,
    allEntities: [
      project,
      intent,
      ...outcomes,
      ...actors,
      ...constraints,
      ...domains,
      ...functions,
      ...components,
      ...flows,
      ...dependencies,
      ...rules,
      ...invariants,
      ...guardrails,
      ...phases,
      ...scopeItems,
      ...decisionRecords,
      ...failureModes,
    ],
  };
};

export const relationTypeForScope = (scope: string | undefined): Exclude<RelationType, "scopeEntities"> => {
  switch (scope) {
    case "actor":
      return "actors";
    case "component":
      return "components";
    case "domain":
      return "domains";
    case "flow":
      return "flows";
    case "function":
      return "functions";
    case "phase":
      return "phases";
    case "project":
    case "scope-item":
      return "allEntities";
    default:
      return "allEntities";
  }
};

export const resolveRelationOptions = (
  groups: RelationOptionGroups,
  relationType: RelationType,
  scope?: string,
): RelationOption[] => groups[relationType === "scopeEntities" ? relationTypeForScope(scope) : relationType];

export const getMissingRelationIds = (ids: string[], options: RelationOption[]): string[] => {
  const optionIds = new Set(options.map((item) => item.id));
  return ids.filter((id) => !optionIds.has(id));
};

export const toggleRelationId = (ids: string[], id: string): string[] =>
  ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];

export const parseRelationRawValue = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const stringifyRelationIds = (ids: string[]): string => ids.join(", ");

export const formatRelationLabel = (id: string, groups: RelationOptionGroups): string => {
  const match = groups.allEntities.find((item) => item.id === id);
  return match ? `${id} (${match.label})` : `${id} (missing)`;
};

export const labelsForRelationIds = (
  ids: string[],
  options: RelationOption[],
  maxLabels = 3,
): string => {
  const optionById = new Map(options.map((item) => [item.id, item]));
  const labels = ids.slice(0, maxLabels).map((id) => optionById.get(id)?.label ?? `Missing: ${id}`);
  const remainingCount = ids.length - labels.length;

  return `${labels.join(", ")}${remainingCount > 0 ? `, +${remainingCount} more` : ""}`;
};
