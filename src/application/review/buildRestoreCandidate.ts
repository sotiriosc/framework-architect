import {
  compareBlueprints,
} from "@/application/review/compareBlueprints";
import type { BlueprintStructuralDiff } from "@/application/review/diffModel";
import type { ProjectBlueprint } from "@/domain/models";
import type { StoredProjectsDocument } from "@/persistence/types";

export type RecoveredProjectOption = {
  id: string;
  name: string;
  status: string;
  version: number;
};

export type RestoreMode = "replace-active" | "replace-existing" | "append-active";

export type RestoreCandidate = {
  quarantineId: string;
  activeProjectId: string | null;
  activeProjectName: string | null;
  recoveredProjects: RecoveredProjectOption[];
  selectedRecoveredProjectId: string | null;
  selectedRecoveredProjectName: string | null;
  selectedRecoveredProjectStatus: string | null;
  selectedRecoveredProjectVersion: number | null;
  matchedStoredProjectId: string | null;
  matchedStoredProjectName: string | null;
  compare: BlueprintStructuralDiff;
  restoreReady: boolean;
  restoreMode: RestoreMode;
  restoreSummary: string;
  restoreWarnings: string[];
};

const toRecoveredProjectOption = (project: ProjectBlueprint): RecoveredProjectOption => ({
  id: project.project.id,
  name: project.project.name,
  status: project.project.status,
  version: project.project.version,
});

const resolveSelectedRecoveredProject = (input: {
  recoveredProjects: ProjectBlueprint[];
  activeBlueprint: ProjectBlueprint | null;
  selectedRecoveredProjectId?: string | null;
}): ProjectBlueprint | null => {
  if (input.selectedRecoveredProjectId) {
    const explicit = input.recoveredProjects.find(
      (project) => project.project.id === input.selectedRecoveredProjectId,
    );
    if (explicit) {
      return explicit;
    }
  }

  if (input.activeBlueprint) {
    const activeProjectId = input.activeBlueprint.project.id;
    const matchedActive = input.recoveredProjects.find(
      (project) => project.project.id === activeProjectId,
    );
    if (matchedActive) {
      return matchedActive;
    }
  }

  return input.recoveredProjects[0] ?? null;
};

const resolveRestoreMode = (
  selectedProject: ProjectBlueprint | null,
  activeBlueprint: ProjectBlueprint | null,
  existingProjects: ProjectBlueprint[],
): RestoreMode => {
  if (!selectedProject) {
    return "append-active";
  }

  const matchedStoredProject = existingProjects.find(
    (project) => project.project.id === selectedProject.project.id,
  );

  if (!matchedStoredProject) {
    return "append-active";
  }

  if (activeBlueprint && matchedStoredProject.project.id === activeBlueprint.project.id) {
    return "replace-active";
  }

  return "replace-existing";
};

const createRestoreSummary = (input: {
  selectedProject: ProjectBlueprint | null;
  activeBlueprint: ProjectBlueprint | null;
  matchedStoredProject: ProjectBlueprint | null;
  restoreMode: RestoreMode;
}): string => {
  if (!input.selectedProject) {
    return "Preview succeeded, but there is no recovered project available to restore.";
  }

  if (input.restoreMode === "replace-active" && input.activeBlueprint) {
    return `Restore will replace the current active project "${input.activeBlueprint.project.name}" with "${input.selectedProject.project.name}" and keep it selected.`;
  }

  if (input.restoreMode === "replace-existing" && input.matchedStoredProject) {
    return `Restore will replace stored project "${input.matchedStoredProject.project.name}" with "${input.selectedProject.project.name}" and then make the recovered project active.`;
  }

  return `Restore will add "${input.selectedProject.project.name}" to active storage and then make it the active project.`;
};

const createRestoreWarnings = (input: {
  recoveredProjectCount: number;
  selectedProject: ProjectBlueprint | null;
  activeBlueprint: ProjectBlueprint | null;
  matchedStoredProject: ProjectBlueprint | null;
  restoreMode: RestoreMode;
}): string[] => {
  const warnings: string[] = [];

  if (input.recoveredProjectCount > 1) {
    warnings.push(
      `Recovered payload contains ${input.recoveredProjectCount} projects. Only the selected recovered project will be restored.`,
    );
  }

  if (!input.selectedProject) {
    warnings.push("No recovered project is currently selected, so restore is blocked.");
    return warnings;
  }

  if (!input.activeBlueprint) {
    warnings.push("No active project is selected. Restore will add the recovered project and then select it.");
  }

  if (
    input.activeBlueprint &&
    input.selectedProject.project.id !== input.activeBlueprint.project.id
  ) {
    warnings.push(
      `The selected recovered project does not match the current active project "${input.activeBlueprint.project.name}". Review the compare summary before restoring.`,
    );
  }

  if (
    input.restoreMode === "replace-existing" &&
    input.matchedStoredProject &&
    (!input.activeBlueprint || input.matchedStoredProject.project.id !== input.activeBlueprint.project.id)
  ) {
    warnings.push(
      `Restore will replace the stored project "${input.matchedStoredProject.project.name}" because it shares the same project id.`,
    );
  }

  return warnings;
};

export const buildRestoreCandidate = (input: {
  quarantineId: string;
  candidateDocument: StoredProjectsDocument;
  activeBlueprint: ProjectBlueprint | null;
  existingProjects: ProjectBlueprint[];
  selectedRecoveredProjectId?: string | null;
}): RestoreCandidate => {
  const recoveredProjects = input.candidateDocument.projects;
  const selectedProject = resolveSelectedRecoveredProject({
    recoveredProjects,
    activeBlueprint: input.activeBlueprint,
    selectedRecoveredProjectId: input.selectedRecoveredProjectId,
  });
  const matchedStoredProject = selectedProject
    ? input.existingProjects.find((project) => project.project.id === selectedProject.project.id) ?? null
    : null;
  const compare = compareBlueprints({
    activeBlueprint: input.activeBlueprint,
    candidateBlueprint: selectedProject,
  });
  const restoreMode = resolveRestoreMode(
    selectedProject,
    input.activeBlueprint,
    input.existingProjects,
  );

  return {
    quarantineId: input.quarantineId,
    activeProjectId: input.activeBlueprint?.project.id ?? null,
    activeProjectName: input.activeBlueprint?.project.name ?? null,
    recoveredProjects: recoveredProjects.map(toRecoveredProjectOption),
    selectedRecoveredProjectId: selectedProject?.project.id ?? null,
    selectedRecoveredProjectName: selectedProject?.project.name ?? null,
    selectedRecoveredProjectStatus: selectedProject?.project.status ?? null,
    selectedRecoveredProjectVersion: selectedProject?.project.version ?? null,
    matchedStoredProjectId: matchedStoredProject?.project.id ?? null,
    matchedStoredProjectName: matchedStoredProject?.project.name ?? null,
    compare,
    restoreReady: Boolean(selectedProject),
    restoreMode,
    restoreSummary: createRestoreSummary({
      selectedProject,
      activeBlueprint: input.activeBlueprint,
      matchedStoredProject,
      restoreMode,
    }),
    restoreWarnings: createRestoreWarnings({
      recoveredProjectCount: recoveredProjects.length,
      selectedProject,
      activeBlueprint: input.activeBlueprint,
      matchedStoredProject,
      restoreMode,
    }),
  };
};
