import type {
  Component,
  DecisionRecord,
  Domain,
  FailureMode,
  Flow,
  Guardrail,
  Invariant,
  Outcome,
  Phase,
  ProjectBlueprint,
  ProjectFunction,
  Rule,
  ScopeItem,
  ValidationState,
} from "@/domain/models";

export const textOrFallback = (value: string, fallback = "Not specified."): string =>
  value.trim() || fallback;

export const joinBlocks = (blocks: string[]): string =>
  blocks
    .map((block) => block.trim())
    .filter(Boolean)
    .join("\n\n");

export const bulletList = <T>(items: T[], render: (item: T) => string, empty = "- None defined."): string =>
  items.length > 0 ? items.map((item) => `- ${render(item)}`).join("\n") : empty;

export const checklist = <T>(items: T[], render: (item: T) => string, empty = "- [ ] None defined."): string =>
  items.length > 0 ? items.map((item) => `- [ ] ${render(item)}`).join("\n") : empty;

export const createNameLookup = (blueprint: ProjectBlueprint): Map<string, string> =>
  new Map<string, string>([
    [blueprint.project.id, blueprint.project.name],
    [blueprint.intent.id, blueprint.intent.summary],
    ...blueprint.outcomes.map((item) => [item.id, item.name] as const),
    ...blueprint.actors.map((item) => [item.id, item.name] as const),
    ...blueprint.constraints.map((item) => [item.id, item.name] as const),
    ...blueprint.domains.map((item) => [item.id, item.name] as const),
    ...blueprint.functions.map((item) => [item.id, item.name] as const),
    ...blueprint.components.map((item) => [item.id, item.name] as const),
    ...blueprint.flows.map((item) => [item.id, item.name] as const),
    ...blueprint.dependencies.map((item) => [item.id, item.name] as const),
    ...blueprint.rules.map((item) => [item.id, item.name] as const),
    ...blueprint.invariants.map((item) => [item.id, item.name] as const),
    ...blueprint.guardrails.map((item) => [item.id, item.name] as const),
    ...blueprint.phases.map((item) => [item.id, item.name] as const),
    ...blueprint.mvpScope.items.map((item) => [item.id, item.name] as const),
    ...blueprint.expansionScope.items.map((item) => [item.id, item.name] as const),
    ...blueprint.decisionLogic.records.map((item) => [item.id, item.title] as const),
    ...blueprint.failureModes.map((item) => [item.id, item.name] as const),
  ]);

export const namesFor = (lookup: Map<string, string>, ids: string[]): string =>
  ids.length > 0 ? ids.map((id) => lookup.get(id) ?? id).join(", ") : "None";

const shortReferenceName = (id: string, lookup: Map<string, string>): string => {
  const name = lookup.get(id) ?? id;

  if (id.startsWith("outcome")) {
    if (name === "Governed scope and assumptions stay explicit") {
      return "Governance outcome";
    }

    if (name.includes(":")) {
      return "Primary outcome";
    }
  }

  return name.length > 72 ? `${name.slice(0, 69).trim()}...` : name;
};

const compactNamesFor = (lookup: Map<string, string>, ids: string[], maxItems = 6): string => {
  const names = [...new Set(ids.map((id) => shortReferenceName(id, lookup)).filter(Boolean))];
  const visible = names.slice(0, maxItems);
  const remainingCount = names.length - visible.length;

  if (visible.length === 0) {
    return "None";
  }

  return remainingCount > 0 ? `${visible.join(", ")} +${remainingCount} more` : visible.join(", ");
};

export const validationCounts = (validation: ValidationState): { pass: number; warning: number; fail: number } =>
  validation.checks.reduce(
    (counts, check) => {
      counts[check.status] += 1;
      return counts;
    },
    { pass: 0, warning: 0, fail: 0 },
  );

export const validationSummary = (validation: ValidationState): string => {
  const counts = validationCounts(validation);
  return [
    `Build-ready: ${validation.buildReady ? "Yes" : "No"}`,
    `Checks: ${counts.pass} pass / ${counts.warning} warning / ${counts.fail} fail`,
    `Last validated: ${validation.lastValidatedAt}`,
  ].join("\n");
};

export const renderOutcome = (outcome: Outcome): string =>
  `${outcome.name} (${outcome.priority}) - ${textOrFallback(outcome.description)} Success: ${textOrFallback(
    outcome.successMetric,
  )}`;

export const renderDomain = (domain: Domain, lookup: Map<string, string>): string =>
  `${domain.name} - ${textOrFallback(domain.responsibility || domain.description)} Outcomes: ${namesFor(
    lookup,
    domain.outcomeIds,
  )}`;

export const renderFunction = (fn: ProjectFunction, lookup: Map<string, string>): string =>
  `${fn.name} - ${textOrFallback(fn.description)} Domains: ${namesFor(lookup, fn.domainIds)}. Outcomes: ${namesFor(
    lookup,
    fn.outcomeIds,
  )}. Actors: ${namesFor(lookup, fn.actorIds)}.`;

export const renderComponent = (component: Component, lookup: Map<string, string>): string =>
  `${component.name} - ${textOrFallback(component.purpose || component.description)} Functions: ${namesFor(
    lookup,
    component.functionIds,
  )}. Domains: ${namesFor(lookup, component.domainIds)}.`;

export const renderFlow = (flow: Flow, lookup: Map<string, string>): string =>
  `${flow.name} - ${textOrFallback(flow.stepSummary || flow.description)} Functions: ${namesFor(
    lookup,
    flow.functionIds,
  )}. Components: ${namesFor(lookup, flow.componentIds)}.`;

export const renderRule = (rule: Rule): string =>
  `${rule.name} - ${textOrFallback(rule.description)} Enforcement: ${textOrFallback(rule.enforcement)} Scope: ${
    rule.scope
  }.`;

export const renderInvariant = (invariant: Invariant): string =>
  `${invariant.name} - ${textOrFallback(invariant.description)} Violation: ${textOrFallback(
    invariant.violationMessage,
  )}`;

export const renderGuardrail = (guardrail: Guardrail): string =>
  `${guardrail.name} - protects against ${textOrFallback(guardrail.protectedAgainst)} Scope: ${guardrail.scope}.`;

export const renderPhase = (phase: Phase, lookup: Map<string, string>): string =>
  `${phase.order}. ${phase.name} - ${textOrFallback(phase.objective || phase.description)} Functions: ${namesFor(
    lookup,
    phase.functionIds,
  )}. Components: ${namesFor(lookup, phase.componentIds)}. Exit: ${
    phase.exitCriteria.length > 0 ? phase.exitCriteria.join(", ") : "None"
  }.`;

export const renderScopeItem = (item: ScopeItem, lookup: Map<string, string>): string =>
  `${item.name} - ${textOrFallback(item.description || item.rationale)} References: ${compactNamesFor(lookup, [
    ...item.functionIds,
    ...item.componentIds,
    ...item.outcomeIds,
  ])}`;

export const renderFailureMode = (failureMode: FailureMode, lookup: Map<string, string>): string =>
  `${failureMode.name} (${failureMode.severity}) - ${textOrFallback(
    failureMode.description,
  )} Mitigation: ${textOrFallback(failureMode.mitigation)} Related: ${namesFor(
    lookup,
    failureMode.relatedEntityIds,
  )}`;

export const renderDecisionRecord = (record: DecisionRecord, lookup: Map<string, string>): string =>
  `${record.title} (${record.status}, ${record.scopeDecision}) - ${textOrFallback(record.summary)} Reason: ${
    record.reason
  }. Related: ${namesFor(lookup, record.relatedEntityIds)}`;
