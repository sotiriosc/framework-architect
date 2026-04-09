import { z } from "zod";

import {
  ActorSchema,
  ComponentSchema,
  ConstraintSchema,
  DecisionLogicSchema,
  DependencySchema,
  DomainSchema,
  ExpansionScopeSchema,
  FailureModeSchema,
  FlowSchema,
  GuardrailSchema,
  IntentSchema,
  InvariantSchema,
  MVPScopeSchema,
  MemoryStateSchema,
  OutcomeSchema,
  PhaseSchema,
  ProjectFunctionSchema,
  ProjectSchema,
  RuleSchema,
  ValidationStateSchema,
} from "@/schema/entities";

const normalizeBlueprintKeys = (input: unknown): unknown => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return input;
  }

  const record = input as Record<string, unknown>;

  return {
    ...record,
    decisionLogic: record.decisionLogic ?? record.decision_logic,
    failureModes: record.failureModes ?? record.failure_modes,
    mvpScope: record.mvpScope ?? record.mvp_scope,
    expansionScope: record.expansionScope ?? record.expansion_scope,
  };
};

export const ProjectBlueprintSchema = z.preprocess(
  normalizeBlueprintKeys,
  z
    .object({
      project: ProjectSchema,
      intent: IntentSchema,
      outcomes: z.array(OutcomeSchema),
      actors: z.array(ActorSchema),
      constraints: z.array(ConstraintSchema),
      domains: z.array(DomainSchema),
      functions: z.array(ProjectFunctionSchema),
      components: z.array(ComponentSchema),
      flows: z.array(FlowSchema),
      dependencies: z.array(DependencySchema),
      rules: z.array(RuleSchema),
      invariants: z.array(InvariantSchema),
      decisionLogic: DecisionLogicSchema,
      failureModes: z.array(FailureModeSchema),
      guardrails: z.array(GuardrailSchema),
      phases: z.array(PhaseSchema),
      mvpScope: MVPScopeSchema,
      expansionScope: ExpansionScopeSchema,
      validation: ValidationStateSchema,
      memory: MemoryStateSchema,
    })
    .superRefine((blueprint, context) => {
      const ids = new Map<string, string[]>();

      [
        blueprint.project,
        blueprint.intent,
        ...blueprint.outcomes,
        ...blueprint.actors,
        ...blueprint.constraints,
        ...blueprint.domains,
        ...blueprint.functions,
        ...blueprint.components,
        ...blueprint.flows,
        ...blueprint.dependencies,
        ...blueprint.rules,
        ...blueprint.invariants,
        ...blueprint.decisionLogic.records,
        ...blueprint.failureModes,
        ...blueprint.guardrails,
        ...blueprint.phases,
        blueprint.mvpScope,
        blueprint.expansionScope,
        ...blueprint.mvpScope.items,
        ...blueprint.expansionScope.items,
        ...blueprint.validation.checks,
        ...blueprint.memory.projectEntries,
        ...blueprint.memory.structuralEntries,
        ...blueprint.memory.decisionEntries,
      ].forEach((entity) => {
        const matches = ids.get(entity.id) ?? [];
        matches.push(entity.constructor?.name ?? "entity");
        ids.set(entity.id, matches);
      });

      ids.forEach((occurrences, id) => {
        if (occurrences.length > 1) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate entity ID detected: ${id}`,
            path: ["project", "id"],
          });
        }
      });
    }),
);
