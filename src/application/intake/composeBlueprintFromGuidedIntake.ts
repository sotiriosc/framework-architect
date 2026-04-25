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
import type { ProjectBlueprint, ProjectFunction, Component, ScopeItem } from "@/domain/models";
import { ProjectBlueprintSchema } from "@/schema";
import { validateBlueprint } from "@/application/validation/validateBlueprint";

export type GuidedIntakeInput = {
  rawIdea: string;
  projectName: string;
  frameworkType: string;
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

const normalizeInput = (input: GuidedIntakeInput): NormalizedGuidedIntake => {
  const projectName = requireText(input.projectName, "Project name");
  const rawIdea = requireText(input.rawIdea, "Raw idea");
  const frameworkType = textOr(input.frameworkType, "guided framework");
  const targetUser = textOr(input.targetUser, "the primary user");
  const problem = textOr(input.problem, "The problem space needs explicit structure before implementation.");
  const intendedOutcome = textOr(input.intendedOutcome, "a clear and buildable path forward");
  const corePrinciples = uniqueList(input.corePrinciples, [
    "Make assumptions explicit",
    "Validate structure before build-ready claims",
    "Keep scope decisions inspectable",
  ]);
  const mustRemainTrue = uniqueList(input.mustRemainTrue, [
    "The blueprint remains governed by explicit rules, invariants, and scope boundaries.",
  ]);
  const mvpBoundary = uniqueList(input.mvpBoundary, [
    "Create the core guided workflow",
    "Expose validation and readiness signals",
  ]);
  const expansionIdeas = uniqueList(input.expansionIdeas, [
    "Add deeper automation after the governed MVP is stable",
  ]);
  const knownRisks = uniqueList(input.knownRisks, [
    "Hidden assumptions could make the first implementation ambiguous",
  ]);

  return {
    rawIdea,
    projectName,
    frameworkType,
    targetUser,
    problem,
    intendedOutcome,
    corePrinciples,
    mustRemainTrue,
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

export const composeBlueprintFromGuidedIntake = (input: GuidedIntakeInput): ProjectBlueprint => {
  const guided = normalizeInput(input);

  const project = createProject({
    name: guided.projectName,
    rawIdea: guided.rawIdea,
    corePhilosophy: `${guided.frameworkType} decisions should keep assumptions, constraints, rules, and scope explicit.`,
  });
  project.status = "validated";
  project.invariantPriorities = uniqueList(
    [...guided.corePrinciples, ...guided.mustRemainTrue],
    guided.corePrinciples,
  ).slice(0, 8);

  const intent = createIntent(`Create a ${guided.frameworkType} for ${guided.targetUser}.`);
  intent.problemStatement = guided.problem;
  intent.targetAudience = guided.targetUser;
  intent.valueHypothesis = `If ${guided.targetUser} can work from a governed blueprint, they can reach ${guided.intendedOutcome} with fewer hidden assumptions.`;

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

  const primaryOutcome = createOutcome(`${guided.projectName} achieves ${guided.intendedOutcome}`);
  primaryOutcome.description = `The ${guided.frameworkType} solves: ${guided.problem}`;
  primaryOutcome.successMetric = `The target user can reach ${guided.intendedOutcome} through the MVP workflow.`;
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

  const contextDomain = createDomain();
  contextDomain.name = "Intent and Context";
  contextDomain.description = "Captures the problem, target user, intended outcome, and assumptions.";
  contextDomain.responsibility = "Keep the original idea and success logic traceable.";
  contextDomain.outcomeIds = [primaryOutcome.id, governanceOutcome.id];

  const frameworkDomain = createDomain();
  frameworkDomain.name = "Core Framework";
  frameworkDomain.description = `Defines how the ${guided.frameworkType} delivers the intended outcome.`;
  frameworkDomain.responsibility = "Turn the guided intake into connected functions, components, and flows.";
  frameworkDomain.outcomeIds = [primaryOutcome.id];

  const governanceDomain = createDomain();
  governanceDomain.name = "Governance and Readiness";
  governanceDomain.description = "Keeps rules, invariants, guardrails, decisions, and validation visible.";
  governanceDomain.responsibility = "Protect build readiness from hidden assumptions or blurred scope.";
  governanceDomain.outcomeIds = [governanceOutcome.id];

  const clarifyFunction = createProjectFunction();
  clarifyFunction.name = "Clarify intake assumptions";
  clarifyFunction.description = "Normalize the raw idea into explicit problem, user, outcome, and principles.";
  clarifyFunction.domainIds = [contextDomain.id];
  clarifyFunction.outcomeIds = [primaryOutcome.id, governanceOutcome.id];
  clarifyFunction.actorIds = [primaryActor.id];
  clarifyFunction.inputs = ["Raw idea", "Guided intake answers"];
  clarifyFunction.outputs = ["Intent", "Outcomes", "Principles"];

  const buildFunction = createProjectFunction();
  buildFunction.name = "Compose governed framework blueprint";
  buildFunction.description = "Create a connected blueprint structure for the MVP framework.";
  buildFunction.domainIds = [frameworkDomain.id];
  buildFunction.outcomeIds = [primaryOutcome.id];
  buildFunction.actorIds = [builderActor.id, primaryActor.id];
  buildFunction.inputs = ["Intent", "Outcomes", "MVP boundary"];
  buildFunction.outputs = ["Domains", "Functions", "Components", "Flow"];

  const readinessFunction = createProjectFunction();
  readinessFunction.name = "Review readiness and governance";
  readinessFunction.description = "Surface validation, rules, invariants, guardrails, risks, and decisions.";
  readinessFunction.domainIds = [governanceDomain.id];
  readinessFunction.outcomeIds = [primaryOutcome.id, governanceOutcome.id];
  readinessFunction.actorIds = [builderActor.id];
  readinessFunction.inputs = ["Blueprint structure", "Constraints", "Known risks"];
  readinessFunction.outputs = ["Readiness summary", "Decision records", "Failure modes"];

  const intakeComponent = createComponent();
  intakeComponent.name = "Guided Intake Workspace";
  intakeComponent.description = "Collects the guided intake and keeps the original idea attached.";
  intakeComponent.purpose = "Turn raw project intent into explicit blueprint context.";
  intakeComponent.domainIds = [contextDomain.id];
  intakeComponent.functionIds = [clarifyFunction.id];
  intakeComponent.inputs = ["Guided intake"];
  intakeComponent.outputs = ["Normalized intent"];

  const blueprintComponent = createComponent();
  blueprintComponent.name = "Blueprint Composer";
  blueprintComponent.description = "Creates the connected blueprint entities from guided intake.";
  blueprintComponent.purpose = "Populate the governed framework model without bypassing schema validation.";
  blueprintComponent.domainIds = [frameworkDomain.id, governanceDomain.id];
  blueprintComponent.functionIds = [buildFunction.id, readinessFunction.id];
  blueprintComponent.inputs = ["Intent", "Principles", "Scope boundaries"];
  blueprintComponent.outputs = ["ProjectBlueprint"];

  const readinessComponent = createComponent();
  readinessComponent.name = "Readiness Review Surface";
  readinessComponent.description = "Shows blockers, warnings, passes, and next recommended fixes.";
  readinessComponent.purpose = "Help users understand whether the blueprint is ready for implementation.";
  readinessComponent.domainIds = [governanceDomain.id];
  readinessComponent.functionIds = [readinessFunction.id];
  readinessComponent.inputs = ["Validation state", "Decision records", "Failure modes"];
  readinessComponent.outputs = ["Human-readable readiness summary"];

  const intakeToComposer = createDependency();
  intakeToComposer.name = "Intake feeds composer";
  intakeToComposer.description = "The composer uses guided intake answers as its source material.";
  intakeToComposer.kind = "internal";
  intakeToComposer.sourceEntityId = intakeComponent.id;
  intakeToComposer.targetEntityId = blueprintComponent.id;

  const composerToReadiness = createDependency();
  composerToReadiness.name = "Composer feeds readiness review";
  composerToReadiness.description = "Readiness review evaluates the generated blueprint structure.";
  composerToReadiness.kind = "internal";
  composerToReadiness.sourceEntityId = blueprintComponent.id;
  composerToReadiness.targetEntityId = readinessComponent.id;

  intakeComponent.dependencyIds = [intakeToComposer.id];
  readinessComponent.dependencyIds = [composerToReadiness.id];

  const guidedFlow = createFlow();
  guidedFlow.name = "Idea to governed blueprint";
  guidedFlow.description = "Transforms guided intake into a validated framework blueprint.";
  guidedFlow.stepSummary =
    "Capture guided intake, compose connected structure, validate readiness, and preserve decisions.";
  guidedFlow.actorIds = [primaryActor.id, builderActor.id];
  guidedFlow.functionIds = [clarifyFunction.id, buildFunction.id, readinessFunction.id];
  guidedFlow.componentIds = [intakeComponent.id, blueprintComponent.id, readinessComponent.id];

  const assumptionsRule = createRule();
  assumptionsRule.name = "Assumptions stay explicit";
  assumptionsRule.description = "Any generated or edited blueprint assumption must remain visible in the model.";
  assumptionsRule.scope = "global";
  assumptionsRule.enforcement = "Review project, structural, and decision changes before stable save.";
  assumptionsRule.policy.reviewSeverity = "warning";
  assumptionsRule.policy.reviewMessage = "Stable changes should not hide guided assumptions.";
  assumptionsRule.policy.recommendation = "Review assumptions, constraints, and decision records before saving.";
  assumptionsRule.policy.rationale = "Hidden assumptions make the generated blueprint hard to implement safely.";

  const scopeRule = createRule();
  scopeRule.name = "MVP and expansion remain separate";
  scopeRule.description = "MVP scope items must not be duplicated into expansion scope.";
  scopeRule.scope = "global";
  scopeRule.enforcement = "Validation keeps MVP and expansion names distinct.";
  scopeRule.policy.reviewSeverity = "warning";
  scopeRule.policy.blocksBuildReady = true;
  scopeRule.policy.reviewMessage = "Scope boundaries must remain explicit before build-ready claims.";
  scopeRule.policy.recommendation = "Keep first-build items separate from future expansion ideas.";
  scopeRule.policy.rationale = "Blurred scope makes implementation planning unreliable.";

  const invariants = guided.mustRemainTrue.slice(0, 4).map((statement, index) => {
    const invariant = createInvariant();
    invariant.name = index === 0 ? "Must remain true" : `Must remain true ${index + 1}`;
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

  const mvpGuardrail = createGuardrail();
  mvpGuardrail.name = "Protect MVP boundary";
  mvpGuardrail.description = "Prevents future ideas from diluting the first buildable version.";
  mvpGuardrail.protectedAgainst = "Scope creep during implementation planning.";
  mvpGuardrail.scope = "project";
  mvpGuardrail.scopeEntityIds = [project.id];

  const riskGuardrail = createGuardrail();
  riskGuardrail.name = "Keep known risks visible";
  riskGuardrail.description = "Known risks must remain attached to readiness review.";
  riskGuardrail.protectedAgainst = "Treating generated structure as risk-free.";
  riskGuardrail.scope = "global";

  blueprintComponent.invariantIds = mapAllIds(invariants);
  blueprintComponent.guardrailIds = [mvpGuardrail.id];
  readinessComponent.invariantIds = mapAllIds(invariants);
  readinessComponent.guardrailIds = [mvpGuardrail.id, riskGuardrail.id];

  const mvpPhase = createPhase();
  mvpPhase.name = "MVP Foundation";
  mvpPhase.description = "Create the first buildable governed framework.";
  mvpPhase.order = 1;
  mvpPhase.objective = `Deliver the core ${guided.frameworkType} experience for ${guided.targetUser}.`;
  mvpPhase.functionIds = [clarifyFunction.id, buildFunction.id];
  mvpPhase.componentIds = [intakeComponent.id, blueprintComponent.id];
  mvpPhase.exitCriteria = [
    "Intent and outcome are explicit",
    "MVP scope items reference outcomes, functions, and components",
    "Validation has no critical failures",
  ];

  const readinessPhase = createPhase();
  readinessPhase.name = "Governance Review";
  readinessPhase.description = "Validate readiness before treating the blueprint as stable implementation guidance.";
  readinessPhase.order = 2;
  readinessPhase.objective = "Confirm rules, invariants, guardrails, decisions, and risks are visible.";
  readinessPhase.functionIds = [readinessFunction.id];
  readinessPhase.componentIds = [readinessComponent.id];
  readinessPhase.exitCriteria = [
    "Readiness blockers are resolved",
    "MVP and expansion are distinct",
    "Decision records explain the initial structure",
  ];

  const functions: ProjectFunction[] = [clarifyFunction, buildFunction, readinessFunction];
  const components: Component[] = [intakeComponent, blueprintComponent, readinessComponent];

  const mvpItems = guided.mvpBoundary.map((item) =>
    createMappedScopeItem({
      name: `MVP: ${item}`,
      description: `Belongs in the first buildable version of ${guided.projectName}.`,
      outcomeIds: [primaryOutcome.id],
      functionIds: [buildFunction.id],
      componentIds: [blueprintComponent.id],
      rationale: "The guided intake identified this as part of the MVP boundary.",
    }),
  );
  const mvpNames = new Set(mvpItems.map((item) => item.name.trim().toLowerCase()));
  const expansionItems = guided.expansionIdeas.map((item) =>
    createMappedScopeItem({
      name: createDistinctExpansionName(item, mvpNames),
      description: `A future enhancement after the MVP is governed and validated.`,
      outcomeIds: [governanceOutcome.id],
      functionIds: [readinessFunction.id],
      componentIds: [readinessComponent.id],
      rationale: "The guided intake marked this as expansion, not first-build scope.",
    }),
  );

  const failureModes = guided.knownRisks.map((risk, index) => {
    const failureMode = createFailureMode();
    failureMode.name = index === 0 ? "Known guided risk" : `Known guided risk ${index + 1}`;
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
  blueprint.domains = [contextDomain, frameworkDomain, governanceDomain];
  blueprint.functions = functions;
  blueprint.components = components;
  blueprint.flows = [guidedFlow];
  blueprint.dependencies = [intakeToComposer, composerToReadiness];
  blueprint.rules = [assumptionsRule, scopeRule];
  blueprint.invariants = invariants;
  blueprint.decisionLogic = decisionLogic;
  blueprint.failureModes = failureModes;
  blueprint.guardrails = [mvpGuardrail, riskGuardrail];
  blueprint.phases = [mvpPhase, readinessPhase];
  blueprint.mvpScope.summary = `First build: ${joinList(guided.mvpBoundary)}.`;
  blueprint.mvpScope.successDefinition = `The MVP helps ${guided.targetUser} reach ${guided.intendedOutcome} with explicit governance.`;
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
