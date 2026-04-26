import type {
  Actor,
  Component,
  Constraint,
  DecisionRecord,
  Dependency,
  Domain,
  FailureMode,
  Flow,
  Guardrail,
  Invariant,
  Phase,
  ProjectFunction,
  Rule,
  ScopeItem,
} from "@/domain/models";
import {
  createActor,
  createComponent,
  createConstraint,
  createDecisionRecord,
  createDependency,
  createDomain,
  createFailureMode,
  createFlow,
  createGuardrail,
  createInvariant,
  createPhase,
  createProjectFunction,
  createRule,
  createScopeItem,
} from "@/domain/defaults";
import {
  constraintKindValues,
  decisionScopeValues,
  decisionStatusValues,
  dependencyKindValues,
  entityScopeValues,
  priorityValues,
  reviewSeverityValues,
} from "@/schema";
import type { EditorField } from "@/ui/components/CollectionEditor";

export const actorFields: EditorField[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "role", label: "Role" },
  { key: "needs", label: "Needs", kind: "csv" },
];

export const constraintFields: EditorField[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "kind", label: "Kind", kind: "select", options: constraintKindValues },
  { key: "severity", label: "Severity", kind: "select", options: priorityValues },
  { key: "value", label: "Value" },
  { key: "unit", label: "Unit" },
  { key: "hardConstraint", label: "Hard constraint", kind: "boolean" },
];

export const domainFields: EditorField[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "responsibility", label: "Responsibility", kind: "textarea" },
  { key: "outcomeIds", label: "Outcomes", kind: "relation-multi", relationType: "outcomes" },
];

export const functionFields: EditorField[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "domainIds", label: "Domains", kind: "relation-multi", relationType: "domains" },
  { key: "outcomeIds", label: "Outcomes", kind: "relation-multi", relationType: "outcomes" },
  { key: "actorIds", label: "Actors", kind: "relation-multi", relationType: "actors" },
  { key: "inputs", label: "Inputs", kind: "csv" },
  { key: "outputs", label: "Outputs", kind: "csv" },
];

export const componentFields: EditorField[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "purpose", label: "Purpose", kind: "textarea" },
  { key: "domainIds", label: "Domains", kind: "relation-multi", relationType: "domains" },
  { key: "functionIds", label: "Functions", kind: "relation-multi", relationType: "functions" },
  { key: "dependencyIds", label: "Dependencies", kind: "relation-multi", relationType: "dependencies" },
  { key: "invariantIds", label: "Invariants", kind: "relation-multi", relationType: "invariants" },
  { key: "guardrailIds", label: "Guardrails", kind: "relation-multi", relationType: "guardrails" },
  { key: "inputs", label: "Inputs", kind: "csv" },
  { key: "outputs", label: "Outputs", kind: "csv" },
];

export const flowFields: EditorField[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "stepSummary", label: "Step summary", kind: "textarea" },
  { key: "actorIds", label: "Actors", kind: "relation-multi", relationType: "actors" },
  { key: "functionIds", label: "Functions", kind: "relation-multi", relationType: "functions" },
  { key: "componentIds", label: "Components", kind: "relation-multi", relationType: "components" },
];

export const dependencyFields: EditorField[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "kind", label: "Kind", kind: "select", options: dependencyKindValues },
  { key: "sourceEntityId", label: "Source entity", kind: "relation-single", relationType: "allEntities" },
  { key: "targetEntityId", label: "Target entity", kind: "relation-single", relationType: "allEntities" },
  { key: "required", label: "Required", kind: "boolean" },
];

export const ruleFields: EditorField[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "scope", label: "Scope", kind: "select", options: entityScopeValues },
  { key: "scopeEntityIds", label: "Scope entities", kind: "relation-multi", relationType: "scopeEntities" },
  { key: "enforcement", label: "Enforcement", kind: "textarea" },
  { key: "policy.reviewSeverity", label: "Review severity", kind: "select", options: reviewSeverityValues },
  { key: "policy.affectsStableSave", label: "Affects save review", kind: "boolean" },
  { key: "policy.affectsCheckpoint", label: "Affects checkpoint review", kind: "boolean" },
  { key: "policy.affectsBuildReady", label: "Affects build-ready review", kind: "boolean" },
  { key: "policy.blocksBuildReady", label: "Blocks build-ready", kind: "boolean" },
  { key: "policy.requiresConfirmation", label: "Requires confirmation", kind: "boolean" },
  { key: "policy.overrideAllowed", label: "Override allowed", kind: "boolean" },
  { key: "policy.reviewMessage", label: "Review message", kind: "textarea" },
  { key: "policy.recommendation", label: "Recommendation", kind: "textarea" },
  { key: "policy.rationale", label: "Policy rationale", kind: "textarea" },
];

export const invariantFields: EditorField[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "scope", label: "Scope", kind: "select", options: entityScopeValues },
  { key: "scopeEntityIds", label: "Scope entities", kind: "relation-multi", relationType: "scopeEntities" },
  { key: "priority", label: "Priority", kind: "select", options: priorityValues },
  { key: "violationMessage", label: "Violation message", kind: "textarea" },
  { key: "policy.reviewSeverity", label: "Review severity", kind: "select", options: reviewSeverityValues },
  { key: "policy.affectsStableSave", label: "Affects save review", kind: "boolean" },
  { key: "policy.affectsCheckpoint", label: "Affects checkpoint review", kind: "boolean" },
  { key: "policy.affectsBuildReady", label: "Affects build-ready review", kind: "boolean" },
  { key: "policy.blocksBuildReady", label: "Blocks build-ready", kind: "boolean" },
  { key: "policy.requiresConfirmation", label: "Requires confirmation", kind: "boolean" },
  { key: "policy.overrideAllowed", label: "Override allowed", kind: "boolean" },
  { key: "policy.reviewMessage", label: "Review message", kind: "textarea" },
  { key: "policy.recommendation", label: "Recommendation", kind: "textarea" },
  { key: "policy.rationale", label: "Policy rationale", kind: "textarea" },
];

export const guardrailFields: EditorField[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "protectedAgainst", label: "Protected against", kind: "textarea" },
  { key: "scope", label: "Scope", kind: "select", options: entityScopeValues },
  { key: "scopeEntityIds", label: "Scope entities", kind: "relation-multi", relationType: "scopeEntities" },
];

export const phaseFields: EditorField[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "order", label: "Order", kind: "number" },
  { key: "objective", label: "Objective", kind: "textarea" },
  { key: "functionIds", label: "Functions", kind: "relation-multi", relationType: "functions" },
  { key: "componentIds", label: "Components", kind: "relation-multi", relationType: "components" },
  { key: "exitCriteria", label: "Exit criteria", kind: "csv" },
];

export const scopeItemFields: EditorField[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "outcomeIds", label: "Outcomes", kind: "relation-multi", relationType: "outcomes" },
  { key: "functionIds", label: "Functions", kind: "relation-multi", relationType: "functions" },
  { key: "componentIds", label: "Components", kind: "relation-multi", relationType: "components" },
  { key: "rationale", label: "Rationale", kind: "textarea" },
];

export const decisionRecordFields: EditorField[] = [
  { key: "title", label: "Title" },
  { key: "summary", label: "Summary", kind: "textarea" },
  { key: "reason", label: "Reason", kind: "textarea" },
  { key: "status", label: "Status", kind: "select", options: decisionStatusValues },
  { key: "scopeDecision", label: "Scope decision", kind: "select", options: decisionScopeValues },
  { key: "relatedEntityIds", label: "Related entities", kind: "relation-multi", relationType: "allEntities" },
  { key: "rejectedOptions", label: "Rejected options", kind: "csv" },
  { key: "invariantConflicts", label: "Invariant conflicts", kind: "relation-multi", relationType: "invariants" },
];

export const failureModeFields: EditorField[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "severity", label: "Severity", kind: "select", options: priorityValues },
  { key: "mitigation", label: "Mitigation", kind: "textarea" },
  { key: "relatedEntityIds", label: "Related entities", kind: "relation-multi", relationType: "allEntities" },
];

export const createEntityFactories = {
  actors: createActor,
  constraints: createConstraint,
  domains: createDomain,
  functions: createProjectFunction,
  components: createComponent,
  flows: createFlow,
  dependencies: createDependency,
  rules: createRule,
  invariants: createInvariant,
  guardrails: createGuardrail,
  phases: createPhase,
  mvpItems: createScopeItem,
  expansionItems: createScopeItem,
  decisionRecords: createDecisionRecord,
  failureModes: createFailureMode,
};

export type EditorCollectionMap = {
  actors: Actor[];
  constraints: Constraint[];
  domains: Domain[];
  functions: ProjectFunction[];
  components: Component[];
  flows: Flow[];
  dependencies: Dependency[];
  rules: Rule[];
  invariants: Invariant[];
  guardrails: Guardrail[];
  phases: Phase[];
  mvpItems: ScopeItem[];
  expansionItems: ScopeItem[];
  decisionRecords: DecisionRecord[];
  failureModes: FailureMode[];
};
