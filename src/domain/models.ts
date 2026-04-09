import type { z } from "zod";

import {
  ActorSchema,
  ComponentSchema,
  ConstraintSchema,
  DecisionLogicSchema,
  DecisionRecordSchema,
  DependencySchema,
  DomainSchema,
  ExpansionScopeSchema,
  FailureModeSchema,
  FlowSchema,
  GuardrailSchema,
  IntentSchema,
  InvariantSchema,
  MVPScopeSchema,
  MemoryEntrySchema,
  MemoryStateSchema,
  OutcomeSchema,
  PhaseSchema,
  ProjectBlueprintSchema,
  ProjectFunctionSchema,
  ProjectSchema,
  RuleSchema,
  ScopeItemSchema,
  ValidationCheckSchema,
  ValidationStateSchema,
} from "@/schema";

export type Project = z.infer<typeof ProjectSchema>;
export type Intent = z.infer<typeof IntentSchema>;
export type Outcome = z.infer<typeof OutcomeSchema>;
export type Actor = z.infer<typeof ActorSchema>;
export type Constraint = z.infer<typeof ConstraintSchema>;
export type Domain = z.infer<typeof DomainSchema>;
export type ProjectFunction = z.infer<typeof ProjectFunctionSchema>;
export type Component = z.infer<typeof ComponentSchema>;
export type Flow = z.infer<typeof FlowSchema>;
export type Dependency = z.infer<typeof DependencySchema>;
export type Rule = z.infer<typeof RuleSchema>;
export type Invariant = z.infer<typeof InvariantSchema>;
export type Guardrail = z.infer<typeof GuardrailSchema>;
export type Phase = z.infer<typeof PhaseSchema>;
export type ScopeItem = z.infer<typeof ScopeItemSchema>;
export type MVPScope = z.infer<typeof MVPScopeSchema>;
export type ExpansionScope = z.infer<typeof ExpansionScopeSchema>;
export type ValidationCheck = z.infer<typeof ValidationCheckSchema>;
export type ValidationState = z.infer<typeof ValidationStateSchema>;
export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;
export type MemoryState = z.infer<typeof MemoryStateSchema>;
export type DecisionRecord = z.infer<typeof DecisionRecordSchema>;
export type DecisionLogic = z.infer<typeof DecisionLogicSchema>;
export type FailureMode = z.infer<typeof FailureModeSchema>;
export type ProjectBlueprint = z.infer<typeof ProjectBlueprintSchema>;
