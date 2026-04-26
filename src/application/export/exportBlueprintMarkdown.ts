import type { ProjectBlueprint } from "@/domain/models";
import {
  bulletList,
  createNameLookup,
  joinBlocks,
  renderComponent,
  renderDecisionRecord,
  renderDomain,
  renderFailureMode,
  renderFlow,
  renderFunction,
  renderGuardrail,
  renderInvariant,
  renderOutcome,
  renderPhase,
  renderRule,
  renderScopeItem,
  textOrFallback,
  validationSummary,
} from "@/application/export/exportHelpers";

export const exportBlueprintMarkdown = (blueprint: ProjectBlueprint): string => {
  const lookup = createNameLookup(blueprint);

  return `${joinBlocks([
    `# ${blueprint.project.name}`,
    joinBlocks([
      "## Project",
      `Raw idea: ${blueprint.project.rawIdea}`,
      `Core philosophy: ${textOrFallback(blueprint.project.corePhilosophy)}`,
    ]),
    joinBlocks([
      "## Intent",
      `Summary: ${blueprint.intent.summary}`,
      `Problem statement: ${textOrFallback(blueprint.intent.problemStatement)}`,
      `Target audience: ${textOrFallback(blueprint.intent.targetAudience)}`,
      `Value hypothesis: ${textOrFallback(blueprint.intent.valueHypothesis)}`,
    ]),
    `## Outcomes\n${bulletList(blueprint.outcomes, renderOutcome)}`,
    `## Actors\n${bulletList(
      blueprint.actors,
      (actor) => `${actor.name} - ${textOrFallback(actor.role || actor.description)} Needs: ${actor.needs.join(", ") || "None"}`,
    )}`,
    `## Domains\n${bulletList(blueprint.domains, (domain) => renderDomain(domain, lookup))}`,
    `## Functions\n${bulletList(blueprint.functions, (fn) => renderFunction(fn, lookup))}`,
    `## Components\n${bulletList(blueprint.components, (component) => renderComponent(component, lookup))}`,
    `## Flows\n${bulletList(blueprint.flows, (flow) => renderFlow(flow, lookup))}`,
    `## Rules\n${bulletList(blueprint.rules, renderRule)}`,
    `## Invariants\n${bulletList(blueprint.invariants, renderInvariant)}`,
    `## Guardrails\n${bulletList(blueprint.guardrails, renderGuardrail)}`,
    `## Phases\n${bulletList(blueprint.phases, (phase) => renderPhase(phase, lookup))}`,
    joinBlocks([
      "## MVP Scope",
      `Summary: ${textOrFallback(blueprint.mvpScope.summary)}`,
      `Success definition: ${textOrFallback(blueprint.mvpScope.successDefinition)}`,
      bulletList(blueprint.mvpScope.items, (item) => renderScopeItem(item, lookup)),
    ]),
    joinBlocks([
      "## Expansion Scope",
      `Summary: ${textOrFallback(blueprint.expansionScope.summary)}`,
      `Future signals: ${blueprint.expansionScope.futureSignals.join(", ") || "None"}`,
      bulletList(blueprint.expansionScope.items, (item) => renderScopeItem(item, lookup)),
    ]),
    `## Failure Modes\n${bulletList(blueprint.failureModes, (failureMode) => renderFailureMode(failureMode, lookup))}`,
    `## Decision Records\n${bulletList(blueprint.decisionLogic.records, (record) =>
      renderDecisionRecord(record, lookup),
    )}`,
    `## Validation Summary\n${validationSummary(blueprint.validation)}`,
  ])}\n`;
};
