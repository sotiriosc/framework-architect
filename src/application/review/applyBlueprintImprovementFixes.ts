import { validateBlueprint } from "@/application/validation/validateBlueprint";
import {
  describeFrameworkTemplateForBlueprint,
  type FrameworkTemplateDefinition,
} from "@/application/templates/frameworkTemplates";
import {
  createComponent,
  createDomain,
  createGuardrail,
  createProjectFunction,
} from "@/domain/defaults";
import type {
  Component,
  Domain,
  Guardrail,
  ProjectBlueprint,
  ProjectFunction,
  ScopeItem,
} from "@/domain/models";
import { nowIso } from "@/lib/identity";
import { ProjectBlueprintSchema } from "@/schema";
import {
  buildBlueprintImprovementPlan,
  type BlueprintImprovementFix,
} from "@/application/review/buildBlueprintImprovementPlan";

const cloneBlueprint = (blueprint: ProjectBlueprint): ProjectBlueprint => structuredClone(blueprint);

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/^(mvp|expansion):\s*/i, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const genericInvariantNamePattern = /^(new invariant|must remain true(?:\s+\d+)?)$/i;

const includesExportIntent = (value: string): boolean =>
  /\b(export|codex|prompt|json|markdown|checklist|handoff|download|artifact|output|publication|draft)\b/i.test(
    value,
  );

const includesAny = (value: string, terms: string[]): boolean => {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term));
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

const touch = (entity: { updatedAt: string }): void => {
  entity.updatedAt = nowIso();
};

const textPresent = (value: string | undefined): boolean => Boolean(value?.trim());

const appendUnique = (current: string[], additions: string[]): string[] => {
  const existing = new Set(current);
  const next = [...current];

  additions.forEach((addition) => {
    if (addition && !existing.has(addition)) {
      existing.add(addition);
      next.push(addition);
    }
  });

  return next;
};

const titleCaseWord = (word: string): string => {
  const normalized = word.toLowerCase();
  if (normalized === "ai") return "AI";
  if (normalized === "api") return "API";
  if (normalized === "json") return "JSON";
  if (normalized === "mvp") return "MVP";
  if (normalized === "ui") return "UI";

  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
};

const invariantStopWords = new Set([
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
  "remain",
  "remains",
  "should",
  "the",
  "to",
  "true",
  "weaken",
  "with",
]);

const titleFromText = (value: string): string => {
  const significantWords = value
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .filter((word) => !invariantStopWords.has(word.toLowerCase()));

  return significantWords.slice(0, 5).map(titleCaseWord).join(" ");
};

const deriveInvariantName = (text: string): string => {
  const normalized = text.toLowerCase();

  if (normalized.includes("mvp") && normalized.includes("expansion") && normalized.includes("separate")) {
    return "Separate MVP and Expansion";
  }

  if (normalized.includes("component") && normalized.includes("function") && normalized.includes("map")) {
    return "Components Map to Functions";
  }

  if (normalized.includes("function") && normalized.includes("outcome") && normalized.includes("map")) {
    return "Functions Map to Outcomes";
  }

  if (normalized.includes("praxis") && normalized.includes("program logic")) {
    return "Preserve Praxis Program Logic";
  }

  if (normalized.includes("program generation logic")) {
    return "Preserve Program Generation Logic";
  }

  if (normalized.includes("progression") && normalized.includes("phase gating")) {
    return "Respect Progression and Phase Gating";
  }

  return titleFromText(text) || "Guided Invariant";
};

const uniqueName = (baseName: string, usedNames: Set<string>): string => {
  const cleanName = baseName.trim() || "Guided Item";
  let candidate = cleanName;
  let suffix = 2;

  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${cleanName} ${suffix}`;
    suffix += 1;
  }

  usedNames.add(candidate.toLowerCase());
  return candidate;
};

const exportScopeItems = (blueprint: ProjectBlueprint): ScopeItem[] =>
  [...blueprint.mvpScope.items, ...blueprint.expansionScope.items].filter((item) =>
    includesExportIntent(`${item.name} ${item.description} ${item.rationale}`),
  );

const findExportFunction = (blueprint: ProjectBlueprint): ProjectFunction | undefined =>
  blueprint.functions.find((fn) => includesExportIntent(`${fn.name} ${fn.description}`));

const findExportComponent = (blueprint: ProjectBlueprint): Component | undefined =>
  blueprint.components.find((component) =>
    includesExportIntent(`${component.name} ${component.description} ${component.purpose}`),
  );

const selectOutputDomain = (blueprint: ProjectBlueprint): Domain | undefined =>
  blueprint.domains.find((domain) =>
    includesExportIntent(`${domain.name} ${domain.description} ${domain.responsibility}`),
  ) ??
  blueprint.domains.find((domain) => includesAny(domain.name, ["delivery", "handoff", "publication"])) ??
  blueprint.domains[0];

const ensureOutputDomain = (blueprint: ProjectBlueprint): Domain | undefined => {
  const existing = selectOutputDomain(blueprint);
  if (existing) {
    return existing;
  }

  if (blueprint.outcomes.length === 0) {
    return undefined;
  }

  const domain = createDomain();
  domain.name = "Implementation Output";
  domain.description = "Owns export and implementation handoff decisions for the blueprint.";
  domain.responsibility = "Keep implementation artifacts connected to blueprint outcomes.";
  domain.outcomeIds = blueprint.outcomes.slice(0, 2).map((outcome) => outcome.id);
  blueprint.domains.push(domain);
  return domain;
};

const ensureExportSurface = (blueprint: ProjectBlueprint): {
  exportFunction: ProjectFunction | undefined;
  exportComponent: Component | undefined;
} => {
  const outputDomain = ensureOutputDomain(blueprint);
  let exportFunction = findExportFunction(blueprint);

  if (!exportFunction) {
    exportFunction = createProjectFunction();
    exportFunction.name = "Export implementation artifacts";
    exportFunction.description = "Prepare Markdown, Codex prompt, JSON, and MVP checklist outputs from the governed blueprint.";
    exportFunction.domainIds = outputDomain ? [outputDomain.id] : [];
    exportFunction.outcomeIds = blueprint.outcomes.slice(0, 2).map((outcome) => outcome.id);
    exportFunction.actorIds = blueprint.actors.slice(0, 2).map((actor) => actor.id);
    exportFunction.inputs = ["Validated blueprint"];
    exportFunction.outputs = ["Markdown brief", "Codex prompt", "JSON blueprint", "MVP checklist"];
    blueprint.functions.push(exportFunction);
  } else {
    if (outputDomain && exportFunction.domainIds.length === 0) {
      exportFunction.domainIds = [outputDomain.id];
      touch(exportFunction);
    }
    if (exportFunction.outcomeIds.length === 0) {
      exportFunction.outcomeIds = blueprint.outcomes.slice(0, 2).map((outcome) => outcome.id);
      touch(exportFunction);
    }
  }

  let exportComponent = findExportComponent(blueprint);

  if (!exportComponent) {
    exportComponent = createComponent();
    exportComponent.name = "Export Panel";
    exportComponent.description = "Downloads implementation-ready exports from the current blueprint.";
    exportComponent.purpose = "Make governed blueprint outputs usable outside Framework Architect.";
    exportComponent.domainIds = outputDomain ? [outputDomain.id] : [];
    exportComponent.functionIds = exportFunction ? [exportFunction.id] : [];
    exportComponent.inputs = ["Validated blueprint"];
    exportComponent.outputs = ["Markdown brief", "Codex prompt", "JSON blueprint", "MVP checklist"];
    blueprint.components.push(exportComponent);
  } else {
    if (outputDomain && exportComponent.domainIds.length === 0) {
      exportComponent.domainIds = [outputDomain.id];
      touch(exportComponent);
    }
    if (exportFunction && !exportComponent.functionIds.includes(exportFunction.id)) {
      exportComponent.functionIds = appendUnique(exportComponent.functionIds, [exportFunction.id]);
      touch(exportComponent);
    }
  }

  return { exportFunction, exportComponent };
};

const domainKeywordsFor = (name: string): string[] => {
  if (includesExportIntent(name) || includesAny(name, ["delivery", "publication", "handoff"])) {
    return ["export", "output", "delivery", "publication", "handoff"];
  }

  if (includesAny(name, ["risk", "safety", "quality", "validation", "check", "governance"])) {
    return ["risk", "safety", "quality", "validation", "check", "governance"];
  }

  if (includesAny(name, ["user", "client", "customer", "audience", "reader"])) {
    return ["user", "client", "customer", "audience", "reader"];
  }

  return tokens(name);
};

const selectDomainFor = (name: string, domains: Domain[], fallbackIndex: number): Domain | undefined => {
  const keywords = domainKeywordsFor(name);
  return (
    domains.find((domain) => keywords.some((keyword) => normalize(domain.name).includes(normalize(keyword)))) ??
    domains[Math.min(fallbackIndex, Math.max(0, domains.length - 1))]
  );
};

const selectFunctionFor = (
  name: string,
  functions: ProjectFunction[],
  fallbackIndex: number,
): ProjectFunction | undefined => {
  const keywords = includesExportIntent(name)
    ? ["export", "prompt", "handoff", "output", "draft"]
    : tokens(name);

  return (
    functions.find((fn) => keywords.some((keyword) => normalize(fn.name).includes(normalize(keyword)))) ??
    functions[Math.min(fallbackIndex, Math.max(0, functions.length - 1))]
  );
};

const applyRenameGenericInvariants = (blueprint: ProjectBlueprint): void => {
  const usedNames = new Set(
    blueprint.invariants
      .filter((invariant) => !genericInvariantNamePattern.test(invariant.name.trim()))
      .map((invariant) => invariant.name.toLowerCase()),
  );

  blueprint.invariants.forEach((invariant) => {
    if (!genericInvariantNamePattern.test(invariant.name.trim())) {
      return;
    }

    const sourceText = invariant.description || invariant.violationMessage || invariant.name;
    invariant.name = uniqueName(deriveInvariantName(sourceText), usedNames);
    touch(invariant);
  });
};

const fill = (current: string, next: string): string => current.trim() || next;

const applyFillEmptyDescriptions = (
  blueprint: ProjectBlueprint,
  template: FrameworkTemplateDefinition,
): void => {
  const templateLabel = template.label.toLowerCase();
  const entityText = (name: string, kind: string): string =>
    `${name} supports the ${templateLabel} blueprint by making this ${kind} explicit and reviewable.`;

  blueprint.outcomes.forEach((outcome) => {
    outcome.description = fill(outcome.description, entityText(outcome.name, "outcome"));
    touch(outcome);
  });
  blueprint.actors.forEach((actor) => {
    actor.description = fill(actor.description, entityText(actor.name, "actor"));
    touch(actor);
  });
  blueprint.domains.forEach((domain) => {
    domain.description = fill(domain.description, entityText(domain.name, "domain"));
    domain.responsibility = fill(domain.responsibility, `Own ${domain.name.toLowerCase()} decisions and relationships.`);
    touch(domain);
  });
  blueprint.functions.forEach((fn) => {
    fn.description = fill(fn.description, entityText(fn.name, "function"));
    touch(fn);
  });
  blueprint.components.forEach((component) => {
    component.description = fill(component.description, entityText(component.name, "component"));
    component.purpose = fill(component.purpose, `Make ${component.name.toLowerCase()} usable inside the blueprint workflow.`);
    touch(component);
  });
  blueprint.flows.forEach((flow) => {
    flow.description = fill(flow.description, entityText(flow.name, "flow"));
    flow.stepSummary = fill(flow.stepSummary, `${flow.name} connects actors, functions, and components in order.`);
    touch(flow);
  });
  blueprint.rules.forEach((rule) => {
    rule.description = fill(rule.description, entityText(rule.name, "rule"));
    rule.enforcement = fill(rule.enforcement, "Review this rule before accepting stable blueprint changes.");
    touch(rule);
  });
  blueprint.invariants.forEach((invariant) => {
    invariant.description = fill(invariant.description, entityText(invariant.name, "invariant"));
    invariant.violationMessage = fill(invariant.violationMessage, `${invariant.name} must remain true.`);
    invariant.policy.reviewMessage = fill(invariant.policy.reviewMessage, invariant.violationMessage);
    invariant.policy.recommendation = fill(
      invariant.policy.recommendation,
      "Review the affected scope before accepting this blueprint change.",
    );
    touch(invariant);
  });
  blueprint.guardrails.forEach((guardrail) => {
    guardrail.description = fill(guardrail.description, entityText(guardrail.name, "guardrail"));
    guardrail.protectedAgainst = fill(guardrail.protectedAgainst, guardrail.name);
    touch(guardrail);
  });
  blueprint.phases.forEach((phase) => {
    phase.description = fill(phase.description, entityText(phase.name, "phase"));
    phase.objective = fill(phase.objective, `Complete ${phase.name.toLowerCase()} with connected evidence.`);
    if (phase.exitCriteria.length === 0) {
      phase.exitCriteria = [`${phase.name} is explicit`, "No critical validation failures remain"];
    }
    touch(phase);
  });
  [...blueprint.mvpScope.items, ...blueprint.expansionScope.items].forEach((item) => {
    item.description = fill(item.description, entityText(item.name, "scope item"));
    item.rationale = fill(item.rationale, "Keep this scope item connected to outcomes, functions, or components.");
    touch(item);
  });
  blueprint.failureModes.forEach((failureMode) => {
    failureMode.description = fill(failureMode.description, entityText(failureMode.name, "failure mode"));
    touch(failureMode);
  });
};

const applyFailureMitigations = (blueprint: ProjectBlueprint): void => {
  blueprint.failureModes.forEach((failureMode) => {
    if (textPresent(failureMode.mitigation)) {
      return;
    }

    failureMode.mitigation = `Review "${failureMode.name}" during readiness checks and add or adjust guardrails before implementation.`;
    touch(failureMode);
  });
};

const applyRemapExportScopeItems = (blueprint: ProjectBlueprint): void => {
  const { exportFunction, exportComponent } = ensureExportSurface(blueprint);
  const outcomeIds = blueprint.outcomes.slice(0, 2).map((outcome) => outcome.id);

  exportScopeItems(blueprint).forEach((item) => {
    if (exportFunction) {
      item.functionIds = appendUnique(item.functionIds, [exportFunction.id]);
    }
    if (exportComponent) {
      item.componentIds = appendUnique(item.componentIds, [exportComponent.id]);
    }
    if (item.outcomeIds.length === 0) {
      item.outcomeIds = outcomeIds;
    }
    item.rationale = fill(item.rationale, "This export item belongs to the export surface and stays governed by validation.");
    touch(item);
  });
};

const applySeparateDuplicateExpansionItems = (blueprint: ProjectBlueprint): void => {
  const mvpNames = new Set(blueprint.mvpScope.items.map((item) => normalize(item.name)).filter(Boolean));
  const usedExpansionNames = new Set(blueprint.expansionScope.items.map((item) => item.name.toLowerCase()));

  blueprint.expansionScope.items.forEach((item) => {
    if (!mvpNames.has(normalize(item.name))) {
      return;
    }

    usedExpansionNames.delete(item.name.toLowerCase());
    const baseName = item.name.replace(/^(mvp|expansion|future):\s*/i, "").trim() || item.name;
    item.name = uniqueName(`Future: ${baseName}`, usedExpansionNames);
    item.description = fill(item.description, "A future enhancement after the MVP boundary is validated.");
    item.rationale = fill(item.rationale, "This belongs after the first build and should not be treated as MVP scope.");
    touch(item);
  });
};

const applyTemplateExpectedStructure = (
  blueprint: ProjectBlueprint,
  template: FrameworkTemplateDefinition,
): void => {
  const outcomeIds = blueprint.outcomes.slice(0, 2).map((outcome) => outcome.id);
  const actorIds = blueprint.actors.slice(0, 2).map((actor) => actor.id);

  if (clearlyThin(blueprint.domains.length, template.suggestedDomains.length)) {
    template.suggestedDomains
      .filter((expected) => !expectedMatchesActual(expected, blueprint.domains.map((domain) => domain.name)))
      .forEach((name) => {
        const domain = createDomain();
        domain.name = name;
        domain.description = `${name} is expected by the ${template.label} template.`;
        domain.responsibility = `Own ${name.toLowerCase()} decisions and keep them connected to outcomes.`;
        domain.outcomeIds = outcomeIds;
        blueprint.domains.push(domain);
      });
  }

  if (clearlyThin(blueprint.functions.length, template.suggestedFunctions.length)) {
    template.suggestedFunctions
      .filter((expected) => !expectedMatchesActual(expected, blueprint.functions.map((fn) => fn.name)))
      .forEach((name, index) => {
        const domain = selectDomainFor(name, blueprint.domains, index);
        const fn = createProjectFunction();
        fn.name = name;
        fn.description = `${name} is expected by the ${template.label} template.`;
        fn.domainIds = domain ? [domain.id] : [];
        fn.outcomeIds = outcomeIds;
        fn.actorIds = actorIds;
        fn.inputs = ["Blueprint context"];
        fn.outputs = [name];
        blueprint.functions.push(fn);
      });
  }

  if (clearlyThin(blueprint.components.length, template.suggestedComponents.length)) {
    template.suggestedComponents
      .filter((expected) => !expectedMatchesActual(expected, blueprint.components.map((component) => component.name)))
      .forEach((name, index) => {
        const fn = selectFunctionFor(name, blueprint.functions, index);
        const domain = fn
          ? blueprint.domains.find((item) => fn.domainIds.includes(item.id)) ?? selectDomainFor(name, blueprint.domains, index)
          : selectDomainFor(name, blueprint.domains, index);
        const component = createComponent();
        component.name = name;
        component.description = `${name} is expected by the ${template.label} template.`;
        component.purpose = `Make ${name.toLowerCase()} visible as part of the blueprint implementation surface.`;
        component.domainIds = domain ? [domain.id] : [];
        component.functionIds = fn ? [fn.id] : [];
        component.inputs = ["Blueprint context"];
        component.outputs = [name];
        blueprint.components.push(component);
      });
  }
};

const applyHighRiskGuardrails = (blueprint: ProjectBlueprint): void => {
  if (blueprint.guardrails.length > 0) {
    return;
  }

  const highRiskFailureModes = blueprint.failureModes.filter(
    (failureMode) => failureMode.severity === "critical" || failureMode.severity === "high",
  );
  const sourceRisks = highRiskFailureModes.length > 0 ? highRiskFailureModes.slice(0, 3) : [];

  if (sourceRisks.length === 0) {
    const guardrail = createGuardrail();
    guardrail.name = "Keep high-risk assumptions visible";
    guardrail.description = "High-risk assumptions must remain explicit before implementation.";
    guardrail.protectedAgainst = "Hidden safety, trust, legal, security, or operational assumptions.";
    guardrail.scope = "project";
    guardrail.scopeEntityIds = [blueprint.project.id];
    blueprint.guardrails.push(guardrail);
    return;
  }

  sourceRisks.forEach((failureMode) => {
    const guardrail = createGuardrail();
    guardrail.name = `Guard against ${failureMode.name}`;
    guardrail.description = `Protects the blueprint from this high-risk failure mode: ${failureMode.description || failureMode.name}.`;
    guardrail.protectedAgainst = failureMode.description || failureMode.name;
    guardrail.scope = "project";
    guardrail.scopeEntityIds = [blueprint.project.id];
    blueprint.guardrails.push(guardrail);
  });
};

const validateAndParse = (blueprint: ProjectBlueprint): ProjectBlueprint => {
  blueprint.validation = validateBlueprint(blueprint);
  return ProjectBlueprintSchema.parse(blueprint);
};

const applySafeFixById = (blueprint: ProjectBlueprint, fixId: string): void => {
  const template = describeFrameworkTemplateForBlueprint(blueprint);

  switch (fixId) {
    case "rename-generic-invariants":
      applyRenameGenericInvariants(blueprint);
      break;
    case "fill-empty-descriptions":
      applyFillEmptyDescriptions(blueprint, template);
      break;
    case "add-failure-mitigations":
      applyFailureMitigations(blueprint);
      break;
    case "add-export-surface":
      ensureExportSurface(blueprint);
      break;
    case "remap-export-scope-items":
      applyRemapExportScopeItems(blueprint);
      break;
    case "separate-duplicate-expansion-items":
      applySeparateDuplicateExpansionItems(blueprint);
      break;
    case "add-template-expected-structure":
      applyTemplateExpectedStructure(blueprint, template);
      break;
    case "add-high-risk-guardrails":
      applyHighRiskGuardrails(blueprint);
      break;
    default:
      throw new Error(`Unknown safe blueprint improvement fix: ${fixId}`);
  }
};

const allFixes = (blueprint: ProjectBlueprint): BlueprintImprovementFix[] => {
  const plan = buildBlueprintImprovementPlan(blueprint);
  return [...plan.safeFixes, ...plan.manualFixes, ...plan.riskyFixes];
};

export const applyBlueprintImprovementFix = (
  blueprint: ProjectBlueprint,
  fixId: string,
): ProjectBlueprint => {
  const fix = allFixes(blueprint).find((candidate) => candidate.id === fixId);
  if (!fix) {
    throw new Error(`Unknown blueprint improvement fix: ${fixId}`);
  }

  const next = cloneBlueprint(blueprint);

  if (fix.safety !== "safe") {
    return ProjectBlueprintSchema.parse(next);
  }

  applySafeFixById(next, fix.id);
  return validateAndParse(next);
};

export const applySafeBlueprintImprovementFixes = (blueprint: ProjectBlueprint): ProjectBlueprint => {
  const plan = buildBlueprintImprovementPlan(blueprint);
  const next = cloneBlueprint(blueprint);

  plan.safeFixes.forEach((fix) => {
    applySafeFixById(next, fix.id);
  });

  return validateAndParse(next);
};
