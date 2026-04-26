import type { ProjectBlueprint, ScopeItem } from "@/domain/models";
import {
  describeFrameworkTemplateForBlueprint,
  type FrameworkTemplateDefinition,
  type FrameworkTemplateId,
} from "@/application/templates/frameworkTemplates";

export type BlueprintQualityGrade = "excellent" | "strong" | "needs-work" | "weak";

export type BlueprintQualityIssueType =
  | "blocker"
  | "improvement"
  | "polish"
  | "template-fit"
  | "export-readiness";

export type BlueprintQualitySectionScores = {
  intent: number;
  outcomes: number;
  actors: number;
  domains: number;
  functions: number;
  components: number;
  flows: number;
  governance: number;
  mvpScope: number;
  expansionScope: number;
  exportReadiness: number;
};

export type BlueprintQualityIssue = {
  code: string;
  type: BlueprintQualityIssueType;
  section: keyof BlueprintQualitySectionScores | "templateFit";
  title: string;
  message: string;
  recommendation: string;
  impact: "high" | "medium" | "low";
  relatedEntityIds: string[];
};

export type BlueprintTemplateFitReview = {
  templateId: FrameworkTemplateId;
  templateLabel: string;
  score: number;
  missingExpectedDomains: string[];
  missingExpectedFunctions: string[];
  missingExpectedComponents: string[];
};

export type BlueprintQualityReview = {
  overallScore: number;
  grade: BlueprintQualityGrade;
  summary: string;
  strengths: string[];
  issues: BlueprintQualityIssue[];
  nextBestFix: BlueprintQualityIssue | null;
  sectionScores: BlueprintQualitySectionScores;
  templateFit: BlueprintTemplateFitReview;
};

type IssueInput = Omit<BlueprintQualityIssue, "relatedEntityIds"> & {
  relatedEntityIds?: string[];
};

const clampScore = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const textPresent = (value: string | undefined): boolean => Boolean(value?.trim());

const meaningfulText = (value: string | undefined, minimumLength = 18): boolean =>
  Boolean(value?.trim() && value.trim().length >= minimumLength);

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/^(mvp|expansion):\s*/i, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const genericNamePatterns = [
  /^new\s+/i,
  /^must remain true(?:\s+\d+)?$/i,
  /^known guided risk(?:\s+\d+)?$/i,
  /^primary outcome$/i,
  /^new scope item$/i,
];

const genericWords = new Set([
  "a",
  "and",
  "app",
  "build",
  "core",
  "create",
  "define",
  "framework",
  "item",
  "new",
  "output",
  "prepare",
  "review",
  "system",
  "the",
  "to",
]);

const tokens = (value: string): string[] =>
  normalize(value)
    .split(" ")
    .filter((token) => token.length > 2 && !genericWords.has(token));

const includesExportIntent = (value: string): boolean =>
  /\b(export|codex|prompt|json|markdown|checklist|handoff|download|artifact)\b/i.test(value);

const isGenericName = (value: string): boolean => genericNamePatterns.some((pattern) => pattern.test(value.trim()));

const percentageWith = <T>(items: T[], predicate: (item: T) => boolean): number => {
  if (items.length === 0) {
    return 0;
  }

  return items.filter(predicate).length / items.length;
};

const issue = (input: IssueInput): BlueprintQualityIssue => ({
  relatedEntityIds: [],
  ...input,
});

const average = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const scoreEntityQuality = <T extends { description: string; name: string }>(input: {
  items: T[];
  hasRequiredRelations: (item: T) => boolean;
  getRequiredText?: (item: T) => string[];
}): number => {
  if (input.items.length === 0) {
    return 0;
  }

  const relationScore = percentageWith(input.items, input.hasRequiredRelations) * 45;
  const descriptionScore = percentageWith(input.items, (item) => meaningfulText(item.description, 12)) * 30;
  const nameScore = percentageWith(input.items, (item) => !isGenericName(item.name)) * 25;
  const requiredTextScore = input.getRequiredText
    ? percentageWith(input.items, (item) => input.getRequiredText!(item).every((value) => textPresent(value))) * 15
    : 0;

  return clampScore(relationScore + descriptionScore + nameScore + requiredTextScore);
};

const normalizedNameSet = (items: ScopeItem[]): Set<string> =>
  new Set(items.map((item) => normalize(item.name)).filter(Boolean));

const overlappingScopeItems = (mvpItems: ScopeItem[], expansionItems: ScopeItem[]): ScopeItem[] => {
  const mvpNames = normalizedNameSet(mvpItems);
  return expansionItems.filter((item) => mvpNames.has(normalize(item.name)));
};

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

const missingExpected = (expected: string[], actualNames: string[]): string[] =>
  expected.filter((item) => !expectedMatchesActual(item, actualNames));

const templateFitFor = (
  blueprint: ProjectBlueprint,
  template: FrameworkTemplateDefinition,
): BlueprintTemplateFitReview => {
  const missingExpectedDomains = missingExpected(
    template.suggestedDomains,
    blueprint.domains.map((item) => item.name),
  );
  const missingExpectedFunctions = missingExpected(
    template.suggestedFunctions,
    blueprint.functions.map((item) => item.name),
  );
  const missingExpectedComponents = missingExpected(
    template.suggestedComponents,
    blueprint.components.map((item) => item.name),
  );
  const domainScore = template.suggestedDomains.length
    ? ((template.suggestedDomains.length - missingExpectedDomains.length) / template.suggestedDomains.length) * 100
    : 100;
  const functionScore = template.suggestedFunctions.length
    ? ((template.suggestedFunctions.length - missingExpectedFunctions.length) / template.suggestedFunctions.length) * 100
    : 100;
  const componentScore = template.suggestedComponents.length
    ? ((template.suggestedComponents.length - missingExpectedComponents.length) / template.suggestedComponents.length) * 100
    : 100;

  return {
    templateId: template.id,
    templateLabel: template.label,
    score: clampScore(average([domainScore, functionScore, componentScore])),
    missingExpectedDomains,
    missingExpectedFunctions,
    missingExpectedComponents,
  };
};

const gradeForScore = (score: number): BlueprintQualityGrade => {
  if (score >= 85) return "excellent";
  if (score >= 70) return "strong";
  if (score >= 45) return "needs-work";
  return "weak";
};

const impactRank = (impact: BlueprintQualityIssue["impact"]): number => {
  switch (impact) {
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
};

const typeRank = (type: BlueprintQualityIssueType): number => {
  switch (type) {
    case "blocker":
      return 5;
    case "export-readiness":
      return 4;
    case "template-fit":
      return 3;
    case "improvement":
      return 2;
    default:
      return 1;
  }
};

const selectNextBestFix = (issues: BlueprintQualityIssue[]): BlueprintQualityIssue | null =>
  [...issues].sort((left, right) => {
    const impactDelta = impactRank(right.impact) - impactRank(left.impact);
    if (impactDelta !== 0) return impactDelta;

    return typeRank(right.type) - typeRank(left.type);
  })[0] ?? null;

const strongestSections = (sectionScores: BlueprintQualitySectionScores): string[] =>
  Object.entries(sectionScores)
    .filter(([, score]) => score >= 80)
    .map(([section]) => section);

const exportItemsNeedExportSurface = (blueprint: ProjectBlueprint): boolean => {
  const exportScopeItems = [...blueprint.mvpScope.items, ...blueprint.expansionScope.items].filter((item) =>
    includesExportIntent(item.name),
  );
  if (exportScopeItems.length === 0) {
    return false;
  }

  const hasExportFunction = blueprint.functions.some((fn) => includesExportIntent(fn.name));
  const hasExportComponent = blueprint.components.some((component) => includesExportIntent(component.name));

  return !hasExportFunction || !hasExportComponent;
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

export const buildBlueprintQualityReview = (blueprint: ProjectBlueprint): BlueprintQualityReview => {
  const issues: BlueprintQualityIssue[] = [];
  const template = describeFrameworkTemplateForBlueprint(blueprint);
  const templateFit = templateFitFor(blueprint, template);
  const validationFailures = blueprint.validation.checks.filter((check) => check.status === "fail");

  const intentScore = clampScore(
    (meaningfulText(blueprint.intent.summary, 24) ? 25 : 0) +
      (meaningfulText(blueprint.intent.problemStatement, 32) ? 25 : 0) +
      (meaningfulText(blueprint.intent.targetAudience, 8) ? 20 : 0) +
      (meaningfulText(blueprint.intent.valueHypothesis, 32) ? 20 : 0) +
      (meaningfulText(blueprint.project.rawIdea, 40) ? 10 : 0),
  );
  const outcomeScore = clampScore(
    blueprint.outcomes.length > 0
      ? percentageWith(blueprint.outcomes, (outcome) => meaningfulText(outcome.successMetric, 12)) * 45 +
          percentageWith(blueprint.outcomes, (outcome) => meaningfulText(outcome.description, 12)) * 30 +
          percentageWith(blueprint.outcomes, (outcome) => outcome.actorIds.length > 0) * 15 +
          percentageWith(blueprint.outcomes, (outcome) => !isGenericName(outcome.name)) * 10
      : 0,
  );
  const actorScore = clampScore(
    blueprint.actors.length > 0
      ? percentageWith(blueprint.actors, (actor) => actor.needs.length > 0) * 55 +
          percentageWith(blueprint.actors, (actor) => meaningfulText(actor.role || actor.description, 8)) * 30 +
          percentageWith(blueprint.actors, (actor) => !isGenericName(actor.name)) * 15
      : 0,
  );
  const domainScore = scoreEntityQuality({
    items: blueprint.domains,
    hasRequiredRelations: (domain) => domain.outcomeIds.length > 0,
    getRequiredText: (domain) => [domain.responsibility],
  });
  const functionScore = scoreEntityQuality({
    items: blueprint.functions,
    hasRequiredRelations: (fn) => fn.outcomeIds.length > 0 && fn.domainIds.length > 0,
  });
  const componentScore = scoreEntityQuality({
    items: blueprint.components,
    hasRequiredRelations: (component) => component.functionIds.length > 0 && component.domainIds.length > 0,
    getRequiredText: (component) => [component.purpose],
  });
  const flowScore = clampScore(
    blueprint.flows.length > 0
      ? percentageWith(
          blueprint.flows,
          (flow) => flow.actorIds.length > 0 && flow.functionIds.length > 0 && flow.componentIds.length > 0,
        ) *
          60 +
          percentageWith(blueprint.flows, (flow) => meaningfulText(flow.stepSummary || flow.description, 16)) * 30 +
          percentageWith(blueprint.flows, (flow) => !isGenericName(flow.name)) * 10
      : 0,
  );
  const governanceNames = [...blueprint.rules, ...blueprint.invariants, ...blueprint.guardrails].map((item) => item.name);
  const clearGovernanceNames = governanceNames.filter((name) => !isGenericName(name)).length;
  const governanceScore = clampScore(
    (blueprint.rules.length > 0 ? 15 : 0) +
      (blueprint.invariants.length > 0 ? 15 : 0) +
      (blueprint.guardrails.length > 0 ? 15 : 0) +
      (governanceNames.length > 0 ? (clearGovernanceNames / governanceNames.length) * 25 : 0) +
      (blueprint.failureModes.length > 0
        ? percentageWith(blueprint.failureModes, (failureMode) => meaningfulText(failureMode.mitigation, 16)) * 15
        : 0) +
      (blueprint.decisionLogic.records.length > 0
        ? percentageWith(blueprint.decisionLogic.records, (record) => meaningfulText(record.reason, 12)) * 15
        : 0),
  );
  const mvpScore = clampScore(
    (meaningfulText(blueprint.mvpScope.summary, 16) ? 20 : 0) +
      (meaningfulText(blueprint.mvpScope.successDefinition, 24) ? 25 : 0) +
      (blueprint.mvpScope.items.length > 0 ? 20 : 0) +
      percentageWith(
        blueprint.mvpScope.items,
        (item) =>
          meaningfulText(item.description || item.rationale, 10) &&
          (item.outcomeIds.length > 0 || item.functionIds.length > 0 || item.componentIds.length > 0),
      ) *
        35,
  );
  const overlap = overlappingScopeItems(blueprint.mvpScope.items, blueprint.expansionScope.items);
  const expansionScore = clampScore(
    (meaningfulText(blueprint.expansionScope.summary, 16) ? 25 : 0) +
      (blueprint.expansionScope.items.length > 0 ? 25 : 0) +
      (blueprint.expansionScope.futureSignals.length > 0 ? 20 : 0) +
      (overlap.length === 0 ? 30 : 0),
  );
  const exportMissingSurface = exportItemsNeedExportSurface(blueprint);
  const exportReadinessScore = clampScore(
    (blueprint.validation.buildReady ? 25 : 0) +
      (blueprint.mvpScope.items.length > 0 ? 15 : 0) +
      (blueprint.functions.length > 0 ? 15 : 0) +
      (blueprint.components.length > 0 ? 15 : 0) +
      (blueprint.rules.length > 0 ? 10 : 0) +
      (blueprint.invariants.length > 0 ? 10 : 0) +
      (!exportMissingSurface ? 10 : 0),
  );

  const sectionScores: BlueprintQualitySectionScores = {
    intent: intentScore,
    outcomes: outcomeScore,
    actors: actorScore,
    domains: domainScore,
    functions: functionScore,
    components: componentScore,
    flows: flowScore,
    governance: governanceScore,
    mvpScope: mvpScore,
    expansionScope: expansionScore,
    exportReadiness: exportReadinessScore,
  };

  if (validationFailures.length > 0) {
    issues.push(
      issue({
        code: "VALIDATION_FAILURES",
        type: "blocker",
        section: "exportReadiness",
        title: "Validation blockers remain",
        message: `${validationFailures.length} validation failure${validationFailures.length === 1 ? "" : "s"} must be resolved before the blueprint is useful for implementation.`,
        recommendation: "Fix critical validation failures before optimizing blueprint quality.",
        impact: "high",
        relatedEntityIds: validationFailures.flatMap((check) => check.relatedEntityIds).slice(0, 8),
      }),
    );
  }

  if (intentScore < 65) {
    issues.push(
      issue({
        code: "INTENT_TOO_VAGUE",
        type: "improvement",
        section: "intent",
        title: "Intent needs more specificity",
        message: "The intent, problem, audience, or value hypothesis is still too thin to guide implementation.",
        recommendation: "Clarify the target user, concrete problem, and practical outcome before editing structure.",
        impact: "high",
        relatedEntityIds: [blueprint.intent.id],
      }),
    );
  }

  if (blueprint.outcomes.some((outcome) => !textPresent(outcome.successMetric))) {
    issues.push(
      issue({
        code: "OUTCOME_SUCCESS_METRICS_MISSING",
        type: "improvement",
        section: "outcomes",
        title: "Outcomes need success metrics",
        message: "One or more outcomes lack a measurable or inspectable success metric.",
        recommendation: "Add success metrics that tell a builder when the blueprint has achieved the outcome.",
        impact: "medium",
        relatedEntityIds: blueprint.outcomes.filter((outcome) => !textPresent(outcome.successMetric)).map((outcome) => outcome.id),
      }),
    );
  }

  if (blueprint.functions.some((fn) => fn.outcomeIds.length === 0 || fn.domainIds.length === 0)) {
    issues.push(
      issue({
        code: "FUNCTION_MAPPING_WEAK",
        type: "improvement",
        section: "functions",
        title: "Functions need stronger mappings",
        message: "Every function should map to at least one outcome and one domain.",
        recommendation: "Use the relation selectors to connect each function to its owning domain and intended outcome.",
        impact: "high",
        relatedEntityIds: blueprint.functions
          .filter((fn) => fn.outcomeIds.length === 0 || fn.domainIds.length === 0)
          .map((fn) => fn.id),
      }),
    );
  }

  if (blueprint.components.some((component) => component.functionIds.length === 0 || component.domainIds.length === 0)) {
    issues.push(
      issue({
        code: "COMPONENT_MAPPING_WEAK",
        type: "improvement",
        section: "components",
        title: "Components need stronger mappings",
        message: "Every component should map to at least one function and one domain.",
        recommendation: "Connect each component to the function it performs and the domain it belongs to.",
        impact: "high",
        relatedEntityIds: blueprint.components
          .filter((component) => component.functionIds.length === 0 || component.domainIds.length === 0)
          .map((component) => component.id),
      }),
    );
  }

  const genericGovernance = [...blueprint.rules, ...blueprint.invariants, ...blueprint.guardrails].filter((item) =>
    isGenericName(item.name),
  );
  if (genericGovernance.length > 0) {
    issues.push(
      issue({
        code: "GENERIC_GOVERNANCE_NAMES",
        type: "polish",
        section: "governance",
        title: "Governance names are too generic",
        message: "Rules, invariants, or guardrails still use placeholder-style names.",
        recommendation: "Rename governance items after the actual promise they protect.",
        impact: "medium",
        relatedEntityIds: genericGovernance.map((item) => item.id),
      }),
    );
  }

  if (overlap.length > 0) {
    issues.push(
      issue({
        code: "MVP_EXPANSION_OVERLAP",
        type: "blocker",
        section: "expansionScope",
        title: "MVP and expansion overlap",
        message: "Expansion scope repeats one or more MVP items.",
        recommendation: "Move duplicated items into only one scope so the first build boundary stays clear.",
        impact: "high",
        relatedEntityIds: overlap.map((item) => item.id),
      }),
    );
  }

  if (
    repeatedMappingIssue(blueprint.mvpScope.items, "functionIds") ||
    repeatedMappingIssue(blueprint.mvpScope.items, "componentIds")
  ) {
    issues.push(
      issue({
        code: "MVP_MAPPING_TOO_REPETITIVE",
        type: "improvement",
        section: "mvpScope",
        title: "MVP mappings are too repetitive",
        message: "Most MVP items point to the same function or component, which makes implementation ownership unclear.",
        recommendation: "Map MVP items to the most relevant function and component instead of one generic target.",
        impact: "medium",
        relatedEntityIds: blueprint.mvpScope.items.map((item) => item.id),
      }),
    );
  }

  if (exportMissingSurface) {
    issues.push(
      issue({
        code: "EXPORT_SURFACE_MISSING",
        type: "export-readiness",
        section: "exportReadiness",
        title: "Export items need an export function and component",
        message: "The scope mentions export output, but the blueprint does not include a clear export function and component.",
        recommendation: "Add or map export items to an export/output function and export panel/surface component.",
        impact: "high",
      }),
    );
  }

  if (
    blueprint.failureModes.some((failureMode) => failureMode.severity === "high") &&
    blueprint.guardrails.length === 0
  ) {
    issues.push(
      issue({
        code: "HIGH_RISK_WITHOUT_GUARDRAILS",
        type: "improvement",
        section: "governance",
        title: "High-risk blueprint needs guardrails",
        message: "High-severity failure modes exist without guardrails to protect the implementation.",
        recommendation: "Add guardrails that explicitly prevent the highest-risk failure modes.",
        impact: "high",
        relatedEntityIds: blueprint.failureModes.filter((failureMode) => failureMode.severity === "high").map((failureMode) => failureMode.id),
      }),
    );
  }

  if (
    blueprint.project.rawIdea.length > 300 &&
    blueprint.domains.length + blueprint.functions.length + blueprint.components.length < 9
  ) {
    issues.push(
      issue({
        code: "LONG_IDEA_THIN_STRUCTURE",
        type: "improvement",
        section: "domains",
        title: "Long raw idea has thin structure",
        message: "The raw idea is detailed, but the blueprint has too few structural entities to carry that detail.",
        recommendation: "Use template completion or add domains, functions, and components that reflect the raw idea.",
        impact: "medium",
        relatedEntityIds: [blueprint.project.id],
      }),
    );
  }

  if (templateFit.score < 75) {
    issues.push(
      issue({
        code: "TEMPLATE_FIT_WEAK",
        type: "template-fit",
        section: "templateFit",
        title: "Template fit is incomplete",
        message: `${template.label} expects more matching domains, functions, or components.`,
        recommendation: "Add missing template concepts or choose a better matching framework template.",
        impact: templateFit.score < 45 ? "high" : "medium",
      }),
    );
  }

  const strengths = strongestSections(sectionScores).map((section) => {
    switch (section) {
      case "intent":
        return "Intent is specific enough to guide implementation.";
      case "functions":
        return "Functions are connected to domains and outcomes.";
      case "components":
        return "Components have clear function/domain mappings.";
      case "governance":
        return "Governance is visible through rules, invariants, guardrails, risks, and decisions.";
      case "mvpScope":
        return "MVP scope is concrete and mapped to implementation structure.";
      case "exportReadiness":
        return "The blueprint is ready to support implementation exports.";
      default:
        return `${section} is in good shape.`;
    }
  });
  if (templateFit.score >= 85) {
    strengths.push(`Template fit is strong for ${template.label}.`);
  }

  const sectionAverage = average(Object.values(sectionScores));
  const overallScore = clampScore(sectionAverage * 0.8 + templateFit.score * 0.2);
  const grade = gradeForScore(overallScore);
  const nextBestFix = selectNextBestFix(issues);
  const improvementNoun = issues.length === 1 ? "improvement remains" : "improvements remain";
  const summary =
    issues.length === 0
      ? `Quality review is ${grade}; the blueprint is specific, connected, and ready to use.`
      : `Quality review score is ${grade}; ${issues.length} ${improvementNoun} beyond structural validation.`;

  return {
    overallScore,
    grade,
    summary,
    strengths,
    issues,
    nextBestFix,
    sectionScores,
    templateFit,
  };
};
