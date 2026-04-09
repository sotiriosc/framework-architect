import {
  createEmptyBlueprint,
  createIntent,
  createMemoryEntry,
  createOutcome,
  createProject,
} from "@/domain/defaults";
import type { MemoryState, ProjectBlueprint } from "@/domain/models";
import { nowIso } from "@/lib/identity";
import type { ProjectRepository } from "@/persistence/projectRepository";
import type { QuarantinedPayload, RepositoryLoadReport } from "@/persistence/types";
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
