import {
  createEmptyBlueprint,
  createDecisionRecord,
  createIntent,
  createMemoryEntry,
  createOutcome,
  createProject,
  createScopeItem,
} from "@/domain/defaults";
import type { MemoryState, ProjectBlueprint } from "@/domain/models";
import {
  buildChangeReview,
  type ChangeReviewReady,
  type ChangeReviewResult,
  type StableSaveSource,
} from "@/application/review/buildChangeReview";
import {
  buildRestoreCandidate,
  type RestoreCandidate,
  type RestoreMode,
} from "@/application/review/buildRestoreCandidate";
import { buildBlueprintRevision } from "@/application/review/buildBlueprintRevision";
import {
  buildRevisionComparison,
  type RevisionComparisonMode,
  type RevisionComparisonResult,
} from "@/application/review/buildRevisionComparison";
import { nowIso } from "@/lib/identity";
import type { ProjectRepository } from "@/persistence/projectRepository";
import type { BlueprintRevision, RevisionSource } from "@/persistence/revisionTypes";
import type {
  QuarantineExportDocument,
  QuarantinedPayload,
  QuarantineFailureCategory,
  QuarantineFailureStage,
  RepositoryLoadReport,
  StoredProjectsDocument,
} from "@/persistence/types";
import { QuarantineExportDocumentSchema, QuarantinedPayloadSchema } from "@/persistence/types";
import { ProjectBlueprintSchema } from "@/schema";
import { createSeedBlueprint } from "@/seed/exampleBlueprint";
import type { ConversationSourceType } from "@/application/import/conversationImportTypes";
import {
  composeBlueprintFromGuidedIntake,
  type GuidedIntakeInput,
} from "@/application/intake/composeBlueprintFromGuidedIntake";
import { completeBlueprintStructure } from "@/application/intake/completeBlueprintStructure";
import { extractIntentFromRawIdea } from "@/application/intake/extractIntent";
import {
  buildImplementationPlan,
  findImplementationDeferredItem,
  findImplementationPlanTask,
} from "@/application/planning/buildImplementationPlan";
import {
  applyBlueprintImprovementFix,
  applySafeBlueprintImprovementFixes,
} from "@/application/review/applyBlueprintImprovementFixes";
import {
  buildBlueprintForesight,
  listBlueprintForesightItems,
  type BlueprintForesightItem,
} from "@/application/review/buildBlueprintForesight";
import { validateBlueprint } from "@/application/validation/validateBlueprint";

const cloneBlueprint = (blueprint: ProjectBlueprint): ProjectBlueprint => structuredClone(blueprint);

const appendUnique = (current: string[], additions: string[]): string[] => {
  const seen = new Set(current);
  const next = [...current];

  additions.forEach((addition) => {
    if (!addition || seen.has(addition)) {
      return;
    }

    seen.add(addition);
    next.push(addition);
  });

  return next;
};

const collectBlueprintEntityIds = (blueprint: ProjectBlueprint): Set<string> =>
  new Set([
    blueprint.project.id,
    blueprint.intent.id,
    ...blueprint.outcomes.map((item) => item.id),
    ...blueprint.actors.map((item) => item.id),
    ...blueprint.constraints.map((item) => item.id),
    ...blueprint.domains.map((item) => item.id),
    ...blueprint.functions.map((item) => item.id),
    ...blueprint.components.map((item) => item.id),
    ...blueprint.flows.map((item) => item.id),
    ...blueprint.dependencies.map((item) => item.id),
    ...blueprint.rules.map((item) => item.id),
    ...blueprint.invariants.map((item) => item.id),
    ...blueprint.guardrails.map((item) => item.id),
    ...blueprint.phases.map((item) => item.id),
    blueprint.mvpScope.id,
    blueprint.expansionScope.id,
    ...blueprint.mvpScope.items.map((item) => item.id),
    ...blueprint.expansionScope.items.map((item) => item.id),
    ...blueprint.decisionLogic.records.map((item) => item.id),
    ...blueprint.failureModes.map((item) => item.id),
  ]);

const findForesightItem = (
  blueprint: ProjectBlueprint,
  foresightItemId: string,
): BlueprintForesightItem => {
  const foresight = buildBlueprintForesight(blueprint);
  const item = listBlueprintForesightItems(foresight).find((candidate) => candidate.id === foresightItemId);

  if (!item) {
    throw new Error(`Unknown blueprint foresight item: ${foresightItemId}`);
  }

  return item;
};

const validRelatedEntityIds = (blueprint: ProjectBlueprint, ids: string[]): string[] => {
  const validIds = collectBlueprintEntityIds(blueprint);
  return ids.filter((id) => validIds.has(id));
};

const appendMemorySnapshot = (
  previousMemory: MemoryState,
  blueprint: ProjectBlueprint,
  reason: string,
): MemoryState => {
  const projectEntry = createMemoryEntry({
    type: "project",
    relatedEntityIds: [blueprint.project.id, blueprint.intent.id, ...blueprint.outcomes.map((outcome) => outcome.id)],
    summary: `Captured project context for version ${blueprint.project.version}.`,
    reason,
    tags: ["project-context", blueprint.project.status],
  });

  const structuralEntry = createMemoryEntry({
    type: "structural",
    relatedEntityIds: [
      ...blueprint.domains.map((domain) => domain.id),
      ...blueprint.functions.map((fn) => fn.id),
      ...blueprint.components.map((component) => component.id),
      ...blueprint.dependencies.map((dependency) => dependency.id),
      ...blueprint.rules.map((rule) => rule.id),
      ...blueprint.guardrails.map((guardrail) => guardrail.id),
    ],
    summary: `Persisted structural blueprint snapshot with ${blueprint.validation.checks.length} validation checks.`,
    reason,
    tags: ["structure", "validation"],
  });

  const decisionEntry = createMemoryEntry({
    type: "decision",
    relatedEntityIds: [blueprint.project.id, ...blueprint.decisionLogic.records.map((record) => record.id)],
    summary: `Recorded decision state for version ${blueprint.project.version}.`,
    reason,
    tags: ["decision", `version-${blueprint.project.version}`],
  });

  return {
    projectEntries: [...previousMemory.projectEntries, projectEntry],
    structuralEntries: [...previousMemory.structuralEntries, structuralEntry],
    decisionEntries: [...previousMemory.decisionEntries, decisionEntry],
  };
};

export type BlueprintBootstrapResult = {
  projects: ProjectBlueprint[];
  selectedProjectId: string | null;
  loadReport: RepositoryLoadReport;
  quarantinedPayloads: QuarantinedPayload[];
};

export type QuarantineExportFile = {
  fileName: string;
  content: string;
};

export type QuarantineRecoverySuccess = {
  success: true;
  selectedProjectId: string | null;
  projects: ProjectBlueprint[];
  report: RepositoryLoadReport;
  message: string;
};

export type QuarantineRecoveryFailure = {
  success: false;
  failureStage: QuarantineFailureStage;
  failureCategory: QuarantineFailureCategory;
  detectedStorageVersion: number | null;
  migrationSteps: string[];
  reason: string;
};

export type QuarantineRecoveryResult = QuarantineRecoverySuccess | QuarantineRecoveryFailure;

export type QuarantinePreviewSuccess = {
  success: true;
  report: RepositoryLoadReport;
  candidateDocument: StoredProjectsDocument;
  restoreCandidate: RestoreCandidate;
  message: string;
};

export type QuarantinePreviewResult = QuarantinePreviewSuccess | QuarantineRecoveryFailure;

export type QuarantineRestoreSuccess = {
  success: true;
  selectedProjectId: string | null;
  restoredProjectId: string;
  restoredProjectName: string;
  projects: ProjectBlueprint[];
  report: RepositoryLoadReport;
  restoreMode: RestoreMode;
  quarantinePreserved: true;
  message: string;
};

export type QuarantineRestoreFailure = {
  success: false;
  code: "preview-required" | "confirmation-required" | "selection-invalid" | "persist-failed";
  reason: string;
};

export type QuarantineRestoreResult = QuarantineRestoreSuccess | QuarantineRestoreFailure;

export type StableSaveCommitSuccess = {
  success: true;
  savedBlueprint: ProjectBlueprint;
  recordedRevisionNumber: number | null;
  effectiveProjectStatus: ProjectBlueprint["project"]["status"];
  message: string;
};

export type StableSaveCommitFailure = {
  success: false;
  code: "review-required" | "confirmation-required" | "save-blocked" | "persist-failed";
  reason: string;
};

export type StableSaveCommitResult = StableSaveCommitSuccess | StableSaveCommitFailure;

const createQuarantineExport = (entry: QuarantinedPayload): QuarantineExportDocument => ({
  exportVersion: 1,
  quarantine: entry,
});

const extractRecoveryPayload = (input: unknown): unknown => {
  const exportDocument = QuarantineExportDocumentSchema.safeParse(input);
  if (exportDocument.success) {
    return exportDocument.data.quarantine.rawPayload;
  }

  const quarantineEntry = QuarantinedPayloadSchema.safeParse(input);
  if (quarantineEntry.success) {
    return quarantineEntry.data.rawPayload;
  }

  return input;
};

const recoveryFailure = (input: {
  failureStage: QuarantineFailureStage;
  failureCategory: QuarantineFailureCategory;
  detectedStorageVersion: number | null;
  migrationSteps: string[];
  reason: string;
}): QuarantineRecoveryFailure => ({
  success: false,
  failureStage: input.failureStage,
  failureCategory: input.failureCategory,
  detectedStorageVersion: input.detectedStorageVersion,
  migrationSteps: input.migrationSteps,
  reason: input.reason,
});

const resolveRecoveryPayload = (
  entry: QuarantinedPayload,
  repairedJson?: string,
): { success: true; payload: unknown } | QuarantineRecoveryFailure => {
  if (repairedJson === undefined) {
    return {
      success: true,
      payload: entry.rawPayload,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(repairedJson);
  } catch (error) {
    return recoveryFailure({
      failureStage: "read",
      failureCategory: "parse",
      detectedStorageVersion: null,
      migrationSteps: ["Failed to parse the supplied recovery JSON."],
      reason: error instanceof Error ? error.message : "Recovery JSON could not be parsed.",
    });
  }

  return {
    success: true,
    payload: extractRecoveryPayload(parsed),
  };
};

export class BlueprintService {
  constructor(private readonly repository: ProjectRepository) {}

  private defaultStableBoundaryReason(source: StableSaveSource): string {
    return source === "manualCheckpoint" ? "Manual checkpoint." : "Manual blueprint update.";
  }

  private composeRawIdeaBlueprint(input: {
    name: string;
    rawIdea: string;
    corePhilosophy?: string;
    invariantPriorities?: string[];
  }): ProjectBlueprint {
    const extracted = extractIntentFromRawIdea(input.rawIdea);
    const project = createProject({
      name: input.name,
      rawIdea: input.rawIdea,
      corePhilosophy: input.corePhilosophy,
    });
    project.invariantPriorities = input.invariantPriorities ?? [];

    const intent = createIntent(extracted.summary);
    intent.problemStatement = extracted.problemStatement;
    intent.targetAudience = extracted.targetAudience;
    intent.valueHypothesis = extracted.valueHypothesis;

    const outcome = createOutcome(extracted.outcomeName);
    outcome.description = extracted.outcomeDescription;
    outcome.successMetric = "Blueprint is explicit enough for a builder to start implementation.";

    return createEmptyBlueprint(project, intent, outcome);
  }

  private executeStableBoundaryAction(input: {
    candidate: ProjectBlueprint;
    reason: string;
    source: StableSaveSource;
  }): ProjectBlueprint {
    const parsed = ProjectBlueprintSchema.parse(cloneBlueprint(input.candidate));
    const review = this.reviewStableSave({
      candidate: parsed,
      reason: input.reason,
      source: input.source,
    });

    if (review.status === "no-change") {
      const existing = this.repository.find(parsed.project.id);
      return cloneBlueprint(existing ?? parsed);
    }

    const committed = this.commitStableSave({
      review,
      confirm: true,
    });

    if (!committed.success) {
      throw new Error(committed.reason);
    }

    return committed.savedBlueprint;
  }

  private persistReviewedSave(review: ChangeReviewReady): StableSaveCommitResult {
    try {
      const next = cloneBlueprint(review.candidateBlueprint);
      const stamp = nowIso();
      const current = this.repository.find(next.project.id);

      next.project.status = review.effectiveProjectStatus;
      next.project.version = current ? current.project.version + 1 : next.project.version;
      next.project.updatedAt = stamp;
      next.validation = validateBlueprint(next);
      next.memory = appendMemorySnapshot(next.memory, next, review.reason || "Manual blueprint update.");

      this.repository.save(next);
      this.repository.setSelectedProjectId(next.project.id);

      const recordedRevision = this.recordProjectRevision({
        snapshot: next,
        source: review.saveSource,
        reason: review.reason,
      });

      const statusMessage =
        review.requestedProjectStatus === "build-ready" && review.effectiveProjectStatus !== "build-ready"
          ? review.saveSource === "manualCheckpoint"
            ? `Manual checkpoint recorded as ${review.effectiveProjectStatus}. Build-ready promotion remained blocked by change review.`
            : `Blueprint saved as ${review.effectiveProjectStatus}. Build-ready promotion remained blocked by change review.`
          : review.saveSource === "manualCheckpoint"
            ? "Manual checkpoint recorded."
            : "Blueprint saved.";

      return {
        success: true,
        savedBlueprint: next,
        recordedRevisionNumber: recordedRevision?.revisionNumber ?? null,
        effectiveProjectStatus: next.project.status,
        message: `${statusMessage}${recordedRevision ? ` Revision ${recordedRevision.revisionNumber} was recorded.` : ""}`,
      };
    } catch (error) {
      return {
        success: false,
        code: "persist-failed",
        reason: error instanceof Error ? error.message : "Unable to persist the reviewed project change.",
      };
    }
  }

  private recordProjectRevision(input: {
    snapshot: ProjectBlueprint;
    source: RevisionSource;
    reason?: string | null;
    relatedDecisionRecordIds?: string[];
    summary?: string;
  }): BlueprintRevision | null {
    const previousRevision = this.repository.getLatestProjectRevision(input.snapshot.project.id) ?? null;
    const revision = buildBlueprintRevision({
      snapshot: input.snapshot,
      previousRevision,
      source: input.source,
      summary: input.summary,
      reason: input.reason,
      relatedDecisionRecordIds: input.relatedDecisionRecordIds,
    });

    if (!revision) {
      return null;
    }

    return this.repository.appendProjectRevision(revision);
  }

  private ensureProjectRevisionHistory(projects: ProjectBlueprint[], source: RevisionSource): void {
    projects.forEach((project) => {
      if (this.repository.getLatestProjectRevision(project.project.id)) {
        return;
      }

      this.recordProjectRevision({
        snapshot: project,
        source,
        reason:
          source === "seed"
            ? "Seed blueprint initialized for inspection."
            : "Revision history backfilled from existing active storage.",
      });
    });
  }

  bootstrap(): BlueprintBootstrapResult {
    let loaded = this.repository.loadAll();
    let seeded = false;

    if (loaded.projects.length === 0 && loaded.report.status === "empty" && loaded.report.quarantineCount === 0) {
      this.repository.seed([createSeedBlueprint()]);
      loaded = this.repository.loadAll();
      seeded = true;
    }

    if (loaded.projects.length > 0) {
      this.ensureProjectRevisionHistory(
        loaded.projects,
        seeded ? "seed" : "system",
      );
    }

    const selectedProjectIdFromStorage = this.repository.getSelectedProjectId();
    const selectedProjectId = loaded.projects.some((project) => project.project.id === selectedProjectIdFromStorage)
      ? selectedProjectIdFromStorage
      : loaded.projects[0]?.project.id ?? null;

    if (selectedProjectId) {
      this.repository.setSelectedProjectId(selectedProjectId);
    }

    return {
      projects: loaded.projects,
      selectedProjectId,
      loadReport: loaded.report,
      quarantinedPayloads: this.repository.listQuarantinedPayloads(),
    };
  }

  createProject(input: {
    name: string;
    rawIdea: string;
    corePhilosophy?: string;
    invariantPriorities?: string[];
  }): ProjectBlueprint {
    const blueprint = completeBlueprintStructure(this.composeRawIdeaBlueprint(input));
    return this.saveBlueprint(blueprint, "Initial framework created from raw idea.");
  }

  createEmptyProject(input: {
    name: string;
    rawIdea: string;
    corePhilosophy?: string;
    invariantPriorities?: string[];
  }): ProjectBlueprint {
    const blueprint = this.composeRawIdeaBlueprint(input);
    return this.saveBlueprint(blueprint, "Initial empty blueprint created from raw idea.");
  }

  createProjectFromGuidedIntake(
    input: GuidedIntakeInput,
    options?: {
      conversationImport?: {
        sourceType: ConversationSourceType;
        optionalSourceLabel?: string;
        title?: string;
      };
    },
  ): ProjectBlueprint {
    const blueprint = composeBlueprintFromGuidedIntake(input);
    if (options?.conversationImport) {
      const label = options.conversationImport.optionalSourceLabel?.trim();
      const title = options.conversationImport.title?.trim();
      blueprint.memory.projectEntries = [
        ...blueprint.memory.projectEntries,
        createMemoryEntry({
          type: "project",
          relatedEntityIds: [blueprint.project.id, blueprint.intent.id],
          summary: `Created from ${options.conversationImport.sourceType} conversation import${label ? ` (${label})` : title ? ` (${title})` : ""}.`,
          reason: "Conversation import distilled into guided intake.",
          tags: ["conversation-import", options.conversationImport.sourceType],
        }),
      ];
    }
    return this.saveBlueprint(blueprint, "Initial project created from guided intake.");
  }

  completeMissingStructure(project: ProjectBlueprint): ProjectBlueprint {
    const completed = completeBlueprintStructure(project);
    return this.saveBlueprint(completed, "Completed missing framework structure.");
  }

  applySafeQualityFixes(project: ProjectBlueprint): ProjectBlueprint {
    const fixed = applySafeBlueprintImprovementFixes(project);
    fixed.validation = validateBlueprint(fixed);
    return this.saveBlueprint(fixed, "Applied safe blueprint quality fixes.");
  }

  applyQualityFix(project: ProjectBlueprint, fixId: string): ProjectBlueprint {
    const fixed = applyBlueprintImprovementFix(project, fixId);
    fixed.validation = validateBlueprint(fixed);
    return this.saveBlueprint(fixed, `Applied blueprint quality fix: ${fixId}`);
  }

  addForesightItemToExpansion(project: ProjectBlueprint, foresightItemId: string): ProjectBlueprint {
    const next = cloneBlueprint(project);
    const item = findForesightItem(next, foresightItemId);
    const validIds = collectBlueprintEntityIds(next);
    const relatedIds = [...item.prerequisiteEntityIds, ...item.relatedEntityIds].filter((id) => validIds.has(id));
    const relatedFunctionIds = relatedIds.filter((id) => next.functions.some((fn) => fn.id === id));
    const relatedComponentIds = relatedIds.filter((id) => next.components.some((component) => component.id === id));
    const relatedOutcomeIds = relatedIds.filter((id) => next.outcomes.some((outcome) => outcome.id === id));
    const scopeItem = createScopeItem(item.title);

    scopeItem.description = item.description;
    scopeItem.rationale = `${item.whyItMatters} ${item.whyNowOrLater}`;
    scopeItem.outcomeIds = relatedOutcomeIds.length > 0
      ? relatedOutcomeIds
      : next.outcomes.slice(0, 1).map((outcome) => outcome.id);
    scopeItem.functionIds = relatedFunctionIds;
    scopeItem.componentIds = relatedComponentIds;

    if (
      scopeItem.outcomeIds.length === 0 &&
      scopeItem.functionIds.length === 0 &&
      scopeItem.componentIds.length === 0
    ) {
      scopeItem.outcomeIds = next.outcomes.slice(0, 1).map((outcome) => outcome.id);
      scopeItem.functionIds = next.functions.slice(0, 1).map((fn) => fn.id);
      scopeItem.componentIds = next.components.slice(0, 1).map((component) => component.id);
    }

    next.expansionScope.summary =
      next.expansionScope.summary.trim() ||
      "Future opportunities that should stay separate from the MVP until intentionally accepted.";
    next.expansionScope.futureSignals = appendUnique(next.expansionScope.futureSignals, [
      `Foresight: ${item.title}`,
    ]);
    next.expansionScope.items = [...next.expansionScope.items, scopeItem];
    next.validation = validateBlueprint(next);

    return this.saveBlueprint(next, `Added foresight item to expansion: ${item.title}.`);
  }

  addForesightItemAsDecision(project: ProjectBlueprint, foresightItemId: string): ProjectBlueprint {
    const next = cloneBlueprint(project);
    const item = findForesightItem(next, foresightItemId);
    const validIds = collectBlueprintEntityIds(next);
    const relatedEntityIds = appendUnique(
      [...item.prerequisiteEntityIds, ...item.relatedEntityIds].filter((id) => validIds.has(id)),
      [next.project.id],
    );
    const decision = createDecisionRecord();

    decision.title = `Foresight: ${item.title}`;
    decision.summary = item.description;
    decision.reason = `${item.whyItMatters} ${item.whyNowOrLater}`;
    decision.status = "proposed";
    decision.relatedEntityIds = relatedEntityIds;
    decision.rejectedOptions =
      item.horizon === "not-yet"
        ? ["Build this before prerequisites are proven"]
        : ["Ignore the foresight signal without review"];
    decision.invariantConflicts = item.category === "governance" || item.category === "user-trust"
      ? next.invariants.slice(0, 3).map((invariant) => invariant.name)
      : [];
    decision.scopeDecision =
      item.horizon === "later" || item.horizon === "not-yet"
        ? "expansion"
        : item.category === "governance" || item.category === "user-trust"
          ? "governance"
          : "architecture";

    next.decisionLogic.records = [...next.decisionLogic.records, decision];
    next.validation = validateBlueprint(next);

    return this.saveBlueprint(next, `Recorded foresight decision: ${item.title}.`);
  }

  addImplementationTaskAsDecision(project: ProjectBlueprint, taskId: string): ProjectBlueprint {
    const next = cloneBlueprint(project);
    const plan = buildImplementationPlan(next);
    const task = findImplementationPlanTask(plan, taskId);

    if (!task) {
      throw new Error(`Unknown implementation task: ${taskId}`);
    }

    const decision = createDecisionRecord();
    decision.title = `Implementation task: ${task.title}`;
    decision.summary = task.description;
    decision.reason = `Selected from implementation plan. Acceptance: ${task.acceptanceCriteria.join(" ")}`;
    decision.status = "proposed";
    decision.relatedEntityIds = appendUnique(validRelatedEntityIds(next, task.relatedEntityIds), [next.project.id]);
    decision.rejectedOptions = ["Rewrite the whole app instead of completing this bounded implementation task"];
    decision.invariantConflicts = next.invariants.slice(0, 3).map((invariant) => invariant.name);
    decision.scopeDecision = "architecture";

    next.decisionLogic.records = [...next.decisionLogic.records, decision];
    next.validation = validateBlueprint(next);

    return this.saveBlueprint(next, `Recorded implementation task decision: ${task.title}.`);
  }

  addImplementationDeferredItemToExpansion(project: ProjectBlueprint, deferredItemId: string): ProjectBlueprint {
    const next = cloneBlueprint(project);
    const plan = buildImplementationPlan(next);
    const deferred = findImplementationDeferredItem(plan, deferredItemId);

    if (!deferred) {
      throw new Error(`Unknown deferred implementation item: ${deferredItemId}`);
    }

    const scopeItem = createScopeItem(deferred.title);
    const relatedIds = validRelatedEntityIds(next, deferred.relatedEntityIds);
    scopeItem.description = deferred.description;
    scopeItem.rationale = `Deferred implementation planning item from ${deferred.source}. Keep this outside MVP until intentionally accepted.`;
    scopeItem.outcomeIds = relatedIds.filter((id) => next.outcomes.some((outcome) => outcome.id === id));
    scopeItem.functionIds = relatedIds.filter((id) => next.functions.some((fn) => fn.id === id));
    scopeItem.componentIds = relatedIds.filter((id) => next.components.some((component) => component.id === id));

    if (
      scopeItem.outcomeIds.length === 0 &&
      scopeItem.functionIds.length === 0 &&
      scopeItem.componentIds.length === 0
    ) {
      scopeItem.outcomeIds = next.outcomes.slice(0, 1).map((outcome) => outcome.id);
    }

    next.expansionScope.summary =
      next.expansionScope.summary.trim() ||
      "Future opportunities that should stay separate from the MVP until intentionally accepted.";
    next.expansionScope.futureSignals = appendUnique(next.expansionScope.futureSignals, [
      `Implementation deferred: ${deferred.title}`,
    ]);
    next.expansionScope.items = [...next.expansionScope.items, scopeItem];
    next.validation = validateBlueprint(next);

    return this.saveBlueprint(next, `Added deferred implementation item to expansion: ${deferred.title}.`);
  }

  listQuarantinedPayloads(): QuarantinedPayload[] {
    return this.repository.listQuarantinedPayloads();
  }

  getQuarantinedPayload(quarantineId: string): QuarantinedPayload | null {
    return this.repository.getQuarantinedPayload(quarantineId) ?? null;
  }

  exportQuarantinedPayload(quarantineId: string): QuarantineExportFile | null {
    const entry = this.repository.getQuarantinedPayload(quarantineId);

    if (!entry) {
      return null;
    }

    return {
      fileName: `framework-architect-quarantine-${entry.id}.json`,
      content: JSON.stringify(createQuarantineExport(entry), null, 2),
    };
  }

  listProjectRevisions(projectId: string | null): BlueprintRevision[] {
    if (!projectId) {
      return [];
    }

    return this.repository.listProjectRevisions(projectId);
  }

  getProjectRevision(revisionId: string): BlueprintRevision | null {
    return this.repository.getProjectRevision(revisionId) ?? null;
  }

  buildRevisionComparison(input: {
    projectId: string | null;
    baseRevisionId: string | null;
    mode?: RevisionComparisonMode;
    compareRevisionId?: string | null;
    activeBlueprint?: ProjectBlueprint | null;
  }): RevisionComparisonResult {
    return buildRevisionComparison({
      revisions: input.projectId ? this.repository.listProjectRevisions(input.projectId) : [],
      baseRevisionId: input.baseRevisionId,
      mode: input.mode,
      compareRevisionId: input.compareRevisionId,
      activeBlueprint: input.activeBlueprint ?? null,
    });
  }

  previewQuarantinedPayload(input: {
    quarantineId: string;
    repairedJson?: string;
    activeBlueprint?: ProjectBlueprint | null;
    selectedRecoveredProjectId?: string | null;
  }): QuarantinePreviewResult {
    const entry = this.repository.getQuarantinedPayload(input.quarantineId);
    if (!entry) {
      return recoveryFailure({
        failureStage: "detect",
        failureCategory: "format",
        detectedStorageVersion: null,
        migrationSteps: [],
        reason: "Quarantine entry was not found.",
      });
    }

    const recoveryPayload = resolveRecoveryPayload(entry, input.repairedJson);
    if (!recoveryPayload.success) {
      return recoveryPayload;
    }

    const hydrated = this.repository.hydrateStoredPayload(recoveryPayload.payload);

    if (!hydrated.success) {
      return hydrated;
    }

    const activeBlueprint = input.activeBlueprint ?? null;
    const restoreCandidate = buildRestoreCandidate({
      quarantineId: entry.id,
      candidateDocument: hydrated.document,
      activeBlueprint,
      existingProjects: this.repository.list(),
      selectedRecoveredProjectId: input.selectedRecoveredProjectId,
    });

    return {
      success: true,
      report: hydrated.report,
      candidateDocument: hydrated.document,
      restoreCandidate,
      message: !restoreCandidate.restoreReady
        ? "Preview recovery succeeded, but no recovered project is available to restore."
        : restoreCandidate.compare.identical
          ? "Preview recovery succeeded. The selected recovered project matches the current active blueprint."
          : "Preview recovery succeeded. Review the structural differences before restoring or clearing quarantine.",
    };
  }

  restorePreviewCandidate(input: {
    preview: QuarantinePreviewResult | null;
    confirm: boolean;
  }): QuarantineRestoreResult {
    if (!input.preview || !input.preview.success) {
      return {
        success: false,
        code: "preview-required",
        reason: "Run a successful recovery preview before restoring.",
      };
    }

    if (!input.confirm) {
      return {
        success: false,
        code: "confirmation-required",
        reason: "Explicit restore confirmation is required before active storage can be updated.",
      };
    }

    const selectedRecoveredProjectId = input.preview.restoreCandidate.selectedRecoveredProjectId;
    if (!input.preview.restoreCandidate.restoreReady || !selectedRecoveredProjectId) {
      return {
        success: false,
        code: "selection-invalid",
        reason: "Select a recovered project before restoring.",
      };
    }

    const recoveredProject = input.preview.candidateDocument.projects.find(
      (project) => project.project.id === selectedRecoveredProjectId,
    );

    if (!recoveredProject) {
      return {
        success: false,
        code: "selection-invalid",
        reason: "The selected recovered project is no longer available in the preview candidate.",
      };
    }

    try {
      const currentProjects = this.repository.list();
      const existingIndex = currentProjects.findIndex(
        (project) => project.project.id === recoveredProject.project.id,
      );
      const nextProjects = structuredClone(currentProjects);

      if (existingIndex >= 0) {
        nextProjects[existingIndex] = structuredClone(recoveredProject);
      } else {
        nextProjects.push(structuredClone(recoveredProject));
      }

      this.repository.saveAll(nextProjects);
      this.repository.setSelectedProjectId(recoveredProject.project.id);
      const recordedRevision = this.recordProjectRevision({
        snapshot: structuredClone(recoveredProject),
        source: "recoveryRestore",
        reason: `Restored from quarantine entry ${input.preview.restoreCandidate.quarantineId}.`,
      });

      const loaded = this.repository.loadAll();

      return {
        success: true,
        selectedProjectId: recoveredProject.project.id,
        restoredProjectId: recoveredProject.project.id,
        restoredProjectName: recoveredProject.project.name,
        projects: loaded.projects,
        report: loaded.report,
        restoreMode: input.preview.restoreCandidate.restoreMode,
        quarantinePreserved: true,
        message:
          input.preview.restoreCandidate.restoreMode === "append-active"
            ? `Recovered project "${recoveredProject.project.name}" was restored into active storage as a separate project.${recordedRevision ? ` Revision ${recordedRevision.revisionNumber} was recorded.` : ""} Quarantine was preserved.`
            : `Recovered project "${recoveredProject.project.name}" was restored into active storage and selected.${recordedRevision ? ` Revision ${recordedRevision.revisionNumber} was recorded.` : ""} Quarantine was preserved.`,
      };
    } catch (error) {
      return {
        success: false,
        code: "persist-failed",
        reason: error instanceof Error ? error.message : "Unable to restore the recovered project.",
      };
    }
  }

  clearQuarantinedPayload(quarantineId?: string): void {
    this.repository.clearQuarantinedPayloads(quarantineId);
  }

  reextractIntent(blueprint: ProjectBlueprint): ProjectBlueprint {
    const extracted = extractIntentFromRawIdea(blueprint.project.rawIdea);
    const next = cloneBlueprint(blueprint);
    const stamp = nowIso();

    next.intent.summary = extracted.summary;
    next.intent.problemStatement = extracted.problemStatement;
    next.intent.targetAudience = extracted.targetAudience;
    next.intent.valueHypothesis = extracted.valueHypothesis;
    next.intent.updatedAt = stamp;

    if (next.outcomes[0]) {
      next.outcomes[0].name = extracted.outcomeName;
      next.outcomes[0].description = extracted.outcomeDescription;
      next.outcomes[0].updatedAt = stamp;
    }

    return this.saveBlueprint(next, "Re-extracted intent and primary outcome from the raw idea.");
  }

  reviewStableSave(input: {
    candidate: ProjectBlueprint;
    reason: string;
    source?: StableSaveSource;
  }): ChangeReviewResult {
    const parsed = ProjectBlueprintSchema.parse(cloneBlueprint(input.candidate));
    const existing = this.repository.find(parsed.project.id) ?? null;
    const latestRevision = this.repository.getLatestProjectRevision(parsed.project.id) ?? null;

    return buildChangeReview({
      baselineBlueprint: existing,
      latestRevision,
      candidateBlueprint: parsed,
      reason: input.reason.trim() || this.defaultStableBoundaryReason(input.source ?? "editSave"),
      saveSource: input.source ?? "editSave",
    });
  }

  commitStableSave(input: {
    review: ChangeReviewResult | null;
    confirm: boolean;
  }): StableSaveCommitResult {
    if (!input.review || input.review.status !== "ready") {
      return {
        success: false,
        code: "review-required",
        reason: "Run a stable save review before attempting to commit the change.",
      };
    }

    if (!input.review.stableSaveAllowed) {
      return {
        success: false,
        code: "save-blocked",
        reason: "This reviewed change cannot be committed as stable project truth.",
      };
    }

    if (input.review.confirmationRequired && !input.confirm) {
      return {
        success: false,
        code: "confirmation-required",
        reason: "Explicit confirmation is required before this reviewed change can be saved.",
      };
    }

    return this.persistReviewedSave(input.review);
  }

  saveBlueprint(candidate: ProjectBlueprint, reason: string): ProjectBlueprint {
    return this.executeStableBoundaryAction({
      candidate,
      reason,
      source: "editSave",
    });
  }

  createManualCheckpoint(candidate: ProjectBlueprint, reason: string): ProjectBlueprint {
    return this.executeStableBoundaryAction({
      candidate,
      reason,
      source: "manualCheckpoint",
    });
  }

  selectProject(projectId: string | null): ProjectBlueprint | null {
    if (!projectId) {
      this.repository.setSelectedProjectId(null);
      return null;
    }

    this.repository.setSelectedProjectId(projectId);
    return this.repository.find(projectId) ?? null;
  }
}
