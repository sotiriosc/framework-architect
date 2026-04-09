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
  { key: "outcomeIds", label: "Outcome IDs", kind: "csv" },
];

export const functionFields: EditorField[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "domainIds", label: "Domain IDs", kind: "csv" },
  { key: "outcomeIds", label: "Outcome IDs", kind: "csv" },
  { key: "actorIds", label: "Actor IDs", kind: "csv" },
  { key: "inputs", label: "Inputs", kind: "csv" },
  { key: "outputs", label: "Outputs", kind: "csv" },
];

export const componentFields: EditorField[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "purpose", label: "Purpose", kind: "textarea" },
  { key: "domainIds", label: "Domain IDs", kind: "csv" },
  { key: "functionIds", label: "Function IDs", kind: "csv" },
  { key: "dependencyIds", label: "Dependency IDs", kind: "csv" },
  { key: "invariantIds", label: "Invariant IDs", kind: "csv" },
  { key: "guardrailIds", label: "Guardrail IDs", kind: "csv" },
  { key: "inputs", label: "Inputs", kind: "csv" },
  { key: "outputs", label: "Outputs", kind: "csv" },
];

export const flowFields: EditorField[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "stepSummary", label: "Step summary", kind: "textarea" },
  { key: "actorIds", label: "Actor IDs", kind: "csv" },
  { key: "functionIds", label: "Function IDs", kind: "csv" },
  { key: "componentIds", label: "Component IDs", kind: "csv" },
];

export const dependencyFields: EditorField[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "kind", label: "Kind", kind: "select", options: dependencyKindValues },
  { key: "sourceEntityId", label: "Source entity ID" },
  { key: "targetEntityId", label: "Target entity ID" },
  { key: "required", label: "Required", kind: "boolean" },
];

export const ruleFields: EditorField[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "scope", label: "Scope", kind: "select", options: entityScopeValues },
  { key: "scopeEntityIds", label: "Scope entity IDs", kind: "csv" },
  { key: "enforcement", label: "Enforcement", kind: "textarea" },
];

export const invariantFields: EditorField[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "scope", label: "Scope", kind: "select", options: entityScopeValues },
  { key: "scopeEntityIds", label: "Scope entity IDs", kind: "csv" },
  { key: "priority", label: "Priority", kind: "select", options: priorityValues },
  { key: "violationMessage", label: "Violation message", kind: "textarea" },
  { key: "blocksBuildReady", label: "Blocks build-ready", kind: "boolean" },
  { key: "overrideAllowed", label: "Override allowed", kind: "boolean" },
];

export const guardrailFields: EditorField[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "protectedAgainst", label: "Protected against", kind: "textarea" },
  { key: "scope", label: "Scope", kind: "select", options: entityScopeValues },
  { key: "scopeEntityIds", label: "Scope entity IDs", kind: "csv" },
];

export const phaseFields: EditorField[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "order", label: "Order", kind: "number" },
  { key: "objective", label: "Objective", kind: "textarea" },
  { key: "functionIds", label: "Function IDs", kind: "csv" },
  { key: "componentIds", label: "Component IDs", kind: "csv" },
  { key: "exitCriteria", label: "Exit criteria", kind: "csv" },
];

export const scopeItemFields: EditorField[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "outcomeIds", label: "Outcome IDs", kind: "csv" },
  { key: "functionIds", label: "Function IDs", kind: "csv" },
  { key: "componentIds", label: "Component IDs", kind: "csv" },
  { key: "rationale", label: "Rationale", kind: "textarea" },
];

export const decisionRecordFields: EditorField[] = [
  { key: "title", label: "Title" },
  { key: "summary", label: "Summary", kind: "textarea" },
  { key: "reason", label: "Reason", kind: "textarea" },
  { key: "status", label: "Status", kind: "select", options: decisionStatusValues },
  { key: "scopeDecision", label: "Scope decision", kind: "select", options: decisionScopeValues },
  { key: "relatedEntityIds", label: "Related entity IDs", kind: "csv" },
  { key: "rejectedOptions", label: "Rejected options", kind: "csv" },
  { key: "invariantConflicts", label: "Invariant conflicts", kind: "csv" },
];

export const failureModeFields: EditorField[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "severity", label: "Severity", kind: "select", options: priorityValues },
  { key: "mitigation", label: "Mitigation", kind: "textarea" },
  { key: "relatedEntityIds", label: "Related entity IDs", kind: "csv" },
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
