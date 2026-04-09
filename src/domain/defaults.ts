import type {
  Actor,
  Component,
  Constraint,
  DecisionLogic,
  DecisionRecord,
  Dependency,
  Domain,
  ExpansionScope,
  FailureMode,
  Flow,
  Guardrail,
  Intent,
  Invariant,
  MemoryEntry,
  MemoryState,
  MVPScope,
  Outcome,
  Phase,
  Project,
  ProjectBlueprint,
  ProjectFunction,
  Rule,
  ScopeItem,
  ValidationCheck,
  ValidationState,
} from "@/domain/models";
import { createId, nowIso, slugify } from "@/lib/identity";

const timestamps = () => {
  const stamp = nowIso();

  return {
    createdAt: stamp,
    updatedAt: stamp,
  };
};

export const createProject = (input: {
  name: string;
  rawIdea: string;
  corePhilosophy?: string;
}): Project => ({
  id: createId("proj"),
  name: input.name,
  slug: slugify(input.name),
  version: 1,
  status: "draft",
  rawIdea: input.rawIdea,
  corePhilosophy: input.corePhilosophy ?? "Architecture first. Make governance explicit before implementation.",
  invariantPriorities: [],
  ...timestamps(),
});

export const createIntent = (summary = "Clarify the intended outcome"): Intent => ({
  id: createId("intent"),
  summary,
  problemStatement: "",
  targetAudience: "",
  valueHypothesis: "",
  extractedFromRawIdea: true,
  ...timestamps(),
});

export const createOutcome = (name = "Primary outcome"): Outcome => ({
  id: createId("outcome"),
  name,
  description: "",
  successMetric: "",
  priority: "high",
  actorIds: [],
  ...timestamps(),
});

export const createActor = (): Actor => ({
  id: createId("actor"),
  name: "New actor",
  description: "",
  role: "",
  needs: [],
  ...timestamps(),
});

export const createConstraint = (): Constraint => ({
  id: createId("constraint"),
  name: "New constraint",
  description: "",
  kind: "scope",
  severity: "medium",
  value: "",
  unit: "",
  hardConstraint: false,
  ...timestamps(),
});

export const createDomain = (): Domain => ({
  id: createId("domain"),
  name: "New domain",
  description: "",
  responsibility: "",
  outcomeIds: [],
  ...timestamps(),
});

export const createProjectFunction = (): ProjectFunction => ({
  id: createId("function"),
  name: "New function",
  description: "",
  domainIds: [],
  outcomeIds: [],
  actorIds: [],
  inputs: [],
  outputs: [],
  ...timestamps(),
});

export const createComponent = (): Component => ({
  id: createId("component"),
  name: "New component",
  description: "",
  purpose: "",
  domainIds: [],
  functionIds: [],
  dependencyIds: [],
  invariantIds: [],
  guardrailIds: [],
  inputs: [],
  outputs: [],
  ...timestamps(),
});

export const createFlow = (): Flow => ({
  id: createId("flow"),
  name: "New flow",
  description: "",
  stepSummary: "",
  actorIds: [],
  functionIds: [],
  componentIds: [],
  ...timestamps(),
});

export const createDependency = (): Dependency => ({
  id: createId("dependency"),
  name: "New dependency",
  description: "",
  kind: "internal",
  sourceEntityId: "",
  targetEntityId: "",
  required: true,
  ...timestamps(),
});

export const createRule = (): Rule => ({
  id: createId("rule"),
  name: "New rule",
  description: "",
  scope: "project",
  scopeEntityIds: [],
  enforcement: "",
  ...timestamps(),
});

export const createInvariant = (): Invariant => ({
  id: createId("invariant"),
  name: "New invariant",
  description: "",
  scope: "global",
  scopeEntityIds: [],
  priority: "high",
  violationMessage: "",
  blocksBuildReady: true,
  overrideAllowed: false,
  ...timestamps(),
});

export const createGuardrail = (): Guardrail => ({
  id: createId("guardrail"),
  name: "New guardrail",
  description: "",
  protectedAgainst: "",
  scope: "project",
  scopeEntityIds: [],
  ...timestamps(),
});

export const createPhase = (): Phase => ({
  id: createId("phase"),
  name: "New phase",
  description: "",
  order: 0,
  objective: "",
  functionIds: [],
  componentIds: [],
  exitCriteria: [],
  ...timestamps(),
});

export const createScopeItem = (name = "New scope item"): ScopeItem => ({
  id: createId("scopeitem"),
  name,
  description: "",
  outcomeIds: [],
  functionIds: [],
  componentIds: [],
  rationale: "",
  ...timestamps(),
});

export const createMVPScope = (): MVPScope => ({
  id: createId("mvpscope"),
  summary: "",
  successDefinition: "",
  items: [],
  ...timestamps(),
});

export const createExpansionScope = (): ExpansionScope => ({
  id: createId("expansionscope"),
  summary: "",
  futureSignals: [],
  items: [],
  ...timestamps(),
});

export const createDecisionRecord = (): DecisionRecord => ({
  id: createId("decision"),
  title: "New decision",
  summary: "",
  reason: "Manual review",
  status: "proposed",
  relatedEntityIds: [],
  rejectedOptions: [],
  invariantConflicts: [],
  scopeDecision: "architecture",
  ...timestamps(),
});

export const createDecisionLogic = (): DecisionLogic => ({
  principles: [],
  openQuestions: [],
  records: [],
  ...timestamps(),
});

export const createFailureMode = (): FailureMode => ({
  id: createId("failure"),
  name: "New failure mode",
  description: "",
  severity: "medium",
  mitigation: "",
  relatedEntityIds: [],
  ...timestamps(),
});

export const createValidationCheck = (input: {
  code: string;
  status: ValidationCheck["status"];
  severity: ValidationCheck["severity"];
  message: string;
  relatedEntityIds?: string[];
  recommendation?: string;
}): ValidationCheck => ({
  id: createId("check"),
  code: input.code,
  status: input.status,
  severity: input.severity,
  message: input.message,
  relatedEntityIds: input.relatedEntityIds ?? [],
  recommendation: input.recommendation ?? "",
  ...timestamps(),
});

export const createMemoryEntry = (input: {
  type: MemoryEntry["type"];
  relatedEntityIds?: string[];
  summary: string;
  reason: string;
  tags?: string[];
}): MemoryEntry => {
  const stamp = nowIso();

  return {
    id: createId("memory"),
    type: input.type,
    relatedEntityIds: input.relatedEntityIds ?? [],
    summary: input.summary,
    reason: input.reason,
    createdAt: stamp,
    updatedAt: stamp,
    tags: input.tags ?? [],
  };
};

export const createMemoryState = (): MemoryState => ({
  projectEntries: [],
  structuralEntries: [],
  decisionEntries: [],
});

export const createValidationState = (): ValidationState => ({
  checks: [],
  buildReady: false,
  lastValidatedAt: nowIso(),
});

export const createEmptyBlueprint = (project: Project, intent: Intent, outcome: Outcome): ProjectBlueprint => ({
  project,
  intent,
  outcomes: [outcome],
  actors: [],
  constraints: [],
  domains: [],
  functions: [],
  components: [],
  flows: [],
  dependencies: [],
  rules: [],
  invariants: [],
  decisionLogic: createDecisionLogic(),
  failureModes: [],
  guardrails: [],
  phases: [],
  mvpScope: createMVPScope(),
  expansionScope: createExpansionScope(),
  validation: createValidationState(),
  memory: createMemoryState(),
});
