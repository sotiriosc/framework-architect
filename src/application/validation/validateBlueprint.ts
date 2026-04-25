import type { ProjectBlueprint, ValidationCheck, ValidationState } from "@/domain/models";
import { createValidationCheck } from "@/domain/defaults";
import { nowIso } from "@/lib/identity";

const normalizeName = (value: string): string => value.trim().toLowerCase();

type IdSets = {
  all: Set<string>;
  project: Set<string>;
  domain: Set<string>;
  function: Set<string>;
  component: Set<string>;
  dependency: Set<string>;
  outcome: Set<string>;
  actor: Set<string>;
  flow: Set<string>;
  phase: Set<string>;
  rule: Set<string>;
  invariant: Set<string>;
  guardrail: Set<string>;
  scopeItem: Set<string>;
  decision: Set<string>;
  failureMode: Set<string>;
};

const collectIdSets = (blueprint: ProjectBlueprint): IdSets => {
  const project = new Set<string>([blueprint.project.id]);
  const domain = new Set<string>(blueprint.domains.map((item) => item.id));
  const outcome = new Set<string>(blueprint.outcomes.map((item) => item.id));
  const actor = new Set<string>(blueprint.actors.map((item) => item.id));
  const fn = new Set<string>(blueprint.functions.map((item) => item.id));
  const component = new Set<string>(blueprint.components.map((item) => item.id));
  const dependency = new Set<string>(blueprint.dependencies.map((item) => item.id));
  const flow = new Set<string>(blueprint.flows.map((item) => item.id));
  const phase = new Set<string>(blueprint.phases.map((item) => item.id));
  const rule = new Set<string>(blueprint.rules.map((item) => item.id));
  const invariant = new Set<string>(blueprint.invariants.map((item) => item.id));
  const guardrail = new Set<string>(blueprint.guardrails.map((item) => item.id));
  const scopeItem = new Set<string>([
    blueprint.mvpScope.id,
    blueprint.expansionScope.id,
    ...blueprint.mvpScope.items.map((item) => item.id),
    ...blueprint.expansionScope.items.map((item) => item.id),
  ]);
  const decision = new Set<string>(blueprint.decisionLogic.records.map((item) => item.id));
  const failureMode = new Set<string>(blueprint.failureModes.map((item) => item.id));
  const all = new Set<string>([
    blueprint.project.id,
    blueprint.intent.id,
    ...outcome,
    ...actor,
    ...blueprint.constraints.map((item) => item.id),
    ...domain,
    ...fn,
    ...component,
    ...flow,
    ...dependency,
    ...rule,
    ...invariant,
    ...decision,
    ...failureMode,
    ...guardrail,
    ...phase,
    ...scopeItem,
  ]);

  return {
    all,
    project,
    domain,
    function: fn,
    component,
    dependency,
    outcome,
    actor,
    flow,
    phase,
    rule,
    invariant,
    guardrail,
    scopeItem,
    decision,
    failureMode,
  };
};

const invalidIds = (ids: string[], allowedIds: Set<string>): string[] =>
  ids.filter((id) => !allowedIds.has(id));

const pushReferenceChecks = (input: {
  checks: ValidationCheck[];
  code: string;
  ownerLabel: string;
  ownerName: string;
  ownerId: string;
  relatedIds: string[];
  allowedIds: Set<string>;
  targetLabel: string;
  severity?: ValidationCheck["severity"];
}) => {
  const missingIds = invalidIds(input.relatedIds, input.allowedIds);

  if (missingIds.length > 0) {
    input.checks.push(
      createValidationCheck({
        code: input.code,
        status: "fail",
        severity: input.severity ?? "high",
        message: `${input.ownerLabel} "${input.ownerName}" references invalid ${input.targetLabel} IDs.`,
        relatedEntityIds: [input.ownerId, ...missingIds],
        recommendation: `Replace invalid ${input.targetLabel} IDs with valid references.`,
      }),
    );
  }
};

const scopeSetFor = (scope: string, idSets: IdSets): Set<string> => {
  switch (scope) {
    case "project":
      return idSets.project;
    case "domain":
      return idSets.domain;
    case "function":
      return idSets.function;
    case "component":
      return idSets.component;
    case "phase":
      return idSets.phase;
    case "flow":
      return idSets.flow;
    case "actor":
      return idSets.actor;
    case "scope-item":
      return idSets.scopeItem;
    default:
      return new Set<string>();
  }
};

const passCheck = (
  code: string,
  message: string,
  recommendation = "",
  relatedEntityIds: string[] = [],
): ValidationCheck =>
  createValidationCheck({
    code,
    status: "pass",
    severity: "low",
    message,
    recommendation,
    relatedEntityIds,
  });

const pushPresenceCheck = (input: {
  checks: ValidationCheck[];
  code: string;
  present: boolean;
  failSeverity: ValidationCheck["severity"];
  failMessage: string;
  failRecommendation: string;
  passMessage: string;
  relatedEntityIds: string[];
}) => {
  if (!input.present) {
    input.checks.push(
      createValidationCheck({
        code: input.code,
        status: "fail",
        severity: input.failSeverity,
        message: input.failMessage,
        relatedEntityIds: input.relatedEntityIds,
        recommendation: input.failRecommendation,
      }),
    );
    return;
  }

  input.checks.push(
    passCheck(input.code, input.passMessage, "", input.relatedEntityIds),
  );
};

export const hasCriticalValidationFailures = (validation: ValidationState): boolean =>
  validation.checks.some((check) => check.status === "fail" && check.severity === "critical");

export const validateBlueprint = (blueprint: ProjectBlueprint): ValidationState => {
  const checks: ValidationCheck[] = [];
  const idSets = collectIdSets(blueprint);

  if (blueprint.outcomes.length === 0) {
    checks.push(
      createValidationCheck({
        code: "OUTCOME_REQUIRED",
        status: "fail",
        severity: "critical",
        message: "Blueprints require at least one intended outcome.",
        relatedEntityIds: [blueprint.project.id],
        recommendation: "Add at least one outcome before treating the blueprint as usable.",
      }),
    );
  } else {
    checks.push(passCheck("OUTCOME_REQUIRED", "Blueprint has at least one intended outcome.", "", [blueprint.project.id]));
  }

  pushPresenceCheck({
    checks,
    code: "ACTOR_REQUIRED",
    present: blueprint.actors.length > 0,
    failSeverity: "high",
    failMessage: "Blueprints require at least one actor.",
    failRecommendation: "Add the primary user, builder, owner, or other actor served by the blueprint.",
    passMessage: "Blueprint has at least one actor.",
    relatedEntityIds: [blueprint.project.id],
  });

  pushPresenceCheck({
    checks,
    code: "DOMAIN_REQUIRED",
    present: blueprint.domains.length > 0,
    failSeverity: "critical",
    failMessage: "Blueprints require at least one domain.",
    failRecommendation: "Add a domain that owns a coherent area of responsibility.",
    passMessage: "Blueprint has at least one domain.",
    relatedEntityIds: [blueprint.project.id],
  });

  pushPresenceCheck({
    checks,
    code: "FUNCTION_REQUIRED",
    present: blueprint.functions.length > 0,
    failSeverity: "critical",
    failMessage: "Blueprints require at least one function.",
    failRecommendation: "Add a function and map it to at least one outcome.",
    passMessage: "Blueprint has at least one function.",
    relatedEntityIds: [blueprint.project.id],
  });

  pushPresenceCheck({
    checks,
    code: "COMPONENT_REQUIRED",
    present: blueprint.components.length > 0,
    failSeverity: "critical",
    failMessage: "Blueprints require at least one component.",
    failRecommendation: "Add a component and map it to at least one function.",
    passMessage: "Blueprint has at least one component.",
    relatedEntityIds: [blueprint.project.id],
  });

  pushPresenceCheck({
    checks,
    code: "FLOW_REQUIRED",
    present: blueprint.flows.length > 0,
    failSeverity: "high",
    failMessage: "Blueprints should define at least one flow.",
    failRecommendation: "Add a flow that shows how actors, functions, and components work together.",
    passMessage: "Blueprint has at least one flow.",
    relatedEntityIds: [blueprint.project.id],
  });

  pushPresenceCheck({
    checks,
    code: "PHASE_REQUIRED",
    present: blueprint.phases.length > 0,
    failSeverity: "high",
    failMessage: "Blueprints should define at least one phase.",
    failRecommendation: "Add an implementation or review phase with exit criteria.",
    passMessage: "Blueprint has at least one phase.",
    relatedEntityIds: [blueprint.project.id],
  });

  pushPresenceCheck({
    checks,
    code: "GOVERNANCE_REQUIRED",
    present: blueprint.invariants.length > 0 && (blueprint.rules.length > 0 || blueprint.guardrails.length > 0),
    failSeverity: "high",
    failMessage: "Blueprints should define at least one invariant and at least one rule or guardrail.",
    failRecommendation: "Add governance that states what must remain true and how scope or risk is protected.",
    passMessage: "Blueprint has invariant and rule or guardrail governance.",
    relatedEntityIds: [blueprint.project.id],
  });

  pushPresenceCheck({
    checks,
    code: "MVP_SCOPE_REQUIRED",
    present:
      blueprint.mvpScope.summary.trim().length > 0 &&
      blueprint.mvpScope.successDefinition.trim().length > 0 &&
      blueprint.mvpScope.items.length > 0,
    failSeverity: "critical",
    failMessage: "MVP scope requires a summary, success definition, and at least one scope item.",
    failRecommendation: "Define the MVP boundary, success definition, and at least one mapped MVP scope item.",
    passMessage: "MVP scope has a summary, success definition, and at least one item.",
    relatedEntityIds: [blueprint.mvpScope.id],
  });

  pushPresenceCheck({
    checks,
    code: "DECISION_PRINCIPLE_REQUIRED",
    present: blueprint.decisionLogic.principles.length > 0,
    failSeverity: "high",
    failMessage: "Decision logic should include at least one principle.",
    failRecommendation: "Add a principle that guides architecture, scope, or governance decisions.",
    passMessage: "Decision logic has at least one principle.",
    relatedEntityIds: [blueprint.project.id],
  });

  const functionFailures = blueprint.functions.filter((fn) => fn.outcomeIds.length === 0);
  if (functionFailures.length > 0) {
    functionFailures.forEach((fn) => {
      checks.push(
        createValidationCheck({
          code: "FUNCTION_OUTCOME_MAPPING",
          status: "fail",
          severity: "critical",
          message: `Function "${fn.name}" must map to at least one outcome.`,
          relatedEntityIds: [fn.id],
          recommendation: "Add at least one outcome ID to the function.",
        }),
      );
    });
  } else {
    checks.push(
      passCheck(
        "FUNCTION_OUTCOME_MAPPING",
        "Every function maps to at least one outcome.",
        "",
        blueprint.functions.map((fn) => fn.id),
      ),
    );
  }

  blueprint.functions.forEach((fn) => {
    pushReferenceChecks({
      checks,
      code: "FUNCTION_DOMAIN_REFERENCES",
      ownerLabel: "Function",
      ownerName: fn.name,
      ownerId: fn.id,
      relatedIds: fn.domainIds,
      allowedIds: idSets.domain,
      targetLabel: "domain",
      severity: "high",
    });
    pushReferenceChecks({
      checks,
      code: "FUNCTION_OUTCOME_REFERENCES",
      ownerLabel: "Function",
      ownerName: fn.name,
      ownerId: fn.id,
      relatedIds: fn.outcomeIds,
      allowedIds: idSets.outcome,
      targetLabel: "outcome",
      severity: "critical",
    });
    pushReferenceChecks({
      checks,
      code: "FUNCTION_ACTOR_REFERENCES",
      ownerLabel: "Function",
      ownerName: fn.name,
      ownerId: fn.id,
      relatedIds: fn.actorIds,
      allowedIds: idSets.actor,
      targetLabel: "actor",
    });
  });

  const componentFailures = blueprint.components.filter((component) => component.functionIds.length === 0);
  if (componentFailures.length > 0) {
    componentFailures.forEach((component) => {
      checks.push(
        createValidationCheck({
          code: "COMPONENT_FUNCTION_MAPPING",
          status: "fail",
          severity: "critical",
          message: `Component "${component.name}" must map to at least one function.`,
          relatedEntityIds: [component.id],
          recommendation: "Add at least one function ID to the component.",
        }),
      );
    });
  } else {
    checks.push(
      passCheck(
        "COMPONENT_FUNCTION_MAPPING",
        "Every component maps to at least one function.",
        "",
        blueprint.components.map((component) => component.id),
      ),
    );
  }

  blueprint.components.forEach((component) => {
    pushReferenceChecks({
      checks,
      code: "COMPONENT_DOMAIN_REFERENCES",
      ownerLabel: "Component",
      ownerName: component.name,
      ownerId: component.id,
      relatedIds: component.domainIds,
      allowedIds: idSets.domain,
      targetLabel: "domain",
    });
    pushReferenceChecks({
      checks,
      code: "COMPONENT_FUNCTION_REFERENCES",
      ownerLabel: "Component",
      ownerName: component.name,
      ownerId: component.id,
      relatedIds: component.functionIds,
      allowedIds: idSets.function,
      targetLabel: "function",
      severity: "critical",
    });
    pushReferenceChecks({
      checks,
      code: "COMPONENT_DEPENDENCY_REFERENCES",
      ownerLabel: "Component",
      ownerName: component.name,
      ownerId: component.id,
      relatedIds: component.dependencyIds,
      allowedIds: idSets.dependency,
      targetLabel: "dependency",
    });
    pushReferenceChecks({
      checks,
      code: "COMPONENT_INVARIANT_REFERENCES",
      ownerLabel: "Component",
      ownerName: component.name,
      ownerId: component.id,
      relatedIds: component.invariantIds,
      allowedIds: idSets.invariant,
      targetLabel: "invariant",
    });
    pushReferenceChecks({
      checks,
      code: "COMPONENT_GUARDRAIL_REFERENCES",
      ownerLabel: "Component",
      ownerName: component.name,
      ownerId: component.id,
      relatedIds: component.guardrailIds,
      allowedIds: idSets.guardrail,
      targetLabel: "guardrail",
    });
  });

  const dependencyFailures = blueprint.dependencies.filter(
    (dependency) =>
      !dependency.sourceEntityId ||
      !dependency.targetEntityId ||
      !idSets.all.has(dependency.sourceEntityId) ||
      !idSets.all.has(dependency.targetEntityId),
  );
  if (dependencyFailures.length > 0) {
    dependencyFailures.forEach((dependency) => {
      checks.push(
        createValidationCheck({
          code: "DEPENDENCY_REFERENCES",
          status: "fail",
          severity: "critical",
          message: `Dependency "${dependency.name}" references an invalid source or target entity.`,
          relatedEntityIds: [dependency.id, dependency.sourceEntityId, dependency.targetEntityId].filter(Boolean),
          recommendation: "Point the dependency to valid entity IDs.",
        }),
      );
    });
  } else {
    checks.push(
      passCheck(
        "DEPENDENCY_REFERENCES",
        "Every dependency references valid entities.",
        "",
        blueprint.dependencies.map((dependency) => dependency.id),
      ),
    );
  }

  blueprint.domains.forEach((domain) => {
    pushReferenceChecks({
      checks,
      code: "DOMAIN_OUTCOME_REFERENCES",
      ownerLabel: "Domain",
      ownerName: domain.name,
      ownerId: domain.id,
      relatedIds: domain.outcomeIds,
      allowedIds: idSets.outcome,
      targetLabel: "outcome",
    });
  });

  blueprint.flows.forEach((flow) => {
    pushReferenceChecks({
      checks,
      code: "FLOW_ACTOR_REFERENCES",
      ownerLabel: "Flow",
      ownerName: flow.name,
      ownerId: flow.id,
      relatedIds: flow.actorIds,
      allowedIds: idSets.actor,
      targetLabel: "actor",
    });
    pushReferenceChecks({
      checks,
      code: "FLOW_FUNCTION_REFERENCES",
      ownerLabel: "Flow",
      ownerName: flow.name,
      ownerId: flow.id,
      relatedIds: flow.functionIds,
      allowedIds: idSets.function,
      targetLabel: "function",
    });
    pushReferenceChecks({
      checks,
      code: "FLOW_COMPONENT_REFERENCES",
      ownerLabel: "Flow",
      ownerName: flow.name,
      ownerId: flow.id,
      relatedIds: flow.componentIds,
      allowedIds: idSets.component,
      targetLabel: "component",
    });
  });

  blueprint.phases.forEach((phase) => {
    pushReferenceChecks({
      checks,
      code: "PHASE_FUNCTION_REFERENCES",
      ownerLabel: "Phase",
      ownerName: phase.name,
      ownerId: phase.id,
      relatedIds: phase.functionIds,
      allowedIds: idSets.function,
      targetLabel: "function",
    });
    pushReferenceChecks({
      checks,
      code: "PHASE_COMPONENT_REFERENCES",
      ownerLabel: "Phase",
      ownerName: phase.name,
      ownerId: phase.id,
      relatedIds: phase.componentIds,
      allowedIds: idSets.component,
      targetLabel: "component",
    });
  });

  const ruleFailures = blueprint.rules.filter(
    (rule) =>
      !rule.scope ||
      (rule.scope === "global" && rule.scopeEntityIds.length > 0) ||
      (rule.scope !== "global" && rule.scopeEntityIds.length === 0) ||
      (rule.policy.blocksBuildReady && rule.policy.overrideAllowed),
  );
  if (ruleFailures.length > 0) {
    ruleFailures.forEach((rule) => {
      checks.push(
        createValidationCheck({
          code: "RULE_SCOPE",
          status: "fail",
          severity: "high",
          message: `Rule "${rule.name}" needs a valid scope definition${rule.scope === "global" ? " without scope entity IDs" : " with scoped entity IDs"} and non-conflicting policy metadata.`,
          relatedEntityIds: [rule.id],
          recommendation:
            "Define the rule scope correctly and keep build-ready blockers non-overridable.",
        }),
      );
    });
  } else {
    checks.push(
      passCheck("RULE_SCOPE", "Every rule has an explicit scope.", "", blueprint.rules.map((rule) => rule.id)),
    );
  }

  blueprint.rules.forEach((rule) => {
    if (rule.scope === "global") {
      return;
    }

    pushReferenceChecks({
      checks,
      code: "RULE_SCOPE_REFERENCES",
      ownerLabel: "Rule",
      ownerName: rule.name,
      ownerId: rule.id,
      relatedIds: rule.scopeEntityIds,
      allowedIds: scopeSetFor(rule.scope, idSets),
      targetLabel: `${rule.scope} scope`,
    });
  });

  const invariantFailures = blueprint.invariants.filter(
    (invariant) =>
      (invariant.scope === "global" && invariant.scopeEntityIds.length > 0) ||
      (invariant.scope !== "global" && invariant.scopeEntityIds.length === 0) ||
      !invariant.violationMessage ||
      (invariant.policy.blocksBuildReady && invariant.policy.overrideAllowed),
  );
  if (invariantFailures.length > 0) {
    invariantFailures.forEach((invariant) => {
      checks.push(
        createValidationCheck({
          code: "INVARIANT_SCOPE",
          status: "fail",
          severity: "high",
          message: `Invariant "${invariant.name}" must be global or clearly scoped, define a violation message, and avoid conflicting override semantics.`,
          relatedEntityIds: [invariant.id],
          recommendation:
            "Scope the invariant correctly, define its violation message, and keep build-ready blockers non-overridable.",
        }),
      );
    });
  } else {
    checks.push(
      passCheck(
        "INVARIANT_SCOPE",
        "Every invariant is global or explicitly scoped.",
        "",
        blueprint.invariants.map((invariant) => invariant.id),
      ),
    );
  }

  blueprint.invariants.forEach((invariant) => {
    if (invariant.scope === "global") {
      return;
    }

    pushReferenceChecks({
      checks,
      code: "INVARIANT_SCOPE_REFERENCES",
      ownerLabel: "Invariant",
      ownerName: invariant.name,
      ownerId: invariant.id,
      relatedIds: invariant.scopeEntityIds,
      allowedIds: scopeSetFor(invariant.scope, idSets),
      targetLabel: `${invariant.scope} scope`,
    });
  });

  blueprint.guardrails.forEach((guardrail) => {
    if (guardrail.scope === "global") {
      if (guardrail.scopeEntityIds.length > 0) {
        checks.push(
          createValidationCheck({
            code: "GUARDRAIL_SCOPE",
            status: "fail",
            severity: "high",
            message: `Guardrail "${guardrail.name}" is global and should not list scoped entity IDs.`,
            relatedEntityIds: [guardrail.id],
            recommendation: "Remove scoped entity IDs for global guardrails.",
          }),
        );
      }

      return;
    }

    if (guardrail.scopeEntityIds.length === 0) {
      checks.push(
        createValidationCheck({
          code: "GUARDRAIL_SCOPE",
          status: "fail",
          severity: "high",
          message: `Guardrail "${guardrail.name}" must reference at least one scoped entity.`,
          relatedEntityIds: [guardrail.id],
          recommendation: "Attach the guardrail to the entities it protects.",
        }),
      );
      return;
    }

    pushReferenceChecks({
      checks,
      code: "GUARDRAIL_SCOPE_REFERENCES",
      ownerLabel: "Guardrail",
      ownerName: guardrail.name,
      ownerId: guardrail.id,
      relatedIds: guardrail.scopeEntityIds,
      allowedIds: scopeSetFor(guardrail.scope, idSets),
      targetLabel: `${guardrail.scope} scope`,
    });
  });

  [...blueprint.mvpScope.items, ...blueprint.expansionScope.items].forEach((item) => {
    pushReferenceChecks({
      checks,
      code: "SCOPE_ITEM_OUTCOME_REFERENCES",
      ownerLabel: "Scope item",
      ownerName: item.name,
      ownerId: item.id,
      relatedIds: item.outcomeIds,
      allowedIds: idSets.outcome,
      targetLabel: "outcome",
    });
    pushReferenceChecks({
      checks,
      code: "SCOPE_ITEM_FUNCTION_REFERENCES",
      ownerLabel: "Scope item",
      ownerName: item.name,
      ownerId: item.id,
      relatedIds: item.functionIds,
      allowedIds: idSets.function,
      targetLabel: "function",
    });
    pushReferenceChecks({
      checks,
      code: "SCOPE_ITEM_COMPONENT_REFERENCES",
      ownerLabel: "Scope item",
      ownerName: item.name,
      ownerId: item.id,
      relatedIds: item.componentIds,
      allowedIds: idSets.component,
      targetLabel: "component",
    });
  });

  blueprint.decisionLogic.records.forEach((record) => {
    pushReferenceChecks({
      checks,
      code: "DECISION_RECORD_REFERENCES",
      ownerLabel: "Decision record",
      ownerName: record.title,
      ownerId: record.id,
      relatedIds: record.relatedEntityIds,
      allowedIds: idSets.all,
      targetLabel: "entity",
    });
  });

  blueprint.failureModes.forEach((failureMode) => {
    pushReferenceChecks({
      checks,
      code: "FAILURE_MODE_REFERENCES",
      ownerLabel: "Failure mode",
      ownerName: failureMode.name,
      ownerId: failureMode.id,
      relatedIds: failureMode.relatedEntityIds,
      allowedIds: idSets.all,
      targetLabel: "entity",
    });
  });

  const expansionNames = new Set(blueprint.expansionScope.items.map((item) => normalizeName(item.name)));
  const overlappingScopeItems = blueprint.mvpScope.items.filter((item) => expansionNames.has(normalizeName(item.name)));
  if (overlappingScopeItems.length > 0) {
    overlappingScopeItems.forEach((item) => {
      checks.push(
        createValidationCheck({
          code: "MVP_EXPANSION_SEPARATION",
          status: "fail",
          severity: "high",
          message: `Scope item "${item.name}" appears in both MVP and expansion scope.`,
          relatedEntityIds: [item.id],
          recommendation: "Keep MVP and expansion items distinct.",
        }),
      );
    });
  } else {
    checks.push(
      passCheck(
        "MVP_EXPANSION_SEPARATION",
        "MVP scope is distinct from expansion scope.",
        "",
        [...blueprint.mvpScope.items, ...blueprint.expansionScope.items].map((item) => item.id),
      ),
    );
  }

  const criticalFailureCount = checks.filter(
    (check) => check.status === "fail" && check.severity === "critical",
  ).length;

  if (blueprint.project.status === "build-ready" && criticalFailureCount > 0) {
    checks.push(
      createValidationCheck({
        code: "BUILD_READY_BLOCKED",
        status: "fail",
        severity: "critical",
        message: "Blueprint cannot be marked build-ready while critical validation failures remain.",
        relatedEntityIds: [blueprint.project.id],
        recommendation: "Resolve critical validation failures before marking the project build-ready.",
      }),
    );
  } else {
    checks.push(
      passCheck("BUILD_READY_BLOCKED", "Build-ready state is aligned with the current validation status.", "", [
        blueprint.project.id,
      ]),
    );
  }

  return {
    checks,
    buildReady: criticalFailureCount === 0,
    lastValidatedAt: nowIso(),
  };
};
