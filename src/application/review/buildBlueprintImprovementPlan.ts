import type { ProjectBlueprint, ScopeItem } from "@/domain/models";
import { buildBlueprintQualityReview } from "@/application/review/buildBlueprintQualityReview";
import { describeFrameworkTemplateForBlueprint } from "@/application/templates/frameworkTemplates";

export type BlueprintImprovementFixCategory =
  | "naming"
  | "mapping"
  | "scope"
  | "template-fit"
  | "governance"
  | "export-readiness"
  | "description-quality";

export type BlueprintImprovementFixSafety = "safe" | "manual-review" | "risky";

export type BlueprintImprovementExpectedImpact = "high" | "medium" | "low";

export type BlueprintImprovementFix = {
  id: string;
  title: string;
  description: string;
  category: BlueprintImprovementFixCategory;
  safety: BlueprintImprovementFixSafety;
  relatedEntityIds: string[];
  expectedImpact: BlueprintImprovementExpectedImpact;
};

export type BlueprintImprovementPlan = {
  planSummary: string;
  safeFixes: BlueprintImprovementFix[];
  manualFixes: BlueprintImprovementFix[];
  riskyFixes: BlueprintImprovementFix[];
  estimatedImpactScore: number;
  recommendedFirstAction: BlueprintImprovementFix | null;
};

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/^(mvp|expansion):\s*/i, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const genericInvariantNamePattern = /^(new invariant|must remain true(?:\s+\d+)?)$/i;

const textPresent = (value: string | undefined): boolean => Boolean(value?.trim());

const meaningfulText = (value: string | undefined, minimumLength = 12): boolean =>
  Boolean(value?.trim() && value.trim().length >= minimumLength);

const includesExportIntent = (value: string): boolean =>
  /\b(export|codex|prompt|json|markdown|checklist|handoff|download|artifact|output|publication|draft)\b/i.test(
    value,
  );

const includesHighRiskLanguage = (blueprint: ProjectBlueprint): boolean =>
  /\b(safety|legal|medical|financial|security|privacy|risk|critical|compliance|trust)\b/i.test(
    [
      blueprint.project.rawIdea,
      blueprint.intent.problemStatement,
      blueprint.project.corePhilosophy,
      ...blueprint.failureModes.map((failureMode) => `${failureMode.name} ${failureMode.description}`),
    ].join(" "),
  );

const overlapByNormalizedName = (mvpItems: ScopeItem[], expansionItems: ScopeItem[]): ScopeItem[] => {
  const mvpNames = new Set(mvpItems.map((item) => normalize(item.name)).filter(Boolean));
  return expansionItems.filter((item) => mvpNames.has(normalize(item.name)));
};

const tokens = (value: string): string[] =>
  normalize(value)
    .split(" ")
    .filter((token) => token.length > 2);

const expectedMatchesActual = (expected: string, actualNames: string[]): boolean => {
  const expectedNormalized = normalize(expected);
  if (actualNames.some((actual) => normalize(actual) === expectedNormalized || normalize(actual).includes(expectedNormalized))) {
    return true;
  }

  const expectedTokens = tokens(expected);
  if (expectedTokens.length === 0) {
    return false;
  }

  return actualNames.some((actual) => {
    const actualTokens = new Set(tokens(actual));
    const overlap = expectedTokens.filter((token) => actualTokens.has(token)).length;
    return overlap >= Math.min(2, expectedTokens.length);
  });
};

const clearlyThin = (actualCount: number, expectedCount: number): boolean =>
  actualCount === 0 || actualCount <= Math.max(1, Math.floor(expectedCount / 2));

const impactWeight = (impact: BlueprintImprovementExpectedImpact): number => {
  switch (impact) {
    case "high":
      return 28;
    case "medium":
      return 16;
    default:
      return 8;
  }
};

const fix = (input: BlueprintImprovementFix): BlueprintImprovementFix => input;

const firstByImpact = (fixes: BlueprintImprovementFix[]): BlueprintImprovementFix | null => {
  const rank = { high: 3, medium: 2, low: 1 } satisfies Record<BlueprintImprovementExpectedImpact, number>;
  return [...fixes].sort((left, right) => rank[right.expectedImpact] - rank[left.expectedImpact])[0] ?? null;
};

const emptyDescriptionEntityIds = (blueprint: ProjectBlueprint): string[] => [
  ...blueprint.outcomes.filter((item) => !textPresent(item.description)).map((item) => item.id),
  ...blueprint.actors.filter((item) => !textPresent(item.description)).map((item) => item.id),
  ...blueprint.domains
    .filter((item) => !textPresent(item.description) || !textPresent(item.responsibility))
    .map((item) => item.id),
  ...blueprint.functions.filter((item) => !textPresent(item.description)).map((item) => item.id),
  ...blueprint.components
    .filter((item) => !textPresent(item.description) || !textPresent(item.purpose))
    .map((item) => item.id),
  ...blueprint.flows
    .filter((item) => !textPresent(item.description) || !textPresent(item.stepSummary))
    .map((item) => item.id),
  ...blueprint.rules
    .filter((item) => !textPresent(item.description) || !textPresent(item.enforcement))
    .map((item) => item.id),
  ...blueprint.invariants
    .filter((item) => !textPresent(item.description) || !textPresent(item.violationMessage))
    .map((item) => item.id),
  ...blueprint.guardrails
    .filter((item) => !textPresent(item.description) || !textPresent(item.protectedAgainst))
    .map((item) => item.id),
  ...blueprint.phases
    .filter((item) => !textPresent(item.description) || !textPresent(item.objective))
    .map((item) => item.id),
  ...blueprint.mvpScope.items
    .filter((item) => !textPresent(item.description) || !textPresent(item.rationale))
    .map((item) => item.id),
  ...blueprint.expansionScope.items
    .filter((item) => !textPresent(item.description) || !textPresent(item.rationale))
    .map((item) => item.id),
  ...blueprint.failureModes.filter((item) => !textPresent(item.description)).map((item) => item.id),
];

const exportScopeItems = (blueprint: ProjectBlueprint): ScopeItem[] =>
  [...blueprint.mvpScope.items, ...blueprint.expansionScope.items].filter((item) =>
    includesExportIntent(`${item.name} ${item.description} ${item.rationale}`),
  );

const exportItemsMissingMappings = (blueprint: ProjectBlueprint): ScopeItem[] => {
  const exportFunctionIds = new Set(
    blueprint.functions.filter((fn) => includesExportIntent(`${fn.name} ${fn.description}`)).map((fn) => fn.id),
  );
  const exportComponentIds = new Set(
    blueprint.components
      .filter((component) => includesExportIntent(`${component.name} ${component.description} ${component.purpose}`))
      .map((component) => component.id),
  );

  return exportScopeItems(blueprint).filter(
    (item) =>
      exportFunctionIds.size === 0 ||
      exportComponentIds.size === 0 ||
      !item.functionIds.some((id) => exportFunctionIds.has(id)) ||
      !item.componentIds.some((id) => exportComponentIds.has(id)),
  );
};

const repeatedMappingIssue = (items: ScopeItem[], relationKey: "functionIds" | "componentIds"): boolean => {
  if (items.length < 4) {
    return false;
  }

  const counts = new Map<string, number>();
  items.forEach((item) => {
    item[relationKey].forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
  });

  const maxCount = Math.max(0, ...counts.values());
  return maxCount / items.length >= 0.75;
};

export const buildBlueprintImprovementPlan = (blueprint: ProjectBlueprint): BlueprintImprovementPlan => {
  const review = buildBlueprintQualityReview(blueprint);
  const template = describeFrameworkTemplateForBlueprint(blueprint);
  const safeFixes: BlueprintImprovementFix[] = [];
  const manualFixes: BlueprintImprovementFix[] = [];
  const riskyFixes: BlueprintImprovementFix[] = [];

  const genericInvariants = blueprint.invariants.filter((invariant) =>
    genericInvariantNamePattern.test(invariant.name.trim()),
  );
  if (genericInvariants.length > 0) {
    safeFixes.push(
      fix({
        id: "rename-generic-invariants",
        title: "Rename generic invariants",
        description: "Replace placeholder invariant names with short names derived from their descriptions.",
        category: "naming",
        safety: "safe",
        relatedEntityIds: genericInvariants.map((invariant) => invariant.id),
        expectedImpact: "medium",
      }),
    );
  }

  const descriptionEntityIds = emptyDescriptionEntityIds(blueprint);
  if (descriptionEntityIds.length > 0) {
    safeFixes.push(
      fix({
        id: "fill-empty-descriptions",
        title: "Fill empty descriptions",
        description: `Add conservative ${template.label} context to empty descriptions and purpose fields without replacing existing text.`,
        category: "description-quality",
        safety: "safe",
        relatedEntityIds: descriptionEntityIds.slice(0, 16),
        expectedImpact: "medium",
      }),
    );
  }

  const missingMitigations = blueprint.failureModes.filter((failureMode) => !textPresent(failureMode.mitigation));
  if (missingMitigations.length > 0) {
    safeFixes.push(
      fix({
        id: "add-failure-mitigations",
        title: "Add missing failure mitigations",
        description: "Add practical mitigation text to failure modes that currently describe risk without a response.",
        category: "governance",
        safety: "safe",
        relatedEntityIds: missingMitigations.map((failureMode) => failureMode.id),
        expectedImpact: "medium",
      }),
    );
  }

  const exportItems = exportScopeItems(blueprint);
  const hasExportFunction = blueprint.functions.some((fn) => includesExportIntent(`${fn.name} ${fn.description}`));
  const hasExportComponent = blueprint.components.some((component) =>
    includesExportIntent(`${component.name} ${component.description} ${component.purpose}`),
  );
  if (exportItems.length > 0 && (!hasExportFunction || !hasExportComponent)) {
    safeFixes.push(
      fix({
        id: "add-export-surface",
        title: "Add export function and component",
        description: "Add a deterministic export function and export panel so export MVP items have an implementation home.",
        category: "export-readiness",
        safety: "safe",
        relatedEntityIds: exportItems.map((item) => item.id),
        expectedImpact: "high",
      }),
    );
  }

  const exportMappingGaps = exportItemsMissingMappings(blueprint);
  if (exportMappingGaps.length > 0) {
    safeFixes.push(
      fix({
        id: "remap-export-scope-items",
        title: "Map export scope items to export surface",
        description: "Attach export-related scope items to the export function and export component while preserving existing references.",
        category: "mapping",
        safety: "safe",
        relatedEntityIds: exportMappingGaps.map((item) => item.id),
        expectedImpact: "high",
      }),
    );
  }

  const overlappingExpansionItems = overlapByNormalizedName(blueprint.mvpScope.items, blueprint.expansionScope.items);
  if (overlappingExpansionItems.length > 0) {
    safeFixes.push(
      fix({
        id: "separate-duplicate-expansion-items",
        title: "Separate duplicate expansion items",
        description: "Rename duplicated expansion items into future-oriented names so MVP and expansion scope remain distinct.",
        category: "scope",
        safety: "safe",
        relatedEntityIds: overlappingExpansionItems.map((item) => item.id),
        expectedImpact: "high",
      }),
    );
  }

  const missingDomains = template.suggestedDomains.filter(
    (expected) => !expectedMatchesActual(expected, blueprint.domains.map((domain) => domain.name)),
  );
  const missingFunctions = template.suggestedFunctions.filter(
    (expected) => !expectedMatchesActual(expected, blueprint.functions.map((fn) => fn.name)),
  );
  const missingComponents = template.suggestedComponents.filter(
    (expected) => !expectedMatchesActual(expected, blueprint.components.map((component) => component.name)),
  );
  const canSafelyAddTemplateStructure =
    (missingDomains.length > 0 && clearlyThin(blueprint.domains.length, template.suggestedDomains.length)) ||
    (missingFunctions.length > 0 && clearlyThin(blueprint.functions.length, template.suggestedFunctions.length)) ||
    (missingComponents.length > 0 && clearlyThin(blueprint.components.length, template.suggestedComponents.length));
  if (canSafelyAddTemplateStructure) {
    safeFixes.push(
      fix({
        id: "add-template-expected-structure",
        title: "Add missing template structure",
        description: `Add missing ${template.label} domains, functions, and components only where the existing collection is thin.`,
        category: "template-fit",
        safety: "safe",
        relatedEntityIds: [blueprint.project.id],
        expectedImpact: "high",
      }),
    );
  }

  const highRiskFailures = blueprint.failureModes.filter(
    (failureMode) => failureMode.severity === "critical" || failureMode.severity === "high",
  );
  if ((highRiskFailures.length > 0 || includesHighRiskLanguage(blueprint)) && blueprint.guardrails.length === 0) {
    safeFixes.push(
      fix({
        id: "add-high-risk-guardrails",
        title: "Add high-risk guardrails",
        description: "Add guardrails for visible high-risk failure modes without changing the existing risk text.",
        category: "governance",
        safety: "safe",
        relatedEntityIds: highRiskFailures.map((failureMode) => failureMode.id),
        expectedImpact: "high",
      }),
    );
  }

  if (
    repeatedMappingIssue(blueprint.mvpScope.items, "functionIds") ||
    repeatedMappingIssue(blueprint.mvpScope.items, "componentIds") ||
    review.issues.some((issue) => issue.code === "MVP_MAPPING_TOO_REPETITIVE")
  ) {
    manualFixes.push(
      fix({
        id: "review-repetitive-mvp-mapping",
        title: "Review repetitive MVP mappings",
        description: "Several MVP items point to the same function or component. Pick the best relation for each item.",
        category: "mapping",
        safety: "manual-review",
        relatedEntityIds: blueprint.mvpScope.items.map((item) => item.id),
        expectedImpact: "medium",
      }),
    );
  }

  const vagueOutcomes = blueprint.outcomes.filter(
    (outcome) => !meaningfulText(outcome.description, 18) || !meaningfulText(outcome.successMetric, 12),
  );
  if (vagueOutcomes.length > 0) {
    manualFixes.push(
      fix({
        id: "clarify-vague-outcomes",
        title: "Clarify vague outcomes",
        description: "Outcomes need clearer descriptions or success metrics that a builder can inspect.",
        category: "description-quality",
        safety: "manual-review",
        relatedEntityIds: vagueOutcomes.map((outcome) => outcome.id),
        expectedImpact: "medium",
      }),
    );
  }

  if (
    blueprint.project.rawIdea.length > 300 &&
    blueprint.domains.length + blueprint.functions.length + blueprint.components.length < 9
  ) {
    manualFixes.push(
      fix({
        id: "expand-thin-structure-from-raw-idea",
        title: "Expand thin structure from raw idea",
        description: "The raw idea is detailed, but the blueprint needs human review to decide which extra concepts belong.",
        category: "template-fit",
        safety: "manual-review",
        relatedEntityIds: [blueprint.project.id],
        expectedImpact: "medium",
      }),
    );
  }

  if (review.templateFit.score < 75) {
    manualFixes.push(
      fix({
        id: "review-template-mismatch",
        title: "Review template fit",
        description: `The detected ${review.templateFit.templateLabel} template is missing expected concepts or may be the wrong fit.`,
        category: "template-fit",
        safety: "manual-review",
        relatedEntityIds: [blueprint.project.id],
        expectedImpact: review.templateFit.score < 45 ? "high" : "medium",
      }),
    );
  }

  if (
    blueprint.decisionLogic.records.length === 0 ||
    blueprint.decisionLogic.records.some(
      (record) => !meaningfulText(record.summary, 16) || !meaningfulText(record.reason, 12),
    )
  ) {
    manualFixes.push(
      fix({
        id: "strengthen-decision-records",
        title: "Strengthen decision records",
        description: "Decision records need human-authored reasons for why architecture choices were made.",
        category: "governance",
        safety: "manual-review",
        relatedEntityIds: blueprint.decisionLogic.records.map((record) => record.id),
        expectedImpact: "medium",
      }),
    );
  }

  if (review.templateFit.score < 75) {
    riskyFixes.push(
      fix({
        id: "replace-structure-from-template",
        title: "Replace structure from template",
        description: "Replacing user-authored structure with template defaults could erase intent, so it is not automated.",
        category: "template-fit",
        safety: "risky",
        relatedEntityIds: [blueprint.project.id],
        expectedImpact: "high",
      }),
    );
  }

  if (overlappingExpansionItems.length > 0 || blueprint.mvpScope.items.length === 0) {
    riskyFixes.push(
      fix({
        id: "rewrite-scope-boundaries",
        title: "Rewrite MVP and expansion scope",
        description: "Wholesale scope rewriting could change product commitments, so it requires user judgment.",
        category: "scope",
        safety: "risky",
        relatedEntityIds: [
          ...blueprint.mvpScope.items.map((item) => item.id),
          ...blueprint.expansionScope.items.map((item) => item.id),
        ],
        expectedImpact: "high",
      }),
    );
  }

  if (review.issues.length > 0) {
    riskyFixes.push(
      fix({
        id: "remove-unused-entities",
        title: "Remove unused entities",
        description: "Deleting entities can remove useful draft thinking, so cleanup should stay manual.",
        category: "mapping",
        safety: "risky",
        relatedEntityIds: [],
        expectedImpact: "low",
      }),
    );
  }

  if (blueprint.project.status !== "build-ready" && blueprint.validation.buildReady) {
    riskyFixes.push(
      fix({
        id: "change-project-status",
        title: "Change project status",
        description: "Project status changes affect stable truth and should not be bundled into quality cleanup.",
        category: "governance",
        safety: "risky",
        relatedEntityIds: [blueprint.project.id],
        expectedImpact: "low",
      }),
    );
  }

  const recommendedFirstAction =
    firstByImpact(safeFixes) ?? firstByImpact(manualFixes) ?? firstByImpact(riskyFixes);
  const estimatedImpactScore = Math.min(
    100,
    Math.round(
      safeFixes.reduce((sum, item) => sum + impactWeight(item.expectedImpact), 0) +
        manualFixes.reduce((sum, item) => sum + impactWeight(item.expectedImpact) * 0.5, 0),
    ),
  );
  const planSummary =
    safeFixes.length + manualFixes.length + riskyFixes.length === 0
      ? "No deterministic quality fixes are currently recommended."
      : `${safeFixes.length} safe fix${safeFixes.length === 1 ? "" : "es"}, ${manualFixes.length} manual review fix${manualFixes.length === 1 ? "" : "es"}, and ${riskyFixes.length} risky fix${riskyFixes.length === 1 ? "" : "es"} are available. Safe fixes add or clarify structure without deleting user-authored content.`;

  return {
    planSummary,
    safeFixes,
    manualFixes,
    riskyFixes,
    estimatedImpactScore,
    recommendedFirstAction,
  };
};
