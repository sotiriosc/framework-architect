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
  createMemoryEntry,
  createOutcome,
  createPhase,
  createProject,
  createProjectFunction,
  createRule,
  createScopeItem,
} from "@/domain/defaults";
import type { ProjectBlueprint } from "@/domain/models";
import { validateBlueprint } from "@/application/validation/validateBlueprint";

export const createSeedBlueprint = (): ProjectBlueprint => {
  const project = createProject({
    name: "Framework Architect Seed",
    rawIdea:
      "Create a local-first app that turns raw project ideas into governed blueprints with memory, validation, and structural decisions.",
    corePhilosophy: "Architecture before implementation. Governance must be inspectable.",
  });
  project.invariantPriorities = ["Transparency", "Local-first persistence", "Explicit governance"];

  const intent = createIntent("Turn a raw project idea into a buildable blueprint.");
  intent.problemStatement =
    "Builders lose time when project ideas are captured only as informal notes and unstated assumptions.";
  intent.targetAudience = "Founders, operators, and builders preparing a project for implementation.";
  intent.valueHypothesis =
    "A governed blueprint reduces ambiguity and preserves architectural decisions over time.";

  const primaryOutcome = createOutcome("Blueprint is buildable without hidden assumptions");
  primaryOutcome.description = "The system produces a blueprint that a builder can execute against.";
  primaryOutcome.successMetric = "Every core entity is present, mapped, and validated.";

  const secondaryOutcome = createOutcome("Architectural decisions remain inspectable over time");
  secondaryOutcome.description = "Memory and decisions persist alongside the structure.";
  secondaryOutcome.successMetric = "Project, structural, and decision memory are all populated.";
  secondaryOutcome.priority = "medium";

  const builder = createActor();
  builder.name = "Builder";
  builder.description = "Implements the governed structure.";
  builder.role = "Delivery";
  builder.needs = ["Clear scope", "Traceable decisions", "Reliable validation"];

  const founder = createActor();
  founder.name = "Founder";
  founder.description = "Owns the intended outcome and project direction.";
  founder.role = "Sponsor";
  founder.needs = ["Visible tradeoffs", "MVP clarity", "Expansion path"];

  const localFirstConstraint = createConstraint();
  localFirstConstraint.name = "Local-first persistence";
  localFirstConstraint.description = "V1 must work without a backend.";
  localFirstConstraint.kind = "technical";
  localFirstConstraint.severity = "high";
  localFirstConstraint.hardConstraint = true;
  localFirstConstraint.value = "browser storage";

  const scopeConstraint = createConstraint();
  scopeConstraint.name = "No AI orchestration in v1";
  scopeConstraint.description = "The first version focuses on explicit structure, memory, and validation.";
  scopeConstraint.kind = "scope";
  scopeConstraint.hardConstraint = true;

  const intakeDomain = createDomain();
  intakeDomain.name = "Idea Intake";
  intakeDomain.description = "Captures the raw idea and extracts intent.";
  intakeDomain.responsibility = "Turn project ideas into a normalized intent and outcome draft.";
  intakeDomain.outcomeIds = [primaryOutcome.id];

  const modelingDomain = createDomain();
  modelingDomain.name = "Blueprint Modeling";
  modelingDomain.description = "Stores governed architecture entities.";
  modelingDomain.responsibility = "Maintain the structural blueprint and scope decisions.";
  modelingDomain.outcomeIds = [primaryOutcome.id, secondaryOutcome.id];

  const governanceDomain = createDomain();
  governanceDomain.name = "Governance Review";
  governanceDomain.description = "Keeps validation, rules, and invariants explicit.";
  governanceDomain.responsibility = "Prevent invalid blueprints from being treated as build-ready.";
  governanceDomain.outcomeIds = [secondaryOutcome.id];

  const captureFunction = createProjectFunction();
  captureFunction.name = "Capture raw project idea";
  captureFunction.description = "Accept the raw idea and generate the first intent statement.";
  captureFunction.domainIds = [intakeDomain.id];
  captureFunction.outcomeIds = [primaryOutcome.id];
  captureFunction.actorIds = [founder.id];
  captureFunction.inputs = ["Raw idea"];
  captureFunction.outputs = ["Intent draft", "Outcome draft"];

  const structureFunction = createProjectFunction();
  structureFunction.name = "Model governed blueprint";
  structureFunction.description = "Store the architecture entities and keep them inspectable.";
  structureFunction.domainIds = [modelingDomain.id];
  structureFunction.outcomeIds = [primaryOutcome.id, secondaryOutcome.id];
  structureFunction.actorIds = [builder.id, founder.id];
  structureFunction.inputs = ["Intent", "Constraints", "Governance rules"];
  structureFunction.outputs = ["Project blueprint"];

  const validateFunction = createProjectFunction();
  validateFunction.name = "Validate structural readiness";
  validateFunction.description = "Run structural checks before build-ready status is allowed.";
  validateFunction.domainIds = [governanceDomain.id];
  validateFunction.outcomeIds = [secondaryOutcome.id];
  validateFunction.actorIds = [builder.id];
  validateFunction.inputs = ["Blueprint entities"];
  validateFunction.outputs = ["Validation report"];

  const intakeComponent = createComponent();
  intakeComponent.name = "Project Intake Workspace";
  intakeComponent.description = "Minimal workspace for entering the raw idea and editing intent.";
  intakeComponent.purpose = "Capture the raw idea and refine the initial intent.";
  intakeComponent.domainIds = [intakeDomain.id];
  intakeComponent.functionIds = [captureFunction.id];
  intakeComponent.inputs = ["Raw idea"];
  intakeComponent.outputs = ["Intent draft", "Outcome draft"];

  const registryComponent = createComponent();
  registryComponent.name = "Blueprint Registry";
  registryComponent.description = "Stores the governed architecture document locally.";
  registryComponent.purpose = "Persist the governed blueprint and memory snapshots.";
  registryComponent.domainIds = [modelingDomain.id];
  registryComponent.functionIds = [structureFunction.id];
  registryComponent.inputs = ["Blueprint entities", "Decision records", "Validation snapshots"];
  registryComponent.outputs = ["Saved project blueprint"];

  const validationComponent = createComponent();
  validationComponent.name = "Validation Panel";
  validationComponent.description = "Shows structural checks and build-ready blockers.";
  validationComponent.purpose = "Surface validation failures before implementation begins.";
  validationComponent.domainIds = [governanceDomain.id];
  validationComponent.functionIds = [validateFunction.id];
  validationComponent.inputs = ["Blueprint entities"];
  validationComponent.outputs = ["Validation checks"];

  const intakeToRegistry = createDependency();
  intakeToRegistry.name = "Intake writes to registry";
  intakeToRegistry.description = "The intake workspace persists normalized project structure.";
  intakeToRegistry.kind = "internal";
  intakeToRegistry.sourceEntityId = intakeComponent.id;
  intakeToRegistry.targetEntityId = registryComponent.id;

  const validationToRegistry = createDependency();
  validationToRegistry.name = "Validation reads from registry";
  validationToRegistry.description = "Validation checks run against the stored blueprint.";
  validationToRegistry.kind = "internal";
  validationToRegistry.sourceEntityId = validationComponent.id;
  validationToRegistry.targetEntityId = registryComponent.id;

  intakeComponent.dependencyIds = [intakeToRegistry.id];
  validationComponent.dependencyIds = [validationToRegistry.id];

  const intakeFlow = createFlow();
  intakeFlow.name = "Idea to blueprint flow";
  intakeFlow.description = "From raw idea capture to a persisted blueprint draft.";
  intakeFlow.stepSummary = "Capture idea, extract intent, persist project blueprint, validate structure.";
  intakeFlow.actorIds = [founder.id, builder.id];
  intakeFlow.functionIds = [captureFunction.id, structureFunction.id, validateFunction.id];
  intakeFlow.componentIds = [intakeComponent.id, registryComponent.id, validationComponent.id];

  const memoryRule = createRule();
  memoryRule.name = "Every save records memory";
  memoryRule.description = "Project, structural, and decision memory must be preserved on every save.";
  memoryRule.scope = "global";
  memoryRule.enforcement = "Required before persistence completes.";
  memoryRule.policy.reviewSeverity = "warning";
  memoryRule.policy.requiresConfirmation = true;
  memoryRule.policy.reviewMessage = "Stable persistence should not bypass memory capture.";
  memoryRule.policy.recommendation = "Review memory capture semantics before accepting the stable change.";
  memoryRule.policy.rationale = "Memory drift breaks traceability across revisions.";

  const validationRule = createRule();
  validationRule.name = "Validation gates build-ready";
  validationRule.description = "Critical validation failures block build-ready state.";
  validationRule.scope = "global";
  validationRule.enforcement = "System-enforced during save.";
  validationRule.policy.reviewSeverity = "warning";
  validationRule.policy.blocksBuildReady = true;
  validationRule.policy.reviewMessage = "Build-ready promotion must respect explicit validation gates.";
  validationRule.policy.recommendation = "Resolve blocker-level validation issues before promoting build-ready.";
  validationRule.policy.rationale = "Build-ready claims cannot outrun structural validation.";

  const transparencyInvariant = createInvariant();
  transparencyInvariant.name = "Governance stays explicit";
  transparencyInvariant.description = "Rules, invariants, and decisions must remain inspectable.";
  transparencyInvariant.scope = "global";
  transparencyInvariant.priority = "critical";
  transparencyInvariant.violationMessage = "Governance logic cannot be hidden from the blueprint.";
  transparencyInvariant.policy.reviewSeverity = "warning";
  transparencyInvariant.policy.blocksBuildReady = true;
  transparencyInvariant.policy.reviewMessage = transparencyInvariant.violationMessage;
  transparencyInvariant.policy.recommendation =
    "Review the changed governance surface before treating the project as stable truth.";
  transparencyInvariant.policy.rationale = "Hidden governance creates structural drift.";

  const localFirstInvariant = createInvariant();
  localFirstInvariant.name = "Persistence remains local-first in v1";
  localFirstInvariant.description = "The initial implementation must work without backend infrastructure.";
  localFirstInvariant.scope = "global";
  localFirstInvariant.violationMessage = "V1 cannot require backend infrastructure to function.";
  localFirstInvariant.policy.reviewSeverity = "warning";
  localFirstInvariant.policy.blocksBuildReady = true;
  localFirstInvariant.policy.reviewMessage = localFirstInvariant.violationMessage;
  localFirstInvariant.policy.recommendation =
    "Confirm the stable change still preserves the local-first promise before promotion.";
  localFirstInvariant.policy.rationale = "Infrastructure drift breaks the v1 architecture contract.";

  const codegenGuardrail = createGuardrail();
  codegenGuardrail.name = "No code generation in v1";
  codegenGuardrail.description = "The product structures architecture before implementation.";
  codegenGuardrail.protectedAgainst = "Premature generation of implementation artifacts.";
  codegenGuardrail.scope = "project";
  codegenGuardrail.scopeEntityIds = [project.id];

  const hiddenLogicGuardrail = createGuardrail();
  hiddenLogicGuardrail.name = "No hidden governance logic";
  hiddenLogicGuardrail.description = "Validation and invariants must stay visible in the system.";
  hiddenLogicGuardrail.protectedAgainst = "Implicit or buried decision rules.";
  hiddenLogicGuardrail.scope = "global";

  const foundationPhase = createPhase();
  foundationPhase.name = "Foundation";
  foundationPhase.description = "Create the initial blueprint and preserve intent.";
  foundationPhase.order = 1;
  foundationPhase.objective = "Capture the project idea and model the first architecture draft.";
  foundationPhase.functionIds = [captureFunction.id, structureFunction.id];
  foundationPhase.componentIds = [intakeComponent.id, registryComponent.id];
  foundationPhase.exitCriteria = ["Intent is explicit", "Blueprint is persisted"];

  const governancePhase = createPhase();
  governancePhase.name = "Governance Review";
  governancePhase.description = "Validate the blueprint before any build-ready claim.";
  governancePhase.order = 2;
  governancePhase.objective = "Review mappings, scope boundaries, and blockers.";
  governancePhase.functionIds = [validateFunction.id];
  governancePhase.componentIds = [validationComponent.id];
  governancePhase.exitCriteria = ["Critical checks pass", "Guardrails are visible"];

  const createProjectScopeItem = createScopeItem("Create project and raw idea intake");
  createProjectScopeItem.functionIds = [captureFunction.id];
  createProjectScopeItem.componentIds = [intakeComponent.id];
  createProjectScopeItem.outcomeIds = [primaryOutcome.id];
  createProjectScopeItem.rationale = "A project must start from a raw idea.";

  const inspectBlueprintScopeItem = createScopeItem("Inspect governed blueprint");
  inspectBlueprintScopeItem.functionIds = [structureFunction.id];
  inspectBlueprintScopeItem.componentIds = [registryComponent.id];
  inspectBlueprintScopeItem.outcomeIds = [primaryOutcome.id];
  inspectBlueprintScopeItem.rationale = "Builders need transparent structure before implementation.";

  const reviewValidationScopeItem = createScopeItem("Review validation and readiness");
  reviewValidationScopeItem.functionIds = [validateFunction.id];
  reviewValidationScopeItem.componentIds = [validationComponent.id];
  reviewValidationScopeItem.outcomeIds = [secondaryOutcome.id];
  reviewValidationScopeItem.rationale = "Governance checks must be visible before execution.";

  const expansionScopeItem = createScopeItem("AI-assisted extraction");
  expansionScopeItem.functionIds = [captureFunction.id];
  expansionScopeItem.componentIds = [intakeComponent.id];
  expansionScopeItem.outcomeIds = [secondaryOutcome.id];
  expansionScopeItem.rationale = "Smarter extraction belongs after the governance contract is stable.";

  const localFirstDecision = createDecisionRecord();
  localFirstDecision.title = "Use local-first storage in v1";
  localFirstDecision.summary = "The first version stores projects and memory locally.";
  localFirstDecision.reason = "It keeps the architecture explicit and avoids backend coupling during foundation work.";
  localFirstDecision.status = "accepted";
  localFirstDecision.relatedEntityIds = [project.id, registryComponent.id];
  localFirstDecision.scopeDecision = "architecture";
  localFirstDecision.rejectedOptions = ["Start with hosted database", "Hide persistence behind server routes first"];

  const noCodegenDecision = createDecisionRecord();
  noCodegenDecision.title = "Exclude code generation from v1";
  noCodegenDecision.summary = "The product focuses on governed architecture output first.";
  noCodegenDecision.reason = "Code generation would hide whether the architecture contract is actually sound.";
  noCodegenDecision.status = "accepted";
  noCodegenDecision.relatedEntityIds = [project.id, codegenGuardrail.id];
  noCodegenDecision.scopeDecision = "mvp";
  noCodegenDecision.rejectedOptions = ["Generate implementation stubs immediately"];

  const decisionLogic = createDecisionLogic();
  decisionLogic.principles = [
    "Architecture before implementation",
    "Validation before build-ready",
    "Memory is a first-class part of the model",
  ];
  decisionLogic.openQuestions = ["When should version history become first-class beyond memory snapshots?"];
  decisionLogic.records = [localFirstDecision, noCodegenDecision];

  const mappingFailure = createFailureMode();
  mappingFailure.name = "Unmapped architecture entities";
  mappingFailure.description = "Functions or components exist without governance links.";
  mappingFailure.severity = "high";
  mappingFailure.mitigation = "Run structural validation and block build-ready status.";
  mappingFailure.relatedEntityIds = [validateFunction.id, validationComponent.id];

  const memoryFailure = createFailureMode();
  memoryFailure.name = "Decision memory goes stale";
  memoryFailure.description = "Changes are made without preserving reasons or rejected options.";
  memoryFailure.severity = "medium";
  memoryFailure.mitigation = "Capture decision memory on every save and keep decision records editable.";
  memoryFailure.relatedEntityIds = [project.id, localFirstDecision.id, noCodegenDecision.id];

  const blueprint = createEmptyBlueprint(project, intent, primaryOutcome);
  blueprint.outcomes = [primaryOutcome, secondaryOutcome];
  blueprint.actors = [builder, founder];
  blueprint.constraints = [localFirstConstraint, scopeConstraint];
  blueprint.domains = [intakeDomain, modelingDomain, governanceDomain];
  blueprint.functions = [captureFunction, structureFunction, validateFunction];
  blueprint.components = [intakeComponent, registryComponent, validationComponent];
  blueprint.flows = [intakeFlow];
  blueprint.dependencies = [intakeToRegistry, validationToRegistry];
  blueprint.rules = [memoryRule, validationRule];
  blueprint.invariants = [transparencyInvariant, localFirstInvariant];
  blueprint.decisionLogic = decisionLogic;
  blueprint.failureModes = [mappingFailure, memoryFailure];
  blueprint.guardrails = [codegenGuardrail, hiddenLogicGuardrail];
  blueprint.phases = [foundationPhase, governancePhase];
  intakeComponent.guardrailIds = [codegenGuardrail.id];
  registryComponent.invariantIds = [transparencyInvariant.id, localFirstInvariant.id];
  validationComponent.invariantIds = [transparencyInvariant.id];
  validationComponent.guardrailIds = [hiddenLogicGuardrail.id];

  blueprint.mvpScope.summary = "Make the architecture visible, editable, and validated.";
  blueprint.mvpScope.successDefinition = "A builder can inspect and refine the blueprint without hidden logic.";
  blueprint.mvpScope.items = [
    createProjectScopeItem,
    inspectBlueprintScopeItem,
    reviewValidationScopeItem,
  ];
  blueprint.expansionScope.summary = "Add smarter automation only after the core contract is stable.";
  blueprint.expansionScope.futureSignals = [
    "Stable architecture schema",
    "Consistent validation outcomes",
    "Demand for assisted extraction",
  ];
  blueprint.expansionScope.items = [expansionScopeItem];

  blueprint.validation = validateBlueprint(blueprint);
  blueprint.memory.projectEntries = [
    createMemoryEntry({
      type: "project",
      relatedEntityIds: [project.id, intent.id, primaryOutcome.id],
      summary: "Captured the original project idea and intended outcome.",
      reason: "Seed project initialization",
      tags: ["seed", "project-context"],
    }),
  ];
  blueprint.memory.structuralEntries = [
    createMemoryEntry({
      type: "structural",
      relatedEntityIds: blueprint.domains.map((domain) => domain.id),
      summary: "Generated the initial structural domains, functions, components, and rules.",
      reason: "Seed blueprint initialization",
      tags: ["seed", "structure"],
    }),
    createMemoryEntry({
      type: "structural",
      relatedEntityIds: blueprint.validation.checks.map((check) => check.id),
      summary: "Stored the first validation snapshot for the seed blueprint.",
      reason: "Seed validation history",
      tags: ["seed", "validation"],
    }),
  ];
  blueprint.memory.decisionEntries = [
    createMemoryEntry({
      type: "decision",
      relatedEntityIds: decisionLogic.records.map((record) => record.id),
      summary: "Recorded the first architecture and scope decisions.",
      reason: "Seed decision memory",
      tags: ["seed", "decision"],
    }),
  ];

  return blueprint;
};
