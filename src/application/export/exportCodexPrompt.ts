import type { ProjectBlueprint } from "@/domain/models";
import { describeFrameworkTemplateForBlueprint } from "@/application/templates/frameworkTemplates";
import {
  bulletList,
  createNameLookup,
  joinBlocks,
  renderComponent,
  renderDomain,
  renderFunction,
  renderGuardrail,
  renderInvariant,
  renderRule,
  renderScopeItem,
  textOrFallback,
  validationSummary,
} from "@/application/export/exportHelpers";

export const exportCodexPrompt = (blueprint: ProjectBlueprint): string => {
  const lookup = createNameLookup(blueprint);
  const template = describeFrameworkTemplateForBlueprint(blueprint);

  return `${joinBlocks([
    `# Codex Implementation Prompt: ${blueprint.project.name}`,
    `Implement ${blueprint.project.name}.`,
    joinBlocks([
      "## Objective",
      `Build the MVP described by this governed ProjectBlueprint. Preserve the architecture, scope boundaries, and validation expectations while turning the blueprint into working implementation artifacts.`,
      `Framework template: ${template.label} - ${template.description}`,
      `Template emphasis: ${template.promptGuidance}`,
      `Raw idea: ${blueprint.project.rawIdea}`,
      `Intent: ${blueprint.intent.summary}`,
      `Problem: ${textOrFallback(blueprint.intent.problemStatement)}`,
      `Target user: ${textOrFallback(blueprint.intent.targetAudience)}`,
    ]),
    `## Build These Domains\n${bulletList(blueprint.domains, (domain) => renderDomain(domain, lookup))}`,
    `## Implement These Functions\n${bulletList(blueprint.functions, (fn) => renderFunction(fn, lookup))}`,
    `## Build These Components\n${bulletList(blueprint.components, (component) => renderComponent(component, lookup))}`,
    joinBlocks([
      "## MVP Scope (Build Now)",
      `Summary: ${textOrFallback(blueprint.mvpScope.summary)}`,
      `Success definition: ${textOrFallback(blueprint.mvpScope.successDefinition)}`,
      bulletList(blueprint.mvpScope.items, (item) => renderScopeItem(item, lookup)),
    ]),
    joinBlocks([
      "## Expansion Scope (Do Not Build Now)",
      `Expansion summary: ${textOrFallback(blueprint.expansionScope.summary)}`,
      bulletList(blueprint.expansionScope.items, (item) => renderScopeItem(item, lookup)),
    ]),
    joinBlocks([
      "## Do Not Modify / Do Not Break",
      "Rules:",
      bulletList(blueprint.rules, renderRule),
      "Invariants:",
      bulletList(blueprint.invariants, renderInvariant),
      "Guardrails:",
      bulletList(blueprint.guardrails, renderGuardrail),
    ]),
    joinBlocks([
      "## Validation Gate",
      validationSummary(blueprint.validation),
      "Do not mark the implementation complete until critical validation blockers are resolved and the governed structure remains connected.",
    ]),
    "Do not bypass governance constraints, stable validation expectations, explicit scope separation, or any rule/invariant/guardrail listed above.",
  ])}\n`;
};
