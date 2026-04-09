import {
  createEmptyBlueprint,
  createIntent,
  createMemoryEntry,
  createOutcome,
  createProject,
} from "@/domain/defaults";
import type { MemoryState, ProjectBlueprint } from "@/domain/models";
import {
  compareBlueprints,
  type BlueprintCompareSummary,
} from "@/application/review/compareBlueprints";
import { nowIso } from "@/lib/identity";
import type { ProjectRepository } from "@/persistence/projectRepository";
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
import { extractIntentFromRawIdea } from "@/application/intake/extractIntent";
import { hasCriticalValidationFailures, validateBlueprint } from "@/application/validation/validateBlueprint";

const cloneBlueprint = (blueprint: ProjectBlueprint): ProjectBlueprint => structuredClone(blueprint);

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
  compare: BlueprintCompareSummary;
  message: string;
};

export type QuarantinePreviewResult = QuarantinePreviewSuccess | QuarantineRecoveryFailure;

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

const resolveCandidateProject = (
  projects: ProjectBlueprint[],
  activeBlueprint: ProjectBlueprint | null,
): ProjectBlueprint | null => {
  if (activeBlueprint) {
    const matched = projects.find((project) => project.project.id === activeBlueprint.project.id);
    if (matched) {
      return matched;
    }
  }

  return projects[0] ?? null;
};

export class BlueprintService {
  constructor(private readonly repository: ProjectRepository) {}

  bootstrap(): BlueprintBootstrapResult {
    let loaded = this.repository.loadAll();

    if (loaded.projects.length === 0 && loaded.report.status === "empty" && loaded.report.quarantineCount === 0) {
      this.repository.seed([createSeedBlueprint()]);
      loaded = this.repository.loadAll();
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

    const blueprint = createEmptyBlueprint(project, intent, outcome);
    return this.saveBlueprint(blueprint, "Initial project created from raw idea.");
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

  previewQuarantinedPayload(input: {
    quarantineId: string;
    repairedJson?: string;
    activeBlueprint?: ProjectBlueprint | null;
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
    const candidateProject = resolveCandidateProject(hydrated.document.projects, activeBlueprint);
    const compare = compareBlueprints({
      activeBlueprint,
      candidateBlueprint: candidateProject,
    });

    return {
      success: true,
      report: hydrated.report,
      candidateDocument: hydrated.document,
      compare,
      message: compare.identical
        ? "Preview recovery succeeded. The recovered candidate matches the current active blueprint."
        : "Preview recovery succeeded. Review the structural differences before restoring or clearing quarantine.",
    };
  }

  recoverQuarantinedPayload(input: {
    quarantineId: string;
    repairedJson: string;
    clearOnSuccess?: boolean;
  }): QuarantineRecoveryResult {
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

    this.repository.saveAll(hydrated.document.projects);
    const selectedProjectId =
      this.repository.getSelectedProjectId() &&
      hydrated.document.projects.some((project) => project.project.id === this.repository.getSelectedProjectId())
        ? this.repository.getSelectedProjectId()
        : hydrated.document.projects[0]?.project.id ?? null;

    this.repository.setSelectedProjectId(selectedProjectId);

    if (input.clearOnSuccess) {
      this.repository.clearQuarantinedPayloads(entry.id);
    }

    return {
      success: true,
      selectedProjectId,
      projects: hydrated.document.projects,
      report: hydrated.report,
      message: input.clearOnSuccess
        ? "Recovered payload restored into active storage and the quarantine entry was cleared."
        : "Recovered payload restored into active storage. The original quarantine entry was preserved until you clear it.",
    };
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

  saveBlueprint(candidate: ProjectBlueprint, reason: string): ProjectBlueprint {
    const parsed = ProjectBlueprintSchema.parse(cloneBlueprint(candidate));
    const next = cloneBlueprint(parsed);
    const stamp = nowIso();
    const existing = this.repository.find(next.project.id);

    next.project.version = existing ? existing.project.version + 1 : next.project.version;
    next.project.updatedAt = stamp;

    next.validation = validateBlueprint(next);

    if (next.project.status === "build-ready" && hasCriticalValidationFailures(next.validation)) {
      next.project.status = "validated";
    }

    next.memory = appendMemorySnapshot(next.memory, next, reason || "Manual blueprint update.");

    this.repository.save(next);
    this.repository.setSelectedProjectId(next.project.id);

    return next;
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
