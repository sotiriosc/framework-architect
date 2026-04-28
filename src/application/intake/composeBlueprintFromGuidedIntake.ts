import {
  getFrameworkTemplate,
  inferFrameworkTemplateId,
  type FrameworkTemplateDefinition,
  type FrameworkTemplateId,
} from "@/application/templates/frameworkTemplates";
import {
  cleanOutcomeText,
  cleanProblemText,
  cleanRawIdeaText,
  cleanTargetUserText,
  filterContextProse,
  isActionableMvpItem,
  isExpansionItem,
  toReadableTitleFragment,
} from "@/application/intake/intakeTextFilters";
import {
  createActor,
  createComponent,
  createConstraint,
  createDecisionLogic,
  createDecisionRecord,
  createDependency,
  createDomain,
  createEmptyBlueprint,
  createFailureMode,
  createFlow,
  createGuardrail,
  createIntent,
  createInvariant,
  createOutcome,
  createPhase,
  createProject,
  createProjectFunction,
  createRule,
  createScopeItem,
} from "@/domain/defaults";
import type {
  Component,
  Domain,
  Guardrail,
  Phase,
  ProjectBlueprint,
  ProjectFunction,
  Rule,
  ScopeItem,
} from "@/domain/models";
import { ProjectBlueprintSchema } from "@/schema";
import { validateBlueprint } from "@/application/validation/validateBlueprint";

export type GuidedIntakeInput = {
  rawIdea: string;
  projectName: string;
  frameworkType: string;
  frameworkTemplateId?: FrameworkTemplateId;
  targetUser: string;
  problem: string;
  intendedOutcome: string;
  corePrinciples: string[];
  mustRemainTrue: string[];
  mvpBoundary: string[];
  expansionIdeas: string[];
  knownRisks: string[];
};

type NormalizedGuidedIntake = GuidedIntakeInput & {
  corePrinciples: string[];
  mustRemainTrue: string[];
  mvpBoundary: string[];
  expansionIdeas: string[];
  knownRisks: string[];
};

const requireText = (value: string, fieldName: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} is required for guided blueprint creation.`);
  }

  return trimmed;
};

const textOr = (value: string, fallback: string): string => value.trim() || fallback;

const uniqueList = (items: string[], fallback: string[]): string[] => {
  const seen = new Set<string>();
  const normalized = items
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });

  return normalized.length > 0 ? normalized : fallback;
};

const selectFrameworkTemplate = (input: GuidedIntakeInput): FrameworkTemplateDefinition => {
  if (input.frameworkTemplateId) {
    return getFrameworkTemplate(input.frameworkTemplateId);
  }

  return getFrameworkTemplate(
    inferFrameworkTemplateId(
      [
        input.frameworkType,
        input.projectName,
        input.rawIdea,
        input.targetUser,
        input.problem,
        input.intendedOutcome,
      ].join(" "),
    ),
  );
};

const normalizeInput = (
  input: GuidedIntakeInput,
  template: FrameworkTemplateDefinition,
): NormalizedGuidedIntake => {
  const projectName = requireText(input.projectName, "Project name");
  const rawIdea = cleanRawIdeaText(requireText(input.rawIdea, "Raw idea"));
  const frameworkType = textOr(input.frameworkType, template.label);
  const targetUser = textOr(cleanTargetUserText(input.targetUser), "Primary user");
  const problem = textOr(cleanProblemText(input.problem), "The problem space needs explicit structure before implementation");
  const intendedOutcome = textOr(cleanOutcomeText(input.intendedOutcome), "A clear and buildable path forward");
  const corePrinciples = uniqueList(input.corePrinciples, [
    "Make assumptions explicit",
    "Validate structure before build-ready claims",
    "Keep scope decisions inspectable",
  ]);
  const mustRemainTrue = uniqueList(input.mustRemainTrue, [
    ...template.suggestedInvariants,
    "The blueprint remains governed by explicit rules, invariants, and scope boundaries.",
  ]);
  const templateInvariants = template.suggestedInvariants.filter(
    (invariant) => !mustRemainTrue.some((item) => item.toLowerCase() === invariant.toLowerCase()),
  );
  const mvpBoundary = uniqueList(
    input.mvpBoundary.filter(isActionableMvpItem),
    template.suggestedMvpItems,
  );
  const expansionIdeas = uniqueList(
    input.expansionIdeas.filter(isExpansionItem),
    template.suggestedExpansionItems,
  );
  const knownRisks = uniqueList(filterContextProse(input.knownRisks), template.suggestedFailureModes);

  return {
    rawIdea,
    projectName,
    frameworkType,
    targetUser,
    problem,
    intendedOutcome,
    corePrinciples,
    mustRemainTrue: uniqueList([...mustRemainTrue, ...templateInvariants], mustRemainTrue).slice(0, 8),
    mvpBoundary,
    expansionIdeas,
    knownRisks,
  };
};

const joinList = (items: string[]): string => items.join("; ");

const createMappedScopeItem = (input: {
  name: string;
  description: string;
  outcomeIds: string[];
  functionIds: string[];
  componentIds: string[];
  rationale: string;
}): ScopeItem => {
  const scopeItem = createScopeItem(input.name);
  scopeItem.description = input.description;
  scopeItem.outcomeIds = input.outcomeIds;
  scopeItem.functionIds = input.functionIds;
  scopeItem.componentIds = input.componentIds;
  scopeItem.rationale = input.rationale;
  return scopeItem;
};

const createDistinctExpansionName = (idea: string, mvpNames: Set<string>): string => {
  const baseName = `Expansion: ${idea}`;
  if (!mvpNames.has(baseName.trim().toLowerCase())) {
    return baseName;
  }

  return `${baseName} later`;
};

const mapAllIds = <T extends { id: string }>(items: T[]): string[] => items.map((item) => item.id);

const includesAny = (value: string, terms: string[]): boolean => {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term));
};

const isExportRelated = (value: string): boolean =>
  includesAny(value, [
    "codex",
    "download",
    "export",
    "handoff",
    "implementation artifact",
    "json",
    "markdown",
    "mvp checklist",
    "prompt",
  ]);

const isCaptureRelated = (value: string): boolean =>
  includesAny(value, ["capture", "clarify", "feature idea", "guided intake", "input", "intake", "raw feature", "raw idea", "start condition", "trigger"]);

const isReadinessRelated = (value: string): boolean =>
  includesAny(value, ["checks", "governance", "missing structure", "quality", "readiness", "risk", "safety", "validate", "validation"]);

const isStructureRelated = (value: string): boolean =>
  includesAny(value, ["blueprint", "compose", "connected framework", "generate", "structure"]);

type ScopeReferenceMapping = {
  outcomeIds: string[];
  functionIds: string[];
  componentIds: string[];
  rationale: string;
};

const mapMvpScopeReferences = (
  item: string,
  targets: {
    primaryOutcomeId: string;
    governanceOutcomeId: string;
    clarifyFunction: ProjectFunction;
    buildFunction: ProjectFunction;
    readinessFunction: ProjectFunction;
    intakeComponent: Component;
    blueprintComponent: Component;
    readinessComponent: Component;
    exportFunction?: ProjectFunction;
    exportComponent?: Component;
  },
): ScopeReferenceMapping => {
  if (isExportRelated(item) && targets.exportFunction && targets.exportComponent) {
    return {
      outcomeIds: [targets.primaryOutcomeId, targets.governanceOutcomeId],
      functionIds: [targets.exportFunction.id],
      componentIds: [targets.exportComponent.id],
      rationale: "This MVP item produces implementation artifacts through the export surface.",
    };
  }

  if (isReadinessRelated(item)) {
    return {
      outcomeIds: [targets.governanceOutcomeId, targets.primaryOutcomeId],
      functionIds: [targets.readinessFunction.id],
      componentIds: [targets.readinessComponent.id],
      rationale: "This MVP item depends on readiness review and visible governance.",
    };
  }

  if (isCaptureRelated(item)) {
    return {
      outcomeIds: [targets.primaryOutcomeId, targets.governanceOutcomeId],
      functionIds: [targets.clarifyFunction.id],
      componentIds: [targets.intakeComponent.id],
      rationale: "This MVP item starts with clarifying the raw idea and intake assumptions.",
    };
  }

  if (isStructureRelated(item)) {
    return {
      outcomeIds: [targets.primaryOutcomeId],
      functionIds: [targets.buildFunction.id],
      componentIds: [targets.blueprintComponent.id],
      rationale: "This MVP item depends on composing the connected governed framework.",
    };
  }

  return {
    outcomeIds: [targets.primaryOutcomeId],
    functionIds: [targets.buildFunction.id],
    componentIds: [targets.blueprintComponent.id],
    rationale: "The guided intake identified this as part of the MVP boundary.",
  };
};

const mapExpansionScopeReferences = (
  item: string,
  targets: {
    governanceOutcomeId: string;
    readinessFunction: ProjectFunction;
    readinessComponent: Component;
    exportFunction?: ProjectFunction;
    exportComponent?: Component;
  },
): ScopeReferenceMapping => {
  if (isExportRelated(item) && targets.exportFunction && targets.exportComponent) {
    return {
      outcomeIds: [targets.governanceOutcomeId],
      functionIds: [targets.exportFunction.id],
      componentIds: [targets.exportComponent.id],
      rationale: "The guided intake marked this output idea as expansion, not first-build scope.",
    };
  }

  return {
    outcomeIds: [targets.governanceOutcomeId],
    functionIds: [targets.readinessFunction.id],
    componentIds: [targets.readinessComponent.id],
    rationale: "The guided intake marked this as expansion, not first-build scope.",
  };
};

const INVARIANT_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "be",
  "by",
  "can",
  "cannot",
  "do",
  "each",
  "every",
  "existing",
  "generated",
  "is",
  "must",
  "not",
  "of",
  "or",
  "prompts",
  "remain",
  "remains",
  "should",
  "the",
  "to",
  "true",
  "weaken",
  "with",
]);

const RISK_STOP_WORDS = new Set([
  ...INVARIANT_STOP_WORDS,
  "accidentally",
  "as",
  "become",
  "becomes",
  "being",
  "can",
  "could",
  "from",
  "get",
  "if",
  "in",
  "first",
  "may",
  "might",
  "more",
  "than",
  "too",
  "were",
  "when",
]);

const titleWord = (word: string): string => {
  const normalized = word.toLowerCase();
  if (normalized === "ai") return "AI";
  if (normalized === "api") return "API";
  if (normalized === "json") return "JSON";
  if (normalized === "mvp") return "MVP";
  if (normalized === "ui") return "UI";

  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
};

const significantInvariantWords = (statement: string): string[] =>
  statement
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .filter((word) => !INVARIANT_STOP_WORDS.has(word.toLowerCase()));

const titleFromWords = (words: string[]): string => words.map(titleWord).join(" ");

const riskNameFromText = (risk: string, index: number): string => {
  const words = risk
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .filter((word) => !RISK_STOP_WORDS.has(word.toLowerCase()))
    .slice(0, 5);

  return words.length > 0 ? titleFromWords(words) : `Guided Risk ${index + 1}`;
};

const lowerFirst = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return `${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
};

const outcomeActionPhrase = (value: string): string => {
  const trimmed = cleanOutcomeText(value);
  if (/^(add|build|capture|clarify|create|define|deliver|distill|export|generate|help|implement|import|improve|inspect|make|map|move|paste|prepare|produce|reduce|review|ship|store|support|turn|validate)\b/i.test(trimmed)) {
    return lowerFirst(trimmed);
  }

  return `reach ${lowerFirst(trimmed)}`;
};

const outcomeLabel = (projectName: string, intendedOutcome: string): string =>
  `${projectName}: ${toReadableTitleFragment(intendedOutcome)}`;

const deriveInvariantName = (statement: string): string => {
  const normalized = statement.toLowerCase();

  if (normalized.includes("mvp") && normalized.includes("expansion") && normalized.includes("separate")) {
    return "Separate MVP and Expansion";
  }

  if (normalized.includes("component") && normalized.includes("function") && normalized.includes("map")) {
    return "Components Map to Functions";
  }

  if (normalized.includes("function") && normalized.includes("outcome") && normalized.includes("map")) {
    return "Functions Map to Outcomes";
  }

  if (normalized.includes("program generation logic") && normalized.includes("weaken")) {
    return "Preserve Program Generation Logic";
  }

  if (normalized.includes("progression") && normalized.includes("phase gating") && normalized.includes("bypass")) {
    return "Respect Progression and Phase Gating";
  }

  if (normalized.includes("program logic") && (normalized.includes("weaken") || normalized.includes("preserve"))) {
    return `Preserve ${titleFromWords(significantInvariantWords(statement).slice(0, 3))}`;
  }

  const significantWords = significantInvariantWords(statement);
  if (significantWords.length > 0) {
    return titleFromWords(significantWords.slice(0, 5));
  }

  return "Guided Invariant";
};

const uniqueGeneratedName = (baseName: string, usedNames: Set<string>): string => {
  const cleanName = baseName.trim() || "Guided Invariant";
  let candidate = cleanName;
  let suffix = 2;

  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${cleanName} ${suffix}`;
    suffix += 1;
  }

  usedNames.add(candidate.toLowerCase());
  return candidate;
};

const uniqueTemplateNames = (items: string[], fallback: string[]): string[] => uniqueList(items, fallback);

const matchByKeywords = <T extends { name: string }>(
  items: T[],
  keywords: string[],
  fallbackIndex: number,
): T => {
  const matched = items.find((item) => includesAny(item.name, keywords));
  const fallback = items[Math.min(Math.max(fallbackIndex, 0), items.length - 1)] ?? items[0];

  if (!fallback) {
    throw new Error("Guided template generation expected a populated collection.");
  }

  return matched ?? fallback;
};

const domainKeywordsFor = (name: string): string[] => {
  if (isExportRelated(name) || includesAny(name, ["delivery", "publication", "handoff"])) {
    return ["export", "output", "delivery", "publication", "handoff"];
  }

  if (isReadinessRelated(name) || includesAny(name, ["quality", "risk", "safety", "checks"])) {
    return ["validation", "quality", "risk", "safety", "governance", "checks"];
  }

  if (includesAny(name, ["pricing", "revenue"])) {
    return ["revenue", "pricing"];
  }

  if (includesAny(name, ["operations"])) {
    return ["operations"];
  }

  if (includesAny(name, ["data", "persistence"])) {
    return ["data", "persistence"];
  }

  if (includesAny(name, ["user", "client", "customer", "audience", "reader"])) {
    return ["user", "client", "customer", "audience"];
  }

  if (isCaptureRelated(name) || includesAny(name, ["intent", "goal", "offer", "message", "thesis", "trigger"])) {
    return ["intent", "goal", "offer", "message", "thesis", "trigger", "intake"];
  }

  return name.split(/\s+/).filter(Boolean);
};

const selectDomainFor = (name: string, domains: Domain[], fallbackIndex: number): Domain =>
  matchByKeywords(domains, domainKeywordsFor(name), fallbackIndex);

const createTemplateDomains = (input: {
  template: FrameworkTemplateDefinition;
  frameworkType: string;
  primaryOutcomeId: string;
  governanceOutcomeId: string;
}): Domain[] =>
  uniqueTemplateNames(input.template.suggestedDomains, ["Intent and Context", "Core Framework", "Governance"])
    .map((name, index) => {
      const domain = createDomain();
      domain.name = name;
      domain.description = `${input.template.label} domain for ${input.frameworkType}.`;
      domain.responsibility =
        index === 0
          ? "Preserve the source intent and primary decision context."
          : `Own ${name.toLowerCase()} decisions and keep them connected to outcomes.`;
      domain.outcomeIds =
        isReadinessRelated(name) || isExportRelated(name) || includesAny(name, ["risk", "quality", "safety"])
          ? [input.governanceOutcomeId, input.primaryOutcomeId]
          : [input.primaryOutcomeId, input.governanceOutcomeId];
      return domain;
    });

const createTemplateFunctions = (input: {
  template: FrameworkTemplateDefinition;
  frameworkType: string;
  targetUser: string;
  domains: Domain[];
  primaryOutcomeId: string;
  governanceOutcomeId: string;
  primaryActorId: string;
  builderActorId: string;
  needsExport: boolean;
}): ProjectFunction[] => {
  const names = uniqueTemplateNames(
    [
      ...input.template.suggestedFunctions,
      ...(input.needsExport && !input.template.suggestedFunctions.some(isExportRelated)
        ? ["Export implementation artifacts"]
        : []),
    ],
    ["Clarify intake assumptions", "Compose governed framework blueprint", "Review readiness and governance"],
  );

  return names.map((name, index) => {
    const fn = createProjectFunction();
    const domain = selectDomainFor(name, input.domains, index);
    fn.name = name;
    fn.description = `${name} for ${input.targetUser}, shaped by the ${input.template.label.toLowerCase()} template.`;
    fn.domainIds = [domain.id];
    fn.outcomeIds = [input.primaryOutcomeId, input.governanceOutcomeId];
    fn.actorIds = isReadinessRelated(name) || isExportRelated(name)
      ? [input.builderActorId, input.primaryActorId]
      : [input.primaryActorId, input.builderActorId];
    fn.inputs = ["Guided intake", input.frameworkType, input.template.label];
    fn.outputs = [name, "Connected blueprint structure"];
    return fn;
  });
};

const functionKeywordsFor = (name: string): string[] => {
  if (includesAny(name, ["customer"])) {
    return ["customer"];
  }

  if (includesAny(name, ["delivery"])) {
    return ["delivery"];
  }

  if (includesAny(name, ["operations"])) {
    return ["operations"];
  }

  if (includesAny(name, ["revenue", "pricing"])) {
    return ["revenue", "pricing"];
  }

  if (includesAny(name, ["risk", "bottleneck"])) {
    return ["risk", "bottleneck"];
  }

  if (includesAny(name, ["audience"])) {
    return ["audience"];
  }

  if (includesAny(name, ["pillar"])) {
    return ["pillar", "content"];
  }

  if (includesAny(name, ["distribution", "posting", "asset"])) {
    return ["distribution", "posting", "asset"];
  }

  if (includesAny(name, ["conversion"])) {
    return ["conversion", "preserve"];
  }

  if (includesAny(name, ["proof", "trust"])) {
    return ["proof", "trust", "truth"];
  }

  if (includesAny(name, ["argument"])) {
    return ["argument", "structure"];
  }

  if (includesAny(name, ["evidence"])) {
    return ["evidence", "supporting"];
  }

  if (includesAny(name, ["section"])) {
    return ["section"];
  }

  if (includesAny(name, ["input"])) {
    return ["input", "start", "condition"];
  }

  if (includesAny(name, ["step"])) {
    return ["step"];
  }

  if (includesAny(name, ["role"])) {
    return ["role"];
  }

  if (includesAny(name, ["quality", "check"])) {
    return ["check"];
  }

  if (includesAny(name, ["output", "done"])) {
    return ["output", "completed"];
  }

  if (isExportRelated(name) || includesAny(name, ["publication", "handoff"])) {
    return ["export", "prompt", "handoff", "output", "publication", "draft"];
  }

  if (isReadinessRelated(name) || includesAny(name, ["risk", "safety", "quality", "checks"])) {
    return ["validate", "readiness", "risk", "safety", "quality", "checks", "assess"];
  }

  if (isCaptureRelated(name) || includesAny(name, ["goal", "offer", "customer", "message", "thesis", "trigger"])) {
    return ["capture", "clarify", "define", "identify", "goal", "offer", "message", "thesis", "trigger"];
  }

  if (isStructureRelated(name) || includesAny(name, ["model", "map", "design", "components", "pillars", "argument"])) {
    return ["model", "map", "design", "compose", "define", "structure", "components", "pillars", "argument"];
  }

  return name.split(/\s+/).filter(Boolean);
};

const selectFunctionFor = (name: string, functions: ProjectFunction[], fallbackIndex: number): ProjectFunction =>
  matchByKeywords(functions, functionKeywordsFor(name), fallbackIndex);

const createTemplateComponents = (input: {
  template: FrameworkTemplateDefinition;
  domains: Domain[];
  functions: ProjectFunction[];
  needsExport: boolean;
}): Component[] => {
  const names = uniqueTemplateNames(
    [
      ...input.template.suggestedComponents,
      ...(input.needsExport && !input.template.suggestedComponents.some(isExportRelated)
        ? ["Export Panel"]
        : []),
    ],
    ["Guided Intake Workspace", "Blueprint Composer", "Readiness Review Surface"],
  );

  return names.map((name, index) => {
    const component = createComponent();
    const fn = selectFunctionFor(name, input.functions, index);
    const domain = selectDomainFor(name, input.domains, index);
    component.name = name;
    component.description = `${name} supports the ${input.template.label.toLowerCase()} workflow.`;
    component.purpose = `Support ${fn.name.toLowerCase()} with inspectable ${domain.name.toLowerCase()} decisions.`;
    component.domainIds = [domain.id];
    component.functionIds = [fn.id];
    component.inputs = ["Guided blueprint state"];
    component.outputs = [name];
    return component;
  });
};

const createLinearDependencies = (components: Component[]) =>
  components.slice(0, -1).map((component, index) => {
    const target = components[index + 1];
    if (!target) {
      throw new Error("Guided template dependency generation expected a target component.");
    }

    const dependency = createDependency();
    dependency.name = `${component.name} feeds ${target.name}`;
    dependency.description = `${target.name} depends on output from ${component.name}.`;
    dependency.kind = "internal";
    dependency.sourceEntityId = component.id;
    dependency.targetEntityId = target.id;
    target.dependencyIds = [...target.dependencyIds, dependency.id];
    return dependency;
  });

const createTemplateRules = (template: FrameworkTemplateDefinition): Rule[] =>
  uniqueTemplateNames(
    [
      ...template.suggestedRules,
      "Assumptions stay explicit",
      "MVP and expansion remain separate",
      "Build-ready requires connected structure",
    ],
    template.suggestedRules,
  ).map((name) => {
    const rule = createRule();
    rule.name = name;
    rule.description = `${template.label} rule: ${name}.`;
    rule.scope = "global";
    rule.enforcement = "Review stable saves and validation state before accepting changes.";
    rule.policy.reviewSeverity = "warning";
    rule.policy.blocksBuildReady = includesAny(name, ["mvp", "expansion", "build-ready", "validation"]);
    rule.policy.reviewMessage = `${name} must remain visible before stable save.`;
    rule.policy.recommendation = "Review generated structure, scope, and governance before implementation.";
    rule.policy.rationale = `${template.label} templates rely on explicit, governed decisions.`;
    return rule;
  });

const createTemplateGuardrails = (input: {
  template: FrameworkTemplateDefinition;
  projectId: string;
}): Guardrail[] =>
  uniqueTemplateNames(
    [...input.template.suggestedGuardrails, "Protect MVP boundary", "Keep known risks visible"],
    input.template.suggestedGuardrails,
  ).map((name, index) => {
    const guardrail = createGuardrail();
    guardrail.name = name;
    guardrail.description = `${input.template.label} guardrail: ${name}.`;
    guardrail.protectedAgainst = name;
    guardrail.scope = index === 0 ? "project" : "global";
    guardrail.scopeEntityIds = index === 0 ? [input.projectId] : [];
    return guardrail;
  });

const createTemplatePhases = (input: {
  template: FrameworkTemplateDefinition;
  frameworkType: string;
  functions: ProjectFunction[];
  components: Component[];
}): Phase[] => {
  const phaseNames = uniqueTemplateNames(input.template.suggestedPhases, ["Foundation", "Structure", "Review"]);
  const phaseCount = phaseNames.length;

  return phaseNames.map((name, index) => {
    const phase = createPhase();
    const functionIds = input.functions
      .filter((_, functionIndex) => functionIndex % phaseCount === index)
      .map((fn) => fn.id);
    const componentIds = input.components
      .filter((_, componentIndex) => componentIndex % phaseCount === index)
      .map((component) => component.id);

    phase.name = name;
    phase.description = `${input.template.label} phase for ${input.frameworkType}.`;
    phase.order = index + 1;
    phase.objective = `Complete ${name.toLowerCase()} decisions with explicit validation and scope.`;
    phase.functionIds = functionIds.length > 0 ? functionIds : input.functions[0] ? [input.functions[0].id] : [];
    phase.componentIds =
      componentIds.length > 0 ? componentIds : input.components[0] ? [input.components[0].id] : [];
    phase.exitCriteria = [
      `${name} is explicit`,
      "Referenced functions and components are connected",
      "No critical validation failures remain",
    ];
    return phase;
  });
};

export const composeBlueprintFromGuidedIntake = (input: GuidedIntakeInput): ProjectBlueprint => {
  const template = selectFrameworkTemplate(input);
  const guided = normalizeInput(input, template);
  const hasExportMvpItems = guided.mvpBoundary.some(isExportRelated);

  const project = createProject({
    name: guided.projectName,
    rawIdea: guided.rawIdea,
    corePhilosophy: `Framework template: ${template.label}. ${guided.frameworkType} decisions should keep assumptions, constraints, rules, and scope explicit.`,
  });
  project.status = "validated";
  project.invariantPriorities = uniqueList(
    [...guided.corePrinciples, ...guided.mustRemainTrue],
    guided.corePrinciples,
  ).slice(0, 8);

  const intent = createIntent(`Create a ${guided.frameworkType} for ${guided.targetUser}.`);
  intent.problemStatement = guided.problem;
  intent.targetAudience = guided.targetUser;
  const intendedOutcomeAction = outcomeActionPhrase(guided.intendedOutcome);
  intent.valueHypothesis = `If ${guided.targetUser} can work from a governed blueprint, they can ${intendedOutcomeAction} with fewer hidden assumptions.`;

  const primaryActor = createActor();
  primaryActor.name = guided.targetUser;
  primaryActor.description = `The person or group the ${guided.frameworkType} is designed to help.`;
  primaryActor.role = "Primary user";
  primaryActor.needs = [
    guided.intendedOutcome,
    "Clear MVP boundaries",
    "Explicit constraints, rules, and risks",
  ];

  const builderActor = createActor();
  builderActor.name = "Framework builder";
  builderActor.description = "Turns the governed blueprint into a working implementation.";
  builderActor.role = "Delivery";
  builderActor.needs = [
    "Connected outcomes, functions, and components",
    "Visible validation readiness",
    "Traceable decision records",
  ];

  const primaryOutcome = createOutcome(outcomeLabel(guided.projectName, guided.intendedOutcome));
  primaryOutcome.description = `The ${guided.frameworkType} solves: ${guided.problem}`;
  primaryOutcome.successMetric = `${guided.targetUser} can ${intendedOutcomeAction} through the MVP workflow.`;
  primaryOutcome.actorIds = [primaryActor.id];

  const governanceOutcome = createOutcome("Governed scope and assumptions stay explicit");
  governanceOutcome.description =
    "Assumptions, constraints, rules, invariants, and scope boundaries are visible before implementation.";
  governanceOutcome.successMetric = "Validation is build-ready and MVP scope is distinct from expansion scope.";
  governanceOutcome.priority = "medium";
  governanceOutcome.actorIds = [primaryActor.id, builderActor.id];

  const contextConstraint = createConstraint();
  contextConstraint.name = "Problem context remains visible";
  contextConstraint.description = guided.problem;
  contextConstraint.kind = "business";
  contextConstraint.severity = "high";
  contextConstraint.value = guided.problem;
  contextConstraint.hardConstraint = true;

  const mvpConstraint = createConstraint();
  mvpConstraint.name = "MVP boundary is explicit";
  mvpConstraint.description = `MVP includes: ${joinList(guided.mvpBoundary)}.`;
  mvpConstraint.kind = "scope";
  mvpConstraint.severity = "high";
  mvpConstraint.value = joinList(guided.mvpBoundary);
  mvpConstraint.hardConstraint = true;

  const riskConstraint = createConstraint();
  riskConstraint.name = "Known risks require review";
  riskConstraint.description = `Known risks: ${joinList(guided.knownRisks)}.`;
  riskConstraint.kind = "operational";
  riskConstraint.severity = "medium";
  riskConstraint.value = joinList(guided.knownRisks);
  riskConstraint.hardConstraint = false;

  const domains = createTemplateDomains({
    template,
    frameworkType: guided.frameworkType,
    primaryOutcomeId: primaryOutcome.id,
    governanceOutcomeId: governanceOutcome.id,
  });
  const functions = createTemplateFunctions({
    template,
    frameworkType: guided.frameworkType,
    targetUser: guided.targetUser,
    domains,
    primaryOutcomeId: primaryOutcome.id,
    governanceOutcomeId: governanceOutcome.id,
    primaryActorId: primaryActor.id,
    builderActorId: builderActor.id,
    needsExport: hasExportMvpItems,
  });
  const components = createTemplateComponents({
    template,
    domains,
    functions,
    needsExport: hasExportMvpItems,
  });
  const dependencies = createLinearDependencies(components);

  const clarifyFunction = matchByKeywords(
    functions,
    ["capture", "clarify", "define", "identify", "goal", "intent", "offer", "message", "thesis", "trigger"],
    0,
  );
  const buildFunction = matchByKeywords(
    functions,
    [
      "compose",
      "model",
      "workflow",
      "structure",
      "boundary",
      "map",
      "design",
      "components",
      "pillars",
      "argument",
      "steps",
    ],
    Math.min(1, functions.length - 1),
  );
  const readinessFunction = matchByKeywords(
    functions,
    ["validate", "readiness", "safety", "risk", "quality", "checks", "assess", "bottlenecks"],
    Math.min(2, functions.length - 1),
  );
  const exportFunction = matchByKeywords(
    functions,
    ["export", "prompt", "handoff", "output", "publication", "draft"],
    functions.length - 1,
  );

  const intakeComponent = matchByKeywords(
    components,
    ["intake", "goal", "feature", "customer", "client", "message", "thesis", "trigger"],
    0,
  );
  const blueprintComponent = matchByKeywords(
    components,
    ["composer", "modeler", "planner", "logic", "boundary", "workflow", "delivery", "program", "pillars", "argument", "steps"],
    Math.min(1, components.length - 1),
  );
  const readinessComponent = matchByKeywords(
    components,
    ["validation", "readiness", "review", "safety", "risk", "quality", "assessment", "checks"],
    Math.min(2, components.length - 1),
  );
  const exportComponent = matchByKeywords(
    components,
    ["export", "prompt", "handoff", "output", "publication", "draft"],
    components.length - 1,
  );

  const guidedFlow = createFlow();
  guidedFlow.name = "Idea to governed blueprint";
  guidedFlow.description = `Transforms guided intake into a validated ${template.label.toLowerCase()} blueprint.`;
  guidedFlow.stepSummary =
    hasExportMvpItems
      ? `Capture guided intake, shape ${template.label.toLowerCase()} structure, validate readiness, and export implementation artifacts.`
      : `Capture guided intake, shape ${template.label.toLowerCase()} structure, validate readiness, and preserve decisions.`;
  guidedFlow.actorIds = [primaryActor.id, builderActor.id];
  guidedFlow.functionIds = mapAllIds(functions);
  guidedFlow.componentIds = mapAllIds(components);

  const rules = createTemplateRules(template);

  const invariantNames = new Set<string>();
  const invariants = guided.mustRemainTrue.slice(0, 8).map((statement, index) => {
    const invariant = createInvariant();
    invariant.name = uniqueGeneratedName(deriveInvariantName(statement), invariantNames);
    invariant.description = statement;
    invariant.scope = "global";
    invariant.priority = index === 0 ? "critical" : "high";
    invariant.violationMessage = `This must remain true: ${statement}`;
    invariant.policy.reviewSeverity = "warning";
    invariant.policy.blocksBuildReady = true;
    invariant.policy.reviewMessage = invariant.violationMessage;
    invariant.policy.recommendation = "Review this invariant before accepting a stable blueprint change.";
    invariant.policy.rationale = "The guided intake marked this as a non-negotiable project truth.";
    return invariant;
  });

  const guardrails = createTemplateGuardrails({ template, projectId: project.id });
  const riskGuardrail = matchByKeywords(guardrails, ["risk", "safety", "hidden", "assumption"], guardrails.length - 1);
  const coreGuardrailIds = guardrails.slice(0, 3).map((guardrail) => guardrail.id);
  components.forEach((component) => {
    component.invariantIds = mapAllIds(invariants);
    component.guardrailIds = coreGuardrailIds;
  });

  const phases = createTemplatePhases({
    template,
    frameworkType: guided.frameworkType,
    functions,
    components,
  });

  const mvpItems = guided.mvpBoundary.map((item) => {
    const mapping = mapMvpScopeReferences(item, {
      primaryOutcomeId: primaryOutcome.id,
      governanceOutcomeId: governanceOutcome.id,
      clarifyFunction,
      buildFunction,
      readinessFunction,
      intakeComponent,
      blueprintComponent,
      readinessComponent,
      exportFunction,
      exportComponent,
    });

    return createMappedScopeItem({
      name: `MVP: ${item}`,
      description: "First-build scope item from guided intake.",
      outcomeIds: mapping.outcomeIds,
      functionIds: mapping.functionIds,
      componentIds: mapping.componentIds,
      rationale: mapping.rationale,
    });
  });
  const mvpNames = new Set(mvpItems.map((item) => item.name.trim().toLowerCase()));
  const expansionItems = guided.expansionIdeas.map((item) => {
    const mapping = mapExpansionScopeReferences(item, {
      governanceOutcomeId: governanceOutcome.id,
      readinessFunction,
      readinessComponent,
      exportFunction,
      exportComponent,
    });

    return createMappedScopeItem({
      name: createDistinctExpansionName(item, mvpNames),
      description: "Future option after the MVP is governed and validated.",
      outcomeIds: mapping.outcomeIds,
      functionIds: mapping.functionIds,
      componentIds: mapping.componentIds,
      rationale: mapping.rationale,
    });
  });

  const failureModes = guided.knownRisks.map((risk, index) => {
    const failureMode = createFailureMode();
    failureMode.name = riskNameFromText(risk, index);
    failureMode.description = risk;
    failureMode.severity = index === 0 ? "high" : "medium";
    failureMode.mitigation = "Review this risk during readiness checks and adjust scope or guardrails if needed.";
    failureMode.relatedEntityIds = [readinessFunction.id, readinessComponent.id, riskGuardrail.id];
    return failureMode;
  });

  const guidedDecision = createDecisionRecord();
  guidedDecision.title = "Compose blueprint from guided intake";
  guidedDecision.summary = "The first project state is generated from structured intake fields.";
  guidedDecision.reason =
    "Guided creation gives the user a populated governed blueprint while preserving review and validation.";
  guidedDecision.status = "accepted";
  guidedDecision.relatedEntityIds = [
    project.id,
    intent.id,
    primaryOutcome.id,
    governanceOutcome.id,
    intakeComponent.id,
    blueprintComponent.id,
  ];
  guidedDecision.rejectedOptions = ["Start with a blank editor-only blueprint", "Skip validation during creation"];
  guidedDecision.scopeDecision = "architecture";

  const scopeDecision = createDecisionRecord();
  scopeDecision.title = "Separate MVP from expansion";
  scopeDecision.summary = "MVP boundary and expansion ideas are stored as distinct scope collections.";
  scopeDecision.reason = "Separating the first build from future ideas prevents scope drift.";
  scopeDecision.status = "accepted";
  scopeDecision.relatedEntityIds = [project.id, ...mapAllIds(mvpItems), ...mapAllIds(expansionItems)];
  scopeDecision.rejectedOptions = ["Merge MVP and expansion into one backlog"];
  scopeDecision.scopeDecision = "mvp";

  const riskDecision = createDecisionRecord();
  riskDecision.title = "Track known risks as failure modes";
  riskDecision.summary = "Known risks from intake become explicit failure modes.";
  riskDecision.reason = "Risk visibility helps the user review the generated blueprint before implementation.";
  riskDecision.status = "proposed";
  riskDecision.relatedEntityIds = [riskGuardrail.id, ...mapAllIds(failureModes)];
  riskDecision.rejectedOptions = ["Leave risks only in raw notes"];
  riskDecision.scopeDecision = "governance";

  const decisionLogic = createDecisionLogic();
  decisionLogic.principles = uniqueList(
    [
      ...guided.corePrinciples,
      "Make assumptions, constraints, rules, and scope visible",
      "Use validation before implementation planning",
    ],
    guided.corePrinciples,
  );
  decisionLogic.openQuestions = [
    `Which part of ${guided.frameworkType} should be validated with users first?`,
    ...guided.knownRisks.map((risk) => `How should the team reduce this risk: ${risk}?`),
  ];
  decisionLogic.records = [guidedDecision, scopeDecision, riskDecision];

  const blueprint = createEmptyBlueprint(project, intent, primaryOutcome);
  blueprint.outcomes = [primaryOutcome, governanceOutcome];
  blueprint.actors = [primaryActor, builderActor];
  blueprint.constraints = [contextConstraint, mvpConstraint, riskConstraint];
  blueprint.domains = domains;
  blueprint.functions = functions;
  blueprint.components = components;
  blueprint.flows = [guidedFlow];
  blueprint.dependencies = dependencies;
  blueprint.rules = rules;
  blueprint.invariants = invariants;
  blueprint.decisionLogic = decisionLogic;
  blueprint.failureModes = failureModes;
  blueprint.guardrails = guardrails;
  blueprint.phases = phases;
  blueprint.mvpScope.summary = `First build: ${joinList(guided.mvpBoundary)}.`;
  blueprint.mvpScope.successDefinition = `The MVP helps ${guided.targetUser} ${intendedOutcomeAction} with explicit governance.`;
  blueprint.mvpScope.items = mvpItems;
  blueprint.expansionScope.summary = `Future options after the MVP is validated: ${joinList(guided.expansionIdeas)}.`;
  blueprint.expansionScope.futureSignals = [
    "MVP validation remains build-ready",
    "Users ask for capabilities beyond the initial boundary",
    ...guided.expansionIdeas.map((idea) => `Demand for ${idea}`),
  ];
  blueprint.expansionScope.items = expansionItems;
  blueprint.validation = validateBlueprint(blueprint);

  return ProjectBlueprintSchema.parse(blueprint);
};
