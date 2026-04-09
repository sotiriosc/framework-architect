import { useState } from "react";

import {
  BlueprintService,
  type QuarantinePreviewResult,
} from "@/application/services/blueprintService";
import type { ProjectBlueprint } from "@/domain/models";
import { LocalProjectRepository } from "@/persistence/localProjectRepository";
import type { BlueprintRevision } from "@/persistence/revisionTypes";
import type { QuarantinedPayload, RepositoryLoadReport } from "@/persistence/types";
import type { CreateProjectDraft } from "@/ui/components/ProjectForm";

const repository = new LocalProjectRepository();
const blueprintService = new BlueprintService(repository);

const defaultCreateDraft: CreateProjectDraft = {
  name: "",
  rawIdea: "",
  corePhilosophy: "Architecture first. Keep governance explicit and inspectable.",
  invariantPrioritiesText: "Transparency\nTraceability\nBuild-ready only after validation",
};

const formatJson = (value: unknown): string => JSON.stringify(value, null, 2) ?? "null";

type QuarantineFeedback = {
  tone: "success" | "error";
  message: string;
};

type WorkspaceState = {
  projects: ProjectBlueprint[];
  selectedProjectId: string | null;
  draftBlueprint: ProjectBlueprint | null;
  createDraft: CreateProjectDraft;
  loadReport: RepositoryLoadReport | null;
  projectRevisions: BlueprintRevision[];
  selectedRevisionId: string | null;
  showRevisionSnapshotJson: boolean;
  quarantinedPayloads: QuarantinedPayload[];
  selectedQuarantineId: string | null;
  recoveryDraft: string;
  quarantinePreview: QuarantinePreviewResult | null;
  restoreConfirmationChecked: boolean;
  showPreviewJson: boolean;
  quarantineFeedback: QuarantineFeedback | null;
  error: string | null;
};

const initializeWorkspace = (): WorkspaceState => {
  const { projects, selectedProjectId, loadReport, quarantinedPayloads } = blueprintService.bootstrap();
  const selectedProject =
    (selectedProjectId ? projects.find((project) => project.project.id === selectedProjectId) : null) ??
    projects[0] ??
    null;
  const projectRevisions = blueprintService.listProjectRevisions(selectedProject?.project.id ?? null);
  const selectedQuarantine = quarantinedPayloads[0] ?? null;

  return {
    projects,
    selectedProjectId: selectedProject?.project.id ?? null,
    draftBlueprint: selectedProject ? structuredClone(selectedProject) : null,
    createDraft: defaultCreateDraft,
    loadReport,
    projectRevisions,
    selectedRevisionId: projectRevisions[0]?.id ?? null,
    showRevisionSnapshotJson: false,
    quarantinedPayloads,
    selectedQuarantineId: selectedQuarantine?.id ?? null,
    recoveryDraft: selectedQuarantine ? formatJson(selectedQuarantine.rawPayload) : "",
    quarantinePreview: null,
    restoreConfirmationChecked: false,
    showPreviewJson: false,
    quarantineFeedback: null,
    error: null,
  };
};

const parseInvariantPriorities = (value: string): string[] =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

export const useBlueprintWorkspace = () => {
  const [state, setState] = useState<WorkspaceState>(() => initializeWorkspace());

  const refreshProjects = (selectedProjectId: string | null) => {
    const loaded = repository.loadAll();
    const projects = loaded.projects;
    const resolvedSelectedProjectId =
      selectedProjectId && projects.some((project) => project.project.id === selectedProjectId)
        ? selectedProjectId
        : projects[0]?.project.id ?? null;
    const selectedProject =
      (resolvedSelectedProjectId
        ? projects.find((project) => project.project.id === resolvedSelectedProjectId)
        : null) ??
      null;

    if (resolvedSelectedProjectId !== selectedProjectId) {
      repository.setSelectedProjectId(resolvedSelectedProjectId);
    }

    setState((current) => {
      const projectRevisions = blueprintService.listProjectRevisions(resolvedSelectedProjectId);
      const selectedRevisionId =
        current.selectedProjectId === resolvedSelectedProjectId &&
        current.selectedRevisionId &&
        projectRevisions.some((revision) => revision.id === current.selectedRevisionId)
          ? current.selectedRevisionId
          : projectRevisions[0]?.id ?? null;
      const quarantinedPayloads = blueprintService.listQuarantinedPayloads();
      const selectedQuarantineId =
        current.selectedQuarantineId &&
        quarantinedPayloads.some((entry) => entry.id === current.selectedQuarantineId)
          ? current.selectedQuarantineId
          : quarantinedPayloads[0]?.id ?? null;
      const selectedQuarantine =
        quarantinedPayloads.find((entry) => entry.id === selectedQuarantineId) ?? null;
      const recoveryDraft =
        selectedQuarantine && selectedQuarantineId === current.selectedQuarantineId
          ? current.recoveryDraft
          : selectedQuarantine
            ? formatJson(selectedQuarantine.rawPayload)
            : "";

      return {
        ...current,
        projects,
        selectedProjectId: resolvedSelectedProjectId,
        draftBlueprint: selectedProject ? structuredClone(selectedProject) : null,
        loadReport: loaded.report,
        projectRevisions,
        selectedRevisionId,
        showRevisionSnapshotJson: false,
        quarantinedPayloads,
        selectedQuarantineId,
        recoveryDraft,
        quarantinePreview: null,
        restoreConfirmationChecked: false,
        showPreviewJson: false,
        error: null,
      };
    });
  };

  const createProject = () => {
    if (!state.createDraft.name.trim() || !state.createDraft.rawIdea.trim()) {
      setState((current) => ({
        ...current,
        error: "Project name and raw idea are required.",
      }));
      return;
    }

    try {
      const created = blueprintService.createProject({
        name: state.createDraft.name.trim(),
        rawIdea: state.createDraft.rawIdea.trim(),
        corePhilosophy: state.createDraft.corePhilosophy.trim(),
        invariantPriorities: parseInvariantPriorities(state.createDraft.invariantPrioritiesText),
      });

      refreshProjects(created.project.id);
      setState((current) => ({
        ...current,
        draftBlueprint: structuredClone(created),
        createDraft: defaultCreateDraft,
        error: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to create project.",
      }));
    }
  };

  const selectProject = (projectId: string | null) => {
    const selected = blueprintService.selectProject(projectId);
    const projectRevisions = blueprintService.listProjectRevisions(selected?.project.id ?? null);
    setState((current) => ({
      ...current,
      selectedProjectId: selected?.project.id ?? null,
      draftBlueprint: selected ? structuredClone(selected) : null,
      projectRevisions,
      selectedRevisionId: projectRevisions[0]?.id ?? null,
      showRevisionSnapshotJson: false,
      quarantinePreview: null,
      restoreConfirmationChecked: false,
      showPreviewJson: false,
      error: null,
    }));
  };

  const selectRevision = (revisionId: string | null) => {
    setState((current) => ({
      ...current,
      selectedRevisionId: revisionId,
      showRevisionSnapshotJson: false,
    }));
  };

  const toggleRevisionSnapshotJson = () => {
    setState((current) => ({
      ...current,
      showRevisionSnapshotJson: !current.showRevisionSnapshotJson,
    }));
  };

  const updateCreateDraft = (createDraft: CreateProjectDraft) => {
    setState((current) => ({
      ...current,
      createDraft,
    }));
  };

  const selectQuarantinedPayload = (quarantineId: string | null) => {
    const selected = quarantineId ? blueprintService.getQuarantinedPayload(quarantineId) : null;
    setState((current) => ({
      ...current,
      selectedQuarantineId: selected?.id ?? null,
      recoveryDraft: selected ? formatJson(selected.rawPayload) : "",
      quarantinePreview: null,
      restoreConfirmationChecked: false,
      showPreviewJson: false,
      quarantineFeedback: null,
      error: null,
    }));
  };

  const updateRecoveryDraft = (recoveryDraft: string) => {
    setState((current) => ({
      ...current,
      recoveryDraft,
      quarantinePreview: null,
      restoreConfirmationChecked: false,
      showPreviewJson: false,
      quarantineFeedback: null,
      error: null,
    }));
  };

  const importRecoveryDraftFile = async (file: File) => {
    try {
      const recoveryDraft = await file.text();
      setState((current) => ({
        ...current,
        recoveryDraft,
        quarantinePreview: null,
        restoreConfirmationChecked: false,
        showPreviewJson: false,
        quarantineFeedback: null,
        error: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        quarantineFeedback: {
          tone: "error",
          message: error instanceof Error ? error.message : "Unable to read the recovery file.",
        },
      }));
    }
  };

  const exportQuarantinedPayload = (quarantineId: string | null) => {
    if (!quarantineId) {
      return null;
    }

    return blueprintService.exportQuarantinedPayload(quarantineId);
  };

  const previewSelectedQuarantine = () => {
    if (!state.selectedQuarantineId) {
      setState((current) => ({
        ...current,
        quarantinePreview: {
          success: false,
          failureStage: "detect",
          failureCategory: "format",
          detectedStorageVersion: null,
          migrationSteps: [],
          reason: "Select a quarantine entry before running preview.",
        },
        showPreviewJson: false,
        quarantineFeedback: null,
      }));
      return;
    }

    const activeBlueprint =
      (state.selectedProjectId
        ? state.projects.find((project) => project.project.id === state.selectedProjectId)
        : null) ?? null;
    const result = blueprintService.previewQuarantinedPayload({
      quarantineId: state.selectedQuarantineId,
      repairedJson: state.recoveryDraft,
      activeBlueprint,
      selectedRecoveredProjectId: state.quarantinePreview?.success
        ? state.quarantinePreview.restoreCandidate.selectedRecoveredProjectId
        : null,
    });

    setState((current) => ({
      ...current,
      quarantinePreview: result,
      restoreConfirmationChecked: false,
      showPreviewJson: false,
      quarantineFeedback: null,
      error: null,
    }));
  };

  const selectRecoveredProjectForPreview = (recoveredProjectId: string) => {
    if (!state.selectedQuarantineId) {
      return;
    }

    const activeBlueprint =
      (state.selectedProjectId
        ? state.projects.find((project) => project.project.id === state.selectedProjectId)
        : null) ?? null;
    const result = blueprintService.previewQuarantinedPayload({
      quarantineId: state.selectedQuarantineId,
      repairedJson: state.recoveryDraft,
      activeBlueprint,
      selectedRecoveredProjectId: recoveredProjectId,
    });

    setState((current) => ({
      ...current,
      quarantinePreview: result,
      restoreConfirmationChecked: false,
      showPreviewJson: false,
      quarantineFeedback: null,
      error: null,
    }));
  };

  const setRestoreConfirmationChecked = (checked: boolean) => {
    setState((current) => ({
      ...current,
      restoreConfirmationChecked: checked,
    }));
  };

  const togglePreviewJson = () => {
    setState((current) => ({
      ...current,
      showPreviewJson: !current.showPreviewJson,
    }));
  };

  const restorePreviewCandidate = () => {
    const result = blueprintService.restorePreviewCandidate({
      preview: state.quarantinePreview,
      confirm: state.restoreConfirmationChecked,
    });

    if (!result.success) {
      setState((current) => ({
        ...current,
        quarantineFeedback: {
          tone: "error",
          message: result.reason,
        },
      }));
      return;
    }

    refreshProjects(result.selectedProjectId);
    setState((current) => ({
      ...current,
      quarantineFeedback: {
        tone: "success",
        message: result.message,
      },
      quarantinePreview: null,
      restoreConfirmationChecked: false,
      showPreviewJson: false,
      error: null,
    }));
  };

  const clearQuarantinedPayload = (quarantineId?: string) => {
    blueprintService.clearQuarantinedPayload(quarantineId);
    refreshProjects(state.selectedProjectId);
    setState((current) => ({
      ...current,
      quarantineFeedback: {
        tone: "success",
        message: quarantineId
          ? "Quarantine entry cleared."
          : "All quarantine entries cleared.",
      },
      quarantinePreview: null,
      restoreConfirmationChecked: false,
      showPreviewJson: false,
      error: null,
    }));
  };

  const updateDraftBlueprint = (updater: (blueprint: ProjectBlueprint) => ProjectBlueprint) => {
    setState((current) => {
      if (!current.draftBlueprint) {
        return current;
      }

      return {
        ...current,
        draftBlueprint: updater(structuredClone(current.draftBlueprint)),
      };
    });
  };

  const saveCurrentProject = (reason: string) => {
    if (!state.draftBlueprint) {
      return;
    }

    try {
      const saved = blueprintService.saveBlueprint(
        structuredClone(state.draftBlueprint),
        reason.trim() || "Manual blueprint update.",
      );
      refreshProjects(saved.project.id);
      setState((current) => ({
        ...current,
        draftBlueprint: structuredClone(saved),
        selectedProjectId: saved.project.id,
        error: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to save project.",
      }));
    }
  };

  const reextractIntent = () => {
    if (!state.draftBlueprint) {
      return;
    }

    try {
      const saved = blueprintService.reextractIntent(structuredClone(state.draftBlueprint));
      refreshProjects(saved.project.id);
      setState((current) => ({
        ...current,
        draftBlueprint: structuredClone(saved),
        selectedProjectId: saved.project.id,
        error: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to re-extract intent.",
      }));
    }
  };

  return {
    ...state,
    createProject,
    selectProject,
    selectRevision,
    selectQuarantinedPayload,
    updateCreateDraft,
    updateDraftBlueprint,
    updateRecoveryDraft,
    importRecoveryDraftFile,
    exportQuarantinedPayload,
    previewSelectedQuarantine,
    selectRecoveredProjectForPreview,
    setRestoreConfirmationChecked,
    toggleRevisionSnapshotJson,
    togglePreviewJson,
    restorePreviewCandidate,
    clearQuarantinedPayload,
    saveCurrentProject,
    reextractIntent,
  };
};
