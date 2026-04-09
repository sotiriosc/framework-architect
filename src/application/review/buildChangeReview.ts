import { compareBlueprints } from "@/application/review/compareBlueprints";
import type { BlueprintStructuralDiff, StructuralDiffCollectionKey } from "@/application/review/diffModel";
import { validateBlueprint } from "@/application/validation/validateBlueprint";
import type {
  GovernancePolicy,
  Invariant,
  Project,
  ProjectBlueprint,
  Rule,
  ValidationCheck,
  ValidationState,
} from "@/domain/models";
import type { BlueprintRevision, RevisionSource } from "@/persistence/revisionTypes";

export type StableSaveSource = Extract<RevisionSource, "editSave" | "manualCheckpoint">;
export type ChangeReviewTarget = "save" | "manualCheckpoint" | "buildReadyTransition";
export type ChangeReviewLevel = "clean" | "warning" | "blocked";
export type ChangeReviewIssueSeverity = "blocker" | "warning" | "notice";
export type GovernanceImpactPresence = "existing" | "added" | "removed" | "changed";

export type ChangeReviewBaseline = {
  kind: "stable-project";
  projectId: string | null;
  projectName: string | null;
  revisionId: string | null;
  revisionNumber: number | null;
  label: string;
  detail: string;
};

export type GovernancePolicySource = {
  entityType: "invariant" | "rule";
  entityId: string;
  entityName: string;
  declaredSeverity: ChangeReviewIssueSeverity;
  appliedSeverity: ChangeReviewIssueSeverity;
  requiresConfirmation: boolean;
  overrideAllowed: boolean;
  reviewMessage: string;
  recommendation: string;
  rationale: string;
};

export type ChangeReviewIssue = {
  severity: ChangeReviewIssueSeverity;
  category: "invariant" | "rule" | "validation" | "status";
  source: "policy" | "validation" | "status";
  code: string;
  title: string;
  reason: string;
  relatedEntityIds: string[];
  recommendation: string;
  confirmationRequired: boolean;
  overrideAllowed: boolean;
  policySource?: GovernancePolicySource;
};

export type AffectedInvariant = {
  id: string;
  name: string;
  scope: Invariant["scope"];
  priority: Invariant["priority"];
  presence: GovernanceImpactPresence;
  directChange: boolean;
  scopeTouched: boolean;
  policy: Invariant["policy"];
  appliesToReviewTarget: boolean;
  relatedEntityIds: string[];
  triggers: string[];
};

export type AffectedRule = {
  id: string;
  name: string;
  scope: Rule["scope"];
  presence: GovernanceImpactPresence;
  directChange: boolean;
  scopeTouched: boolean;
  policy: Rule["policy"];
  appliesToReviewTarget: boolean;
  relatedEntityIds: string[];
  triggers: string[];
};

type ChangeReviewNoChange = {
  status: "no-change";
  saveSource: StableSaveSource;
  reviewTarget: ChangeReviewTarget;
  sourceProjectId: string;
  sourceProjectName: string;
  reason: string;
  baseline: ChangeReviewBaseline;
  structuralDiff: BlueprintStructuralDiff;
  message: string;
};

export type ChangeReviewReady = {
  status: "ready";
  saveSource: StableSaveSource;
  reviewTarget: ChangeReviewTarget;
  level: ChangeReviewLevel;
  sourceProjectId: string;
  sourceProjectName: string;
  reason: string;
  baseline: ChangeReviewBaseline;
  candidateBlueprint: ProjectBlueprint;
  structuralDiff: BlueprintStructuralDiff;
  validation: ValidationState;
  affectedInvariants: AffectedInvariant[];
  affectedRules: AffectedRule[];
  relevantValidationIssues: ValidationCheck[];
  blockers: ChangeReviewIssue[];
  warnings: ChangeReviewIssue[];
  notices: ChangeReviewIssue[];
  recommendations: string[];
  confirmationRequired: boolean;
  stableSaveAllowed: boolean;
  buildReadyAllowed: boolean;
  requestedProjectStatus: Project["status"];
  effectiveProjectStatus: Project["status"];
  message: string;
};

export type ChangeReviewResult = ChangeReviewNoChange | ChangeReviewReady;

type TouchedContext = {
  changedEntityIds: Set<string>;
  changedCollectionKeys: Set<StructuralDiffCollectionKey>;
  changedScopeIds: Record<Invariant["scope"], Set<string>>;
  projectLevelTouched: boolean;
  linkedInvariantIds: Set<string>;
};

type GovernanceIssueBuckets = {
  blockers: ChangeReviewIssue[];
  warnings: ChangeReviewIssue[];
  notices: ChangeReviewIssue[];
};

const collectionScopeMap: Partial<Record<StructuralDiffCollectionKey, Invariant["scope"]>> = {
  actors: "actor",
  domains: "domain",
  functions: "function",
  components: "component",
  flows: "flow",
  phases: "phase",
  mvpScopeItems: "scope-item",
  expansionScopeItems: "scope-item",
};

const initializeScopeIds = (): Record<Invariant["scope"], Set<string>> => ({
  global: new Set<string>(),
  project: new Set<string>(),
  domain: new Set<string>(),
  function: new Set<string>(),
  component: new Set<string>(),
  phase: new Set<string>(),
  flow: new Set<string>(),
  actor: new Set<string>(),
  "scope-item": new Set<string>(),
});

const createBaseline = (
  baselineBlueprint: ProjectBlueprint | null,
  latestRevision: BlueprintRevision | null,
): ChangeReviewBaseline => ({
  kind: "stable-project",
  projectId: baselineBlueprint?.project.id ?? null,
  projectName: baselineBlueprint?.project.name ?? null,
  revisionId: latestRevision?.id ?? null,
  revisionNumber: latestRevision?.revisionNumber ?? null,
  label: latestRevision ? `Stable revision ${latestRevision.revisionNumber}` : "Current stable project",
  detail: baselineBlueprint
    ? `${baselineBlueprint.project.name} | ${baselineBlueprint.project.status}`
    : "No stable baseline exists yet.",
});

const makeValidationSignature = (check: ValidationCheck): string =>
  [
    check.code,
    check.status,
    check.severity,
    check.message,
    check.relatedEntityIds.slice().sort().join(","),
  ].join("|");

const makeIssueSignature = (issue: ChangeReviewIssue): string =>
  [
    issue.severity,
    issue.category,
    issue.source,
    issue.code,
    issue.title,
    issue.reason,
    issue.relatedEntityIds.slice().sort().join(","),
  ].join("|");

const dedupeIssues = (issues: ChangeReviewIssue[]): ChangeReviewIssue[] => {
  const seen = new Set<string>();

  return issues.filter((issue) => {
    const signature = makeIssueSignature(issue);
    if (seen.has(signature)) {
      return false;
    }

    seen.add(signature);
    return true;
  });
};

const dedupeRecommendations = (issues: ChangeReviewIssue[]): string[] =>
  Array.from(
    new Set(
      issues
        .map((issue) => issue.recommendation.trim())
        .filter(Boolean),
    ),
  );

const collectTouchedContext = (input: {
  baselineBlueprint: ProjectBlueprint | null;
  candidateBlueprint: ProjectBlueprint;
  structuralDiff: BlueprintStructuralDiff;
}): TouchedContext => {
  const changedEntityIds = new Set<string>();
  const changedCollectionKeys = new Set<StructuralDiffCollectionKey>();
  const changedScopeIds = initializeScopeIds();
  let projectLevelTouched =
    input.structuralDiff.projectChanges.length > 0 ||
    input.structuralDiff.intentChanges.length > 0 ||
    input.structuralDiff.decisionLogicChanges.length > 0 ||
    input.structuralDiff.mvpScopeChanges.length > 0 ||
    input.structuralDiff.expansionScopeChanges.length > 0;

  if (projectLevelTouched) {
    const projectId = input.candidateBlueprint.project.id ?? input.baselineBlueprint?.project.id;
    if (projectId) {
      changedScopeIds.project.add(projectId);
      changedEntityIds.add(projectId);
    }
  }

  input.structuralDiff.collections
    .filter((collection) => collection.hasChanges)
    .forEach((collection) => {
      changedCollectionKeys.add(collection.key);
      const ids = [
        ...collection.added.map((item) => item.id),
        ...collection.removed.map((item) => item.id),
        ...collection.changed.map((item) => item.id),
      ];

      ids.forEach((id) => {
        changedEntityIds.add(id);
      });

      const mappedScope = collectionScopeMap[collection.key];
      if (mappedScope) {
        ids.forEach((id) => {
          changedScopeIds[mappedScope].add(id);
        });
      } else {
        projectLevelTouched = true;
      }
    });

  const changedComponentIds = Array.from(changedScopeIds.component);
  const linkedInvariantIds = new Set<string>();
  const componentMaps = [
    new Map(input.candidateBlueprint.components.map((component) => [component.id, component])),
    new Map((input.baselineBlueprint?.components ?? []).map((component) => [component.id, component])),
  ];

  changedComponentIds.forEach((componentId) => {
    componentMaps.forEach((componentMap) => {
      const component = componentMap.get(componentId);
      component?.invariantIds.forEach((invariantId) => {
        linkedInvariantIds.add(invariantId);
      });
    });
  });

  return {
    changedEntityIds,
    changedCollectionKeys,
    changedScopeIds,
    projectLevelTouched,
    linkedInvariantIds,
  };
};

const buildGovernancePresenceMap = (
  collectionKey: "rules" | "invariants",
  structuralDiff: BlueprintStructuralDiff,
): Map<string, GovernanceImpactPresence> => {
  const presence = new Map<string, GovernanceImpactPresence>();
  const collection = structuralDiff.collections.find((item) => item.key === collectionKey);

  collection?.added.forEach((item) => {
    presence.set(item.id, "added");
  });
  collection?.removed.forEach((item) => {
    presence.set(item.id, "removed");
  });
  collection?.changed.forEach((item) => {
    presence.set(item.id, "changed");
  });

  return presence;
};

const hasScopedEntityTouch = (
  scope: Invariant["scope"],
  scopeEntityIds: string[],
  touchedContext: TouchedContext,
): boolean => {
  if (scope === "global") {
    return false;
  }

  if (scope === "project") {
    return touchedContext.projectLevelTouched;
  }

  const touchedIds = touchedContext.changedScopeIds[scope];
  return scopeEntityIds.some((entityId) => touchedIds.has(entityId));
};

const reviewTargetAffectsPolicy = (
  policy: GovernancePolicy,
  reviewTarget: ChangeReviewTarget,
): boolean => {
  switch (reviewTarget) {
    case "manualCheckpoint":
      return policy.affectsCheckpoint;
    case "buildReadyTransition":
      return policy.affectsBuildReady;
    default:
      return policy.affectsStableSave;
  }
};

const applyGovernancePolicySeverity = (input: {
  policy: GovernancePolicy;
  reviewTarget: ChangeReviewTarget;
  directChange: boolean;
}): ChangeReviewIssueSeverity => {
  if (input.reviewTarget === "buildReadyTransition" && input.policy.blocksBuildReady && input.directChange) {
    return "blocker";
  }

  if (input.policy.reviewSeverity === "notice" && input.policy.requiresConfirmation) {
    return "warning";
  }

  return input.policy.reviewSeverity;
};

const buildGovernanceReason = (
  reviewMessage: string,
  triggers: string[],
  rationale: string,
): string =>
  [reviewMessage.trim(), triggers.join(" ").trim(), rationale.trim()]
    .filter(Boolean)
    .join(" ");

const createEmptyBuckets = (): GovernanceIssueBuckets => ({
  blockers: [],
  warnings: [],
  notices: [],
});

const pushIssueBySeverity = (
  buckets: GovernanceIssueBuckets,
  issue: ChangeReviewIssue,
): void => {
  if (issue.severity === "blocker") {
    buckets.blockers.push(issue);
    return;
  }

  if (issue.severity === "warning") {
    buckets.warnings.push(issue);
    return;
  }

  buckets.notices.push(issue);
};

const analyzeAffectedInvariants = (input: {
  baselineBlueprint: ProjectBlueprint | null;
  candidateBlueprint: ProjectBlueprint;
  structuralDiff: BlueprintStructuralDiff;
  touchedContext: TouchedContext;
  reviewTarget: ChangeReviewTarget;
  buildReadyRequested: boolean;
}): AffectedInvariant[] => {
  const presenceMap = buildGovernancePresenceMap("invariants", input.structuralDiff);
  const baselineMap = new Map((input.baselineBlueprint?.invariants ?? []).map((item) => [item.id, item]));
  const candidateMap = new Map(input.candidateBlueprint.invariants.map((item) => [item.id, item]));
  const allIds = new Set<string>([
    ...baselineMap.keys(),
    ...candidateMap.keys(),
  ]);

  return Array.from(allIds)
    .map((id) => {
      const invariant = candidateMap.get(id) ?? baselineMap.get(id);
      if (!invariant) {
        return null;
      }

      const presence = presenceMap.get(id) ?? "existing";
      const directChange = presence !== "existing";
      const scopeTouched =
        hasScopedEntityTouch(invariant.scope, invariant.scopeEntityIds, input.touchedContext) ||
        input.touchedContext.linkedInvariantIds.has(id);
      const triggers: string[] = [];

      if (presence === "added") {
        triggers.push("Invariant was added in the proposed stable change.");
      } else if (presence === "removed") {
        triggers.push("Invariant was removed from the proposed stable change.");
      } else if (presence === "changed") {
        triggers.push("Invariant definition changed in the proposed stable change.");
      }

      if (scopeTouched) {
        if (input.touchedContext.linkedInvariantIds.has(id)) {
          triggers.push("Changed components still reference this invariant.");
        } else if (invariant.scope === "project") {
          triggers.push("Project-level changes touch the invariant scope.");
        } else {
          triggers.push(`Changed ${invariant.scope} entities touch the invariant scope.`);
        }
      }

      if (input.buildReadyRequested && invariant.scope === "global") {
        triggers.push("Build-ready promotion invokes this global invariant.");
      }

      if (triggers.length === 0) {
        return null;
      }

      return {
        id: invariant.id,
        name: invariant.name,
        scope: invariant.scope,
        priority: invariant.priority,
        presence,
        directChange,
        scopeTouched,
        policy: invariant.policy,
        appliesToReviewTarget: reviewTargetAffectsPolicy(invariant.policy, input.reviewTarget),
        relatedEntityIds: Array.from(new Set([invariant.id, ...invariant.scopeEntityIds])),
        triggers,
      } satisfies AffectedInvariant;
    })
    .filter((item): item is AffectedInvariant => Boolean(item))
    .sort((left, right) => left.name.localeCompare(right.name));
};

const analyzeAffectedRules = (input: {
  baselineBlueprint: ProjectBlueprint | null;
  candidateBlueprint: ProjectBlueprint;
  structuralDiff: BlueprintStructuralDiff;
  touchedContext: TouchedContext;
  reviewTarget: ChangeReviewTarget;
  buildReadyRequested: boolean;
}): AffectedRule[] => {
  const presenceMap = buildGovernancePresenceMap("rules", input.structuralDiff);
  const baselineMap = new Map((input.baselineBlueprint?.rules ?? []).map((item) => [item.id, item]));
  const candidateMap = new Map(input.candidateBlueprint.rules.map((item) => [item.id, item]));
  const allIds = new Set<string>([
    ...baselineMap.keys(),
    ...candidateMap.keys(),
  ]);

  return Array.from(allIds)
    .map((id) => {
      const rule = candidateMap.get(id) ?? baselineMap.get(id);
      if (!rule) {
        return null;
      }

      const presence = presenceMap.get(id) ?? "existing";
      const directChange = presence !== "existing";
      const scopeTouched = hasScopedEntityTouch(rule.scope, rule.scopeEntityIds, input.touchedContext);
      const triggers: string[] = [];

      if (presence === "added") {
        triggers.push("Rule was added in the proposed stable change.");
      } else if (presence === "removed") {
        triggers.push("Rule was removed from the proposed stable change.");
      } else if (presence === "changed") {
        triggers.push("Rule definition changed in the proposed stable change.");
      }

      if (scopeTouched) {
        if (rule.scope === "project") {
          triggers.push("Project-level changes touch the rule scope.");
        } else {
          triggers.push(`Changed ${rule.scope} entities touch the rule scope.`);
        }
      }

      if (input.buildReadyRequested && rule.scope === "global") {
        triggers.push("Build-ready promotion invokes this global rule.");
      }

      if (triggers.length === 0) {
        return null;
      }

      return {
        id: rule.id,
        name: rule.name,
        scope: rule.scope,
        presence,
        directChange,
        scopeTouched,
        policy: rule.policy,
        appliesToReviewTarget: reviewTargetAffectsPolicy(rule.policy, input.reviewTarget),
        relatedEntityIds: Array.from(new Set([rule.id, ...rule.scopeEntityIds])),
        triggers,
      } satisfies AffectedRule;
    })
    .filter((item): item is AffectedRule => Boolean(item))
    .sort((left, right) => left.name.localeCompare(right.name));
};

const findRelevantValidationIssues = (input: {
  baselineBlueprint: ProjectBlueprint | null;
  candidateBlueprint: ProjectBlueprint;
  touchedContext: TouchedContext;
  buildReadyRequested: boolean;
}): ValidationCheck[] => {
  const candidateValidation = validateBlueprint(input.candidateBlueprint);
  const baselineValidation = input.baselineBlueprint ? validateBlueprint(input.baselineBlueprint) : null;
  const relatedIds = new Set<string>([
    input.candidateBlueprint.project.id,
    ...input.touchedContext.changedEntityIds,
  ]);
  const baselineIssueKeys = new Set(
    (baselineValidation?.checks ?? [])
      .filter((check) => check.status !== "pass")
      .map(makeValidationSignature),
  );

  return candidateValidation.checks
    .filter((check) => check.status !== "pass")
    .filter((check) => {
      if (input.buildReadyRequested) {
        return true;
      }

      return (
        check.relatedEntityIds.length === 0 ||
        check.relatedEntityIds.some((id) => relatedIds.has(id))
      );
    })
    .filter((check) => input.buildReadyRequested || !baselineIssueKeys.has(makeValidationSignature(check)));
};

const createValidationIssues = (input: {
  validationIssues: ValidationCheck[];
  buildReadyRequested: boolean;
}): GovernanceIssueBuckets =>
  input.validationIssues.reduce<GovernanceIssueBuckets>((accumulator, check) => {
    const severity: ChangeReviewIssueSeverity =
      input.buildReadyRequested && check.status === "fail" && check.severity === "critical"
        ? "blocker"
        : check.status === "fail" || check.status === "warning"
          ? "warning"
          : "notice";

    pushIssueBySeverity(accumulator, {
      severity,
      category: "validation",
      source: "validation",
      code: check.code,
      title: check.code === "BUILD_READY_BLOCKED" ? "Build-ready validation blocker" : "Validation signal changed",
      reason: check.message,
      relatedEntityIds: check.relatedEntityIds,
      recommendation: check.recommendation,
      confirmationRequired: severity !== "notice",
      overrideAllowed: false,
    });

    return accumulator;
  }, createEmptyBuckets());

const createInvariantIssues = (input: {
  invariants: AffectedInvariant[];
  reviewTarget: ChangeReviewTarget;
}): GovernanceIssueBuckets =>
  input.invariants.reduce<GovernanceIssueBuckets>((accumulator, invariant) => {
    if (!invariant.appliesToReviewTarget) {
      return accumulator;
    }

    const severity = applyGovernancePolicySeverity({
      policy: invariant.policy,
      reviewTarget: input.reviewTarget,
      directChange: invariant.directChange,
    });
    const policySource: GovernancePolicySource = {
      entityType: "invariant",
      entityId: invariant.id,
      entityName: invariant.name,
      declaredSeverity: invariant.policy.reviewSeverity,
      appliedSeverity: severity,
      requiresConfirmation: invariant.policy.requiresConfirmation,
      overrideAllowed: invariant.policy.overrideAllowed,
      reviewMessage: invariant.policy.reviewMessage,
      recommendation: invariant.policy.recommendation,
      rationale: invariant.policy.rationale,
    };

    pushIssueBySeverity(accumulator, {
      severity,
      category: "invariant",
      source: "policy",
      code: "INVARIANT_REVIEW",
      title: `Invariant affected: ${invariant.name}`,
      reason: buildGovernanceReason(
        invariant.policy.reviewMessage || invariant.triggers[0] || "",
        invariant.triggers,
        invariant.policy.rationale,
      ),
      relatedEntityIds: invariant.relatedEntityIds,
      recommendation:
        invariant.policy.recommendation ||
        "Review the invariant semantics before accepting this stable change.",
      confirmationRequired: invariant.policy.requiresConfirmation || severity !== "notice",
      overrideAllowed: invariant.policy.overrideAllowed,
      policySource,
    });

    return accumulator;
  }, createEmptyBuckets());

const createRuleIssues = (input: {
  rules: AffectedRule[];
  reviewTarget: ChangeReviewTarget;
}): GovernanceIssueBuckets =>
  input.rules.reduce<GovernanceIssueBuckets>((accumulator, rule) => {
    if (!rule.appliesToReviewTarget) {
      return accumulator;
    }

    const severity = applyGovernancePolicySeverity({
      policy: rule.policy,
      reviewTarget: input.reviewTarget,
      directChange: rule.directChange,
    });
    const policySource: GovernancePolicySource = {
      entityType: "rule",
      entityId: rule.id,
      entityName: rule.name,
      declaredSeverity: rule.policy.reviewSeverity,
      appliedSeverity: severity,
      requiresConfirmation: rule.policy.requiresConfirmation,
      overrideAllowed: rule.policy.overrideAllowed,
      reviewMessage: rule.policy.reviewMessage,
      recommendation: rule.policy.recommendation,
      rationale: rule.policy.rationale,
    };

    pushIssueBySeverity(accumulator, {
      severity,
      category: "rule",
      source: "policy",
      code: "RULE_REVIEW",
      title: `Rule affected: ${rule.name}`,
      reason: buildGovernanceReason(
        rule.policy.reviewMessage || rule.triggers[0] || "",
        rule.triggers,
        rule.policy.rationale,
      ),
      relatedEntityIds: rule.relatedEntityIds,
      recommendation:
        rule.policy.recommendation ||
        "Review the rule scope and enforcement before accepting this stable change.",
      confirmationRequired: rule.policy.requiresConfirmation || severity !== "notice",
      overrideAllowed: rule.policy.overrideAllowed,
      policySource,
    });

    return accumulator;
  }, createEmptyBuckets());

const createStatusIssues = (input: {
  buildReadyRequested: boolean;
  buildReadyAllowed: boolean;
  effectiveProjectStatus: Project["status"];
}): {
  blockers: ChangeReviewIssue[];
  notices: ChangeReviewIssue[];
} => {
  if (!input.buildReadyRequested || input.buildReadyAllowed) {
    return {
      blockers: [],
      notices: [],
    };
  }

  return {
    blockers: [
      {
        severity: "blocker",
        category: "status",
        source: "status",
        code: "BUILD_READY_PROMOTION_BLOCKED",
        title: "Build-ready promotion is blocked",
        reason: `The proposed change cannot be accepted as build-ready. If you continue, the project will be saved as ${input.effectiveProjectStatus}.`,
        relatedEntityIds: [],
        recommendation: `Save as ${input.effectiveProjectStatus} and resolve blocker-level review issues before promoting build-ready.`,
        confirmationRequired: true,
        overrideAllowed: false,
      },
    ],
    notices: [],
  };
};

const createReviewMessage = (input: {
  level: ChangeReviewLevel;
  confirmationRequired: boolean;
  buildReadyRequested: boolean;
  buildReadyAllowed: boolean;
  effectiveProjectStatus: Project["status"];
}): string => {
  if (input.level === "blocked" && input.buildReadyRequested && !input.buildReadyAllowed) {
    return `Build-ready promotion is blocked. Review blocker issues before continuing. Confirming will save the project as ${input.effectiveProjectStatus}.`;
  }

  if (input.level === "blocked") {
    return "Blocker-level governance or validation review issues were detected. Review them before accepting this stable change.";
  }

  if (input.level === "warning" && input.confirmationRequired) {
    return "Review required. Invariants, rules, or validation signals were touched by this stable change.";
  }

  if (input.buildReadyRequested && input.buildReadyAllowed) {
    return "Build-ready promotion can proceed. No blocker-level review issues were detected.";
  }

  return "Stable save can proceed without extra review.";
};

export const buildChangeReview = (input: {
  baselineBlueprint: ProjectBlueprint | null;
  latestRevision: BlueprintRevision | null;
  candidateBlueprint: ProjectBlueprint;
  reason: string;
  saveSource?: StableSaveSource;
}): ChangeReviewResult => {
  const saveSource = input.saveSource ?? "editSave";
  const reviewTarget: ChangeReviewTarget =
    input.candidateBlueprint.project.status === "build-ready" &&
    input.baselineBlueprint?.project.status !== "build-ready"
      ? "buildReadyTransition"
      : saveSource === "manualCheckpoint"
        ? "manualCheckpoint"
        : "save";
  const baseline = createBaseline(input.baselineBlueprint, input.latestRevision);
  const structuralDiff = compareBlueprints({
    activeBlueprint: input.baselineBlueprint,
    candidateBlueprint: input.candidateBlueprint,
  });

  if (structuralDiff.identical) {
    return {
      status: "no-change",
      saveSource,
      reviewTarget,
      sourceProjectId: input.candidateBlueprint.project.id,
      sourceProjectName: input.candidateBlueprint.project.name,
      reason: input.reason,
      baseline,
      structuralDiff,
      message: "No meaningful structural changes were detected. Stable save was skipped.",
    };
  }

  const buildReadyRequested = input.candidateBlueprint.project.status === "build-ready";
  const touchedContext = collectTouchedContext({
    baselineBlueprint: input.baselineBlueprint,
    candidateBlueprint: input.candidateBlueprint,
    structuralDiff,
  });
  const validation = validateBlueprint(input.candidateBlueprint);
  const affectedInvariants = analyzeAffectedInvariants({
    baselineBlueprint: input.baselineBlueprint,
    candidateBlueprint: input.candidateBlueprint,
    structuralDiff,
    touchedContext,
    reviewTarget,
    buildReadyRequested,
  });
  const affectedRules = analyzeAffectedRules({
    baselineBlueprint: input.baselineBlueprint,
    candidateBlueprint: input.candidateBlueprint,
    structuralDiff,
    touchedContext,
    reviewTarget,
    buildReadyRequested,
  });
  const relevantValidationIssues = findRelevantValidationIssues({
    baselineBlueprint: input.baselineBlueprint,
    candidateBlueprint: input.candidateBlueprint,
    touchedContext,
    buildReadyRequested,
  });

  const validationIssues = createValidationIssues({
    validationIssues: relevantValidationIssues,
    buildReadyRequested,
  });
  const invariantIssues = createInvariantIssues({
    invariants: affectedInvariants,
    reviewTarget,
  });
  const ruleIssues = createRuleIssues({
    rules: affectedRules,
    reviewTarget,
  });

  const provisionalBlockers = dedupeIssues([
    ...validationIssues.blockers,
    ...invariantIssues.blockers,
    ...ruleIssues.blockers,
  ]);
  const buildReadyAllowed =
    !buildReadyRequested ||
    (validation.buildReady && provisionalBlockers.length === 0);
  const effectiveProjectStatus: Project["status"] =
    buildReadyRequested && !buildReadyAllowed ? "validated" : input.candidateBlueprint.project.status;
  const statusIssues = createStatusIssues({
    buildReadyRequested,
    buildReadyAllowed,
    effectiveProjectStatus,
  });

  const blockers = dedupeIssues([
    ...provisionalBlockers,
    ...statusIssues.blockers,
  ]);
  const warnings = dedupeIssues([
    ...validationIssues.warnings,
    ...invariantIssues.warnings,
    ...ruleIssues.warnings,
  ]);
  const notices = dedupeIssues([
    ...validationIssues.notices,
    ...invariantIssues.notices,
    ...ruleIssues.notices,
    ...statusIssues.notices,
  ]);
  const level: ChangeReviewLevel =
    blockers.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "clean";
  const allIssues = [...blockers, ...warnings, ...notices];
  const confirmationRequired =
    blockers.length > 0 ||
    warnings.length > 0 ||
    allIssues.some((issue) => issue.confirmationRequired);
  const recommendations = dedupeRecommendations(allIssues);

  return {
    status: "ready",
    saveSource,
    reviewTarget,
    level,
    sourceProjectId: input.candidateBlueprint.project.id,
    sourceProjectName: input.candidateBlueprint.project.name,
    reason: input.reason,
    baseline,
    candidateBlueprint: structuredClone(input.candidateBlueprint),
    structuralDiff,
    validation,
    affectedInvariants,
    affectedRules,
    relevantValidationIssues,
    blockers,
    warnings,
    notices,
    recommendations,
    confirmationRequired,
    stableSaveAllowed: true,
    buildReadyAllowed,
    requestedProjectStatus: input.candidateBlueprint.project.status,
    effectiveProjectStatus,
    message: createReviewMessage({
      level,
      confirmationRequired,
      buildReadyRequested,
      buildReadyAllowed,
      effectiveProjectStatus,
    }),
  };
};
