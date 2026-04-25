import {
  createActor,
  createComponent,
  createDecisionLogic,
  createDecisionRecord,
  createDependency,
  createDomain,
  createFailureMode,
  createFlow,
  createGuardrail,
  createInvariant,
  createOutcome,
  createPhase,
  createProjectFunction,
  createRule,
  createScopeItem,
} from "@/domain/defaults";
import type {
  Actor,
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
} from "@/domain/models";
import { validateBlueprint } from "@/application/validation/validateBlueprint";
import { ProjectBlueprintSchema } from "@/schema";

const cloneBlueprint = (blueprint: ProjectBlueprint): ProjectBlueprint => structuredClone(blueprint);

const textOr = (value: string, fallback: string): string => value.trim() || fallback;

const pick = <T>(items: T[], index: number): T => {
  const item = items[index] ?? items[0];
  if (!item) {
    throw new Error("Completion expected a populated collection.");
  }

  return item;
};

const ids = <T extends { id: string }>(items: T[]): string[] => items.map((item) => item.id);

const createCompletionOutcome = (blueprint: ProjectBlueprint): Outcome => {
  const outcome = createOutcome(`${blueprint.project.name} becomes implementation-ready`);
  outcome.description = textOr(
    blueprint.intent.valueHypothesis,
    "The framework is explicit enough for a builder to inspect, validate, and implement.",
  );
  outcome.successMetric = "The blueprint contains connected structure, governance, scope, and readiness checks.";
  return outcome;
};

const createPrimaryActor = (blueprint: ProjectBlueprint): Actor => {
  const actor = createActor();
  actor.name = textOr(blueprint.intent.targetAudience, "Framework builder");
  actor.description = "Primary person or team served by the framework blueprint.";
  actor.role = "Primary user";
  actor.needs = ["Clear intent", "Connected structure", "Build-ready validation"];
  return actor;
};

const createSecondaryActor = (): Actor => {
  const actor = createActor();
  actor.name = "Reviewer";
  actor.description = "Reviews the blueprint for coherence, scope, and governance before implementation.";
  actor.role = "Governance reviewer";
  actor.needs = ["Visible assumptions", "Readable validation", "Traceable decisions"];
  return actor;
};

const createCompletionDomains = (outcomeIds: string[]): Domain[] => {
  const intake = createDomain();
  intake.name = "Idea Intake";
  intake.description = "Captures the raw idea and preserves the original project intent.";
  intake.responsibility = "Keep the problem, audience, and intended outcome visible.";
  intake.outcomeIds = outcomeIds;

  const modeling = createDomain();
  modeling.name = "Framework Modeling";
  modeling.description = "Turns intent into connected framework entities.";
  modeling.responsibility = "Own domains, functions, components, flows, and scope structure.";
  modeling.outcomeIds = outcomeIds;

  const governance = createDomain();
  governance.name = "Governance Review";
  governance.description = "Keeps validation, invariants, rules, and guardrails inspectable.";
  governance.responsibility = "Prevent incomplete structure from being treated as build-ready.";
  governance.outcomeIds = outcomeIds;

  const output = createDomain();
  output.name = "Output / Export";
  output.description = "Prepares the completed blueprint for implementation handoff.";
  output.responsibility = "Make the governed framework usable outside the editing flow.";
  output.outcomeIds = outcomeIds;

  return [intake, modeling, governance, output];
};

const createCompletionFunctions = (input: {
  outcomes: Outcome[];
  actors: Actor[];
  domains: Domain[];
}): ProjectFunction[] => {
  const outcomeIds = ids(input.outcomes);
  const primaryActor = pick(input.actors, 0);
  const reviewer = pick(input.actors, 1);
  const intakeDomain = pick(input.domains, 0);
  const modelingDomain = pick(input.domains, 1);
  const governanceDomain = pick(input.domains, 2);
  const outputDomain = pick(input.domains, 3);

  const capture = createProjectFunction();
  capture.name = "Capture raw idea";
  capture.description = "Accept the original project idea and preserve it as blueprint context.";
  capture.domainIds = [intakeDomain.id];
  capture.outcomeIds = outcomeIds;
  capture.actorIds = [primaryActor.id];
  capture.inputs = ["Raw idea"];
  capture.outputs = ["Project context"];

  const clarify = createProjectFunction();
  clarify.name = "Clarify intent and outcomes";
  clarify.description = "Turn raw context into explicit intent, audience, and success outcomes.";
  clarify.domainIds = [intakeDomain.id, modelingDomain.id];
  clarify.outcomeIds = outcomeIds;
  clarify.actorIds = [primaryActor.id, reviewer.id];
  clarify.inputs = ["Project context"];
  clarify.outputs = ["Intent", "Outcomes"];

  const structure = createProjectFunction();
  structure.name = "Structure framework entities";
  structure.description = "Create connected domains, functions, components, flows, and scope items.";
  structure.domainIds = [modelingDomain.id];
  structure.outcomeIds = outcomeIds;
  structure.actorIds = [primaryActor.id];
  structure.inputs = ["Intent", "Outcomes"];
  structure.outputs = ["Connected framework structure"];

  const validate = createProjectFunction();
  validate.name = "Validate coherence and readiness";
  validate.description = "Check structural completeness, references, governance, and scope separation.";
  validate.domainIds = [governanceDomain.id];
  validate.outcomeIds = outcomeIds;
  validate.actorIds = [reviewer.id];
  validate.inputs = ["Connected framework structure"];
  validate.outputs = ["Validation state", "Readiness summary"];

  const output = createProjectFunction();
  output.name = "Prepare implementation output";
  output.description = "Package the validated blueprint for implementation planning or export.";
  output.domainIds = [outputDomain.id];
  output.outcomeIds = outcomeIds;
  output.actorIds = [primaryActor.id, reviewer.id];
  output.inputs = ["Validated blueprint"];
  output.outputs = ["Implementation-ready blueprint"];

  return [capture, clarify, structure, validate, output];
};

const createCompletionComponents = (input: {
  domains: Domain[];
  functions: ProjectFunction[];
}): Component[] => {
  const intakeDomain = pick(input.domains, 0);
  const modelingDomain = pick(input.domains, 1);
  const governanceDomain = pick(input.domains, 2);
  const outputDomain = pick(input.domains, 3);
  const capture = pick(input.functions, 0);
  const clarify = pick(input.functions, 1);
  const structure = pick(input.functions, 2);
  const validate = pick(input.functions, 3);
  const output = pick(input.functions, 4);

  const guidedIntake = createComponent();
  guidedIntake.name = "Guided Intake";
  guidedIntake.description = "Collects the raw idea and clarifying context.";
  guidedIntake.purpose = "Preserve original intent before structure is generated or edited.";
  guidedIntake.domainIds = [intakeDomain.id];
  guidedIntake.functionIds = [capture.id, clarify.id];
  guidedIntake.inputs = ["Raw idea"];
  guidedIntake.outputs = ["Clarified intent"];

  const composer = createComponent();
  composer.name = "Blueprint Composer";
  composer.description = "Builds conservative connected structure from missing blueprint sections.";
  composer.purpose = "Populate the framework without replacing user-authored content.";
  composer.domainIds = [modelingDomain.id];
  composer.functionIds = [structure.id];
  composer.inputs = ["Intent", "Outcomes"];
  composer.outputs = ["Structured blueprint entities"];

  const validation = createComponent();
  validation.name = "Validation Panel";
  validation.description = "Shows completeness, relational, and readiness checks.";
  validation.purpose = "Prevent empty or unconnected blueprints from appearing build-ready.";
  validation.domainIds = [governanceDomain.id];
  validation.functionIds = [validate.id];
  validation.inputs = ["Blueprint entities"];
  validation.outputs = ["Validation state"];

  const workspace = createComponent();
  workspace.name = "Blueprint Workspace";
  workspace.description = "Lets users inspect, refine, and save the completed blueprint.";
  workspace.purpose = "Keep generated structure editable and reviewable.";
  workspace.domainIds = [modelingDomain.id, governanceDomain.id];
  workspace.functionIds = [clarify.id, structure.id, validate.id];
  workspace.inputs = ["Structured blueprint entities", "Validation state"];
  workspace.outputs = ["Reviewed blueprint"];

  const exportSurface = createComponent();
  exportSurface.name = "Export Surface";
  exportSurface.description = "Prepares blueprint output for implementation use.";
  exportSurface.purpose = "Expose a practical implementation handoff after validation.";
  exportSurface.domainIds = [outputDomain.id];
  exportSurface.functionIds = [output.id];
  exportSurface.inputs = ["Reviewed blueprint"];
  exportSurface.outputs = ["Implementation output"];

  return [guidedIntake, composer, validation, workspace, exportSurface];
};

const createDependencyBetween = (name: string, description: string, source: Component, target: Component) => {
  const dependency = createDependency();
  dependency.name = name;
  dependency.description = description;
  dependency.kind = "internal";
  dependency.sourceEntityId = source.id;
  dependency.targetEntityId = target.id;
  return dependency;
};

const createCompletionDependencies = (components: Component[]) => {
  if (components.length < 4) {
    return [];
  }

  const guidedIntake = pick(components, 0);
  const composer = pick(components, 1);
  const validation = pick(components, 2);
  const exportSurface = components[4] ?? pick(components, 3);

  return [
    createDependencyBetween(
      "Guided Intake feeds Blueprint Composer",
      "Clarified input is handed to the composer.",
      guidedIntake,
      composer,
    ),
    createDependencyBetween(
      "Blueprint Composer feeds Validation Panel",
      "Generated structure is validated before build-ready claims.",
      composer,
      validation,
    ),
    createDependencyBetween(
      "Validation Panel feeds Export Surface",
      "Only reviewed readiness output moves into implementation handoff.",
      validation,
      exportSurface,
    ),
  ];
};

const createCompletionRules = (): Rule[] => {
  const rawIntent = createRule();
  rawIntent.name = "Every framework must preserve the raw intent";
  rawIntent.description = "The original raw idea and clarified intent must remain visible in the blueprint.";
  rawIntent.scope = "global";
  rawIntent.enforcement = "Review stable saves for hidden or overwritten intent.";
  rawIntent.policy.reviewMessage = "Stable changes should preserve the original intent.";
  rawIntent.policy.recommendation = "Check project raw idea, intent, and outcomes before accepting the change.";
  rawIntent.policy.rationale = "Framework structure is only useful when its source intent stays traceable.";

  const scope = createRule();
  scope.name = "MVP and expansion scope must stay separate";
  scope.description = "First-build commitments and future ideas must stay in distinct scope collections.";
  scope.scope = "global";
  scope.enforcement = "Validation checks scope item separation.";
  scope.policy.blocksBuildReady = true;
  scope.policy.reviewMessage = "Scope separation protects the first implementation boundary.";
  scope.policy.recommendation = "Move future ideas to expansion scope before claiming build-ready.";
  scope.policy.rationale = "Mixed scope makes implementation planning unreliable.";

  const connected = createRule();
  connected.name = "Build-ready requires connected structure";
  connected.description = "Build-ready requires mapped outcomes, functions, components, and scope items.";
  connected.scope = "global";
  connected.enforcement = "Validation blocks critical structural gaps.";
  connected.policy.blocksBuildReady = true;
  connected.policy.reviewMessage = "Build-ready cannot be claimed without connected entities.";
  connected.policy.recommendation = "Resolve critical validation checks before promotion.";
  connected.policy.rationale = "Vacuous validation should not imply implementation readiness.";

  return [rawIntent, scope, connected];
};

const createCompletionInvariants = (): Invariant[] => {
  const explicit = createInvariant();
  explicit.name = "Structure remains explicit";
  explicit.description = "Core framework entities and their relationships remain visible.";
  explicit.violationMessage = "Framework structure cannot be hidden or implied.";

  const buildReady = createInvariant();
  buildReady.name = "No build-ready claim without connected entities";
  buildReady.description = "Build-ready requires outcomes, functions, components, and MVP items to be connected.";
  buildReady.priority = "critical";
  buildReady.violationMessage = "Build-ready claims require connected blueprint entities.";

  const governance = createInvariant();
  governance.name = "Governance remains inspectable";
  governance.description = "Rules, invariants, guardrails, decisions, and failure modes remain visible.";
  governance.violationMessage = "Governance cannot be hidden outside the blueprint.";

  return [explicit, buildReady, governance].map((invariant) => ({
    ...invariant,
    scope: "global" as const,
    scopeEntityIds: [],
    policy: {
      ...invariant.policy,
      reviewSeverity: "warning" as const,
      blocksBuildReady: true,
      overrideAllowed: false,
      reviewMessage: invariant.violationMessage,
      recommendation: "Review the completed structure before treating the project as build-ready.",
      rationale: "Completion must create inspectable governance, not hidden confidence.",
    },
  }));
};

const createCompletionGuardrails = (projectId: string): Guardrail[] => {
  const vague = createGuardrail();
  vague.name = "Prevent vague unconnected frameworks";
  vague.description = "A framework must include mapped structure before implementation planning.";
  vague.protectedAgainst = "An empty or vague blueprint appearing complete.";
  vague.scope = "project";
  vague.scopeEntityIds = [projectId];

  const scopeMixing = createGuardrail();
  scopeMixing.name = "Prevent MVP/expansion scope mixing";
  scopeMixing.description = "MVP scope and expansion ideas stay separated.";
  scopeMixing.protectedAgainst = "Future ideas contaminating first-build scope.";
  scopeMixing.scope = "global";

  const hiddenAssumptions = createGuardrail();
  hiddenAssumptions.name = "Prevent hidden assumptions";
  hiddenAssumptions.description = "Assumptions should become constraints, decisions, rules, or failure modes.";
  hiddenAssumptions.protectedAgainst = "Implementation work based on invisible assumptions.";
  hiddenAssumptions.scope = "global";

  return [vague, scopeMixing, hiddenAssumptions];
};

const createCompletionFlow = (input: {
  actors: Actor[];
  functions: ProjectFunction[];
  components: Component[];
}): Flow => {
  const flow = createFlow();
  flow.name = "Raw idea to implementation-ready blueprint";
  flow.description = "Raw idea -> guided intake -> structured blueprint -> validation -> export.";
  flow.stepSummary = "Capture raw idea, clarify intent, compose structure, validate readiness, prepare output.";
  flow.actorIds = ids(input.actors);
  flow.functionIds = ids(input.functions);
  flow.componentIds = ids(input.components);
  return flow;
};

const createCompletionPhases = (input: {
  functions: ProjectFunction[];
  components: Component[];
}): Phase[] => {
  const capture = pick(input.functions, 0);
  const clarify = pick(input.functions, 1);
  const structure = pick(input.functions, 2);
  const validate = pick(input.functions, 3);
  const output = pick(input.functions, 4);
  const guidedIntake = pick(input.components, 0);
  const composer = pick(input.components, 1);
  const validation = pick(input.components, 2);
  const workspace = pick(input.components, 3);
  const exportSurface = pick(input.components, 4);

  const foundation = createPhase();
  foundation.name = "Foundation";
  foundation.description = "Preserve raw idea and clarify intent.";
  foundation.order = 1;
  foundation.objective = "Establish the problem, audience, and intended outcome.";
  foundation.functionIds = [capture.id, clarify.id];
  foundation.componentIds = [guidedIntake.id];
  foundation.exitCriteria = ["Raw idea is preserved", "Intent and outcomes are explicit"];

  const structurePhase = createPhase();
  structurePhase.name = "Structure";
  structurePhase.description = "Generate connected framework entities.";
  structurePhase.order = 2;
  structurePhase.objective = "Populate domains, functions, components, flows, and scope.";
  structurePhase.functionIds = [structure.id];
  structurePhase.componentIds = [composer.id, workspace.id];
  structurePhase.exitCriteria = ["Functions map to outcomes", "Components map to functions"];

  const governance = createPhase();
  governance.name = "Governance Review";
  governance.description = "Check validation, governance, decisions, and failure modes.";
  governance.order = 3;
  governance.objective = "Confirm the blueprint is coherent and inspectable.";
  governance.functionIds = [validate.id];
  governance.componentIds = [validation.id, workspace.id];
  governance.exitCriteria = ["Critical validation checks pass", "Governance remains visible"];

  const outputPhase = createPhase();
  outputPhase.name = "Output";
  outputPhase.description = "Prepare the validated blueprint for implementation handoff.";
  outputPhase.order = 4;
  outputPhase.objective = "Make the completed framework usable beyond the editor.";
  outputPhase.functionIds = [output.id];
  outputPhase.componentIds = [exportSurface.id];
  outputPhase.exitCriteria = ["Blueprint is ready for implementation planning"];

  return [foundation, structurePhase, governance, outputPhase];
};

const createMappedScopeItem = (input: {
  name: string;
  description: string;
  outcomeIds: string[];
  functionIds: string[];
  componentIds: string[];
  rationale: string;
}): ScopeItem => {
  const item = createScopeItem(input.name);
  item.description = input.description;
  item.outcomeIds = input.outcomeIds;
  item.functionIds = input.functionIds;
  item.componentIds = input.componentIds;
  item.rationale = input.rationale;
  return item;
};

const createMvpItems = (input: {
  outcomes: Outcome[];
  functions: ProjectFunction[];
  components: Component[];
}): ScopeItem[] => {
  const outcomeIds = [pick(input.outcomes, 0).id];
  const capture = pick(input.functions, 0);
  const structure = pick(input.functions, 2);
  const validate = pick(input.functions, 3);
  const inspect = pick(input.functions, 1);
  const guidedIntake = pick(input.components, 0);
  const composer = pick(input.components, 1);
  const validation = pick(input.components, 2);
  const workspace = pick(input.components, 3);

  return [
    createMappedScopeItem({
      name: "Create project from raw idea",
      description: "Capture the initial idea and preserve its context.",
      outcomeIds,
      functionIds: [capture.id],
      componentIds: [guidedIntake.id],
      rationale: "A framework must start from traceable intent.",
    }),
    createMappedScopeItem({
      name: "Generate connected framework structure",
      description: "Populate domains, functions, components, flows, and phases.",
      outcomeIds,
      functionIds: [structure.id],
      componentIds: [composer.id],
      rationale: "Connected structure prevents empty blueprints from appearing complete.",
    }),
    createMappedScopeItem({
      name: "Validate framework readiness",
      description: "Run completeness, relationship, governance, and scope checks.",
      outcomeIds,
      functionIds: [validate.id],
      componentIds: [validation.id],
      rationale: "Validation is the gate before implementation planning.",
    }),
    createMappedScopeItem({
      name: "Inspect and refine blueprint",
      description: "Let users review, edit, and save the completed framework.",
      outcomeIds,
      functionIds: [inspect.id, structure.id],
      componentIds: [workspace.id],
      rationale: "Generated structure remains user-editable and reviewable.",
    }),
  ];
};

const createExpansionItems = (input: {
  outcomes: Outcome[];
  functions: ProjectFunction[];
  components: Component[];
}): ScopeItem[] => {
  const outcomeIds = [pick(input.outcomes, 0).id];
  const structure = pick(input.functions, 2);
  const validate = pick(input.functions, 3);
  const output = pick(input.functions, 4);
  const composer = pick(input.components, 1);
  const workspace = pick(input.components, 3);
  const exportSurface = pick(input.components, 4);

  return [
    createMappedScopeItem({
      name: "Expansion: AI-assisted extraction",
      description: "Use automation later to suggest structure from richer input.",
      outcomeIds,
      functionIds: [structure.id],
      componentIds: [composer.id],
      rationale: "Automation belongs after deterministic completion and validation are stable.",
    }),
    createMappedScopeItem({
      name: "Expansion: reusable templates",
      description: "Offer reusable framework patterns after the base model is proven.",
      outcomeIds,
      functionIds: [structure.id],
      componentIds: [workspace.id],
      rationale: "Templates should build on the same governed structure.",
    }),
    createMappedScopeItem({
      name: "Expansion: export/share workflows",
      description: "Broaden implementation handoff and sharing support.",
      outcomeIds,
      functionIds: [output.id],
      componentIds: [exportSurface.id],
      rationale: "Sharing is valuable after local-first editing and validation are reliable.",
    }),
    createMappedScopeItem({
      name: "Expansion: collaboration/versioning",
      description: "Add richer collaboration and version workflows later.",
      outcomeIds,
      functionIds: [validate.id, output.id],
      componentIds: [workspace.id, exportSurface.id],
      rationale: "Collaboration should not precede stable local revision semantics.",
    }),
  ];
};

const createCompletionDecisionRecords = (input: {
  projectId: string;
  functionIds: string[];
  componentIds: string[];
  ruleIds: string[];
  invariantIds: string[];
  mvpItemIds: string[];
  expansionItemIds: string[];
}): DecisionRecord[] => {
  const composer = createDecisionRecord();
  composer.title = "Use deterministic local-first composer";
  composer.summary = "Missing structure is completed locally from the existing blueprint context.";
  composer.reason = "The completion engine should improve usability without backend or external AI dependencies.";
  composer.status = "accepted";
  composer.relatedEntityIds = [input.projectId, ...input.functionIds.slice(0, 3), ...input.componentIds.slice(0, 2)];
  composer.rejectedOptions = ["Call an external AI service", "Replace the user's existing blueprint sections"];
  composer.scopeDecision = "architecture";

  const validation = createDecisionRecord();
  validation.title = "Build-ready requires validation";
  validation.summary = "Completion is still checked by the central validator before saving.";
  validation.reason = "Generated structure must not bypass schema, validation, or stable review.";
  validation.status = "accepted";
  validation.relatedEntityIds = [input.projectId, ...input.ruleIds, ...input.invariantIds];
  validation.rejectedOptions = ["Treat generated structure as automatically trusted"];
  validation.scopeDecision = "governance";

  const scope = createDecisionRecord();
  scope.title = "Separate MVP from expansion";
  scope.summary = "First-build scope and future ideas stay in distinct scope collections.";
  scope.reason = "Scope separation keeps implementation planning practical.";
  scope.status = "accepted";
  scope.relatedEntityIds = [input.projectId, ...input.mvpItemIds, ...input.expansionItemIds];
  scope.rejectedOptions = ["Merge all ideas into one implementation backlog"];
  scope.scopeDecision = "mvp";

  return [composer, validation, scope];
};

const createCompletionFailureModes = (input: {
  projectId: string;
  functionIds: string[];
  componentIds: string[];
  ruleIds: string[];
  guardrailIds: string[];
  mvpItemIds: string[];
}): FailureMode[] => {
  const empty = createFailureMode();
  empty.name = "Empty framework passes as complete";
  empty.description = "A blueprint with only project, intent, and outcome is mistaken for build-ready.";
  empty.severity = "critical";
  empty.mitigation = "Run structural completeness validation and complete missing sections.";
  empty.relatedEntityIds = [input.projectId, ...input.ruleIds.slice(0, 1)];

  const unmapped = createFailureMode();
  unmapped.name = "Unmapped entities create confusion";
  unmapped.description = "Functions, components, or scope items exist without valid relationships.";
  unmapped.severity = "high";
  unmapped.mitigation = "Keep generated entities mapped to outcomes, functions, and components.";
  unmapped.relatedEntityIds = [...input.functionIds.slice(0, 3), ...input.componentIds.slice(0, 3)];

  const scope = createFailureMode();
  scope.name = "Expansion scope contaminates MVP";
  scope.description = "Future capabilities are treated as first-build commitments.";
  scope.severity = "medium";
  scope.mitigation = "Keep MVP and expansion scope items distinct.";
  scope.relatedEntityIds = [...input.mvpItemIds, ...input.guardrailIds.slice(0, 2)];

  const hidden = createFailureMode();
  hidden.name = "Governance becomes hidden";
  hidden.description = "Rules, invariants, guardrails, or decisions fall out of the visible blueprint.";
  hidden.severity = "high";
  hidden.mitigation = "Keep governance entities inspectable and covered by validation.";
  hidden.relatedEntityIds = [input.projectId, ...input.ruleIds, ...input.guardrailIds];

  return [empty, unmapped, scope, hidden];
};

const attachGeneratedRelationshipMetadata = (input: {
  componentsWereGenerated: boolean;
  components: Component[];
  dependencies: ReturnType<typeof createDependency>[];
  invariants: Invariant[];
  guardrails: Guardrail[];
}) => {
  if (!input.componentsWereGenerated) {
    return;
  }

  const composer = input.components[1];
  const validation = input.components[2];
  const workspace = input.components[3];
  const exportSurface = input.components[4];

  if (composer) {
    composer.dependencyIds = input.dependencies.slice(0, 2).map((dependency) => dependency.id);
    composer.invariantIds = input.invariants.slice(0, 2).map((invariant) => invariant.id);
    composer.guardrailIds = input.guardrails.slice(0, 1).map((guardrail) => guardrail.id);
  }

  if (validation) {
    validation.dependencyIds = input.dependencies.slice(1, 3).map((dependency) => dependency.id);
    validation.invariantIds = ids(input.invariants);
    validation.guardrailIds = ids(input.guardrails);
  }

  if (workspace) {
    workspace.invariantIds = input.invariants.slice(0, 1).map((invariant) => invariant.id);
    workspace.guardrailIds = input.guardrails.slice(1, 3).map((guardrail) => guardrail.id);
  }

  if (exportSurface) {
    exportSurface.dependencyIds = input.dependencies.slice(2, 3).map((dependency) => dependency.id);
  }
};

export const completeBlueprintStructure = (blueprint: ProjectBlueprint): ProjectBlueprint => {
  const next = cloneBlueprint(blueprint);

  if (next.outcomes.length === 0) {
    next.outcomes = [createCompletionOutcome(next)];
  }

  if (next.actors.length === 0) {
    next.actors = [createPrimaryActor(next), createSecondaryActor()];
  }

  if (next.domains.length === 0) {
    next.domains = createCompletionDomains(ids(next.outcomes));
  }

  if (next.functions.length === 0) {
    next.functions = createCompletionFunctions({
      outcomes: next.outcomes,
      actors: next.actors,
      domains: next.domains,
    });
  }

  const componentsWereGenerated = next.components.length === 0;
  if (componentsWereGenerated) {
    next.components = createCompletionComponents({
      domains: next.domains,
      functions: next.functions,
    });
  }

  if (next.flows.length === 0) {
    next.flows = [
      createCompletionFlow({
        actors: next.actors,
        functions: next.functions,
        components: next.components,
      }),
    ];
  }

  if (next.dependencies.length === 0) {
    next.dependencies = createCompletionDependencies(next.components);
  }

  if (next.rules.length === 0) {
    next.rules = createCompletionRules();
  }

  if (next.invariants.length === 0) {
    next.invariants = createCompletionInvariants();
  }

  if (next.guardrails.length === 0) {
    next.guardrails = createCompletionGuardrails(next.project.id);
  }

  attachGeneratedRelationshipMetadata({
    componentsWereGenerated,
    components: next.components,
    dependencies: next.dependencies,
    invariants: next.invariants,
    guardrails: next.guardrails,
  });

  if (next.phases.length === 0) {
    next.phases = createCompletionPhases({
      functions: next.functions,
      components: next.components,
    });
  }

  if (!next.mvpScope.summary.trim()) {
    next.mvpScope.summary = `First build for ${next.project.name}: preserve the raw idea, create connected framework structure, validate readiness, and support inspection.`;
  }

  if (!next.mvpScope.successDefinition.trim()) {
    next.mvpScope.successDefinition =
      "A builder can inspect a connected blueprint with explicit outcomes, actors, domains, functions, components, governance, and MVP scope.";
  }

  if (next.mvpScope.items.length === 0) {
    next.mvpScope.items = createMvpItems({
      outcomes: next.outcomes,
      functions: next.functions,
      components: next.components,
    });
  }

  if (!next.expansionScope.summary.trim()) {
    next.expansionScope.summary =
      "Future capabilities can expand automation, reuse, sharing, and collaboration after the governed MVP is stable.";
  }

  if (next.expansionScope.futureSignals.length === 0) {
    next.expansionScope.futureSignals = [
      "Users need faster intake from richer notes",
      "Several projects repeat the same framework patterns",
      "Validated blueprints need export or sharing workflows",
      "Multiple people need to review framework changes",
    ];
  }

  if (next.expansionScope.items.length === 0) {
    next.expansionScope.items = createExpansionItems({
      outcomes: next.outcomes,
      functions: next.functions,
      components: next.components,
    });
  }

  if (next.decisionLogic.principles.length === 0) {
    next.decisionLogic = {
      ...next.decisionLogic,
      principles: [
        "Preserve intent before implementation",
        "Make structure explicit",
        "Validate before build-ready",
        "Separate MVP from expansion",
      ],
    };
  }

  if (next.decisionLogic.records.length === 0) {
    next.decisionLogic.records = createCompletionDecisionRecords({
      projectId: next.project.id,
      functionIds: ids(next.functions),
      componentIds: ids(next.components),
      ruleIds: ids(next.rules),
      invariantIds: ids(next.invariants),
      mvpItemIds: ids(next.mvpScope.items),
      expansionItemIds: ids(next.expansionScope.items),
    });
  }

  if (next.failureModes.length === 0) {
    next.failureModes = createCompletionFailureModes({
      projectId: next.project.id,
      functionIds: ids(next.functions),
      componentIds: ids(next.components),
      ruleIds: ids(next.rules),
      guardrailIds: ids(next.guardrails),
      mvpItemIds: ids(next.mvpScope.items),
    });
  }

  next.validation = validateBlueprint(next);

  return ProjectBlueprintSchema.parse(next);
};
