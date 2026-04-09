import {
  createActor,
  createComponent,
  createConstraint,
  createDecisionLogic,
  createDecisionRecord,
  createDependency,
  createDomain,
  createExpansionScope,
  createFailureMode,
  createFlow,
  createGuardrail,
  createIntent,
  createInvariant,
  createMemoryEntry,
  createMemoryState,
  createMVPScope,
  createOutcome,
  createPhase,
  createProject,
  createProjectFunction,
  createRule,
  createScopeItem,
  createValidationCheck,
  createValidationState,
} from "@/domain/defaults";
import { createId, slugify } from "@/lib/identity";
import {
  createRepositoryLoadReport,
  createStoredProjectsDocument,
  currentStorageVersion,
  type RepositoryLoadReport,
  type StoredProjectsDocument,
} from "@/persistence/types";
import { ProjectBlueprintSchema } from "@/schema";

class PersistenceMigrationError extends Error {
  constructor(
    message: string,
    public readonly failureStage: "detect" | "migrate" | "validate",
    public readonly detectedStorageVersion: number | null,
    public readonly migrationSteps: string[],
  ) {
    super(message);
    this.name = "PersistenceMigrationError";
  }
}

type LegacyStorageEnvelope = {
  storageVersion: number;
  projects: unknown[];
};

type MigrationStep = {
  fromVersion: number;
  toVersion: number;
  description: string;
  upgrade: (envelope: LegacyStorageEnvelope, migrationSteps: string[]) => LegacyStorageEnvelope;
};

const migrationRegistry: MigrationStep[] = [
  {
    fromVersion: 1,
    toVersion: 2,
    description: "Upgrade legacy stored projects to the current versioned document contract.",
    upgrade: (envelope) => ({
      storageVersion: 2,
      projects: envelope.projects.map((project) => migrateLegacyBlueprint(project)),
    }),
  },
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeBlueprintKeys = (input: unknown): Record<string, unknown> => {
  if (!isRecord(input)) {
    return {};
  }

  return {
    ...input,
    decisionLogic: input.decisionLogic ?? input.decision_logic,
    failureModes: input.failureModes ?? input.failure_modes,
    mvpScope: input.mvpScope ?? input.mvp_scope,
    expansionScope: input.expansionScope ?? input.expansion_scope,
  };
};

const normalizeMemoryEntryKeys = (input: unknown): Record<string, unknown> => {
  if (!isRecord(input)) {
    return {};
  }

  return {
    ...input,
    relatedEntityIds: input.relatedEntityIds ?? input.related_entity_ids,
    createdAt: input.createdAt ?? input.created_at,
    updatedAt: input.updatedAt ?? input.updated_at,
  };
};

const asRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const asString = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;
const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const asStringList = (value: unknown): string[] =>
  asArray(value)
    .map((item) => asString(item).trim())
    .filter(Boolean);

const coerceTimestamp = (value: unknown, fallback: string): string => {
  if (typeof value !== "string") {
    return fallback;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? fallback : new Date(parsed).toISOString();
};

const isPrefixedUuid = (value: string): boolean => /^[a-z][a-z0-9]{1,23}_[0-9a-f-]{36}$/.test(value);

const resolveId = (
  value: unknown,
  prefix: string,
  idMap: Map<string, string>,
  createFallback: () => string,
): string => {
  const raw = asString(value).trim();

  if (!raw) {
    return createFallback();
  }

  if (isPrefixedUuid(raw)) {
    return raw;
  }

  const existing = idMap.get(raw);
  if (existing) {
    return existing;
  }

  const next = createFallback();
  idMap.set(raw, next);
  return next;
};

const remapIds = (value: unknown, idMap: Map<string, string>): string[] =>
  asStringList(value).map((id) => idMap.get(id) ?? id);

const remapId = (value: unknown, idMap: Map<string, string>, fallback = ""): string => {
  const raw = asString(value).trim();
  if (!raw) {
    return fallback;
  }

  return idMap.get(raw) ?? raw;
};

const registerEntityId = (value: unknown, prefix: string, idMap: Map<string, string>): void => {
  const current = asRecord(value);
  const raw = asString(current.id).trim();

  if (!raw || isPrefixedUuid(raw) || idMap.has(raw)) {
    return;
  }

  idMap.set(raw, createId(prefix));
};

const registerCollectionIds = (value: unknown, prefix: string, idMap: Map<string, string>): void => {
  asArray(value).forEach((item) => registerEntityId(item, prefix, idMap));
};

const seedIdMappings = (rawBlueprint: Record<string, unknown>, idMap: Map<string, string>): void => {
  registerEntityId(rawBlueprint.project, "proj", idMap);
  registerEntityId(rawBlueprint.intent, "intent", idMap);
  registerCollectionIds(rawBlueprint.outcomes, "outcome", idMap);
  registerCollectionIds(rawBlueprint.actors, "actor", idMap);
  registerCollectionIds(rawBlueprint.constraints, "constraint", idMap);
  registerCollectionIds(rawBlueprint.domains, "domain", idMap);
  registerCollectionIds(rawBlueprint.functions, "function", idMap);
  registerCollectionIds(rawBlueprint.components, "component", idMap);
  registerCollectionIds(rawBlueprint.flows, "flow", idMap);
  registerCollectionIds(rawBlueprint.dependencies, "dependency", idMap);
  registerCollectionIds(rawBlueprint.rules, "rule", idMap);
  registerCollectionIds(rawBlueprint.invariants, "invariant", idMap);
  registerCollectionIds(rawBlueprint.guardrails, "guardrail", idMap);
  registerCollectionIds(rawBlueprint.phases, "phase", idMap);
  registerCollectionIds(rawBlueprint.failureModes, "failure", idMap);

  const rawDecisionLogic = asRecord(rawBlueprint.decisionLogic);
  registerCollectionIds(rawDecisionLogic.records, "decision", idMap);

  const rawMvpScope = asRecord(rawBlueprint.mvpScope);
  registerEntityId(rawMvpScope, "mvpscope", idMap);
  registerCollectionIds(rawMvpScope.items, "scopeitem", idMap);

  const rawExpansionScope = asRecord(rawBlueprint.expansionScope);
  registerEntityId(rawExpansionScope, "expansionscope", idMap);
  registerCollectionIds(rawExpansionScope.items, "scopeitem", idMap);

  const rawValidation = asRecord(rawBlueprint.validation);
  registerCollectionIds(rawValidation.checks, "check", idMap);

  const rawMemory = asRecord(rawBlueprint.memory);
  registerCollectionIds(rawMemory.projectEntries ?? rawMemory.project_entries, "memory", idMap);
  registerCollectionIds(rawMemory.structuralEntries ?? rawMemory.structural_entries, "memory", idMap);
  registerCollectionIds(rawMemory.decisionEntries ?? rawMemory.decision_entries, "memory", idMap);
};

const detectLegacyEnvelope = (rawPayload: unknown): LegacyStorageEnvelope => {
  if (Array.isArray(rawPayload)) {
    return {
      storageVersion: 1,
      projects: rawPayload,
    };
  }

  if (isRecord(rawPayload) && Array.isArray(rawPayload.projects)) {
    const explicitVersion =
      typeof rawPayload.storageVersion === "number" ? rawPayload.storageVersion : 1;

    return {
      storageVersion: explicitVersion,
      projects: rawPayload.projects,
    };
  }

  if (isRecord(rawPayload) && rawPayload.project) {
    return {
      storageVersion: 1,
      projects: [rawPayload],
    };
  }

  throw new PersistenceMigrationError(
    "Stored payload format is not recognized.",
    "detect",
    null,
    [],
  );
};

const migrateProject = (value: unknown, idMap: Map<string, string>, fallbackNow: string) => {
  const current = asRecord(value);
  const base = createProject({
    name: asString(current.name, "Recovered project"),
    rawIdea: asString(current.rawIdea, asString(current.raw_idea, "Recovered raw idea")),
    corePhilosophy: asString(current.corePhilosophy, asString(current.core_philosophy, "")),
  });

  return {
    ...base,
    id: resolveId(current.id, "proj", idMap, () => base.id),
    name: asString(current.name, base.name) || base.name,
    slug: slugify(asString(current.slug, asString(current.name, base.name)) || base.name),
    version: Math.max(1, asNumber(current.version, base.version)),
    status:
      current.status === "validated" || current.status === "build-ready" || current.status === "draft"
        ? current.status
        : base.status,
    rawIdea: asString(current.rawIdea, asString(current.raw_idea, base.rawIdea)) || base.rawIdea,
    corePhilosophy: asString(current.corePhilosophy, asString(current.core_philosophy, base.corePhilosophy)),
    invariantPriorities: asStringList(current.invariantPriorities ?? current.invariant_priorities),
    createdAt: coerceTimestamp(current.createdAt ?? current.created_at, fallbackNow),
    updatedAt: coerceTimestamp(current.updatedAt ?? current.updated_at, fallbackNow),
  };
};

const migrateIntent = (value: unknown, idMap: Map<string, string>, fallbackNow: string) => {
  const current = asRecord(value);
  const base = createIntent(asString(current.summary, "Clarify the intended outcome"));

  return {
    ...base,
    id: resolveId(current.id, "intent", idMap, () => base.id),
    summary: asString(current.summary, base.summary) || base.summary,
    problemStatement: asString(current.problemStatement, asString(current.problem_statement, "")),
    targetAudience: asString(current.targetAudience, asString(current.target_audience, "")),
    valueHypothesis: asString(current.valueHypothesis, asString(current.value_hypothesis, "")),
    extractedFromRawIdea: asBoolean(current.extractedFromRawIdea ?? current.extracted_from_raw_idea, true),
    createdAt: coerceTimestamp(current.createdAt ?? current.created_at, fallbackNow),
    updatedAt: coerceTimestamp(current.updatedAt ?? current.updated_at, fallbackNow),
  };
};

const migrateNamedEntity = <
  T extends {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
  },
>(
  value: unknown,
  prefix: string,
  createBase: () => T,
  fallbackNow: string,
): T => {
  const current = asRecord(value);
  const base = createBase();

  return {
    ...base,
    id: base.id,
    name: asString(current.name, base.name),
    description: asString(current.description, base.description),
    createdAt: coerceTimestamp(current.createdAt ?? current.created_at, fallbackNow),
    updatedAt: coerceTimestamp(current.updatedAt ?? current.updated_at, fallbackNow),
  };
};

const migrateLegacyBlueprint = (input: unknown) => {
  const fallbackNow = new Date().toISOString();
  const rawBlueprint = normalizeBlueprintKeys(input);
  const idMap = new Map<string, string>();
  seedIdMappings(rawBlueprint, idMap);

  const project = migrateProject(rawBlueprint.project, idMap, fallbackNow);
  const intent = migrateIntent(rawBlueprint.intent, idMap, fallbackNow);

  const outcomes = asArray(rawBlueprint.outcomes).map((value) => {
    const current = asRecord(value);
    const base = createOutcome(asString(current.name, "Recovered outcome"));
    const migrated = migrateNamedEntity(value, "outcome", () => base, fallbackNow);
    migrated.id = resolveId(current.id, "outcome", idMap, () => base.id);

    return {
      ...migrated,
      successMetric: asString(current.successMetric, asString(current.success_metric, "")),
      priority:
        current.priority === "medium" || current.priority === "low" || current.priority === "high"
          ? current.priority
          : base.priority,
      actorIds: remapIds(current.actorIds ?? current.actor_ids, idMap),
    };
  });

  const actors = asArray(rawBlueprint.actors).map((value) => {
    const current = asRecord(value);
    const base = createActor();
    const migrated = migrateNamedEntity(value, "actor", () => base, fallbackNow);
    migrated.id = resolveId(current.id, "actor", idMap, () => base.id);

    return {
      ...migrated,
      role: asString(current.role, ""),
      needs: asStringList(current.needs),
    };
  });

  const constraints = asArray(rawBlueprint.constraints).map((value) => {
    const current = asRecord(value);
    const base = createConstraint();
    const migrated = migrateNamedEntity(value, "constraint", () => base, fallbackNow);
    migrated.id = resolveId(current.id, "constraint", idMap, () => base.id);

    return {
      ...migrated,
      kind: asString(current.kind, asString(current.type, base.kind)),
      severity: asString(current.severity, base.severity),
      value: asString(current.value, ""),
      unit: asString(current.unit, ""),
      hardConstraint: asBoolean(current.hardConstraint ?? current.hard_constraint, false),
    };
  });

  const domains = asArray(rawBlueprint.domains).map((value) => {
    const current = asRecord(value);
    const base = createDomain();
    const migrated = migrateNamedEntity(value, "domain", () => base, fallbackNow);
    migrated.id = resolveId(current.id, "domain", idMap, () => base.id);

    return {
      ...migrated,
      responsibility: asString(current.responsibility, ""),
      outcomeIds: remapIds(current.outcomeIds ?? current.outcome_ids, idMap),
    };
  });

  const functions = asArray(rawBlueprint.functions).map((value) => {
    const current = asRecord(value);
    const base = createProjectFunction();
    const migrated = migrateNamedEntity(value, "function", () => base, fallbackNow);
    migrated.id = resolveId(current.id, "function", idMap, () => base.id);

    return {
      ...migrated,
      domainIds: remapIds(current.domainIds ?? current.domain_ids, idMap),
      outcomeIds: remapIds(current.outcomeIds ?? current.outcome_ids, idMap),
      actorIds: remapIds(current.actorIds ?? current.actor_ids, idMap),
      inputs: asStringList(current.inputs),
      outputs: asStringList(current.outputs),
    };
  });

  const components = asArray(rawBlueprint.components).map((value) => {
    const current = asRecord(value);
    const base = createComponent();
    const migrated = migrateNamedEntity(value, "component", () => base, fallbackNow);
    migrated.id = resolveId(current.id, "component", idMap, () => base.id);

    return {
      ...migrated,
      purpose: asString(current.purpose, ""),
      domainIds: remapIds(current.domainIds ?? current.domain_ids, idMap),
      functionIds: remapIds(current.functionIds ?? current.function_ids, idMap),
      dependencyIds: remapIds(current.dependencyIds ?? current.dependency_ids, idMap),
      invariantIds: remapIds(current.invariantIds ?? current.invariant_ids, idMap),
      guardrailIds: remapIds(current.guardrailIds ?? current.guardrail_ids, idMap),
      inputs: asStringList(current.inputs),
      outputs: asStringList(current.outputs),
    };
  });

  const flows = asArray(rawBlueprint.flows).map((value) => {
    const current = asRecord(value);
    const base = createFlow();
    const migrated = migrateNamedEntity(value, "flow", () => base, fallbackNow);
    migrated.id = resolveId(current.id, "flow", idMap, () => base.id);

    return {
      ...migrated,
      stepSummary: asString(current.stepSummary, asString(current.step_summary, "")),
      actorIds: remapIds(current.actorIds ?? current.actor_ids, idMap),
      functionIds: remapIds(current.functionIds ?? current.function_ids, idMap),
      componentIds: remapIds(current.componentIds ?? current.component_ids, idMap),
    };
  });

  const dependencies = asArray(rawBlueprint.dependencies).map((value) => {
    const current = asRecord(value);
    const base = createDependency();
    const migrated = migrateNamedEntity(value, "dependency", () => base, fallbackNow);
    migrated.id = resolveId(current.id, "dependency", idMap, () => base.id);

    return {
      ...migrated,
      kind: asString(current.kind, base.kind),
      sourceEntityId: remapId(current.sourceEntityId ?? current.source_entity_id, idMap),
      targetEntityId: remapId(current.targetEntityId ?? current.target_entity_id, idMap),
      required: asBoolean(current.required, true),
    };
  });

  const rules = asArray(rawBlueprint.rules).map((value) => {
    const current = asRecord(value);
    const base = createRule();
    const migrated = migrateNamedEntity(value, "rule", () => base, fallbackNow);
    migrated.id = resolveId(current.id, "rule", idMap, () => base.id);

    return {
      ...migrated,
      scope: asString(current.scope, base.scope),
      scopeEntityIds: remapIds(current.scopeEntityIds ?? current.scope_entity_ids, idMap),
      enforcement: asString(current.enforcement, ""),
    };
  });

  const invariants = asArray(rawBlueprint.invariants).map((value) => {
    const current = asRecord(value);
    const base = createInvariant();
    const migrated = migrateNamedEntity(value, "invariant", () => base, fallbackNow);
    migrated.id = resolveId(current.id, "invariant", idMap, () => base.id);

    return {
      ...migrated,
      scope: asString(current.scope, base.scope),
      scopeEntityIds: remapIds(current.scopeEntityIds ?? current.scope_entity_ids, idMap),
      priority: asString(current.priority, base.priority),
      violationMessage: asString(current.violationMessage, asString(current.violation_message, "")),
      blocksBuildReady: asBoolean(current.blocksBuildReady ?? current.blocks_build_ready, true),
      overrideAllowed: asBoolean(current.overrideAllowed ?? current.override_allowed, false),
    };
  });

  const guardrails = asArray(rawBlueprint.guardrails).map((value) => {
    const current = asRecord(value);
    const base = createGuardrail();
    const migrated = migrateNamedEntity(value, "guardrail", () => base, fallbackNow);
    migrated.id = resolveId(current.id, "guardrail", idMap, () => base.id);

    return {
      ...migrated,
      protectedAgainst: asString(current.protectedAgainst, asString(current.protected_against, "")),
      scope: asString(current.scope, base.scope),
      scopeEntityIds: remapIds(current.scopeEntityIds ?? current.scope_entity_ids, idMap),
    };
  });

  const phases = asArray(rawBlueprint.phases).map((value) => {
    const current = asRecord(value);
    const base = createPhase();
    const migrated = migrateNamedEntity(value, "phase", () => base, fallbackNow);
    migrated.id = resolveId(current.id, "phase", idMap, () => base.id);

    return {
      ...migrated,
      order: asNumber(current.order, 0),
      objective: asString(current.objective, ""),
      functionIds: remapIds(current.functionIds ?? current.function_ids, idMap),
      componentIds: remapIds(current.componentIds ?? current.component_ids, idMap),
      exitCriteria: asStringList(current.exitCriteria ?? current.exit_criteria),
    };
  });

  const migrateScopeItemCollection = (value: unknown) =>
    asArray(value).map((item) => {
      const current = asRecord(item);
      const base = createScopeItem(asString(current.name, "Recovered scope item"));
      const migrated = migrateNamedEntity(item, "scopeitem", () => base, fallbackNow);
      migrated.id = resolveId(current.id, "scopeitem", idMap, () => base.id);

      return {
        ...migrated,
        outcomeIds: remapIds(current.outcomeIds ?? current.outcome_ids, idMap),
        functionIds: remapIds(current.functionIds ?? current.function_ids, idMap),
        componentIds: remapIds(current.componentIds ?? current.component_ids, idMap),
        rationale: asString(current.rationale, ""),
      };
    });

  const rawMvpScope = asRecord(rawBlueprint.mvpScope);
  const mvpScopeBase = createMVPScope();
  const mvpScope = {
    ...mvpScopeBase,
    id: resolveId(rawMvpScope.id, "mvpscope", idMap, () => mvpScopeBase.id),
    summary: asString(rawMvpScope.summary, ""),
    successDefinition: asString(rawMvpScope.successDefinition, asString(rawMvpScope.success_definition, "")),
    items: migrateScopeItemCollection(rawMvpScope.items),
    createdAt: coerceTimestamp(rawMvpScope.createdAt ?? rawMvpScope.created_at, fallbackNow),
    updatedAt: coerceTimestamp(rawMvpScope.updatedAt ?? rawMvpScope.updated_at, fallbackNow),
  };

  const rawExpansionScope = asRecord(rawBlueprint.expansionScope);
  const expansionScopeBase = createExpansionScope();
  const expansionScope = {
    ...expansionScopeBase,
    id: resolveId(rawExpansionScope.id, "expansionscope", idMap, () => expansionScopeBase.id),
    summary: asString(rawExpansionScope.summary, ""),
    futureSignals: asStringList(rawExpansionScope.futureSignals ?? rawExpansionScope.future_signals),
    items: migrateScopeItemCollection(rawExpansionScope.items),
    createdAt: coerceTimestamp(rawExpansionScope.createdAt ?? rawExpansionScope.created_at, fallbackNow),
    updatedAt: coerceTimestamp(rawExpansionScope.updatedAt ?? rawExpansionScope.updated_at, fallbackNow),
  };

  const rawDecisionLogic = asRecord(rawBlueprint.decisionLogic);
  const decisionLogicBase = createDecisionLogic();
  const decisionLogic = {
    ...decisionLogicBase,
    principles: asStringList(rawDecisionLogic.principles),
    openQuestions: asStringList(rawDecisionLogic.openQuestions ?? rawDecisionLogic.open_questions),
    records: asArray(rawDecisionLogic.records).map((value) => {
      const current = asRecord(value);
      const base = createDecisionRecord();

      return {
        ...base,
        id: resolveId(current.id, "decision", idMap, () => base.id),
        title: asString(current.title, base.title),
        summary: asString(current.summary, ""),
        reason: asString(current.reason, base.reason),
        status: asString(current.status, base.status),
        relatedEntityIds: remapIds(current.relatedEntityIds ?? current.related_entity_ids, idMap),
        rejectedOptions: asStringList(current.rejectedOptions ?? current.rejected_options),
        invariantConflicts: asStringList(current.invariantConflicts ?? current.invariant_conflicts),
        scopeDecision: asString(current.scopeDecision, asString(current.scope_decision, base.scopeDecision)),
        createdAt: coerceTimestamp(current.createdAt ?? current.created_at, fallbackNow),
        updatedAt: coerceTimestamp(current.updatedAt ?? current.updated_at, fallbackNow),
      };
    }),
    createdAt: coerceTimestamp(rawDecisionLogic.createdAt ?? rawDecisionLogic.created_at, fallbackNow),
    updatedAt: coerceTimestamp(rawDecisionLogic.updatedAt ?? rawDecisionLogic.updated_at, fallbackNow),
  };

  const failureModes = asArray(rawBlueprint.failureModes).map((value) => {
    const current = asRecord(value);
    const base = createFailureMode();
    const migrated = migrateNamedEntity(value, "failure", () => base, fallbackNow);
    migrated.id = resolveId(current.id, "failure", idMap, () => base.id);

    return {
      ...migrated,
      severity: asString(current.severity, base.severity),
      mitigation: asString(current.mitigation, ""),
      relatedEntityIds: remapIds(current.relatedEntityIds ?? current.related_entity_ids, idMap),
    };
  });

  const rawValidation = asRecord(rawBlueprint.validation);
  const validationBase = createValidationState();
  const validation = {
    ...validationBase,
    checks: asArray(rawValidation.checks).map((value) => {
      const current = asRecord(value);
      const base = createValidationCheck({
        code: asString(current.code, "MIGRATED_CHECK"),
        status: "warning",
        severity: "medium",
        message: asString(current.message, "Migrated validation check."),
      });

      return {
        ...base,
        id: resolveId(current.id, "check", idMap, () => base.id),
        code: asString(current.code, base.code),
        status: asString(current.status, base.status),
        severity: asString(current.severity, base.severity),
        message: asString(current.message, base.message),
        relatedEntityIds: remapIds(current.relatedEntityIds ?? current.related_entity_ids, idMap),
        recommendation: asString(current.recommendation, ""),
        createdAt: coerceTimestamp(current.createdAt ?? current.created_at, fallbackNow),
        updatedAt: coerceTimestamp(current.updatedAt ?? current.updated_at, fallbackNow),
      };
    }),
    buildReady: asBoolean(rawValidation.buildReady ?? rawValidation.build_ready, false),
    lastValidatedAt: coerceTimestamp(
      rawValidation.lastValidatedAt ?? rawValidation.last_validated_at,
      fallbackNow,
    ),
  };

  const rawMemory = asRecord(rawBlueprint.memory);
  const memoryBase = createMemoryState();
  const migrateMemoryEntries = (value: unknown) =>
    asArray(value).map((entry) => {
      const current = normalizeMemoryEntryKeys(entry);
      const base = createMemoryEntry({
        type: "project",
        summary: asString(current.summary, "Recovered memory entry"),
        reason: asString(current.reason, "Migrated from legacy storage."),
      });

      return {
        ...base,
        id: resolveId(current.id, "memory", idMap, () => base.id),
        type: asString(current.type, base.type),
        relatedEntityIds: remapIds(current.relatedEntityIds, idMap),
        summary: asString(current.summary, base.summary),
        reason: asString(current.reason, base.reason),
        createdAt: coerceTimestamp(current.createdAt, fallbackNow),
        updatedAt: coerceTimestamp(current.updatedAt, fallbackNow),
        tags: asStringList(current.tags),
      };
    });

  const memory = {
    ...memoryBase,
    projectEntries: migrateMemoryEntries(rawMemory.projectEntries ?? rawMemory.project_entries),
    structuralEntries: migrateMemoryEntries(rawMemory.structuralEntries ?? rawMemory.structural_entries),
    decisionEntries: migrateMemoryEntries(rawMemory.decisionEntries ?? rawMemory.decision_entries),
  };

  return ProjectBlueprintSchema.parse({
    project,
    intent,
    outcomes,
    actors,
    constraints,
    domains,
    functions,
    components,
    flows,
    dependencies,
    rules,
    invariants,
    decisionLogic,
    failureModes,
    guardrails,
    phases,
    mvpScope,
    expansionScope,
    validation,
    memory,
  });
};

export const upgradeStoredProjectsPayload = (rawPayload: unknown) => {
  const detected = detectLegacyEnvelope(rawPayload);
  const migrationSteps = [`Detected storage payload version ${detected.storageVersion}.`];

  if (detected.storageVersion > currentStorageVersion) {
    throw new PersistenceMigrationError(
      `Stored payload version ${detected.storageVersion} is newer than this app supports.`,
      "detect",
      detected.storageVersion,
      migrationSteps,
    );
  }

  let working = detected;

  while (working.storageVersion < currentStorageVersion) {
    const step = migrationRegistry.find((candidate) => candidate.fromVersion === working.storageVersion);

    if (!step) {
      throw new PersistenceMigrationError(
        `No migration step exists from storage version ${working.storageVersion}.`,
        "migrate",
        detected.storageVersion,
        migrationSteps,
      );
    }

    working = step.upgrade(working, migrationSteps);
    migrationSteps.push(step.description);
  }

  const documentCandidate = createStoredProjectsDocument(
    working.projects.map((project) => ProjectBlueprintSchema.parse(project)),
  );

  const parsed = ProjectBlueprintSchema.array().safeParse(documentCandidate.projects);
  if (!parsed.success) {
    throw new PersistenceMigrationError(
      parsed.error.issues[0]?.message ?? "Migrated projects failed validation.",
      "validate",
      detected.storageVersion,
      migrationSteps,
    );
  }

  const document = {
    ...documentCandidate,
    projects: parsed.data,
  } satisfies StoredProjectsDocument;

  return {
    document,
    report: createRepositoryLoadReport({
      status: detected.storageVersion === currentStorageVersion ? "loaded" : "migrated",
      detectedStorageVersion: detected.storageVersion,
      migrated: detected.storageVersion !== currentStorageVersion,
      migrationSteps,
      message:
        detected.storageVersion === currentStorageVersion
          ? "Stored payload already matched the current storage version."
          : `Migrated storage from version ${detected.storageVersion} to ${currentStorageVersion}.`,
    }),
  };
};

export const isPersistenceMigrationError = (
  value: unknown,
): value is PersistenceMigrationError => value instanceof PersistenceMigrationError;
