import { z } from "zod";

import {
  baseNamedEntitySchema,
  constraintKindSchema,
  decisionScopeSchema,
  decisionStatusSchema,
  dependencyKindSchema,
  entityScopeSchema,
  idSchema,
  idListSchema,
  memoryTypeSchema,
  nonEmptyStringSchema,
  outcomePrioritySchema,
  prioritySchema,
  projectStatusSchema,
  reviewSeveritySchema,
  slugSchema,
  stringListSchema,
  textSchema,
  timestampSchema,
  timestampsSchema,
  validationSeveritySchema,
  validationStatusSchema,
} from "@/schema/common";

const coerceLegacyKeys = (
  input: unknown,
  keyMap: Record<string, string>,
): unknown => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return input;
  }

  const record = input as Record<string, unknown>;
  const normalized: Record<string, unknown> = { ...record };

  Object.entries(keyMap).forEach(([nextKey, legacyKey]) => {
    if (normalized[nextKey] === undefined && record[legacyKey] !== undefined) {
      normalized[nextKey] = record[legacyKey];
    }
  });

  return normalized;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const governancePolicyKeyMap = {
  reviewSeverity: "review_severity",
  affectsStableSave: "affects_stable_save",
  affectsCheckpoint: "affects_checkpoint",
  affectsBuildReady: "affects_build_ready",
  blocksBuildReady: "blocks_build_ready",
  requiresConfirmation: "requires_confirmation",
  overrideAllowed: "override_allowed",
  reviewMessage: "review_message",
  recommendation: "recommendation_text",
  rationale: "policy_rationale",
} satisfies Record<string, string>;

type GovernancePolicyInput = {
  reviewSeverity: "blocker" | "warning" | "notice";
  affectsStableSave: boolean;
  affectsCheckpoint: boolean;
  affectsBuildReady: boolean;
  blocksBuildReady: boolean;
  requiresConfirmation: boolean;
  overrideAllowed: boolean;
  reviewMessage: string;
  recommendation: string;
  rationale: string;
};

const createRulePolicyDefaults = (): GovernancePolicyInput => ({
  reviewSeverity: "warning" as const,
  affectsStableSave: true,
  affectsCheckpoint: true,
  affectsBuildReady: true,
  blocksBuildReady: false,
  requiresConfirmation: true,
  overrideAllowed: false,
  reviewMessage: "",
  recommendation: "Review the rule scope and enforcement before accepting this stable change.",
  rationale: "",
});

const createInvariantPolicyDefaults = (input: {
  priority: "critical" | "high" | "medium" | "low";
  blocksBuildReady: boolean;
  overrideAllowed: boolean;
  violationMessage: string;
}): GovernancePolicyInput => ({
  reviewSeverity:
    input.priority === "critical" || input.priority === "high" ? ("warning" as const) : ("notice" as const),
  affectsStableSave: true,
  affectsCheckpoint: true,
  affectsBuildReady: true,
  blocksBuildReady: input.blocksBuildReady,
  requiresConfirmation:
    input.priority === "critical" || input.priority === "high" || input.blocksBuildReady,
  overrideAllowed: input.overrideAllowed,
  reviewMessage: input.violationMessage,
  recommendation: input.blocksBuildReady
    ? "Review the affected scope before claiming the project is build-ready."
    : "Confirm the affected scope still respects the invariant.",
  rationale: "",
});

const normalizeGovernancePolicy = (
  policyInput: unknown,
  defaults: GovernancePolicyInput,
) => {
  const normalizedPolicy = coerceLegacyKeys(policyInput, governancePolicyKeyMap);

  if (!isRecord(normalizedPolicy)) {
    return defaults;
  }

  return {
    ...defaults,
    ...normalizedPolicy,
  };
};

export const ProjectSchema = z
  .object({
    id: idSchema,
    name: nonEmptyStringSchema,
    slug: slugSchema,
    version: z.number().int().positive(),
    status: projectStatusSchema,
    rawIdea: nonEmptyStringSchema,
    corePhilosophy: textSchema,
    invariantPriorities: stringListSchema,
  })
  .merge(timestampsSchema);

export const IntentSchema = z
  .object({
    id: idSchema,
    summary: nonEmptyStringSchema,
    problemStatement: textSchema,
    targetAudience: textSchema,
    valueHypothesis: textSchema,
    extractedFromRawIdea: z.boolean(),
  })
  .merge(timestampsSchema);

export const OutcomeSchema = baseNamedEntitySchema.extend({
  successMetric: textSchema,
  priority: outcomePrioritySchema,
  actorIds: idListSchema,
});

export const ActorSchema = baseNamedEntitySchema.extend({
  role: textSchema,
  needs: stringListSchema,
});

export const ConstraintSchema = z.preprocess(
  (input) => coerceLegacyKeys(input, { kind: "type" }),
  baseNamedEntitySchema.extend({
    kind: constraintKindSchema,
    severity: prioritySchema,
    value: textSchema,
    unit: textSchema,
    hardConstraint: z.boolean(),
  }),
);

export const DomainSchema = baseNamedEntitySchema.extend({
  responsibility: textSchema,
  outcomeIds: idListSchema,
});

export const ProjectFunctionSchema = baseNamedEntitySchema.extend({
  domainIds: idListSchema,
  outcomeIds: idListSchema,
  actorIds: idListSchema,
  inputs: stringListSchema,
  outputs: stringListSchema,
});

export const ComponentSchema = baseNamedEntitySchema.extend({
  purpose: textSchema,
  domainIds: idListSchema,
  functionIds: idListSchema,
  dependencyIds: idListSchema,
  invariantIds: idListSchema,
  guardrailIds: idListSchema,
  inputs: stringListSchema,
  outputs: stringListSchema,
});

export const FlowSchema = baseNamedEntitySchema.extend({
  stepSummary: textSchema,
  actorIds: idListSchema,
  functionIds: idListSchema,
  componentIds: idListSchema,
});

export const DependencySchema = baseNamedEntitySchema.extend({
  kind: dependencyKindSchema,
  sourceEntityId: idSchema,
  targetEntityId: idSchema,
  required: z.boolean(),
});

export const GovernancePolicySchema = z.object({
  reviewSeverity: reviewSeveritySchema,
  affectsStableSave: z.boolean(),
  affectsCheckpoint: z.boolean(),
  affectsBuildReady: z.boolean(),
  blocksBuildReady: z.boolean(),
  requiresConfirmation: z.boolean(),
  overrideAllowed: z.boolean(),
  reviewMessage: textSchema,
  recommendation: textSchema,
  rationale: textSchema,
});

export const RuleSchema = z.preprocess(
  (input) => {
    if (!isRecord(input)) {
      return input;
    }

    const normalized = coerceLegacyKeys(input, {
      scopeEntityIds: "scope_entity_ids",
    });
    if (!isRecord(normalized)) {
      return normalized;
    }

    return {
      ...normalized,
      policy: normalizeGovernancePolicy(normalized.policy, createRulePolicyDefaults()),
    };
  },
  baseNamedEntitySchema.extend({
    scope: entityScopeSchema,
    scopeEntityIds: idListSchema,
    enforcement: textSchema,
    policy: GovernancePolicySchema,
  }),
);

export const InvariantSchema = z.preprocess(
  (input) => {
    if (!isRecord(input)) {
      return input;
    }

    const normalized = coerceLegacyKeys(input, {
      scopeEntityIds: "scope_entity_ids",
      violationMessage: "violation_message",
      blocksBuildReady: "blocks_build_ready",
      overrideAllowed: "override_allowed",
    });
    if (!isRecord(normalized)) {
      return normalized;
    }

    const priority = prioritySchema.catch("high").parse(asString(normalized.priority, "high"));
    const violationMessage = asString(normalized.violationMessage, "");
    const blocksBuildReady = asBoolean(normalized.blocksBuildReady, true);
    const overrideAllowed = asBoolean(normalized.overrideAllowed, false);

    return {
      ...normalized,
      policy: normalizeGovernancePolicy(
        normalized.policy,
        createInvariantPolicyDefaults({
          priority,
          blocksBuildReady,
          overrideAllowed,
          violationMessage,
        }),
      ),
    };
  },
  baseNamedEntitySchema.extend({
    scope: entityScopeSchema,
    scopeEntityIds: idListSchema,
    priority: prioritySchema,
    violationMessage: textSchema,
    policy: GovernancePolicySchema,
  }),
);

export const GuardrailSchema = baseNamedEntitySchema.extend({
  protectedAgainst: textSchema,
  scope: entityScopeSchema,
  scopeEntityIds: idListSchema,
});

export const PhaseSchema = baseNamedEntitySchema.extend({
  order: z.number().int().nonnegative(),
  objective: textSchema,
  functionIds: idListSchema,
  componentIds: idListSchema,
  exitCriteria: stringListSchema,
});

export const ScopeItemSchema = baseNamedEntitySchema
  .extend({
    outcomeIds: idListSchema,
    functionIds: idListSchema,
    componentIds: idListSchema,
    rationale: textSchema,
  })
  .superRefine((value, context) => {
    if (value.outcomeIds.length === 0 && value.functionIds.length === 0 && value.componentIds.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Scope items must reference at least one outcome, function, or component.",
        path: ["outcomeIds"],
      });
    }
  });

export const MVPScopeSchema = z
  .object({
    id: idSchema,
    summary: textSchema,
    successDefinition: textSchema,
    items: z.array(ScopeItemSchema),
  })
  .merge(timestampsSchema);

export const ExpansionScopeSchema = z
  .object({
    id: idSchema,
    summary: textSchema,
    futureSignals: stringListSchema,
    items: z.array(ScopeItemSchema),
  })
  .merge(timestampsSchema);

export const ValidationCheckSchema = z
  .object({
    id: idSchema,
    code: nonEmptyStringSchema,
    status: validationStatusSchema,
    severity: validationSeveritySchema,
    message: nonEmptyStringSchema,
    relatedEntityIds: idListSchema,
    recommendation: textSchema,
  })
  .merge(timestampsSchema);

export const MemoryEntrySchema = z.preprocess(
  (input) =>
    coerceLegacyKeys(input, {
      relatedEntityIds: "related_entity_ids",
      createdAt: "created_at",
      updatedAt: "updated_at",
    }),
  z.object({
    id: idSchema,
    type: memoryTypeSchema,
    relatedEntityIds: idListSchema,
    summary: nonEmptyStringSchema,
    reason: nonEmptyStringSchema,
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
    tags: stringListSchema,
  }),
);

export const DecisionRecordSchema = z
  .object({
    id: idSchema,
    title: nonEmptyStringSchema,
    summary: textSchema,
    reason: nonEmptyStringSchema,
    status: decisionStatusSchema,
    relatedEntityIds: idListSchema,
    rejectedOptions: stringListSchema,
    invariantConflicts: stringListSchema,
    scopeDecision: decisionScopeSchema,
  })
  .merge(timestampsSchema);

export const DecisionLogicSchema = z
  .object({
    principles: stringListSchema,
    openQuestions: stringListSchema,
    records: z.array(DecisionRecordSchema),
  })
  .merge(timestampsSchema);

export const FailureModeSchema = baseNamedEntitySchema.extend({
  severity: prioritySchema,
  mitigation: textSchema,
  relatedEntityIds: idListSchema,
});

export const MemoryStateSchema = z.object({
  projectEntries: z.array(MemoryEntrySchema),
  structuralEntries: z.array(MemoryEntrySchema),
  decisionEntries: z.array(MemoryEntrySchema),
});

export const ValidationStateSchema = z.object({
  checks: z.array(ValidationCheckSchema),
  buildReady: z.boolean(),
  lastValidatedAt: timestampSchema,
});
