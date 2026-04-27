import type { ProjectBlueprint } from "@/domain/models";
import { buildImplementationPlan } from "@/application/planning/buildImplementationPlan";
import { buildBlueprintForesight } from "@/application/review/buildBlueprintForesight";
import { buildBlueprintImprovementPlan } from "@/application/review/buildBlueprintImprovementPlan";
import { buildBlueprintQualityReview } from "@/application/review/buildBlueprintQualityReview";
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
  const qualityReview = buildBlueprintQualityReview(blueprint);
  const improvementPlan = buildBlueprintImprovementPlan(blueprint);
  const foresight = buildBlueprintForesight(blueprint);
  const implementationPlan = buildImplementationPlan(blueprint);
  const qualityWarnings = qualityReview.issues.filter(
    (issue) => issue.impact === "high" || issue.type === "export-readiness" || issue.type === "template-fit",
  );
  const unresolvedQualityFixes = [...improvementPlan.manualFixes, ...improvementPlan.riskyFixes].filter(
    (fix) => fix.expectedImpact !== "low" || fix.safety === "manual-review",
  );
  const futureWork = [
    ...foresight.next,
    ...foresight.later,
    ...foresight.hiddenOpportunities,
  ].slice(0, 6);

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
    implementationPlan.codexTaskPack[0]
      ? joinBlocks([
          "## Recommended First Implementation Task",
          implementationPlan.codexTaskPack[0].prompt,
        ])
      : "",
    futureWork.length > 0 || foresight.notYet.length > 0
      ? joinBlocks([
          "## Recommended Future Work / Do Not Build Yet",
          futureWork.length > 0
            ? `Future work to consider after the MVP is stable:\n${bulletList(
                futureWork,
                (item) => `${item.title}: ${item.description}`,
              )}`
            : "",
          foresight.notYet.length > 0
            ? `Do not build yet:\n${bulletList(
                foresight.notYet.slice(0, 5),
                (item) => `${item.title}: ${item.whyNowOrLater}`,
              )}`
            : "",
        ])
      : "",
    qualityWarnings.length > 0
      ? joinBlocks([
          "## Quality Warnings",
          `Quality score: ${qualityReview.overallScore}/100 (${qualityReview.grade})`,
          bulletList(
            qualityWarnings.slice(0, 5),
            (issue) => `${issue.title}: ${issue.recommendation}`,
          ),
        ])
      : "",
    unresolvedQualityFixes.length > 0
      ? joinBlocks([
          "## Manual Quality Warnings",
          "These quality improvements require human judgment and should not be bypassed silently:",
          bulletList(
            unresolvedQualityFixes.slice(0, 5),
            (fix) => `${fix.title}: ${fix.description}`,
          ),
        ])
      : "",
    "Do not bypass governance constraints, stable validation expectations, explicit scope separation, or any rule/invariant/guardrail listed above.",
  ])}\n`;
};
