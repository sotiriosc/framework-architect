import { useState } from "react";

import type { ChangeReviewReady, StableSaveSource } from "@/application/review/buildChangeReview";
import type {
  RevisionComparisonMode,
  RevisionComparisonResult,
} from "@/application/review/buildRevisionComparison";
import {
  BlueprintService,
  type QuarantinePreviewResult,
} from "@/application/services/blueprintService";
import type { GuidedIntakeInput } from "@/application/intake/composeBlueprintFromGuidedIntake";
import { getFrameworkTemplate, isFrameworkTemplateId } from "@/application/templates/frameworkTemplates";
import type { ProjectBlueprint } from "@/domain/models";
import { LocalProjectRepository } from "@/persistence/localProjectRepository";
import type { BlueprintRevision } from "@/persistence/revisionTypes";
import type { QuarantinedPayload, RepositoryLoadReport } from "@/persistence/types";
import type { GuidedIntakeDraft } from "@/ui/components/GuidedBlueprintWizard";
import type { CreateProjectDraft } from "@/ui/components/ProjectForm";

const repository = new LocalProjectRepository();
const blueprintService = new BlueprintService(repository);

const defaultCreateDraft: CreateProjectDraft = {
  name: "",
  rawIdea: "",
  corePhilosophy: "Architecture first. Keep governance explicit and inspectable.",
  invariantPrioritiesText: "Transparency\nTraceability\nBuild-ready only after validation",
};

const defaultGuidedIntakeDraft: GuidedIntakeDraft = {
  projectName: "",
  frameworkType: "generic-framework",
  customFrameworkType: "",
  rawIdea: "",
  targetUser: "",
  problem: "",
  intendedOutcome: "",
  corePrinciplesText: "Make assumptions explicit\nKeep scope inspectable\nValidate before implementation",
  mustRemainTrueText: "The blueprint remains local-first and governed\nBuild-ready claims require validation",
  mvpBoundaryText: "",
  expansionIdeasText: "",
  knownRisksText: "",
};

const formatJson = (value: unknown): string => JSON.stringify(value, null, 2) ?? "null";

type QuarantineFeedback = {
  tone: "success" | "error";
  message: string;
};

type WorkspaceFeedback = {
  tone: "success" | "error";
  message: string;
};

type WorkspaceState = {
  projects: ProjectBlueprint[];
  selectedProjectId: string | null;
  draftBlueprint: ProjectBlueprint | null;
  createDraft: CreateProjectDraft;
  guidedIntakeDraft: GuidedIntakeDraft;
  projectLatestRevisionNumbers: Record<string, number | null>;
  loadReport: RepositoryLoadReport | null;
  workspaceFeedback: WorkspaceFeedback | null;
  pendingChangeReview: ChangeReviewReady | null;
  projectRevisions: BlueprintRevision[];
  selectedRevisionId: string | null;
  revisionCompareMode: RevisionComparisonMode;
  selectedCompareRevisionId: string | null;
  revisionComparison: RevisionComparisonResult | null;
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

const parseInvariantPriorities = (value: string): string[] =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const parseLines = (value: string): string[] =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const toGuidedIntakeInput = (draft: GuidedIntakeDraft): GuidedIntakeInput => {
  const selectedTemplateId = isFrameworkTemplateId(draft.frameworkType) ? draft.frameworkType : undefined;
  const frameworkType = selectedTemplateId
    ? getFrameworkTemplate(selectedTemplateId).label
    : draft.customFrameworkType.trim() || draft.frameworkType.trim();

  return {
    rawIdea: draft.rawIdea.trim(),
    projectName: draft.projectName.trim(),
    frameworkType,
    frameworkTemplateId: selectedTemplateId,
    targetUser: draft.targetUser.trim(),
    problem: draft.problem.trim(),
    intendedOutcome: draft.intendedOutcome.trim(),
    corePrinciples: parseLines(draft.corePrinciplesText),
    mustRemainTrue: parseLines(draft.mustRemainTrueText),
    mvpBoundary: parseLines(draft.mvpBoundaryText),
    expansionIdeas: parseLines(draft.expansionIdeasText),
    knownRisks: parseLines(draft.knownRisksText),
  };
};

const buildProjectLatestRevisionNumbers = (projects: ProjectBlueprint[]): Record<string, number | null> =>
  projects.reduce<Record<string, number | null>>((accumulator, project) => {
    accumulator[project.project.id] =
      blueprintService.listProjectRevisions(project.project.id)[0]?.revisionNumber ?? null;
    return accumulator;
  }, {});

const resolveRevisionComparison = (input: {
  projectId: string | null;
  baseRevisionId: string | null;
  compareMode: RevisionComparisonMode;
  compareRevisionId: string | null;
  activeBlueprint: ProjectBlueprint | null;
}) => {
  const revisionComparison = blueprintService.buildRevisionComparison({
    projectId: input.projectId,
    baseRevisionId: input.baseRevisionId,
    mode: input.compareMode,
    compareRevisionId: input.compareRevisionId,
    activeBlueprint: input.activeBlueprint,
  });

  return {
    revisionComparison,
    selectedCompareRevisionId:
      revisionComparison.mode === "revision" && revisionComparison.compareTarget?.kind === "revision"
        ? revisionComparison.compareTarget.revisionId
        : null,
  };
};

const initializeWorkspace = (): WorkspaceState => {
  const { projects, selectedProjectId, loadReport, quarantinedPayloads } = blueprintService.bootstrap();
  const selectedProject =
    (selectedProjectId ? projects.find((project) => project.project.id === selectedProjectId) : null) ??
    projects[0] ??
    null;
  const projectRevisions = blueprintService.listProjectRevisions(selectedProject?.project.id ?? null);
  const selectedRevisionId = projectRevisions[0]?.id ?? null;
  const revisionComparisonState = resolveRevisionComparison({
    projectId: selectedProject?.project.id ?? null,
    baseRevisionId: selectedRevisionId,
    compareMode: "previous",
    compareRevisionId: null,
    activeBlueprint: selectedProject ? structuredClone(selectedProject) : null,
  });
  const selectedQuarantine = quarantinedPayloads[0] ?? null;

  return {
    projects,
    selectedProjectId: selectedProject?.project.id ?? null,
    draftBlueprint: selectedProject ? structuredClone(selectedProject) : null,
    createDraft: defaultCreateDraft,
    guidedIntakeDraft: defaultGuidedIntakeDraft,
    projectLatestRevisionNumbers: buildProjectLatestRevisionNumbers(projects),
    loadReport,
    workspaceFeedback: null,
    pendingChangeReview: null,
    projectRevisions,
    selectedRevisionId,
    revisionCompareMode: "previous",
    selectedCompareRevisionId: revisionComparisonState.selectedCompareRevisionId,
    revisionComparison: revisionComparisonState.revisionComparison,
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

export const useBlueprintWorkspace = () => {
  const [state, setState] = useState<WorkspaceState>(() => initializeWorkspace());

  const refreshProjects = (selectedProjectId: string | null, options?: { preferLatestRevision?: boolean }) => {
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
        options?.preferLatestRevision
          ? projectRevisions[0]?.id ?? null
          : current.selectedProjectId === resolvedSelectedProjectId &&
        current.selectedRevisionId &&
        projectRevisions.some((revision) => revision.id === current.selectedRevisionId)
          ? current.selectedRevisionId
          : projectRevisions[0]?.id ?? null;
      const revisionCompareMode =
        options?.preferLatestRevision
          ? "previous"
          : current.selectedProjectId === resolvedSelectedProjectId
            ? current.revisionCompareMode
            : "previous";
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
      const revisionComparisonState = resolveRevisionComparison({
        projectId: resolvedSelectedProjectId,
        baseRevisionId: selectedRevisionId,
        compareMode: revisionCompareMode,
        compareRevisionId:
          options?.preferLatestRevision
            ? null
            : current.selectedProjectId === resolvedSelectedProjectId
              ? current.selectedCompareRevisionId
              : null,
        activeBlueprint: selectedProject ? structuredClone(selectedProject) : null,
      });

      return {
        ...current,
        projects,
        selectedProjectId: resolvedSelectedProjectId,
        draftBlueprint: selectedProject ? structuredClone(selectedProject) : null,
        projectLatestRevisionNumbers: buildProjectLatestRevisionNumbers(projects),
        loadReport: loaded.report,
        workspaceFeedback: options?.preferLatestRevision ? current.workspaceFeedback : null,
        pendingChangeReview: null,
        projectRevisions,
        selectedRevisionId,
        revisionCompareMode,
        selectedCompareRevisionId: revisionComparisonState.selectedCompareRevisionId,
        revisionComparison: revisionComparisonState.revisionComparison,
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

  const createProjectFromDraft = (options: {
    create: (input: {
      name: string;
      rawIdea: string;
      corePhilosophy?: string;
      invariantPriorities?: string[];
    }) => ProjectBlueprint;
    successMessage: string;
    errorMessage: string;
  }) => {
    if (!state.createDraft.name.trim() || !state.createDraft.rawIdea.trim()) {
      setState((current) => ({
        ...current,
        error: "Project name and raw idea are required.",
      }));
      return;
    }

    try {
      const created = options.create({
        name: state.createDraft.name.trim(),
        rawIdea: state.createDraft.rawIdea.trim(),
        corePhilosophy: state.createDraft.corePhilosophy.trim(),
        invariantPriorities: parseInvariantPriorities(state.createDraft.invariantPrioritiesText),
      });

      refreshProjects(created.project.id, { preferLatestRevision: true });
      setState((current) => ({
        ...current,
        draftBlueprint: structuredClone(created),
        createDraft: defaultCreateDraft,
        workspaceFeedback: {
          tone: "success",
          message: options.successMessage,
        },
        pendingChangeReview: null,
        error: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : options.errorMessage,
      }));
    }
  };

  const createProject = () => {
    createProjectFromDraft({
      create: (input) => blueprintService.createProject(input),
      successMessage: "Framework created and opened in the full workspace.",
      errorMessage: "Unable to create framework.",
    });
  };

  const createEmptyProject = () => {
    createProjectFromDraft({
      create: (input) => blueprintService.createEmptyProject(input),
      successMessage: "Empty blueprint created and opened for manual architecture work.",
      errorMessage: "Unable to create empty blueprint.",
    });
  };

  const selectProject = (projectId: string | null) => {
    const selected = blueprintService.selectProject(projectId);
    const projectRevisions = blueprintService.listProjectRevisions(selected?.project.id ?? null);
    const selectedRevisionId = projectRevisions[0]?.id ?? null;
    const revisionComparisonState = resolveRevisionComparison({
      projectId: selected?.project.id ?? null,
      baseRevisionId: selectedRevisionId,
      compareMode: "previous",
      compareRevisionId: null,
      activeBlueprint: selected ? structuredClone(selected) : null,
    });
    setState((current) => ({
      ...current,
      selectedProjectId: selected?.project.id ?? null,
      draftBlueprint: selected ? structuredClone(selected) : null,
      workspaceFeedback: null,
      pendingChangeReview: null,
      projectRevisions,
      selectedRevisionId,
      revisionCompareMode: "previous",
      selectedCompareRevisionId: revisionComparisonState.selectedCompareRevisionId,
      revisionComparison: revisionComparisonState.revisionComparison,
      showRevisionSnapshotJson: false,
      quarantinePreview: null,
      restoreConfirmationChecked: false,
      showPreviewJson: false,
      error: null,
    }));
  };

  const selectRevision = (revisionId: string | null) => {
    const revisionComparisonState = resolveRevisionComparison({
      projectId: state.selectedProjectId,
      baseRevisionId: revisionId,
      compareMode: "previous",
      compareRevisionId: null,
      activeBlueprint: state.draftBlueprint ? structuredClone(state.draftBlueprint) : null,
    });

    setState((current) => ({
      ...current,
      selectedRevisionId: revisionId,
      revisionCompareMode: "previous",
      selectedCompareRevisionId: revisionComparisonState.selectedCompareRevisionId,
      revisionComparison: revisionComparisonState.revisionComparison,
      showRevisionSnapshotJson: false,
      workspaceFeedback: null,
    }));
  };

  const setRevisionCompareMode = (compareMode: RevisionComparisonMode) => {
    const revisionComparisonState = resolveRevisionComparison({
      projectId: state.selectedProjectId,
      baseRevisionId: state.selectedRevisionId,
      compareMode,
      compareRevisionId: compareMode === "revision" ? state.selectedCompareRevisionId : null,
      activeBlueprint: state.draftBlueprint ? structuredClone(state.draftBlueprint) : null,
    });

    setState((current) => ({
      ...current,
      revisionCompareMode: compareMode,
      selectedCompareRevisionId: revisionComparisonState.selectedCompareRevisionId,
      revisionComparison: revisionComparisonState.revisionComparison,
      workspaceFeedback: null,
    }));
  };

  const selectCompareRevision = (compareRevisionId: string | null) => {
    const revisionComparisonState = resolveRevisionComparison({
      projectId: state.selectedProjectId,
      baseRevisionId: state.selectedRevisionId,
      compareMode: "revision",
      compareRevisionId,
      activeBlueprint: state.draftBlueprint ? structuredClone(state.draftBlueprint) : null,
    });

    setState((current) => ({
      ...current,
      revisionCompareMode: "revision",
      selectedCompareRevisionId: revisionComparisonState.selectedCompareRevisionId,
      revisionComparison: revisionComparisonState.revisionComparison,
      workspaceFeedback: null,
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
      workspaceFeedback: null,
    }));
  };

  const updateGuidedIntakeDraft = (guidedIntakeDraft: GuidedIntakeDraft) => {
    setState((current) => ({
      ...current,
      guidedIntakeDraft,
      workspaceFeedback: null,
      error: null,
    }));
  };

  const createProjectFromGuidedIntake = (): ProjectBlueprint | null => {
    if (!state.guidedIntakeDraft.projectName.trim() || !state.guidedIntakeDraft.rawIdea.trim()) {
      setState((current) => ({
        ...current,
        error: "Project name and raw idea are required for guided blueprint creation.",
      }));
      return null;
    }

    try {
      const created = blueprintService.createProjectFromGuidedIntake(
        toGuidedIntakeInput(state.guidedIntakeDraft),
      );

      refreshProjects(created.project.id, { preferLatestRevision: true });
      setState((current) => ({
        ...current,
        draftBlueprint: structuredClone(created),
        guidedIntakeDraft: defaultGuidedIntakeDraft,
        workspaceFeedback: {
          tone: "success",
          message: "Guided blueprint created and opened in the full workspace.",
        },
        pendingChangeReview: null,
        error: null,
      }));

      return created;
    } catch (error) {
      setState((current) => ({
        ...current,
        workspaceFeedback: null,
        error: error instanceof Error ? error.message : "Unable to create guided blueprint.",
      }));
      return null;
    }
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

    refreshProjects(result.selectedProjectId, { preferLatestRevision: true });
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

      const nextDraftBlueprint = updater(structuredClone(current.draftBlueprint));
      const revisionComparisonState =
        current.revisionCompareMode === "current"
          ? resolveRevisionComparison({
              projectId: current.selectedProjectId,
              baseRevisionId: current.selectedRevisionId,
              compareMode: current.revisionCompareMode,
              compareRevisionId: current.selectedCompareRevisionId,
              activeBlueprint: nextDraftBlueprint,
            })
          : null;

      return {
        ...current,
        draftBlueprint: nextDraftBlueprint,
        pendingChangeReview: null,
        workspaceFeedback: null,
        selectedCompareRevisionId:
          revisionComparisonState?.selectedCompareRevisionId ?? current.selectedCompareRevisionId,
        revisionComparison: revisionComparisonState?.revisionComparison ?? current.revisionComparison,
      };
    });
  };

  const applyCommittedStableSave = (savedBlueprint: ProjectBlueprint, message: string) => {
    refreshProjects(savedBlueprint.project.id, { preferLatestRevision: true });
    setState((current) => ({
      ...current,
      draftBlueprint: structuredClone(savedBlueprint),
      selectedProjectId: savedBlueprint.project.id,
      pendingChangeReview: null,
      workspaceFeedback: {
        tone: "success",
        message,
      },
      error: null,
    }));
  };

  const runStableBoundaryAction = (source: StableSaveSource, reason: string) => {
    if (!state.draftBlueprint) {
      return;
    }

    try {
      const review = blueprintService.reviewStableSave({
        candidate: structuredClone(state.draftBlueprint),
        reason,
        source,
      });

      if (review.status === "no-change") {
        setState((current) => ({
          ...current,
          pendingChangeReview: null,
          workspaceFeedback: {
            tone: "success",
            message: review.message,
          },
          error: null,
        }));
        return;
      }

      if (review.confirmationRequired) {
        setState((current) => ({
          ...current,
          pendingChangeReview: review,
          workspaceFeedback: null,
          error: null,
        }));
        return;
      }

      const committed = blueprintService.commitStableSave({
        review,
        confirm: true,
      });

      if (!committed.success) {
        setState((current) => ({
          ...current,
          workspaceFeedback: {
            tone: "error",
            message: committed.reason,
          },
          error: null,
        }));
        return;
      }

      applyCommittedStableSave(committed.savedBlueprint, committed.message);
    } catch (error) {
      setState((current) => ({
        ...current,
        workspaceFeedback: null,
        error:
          error instanceof Error
            ? error.message
            : source === "manualCheckpoint"
              ? "Unable to create checkpoint."
              : "Unable to save project.",
      }));
    }
  };

  const saveCurrentProject = (reason: string) => {
    runStableBoundaryAction("editSave", reason.trim() || "Manual blueprint update.");
  };

  const createManualCheckpoint = (note: string) => {
    runStableBoundaryAction("manualCheckpoint", note.trim() || "Manual checkpoint.");
  };

  const completeMissingStructure = () => {
    if (!state.draftBlueprint) {
      return;
    }

    try {
      const saved = blueprintService.completeMissingStructure(structuredClone(state.draftBlueprint));
      applyCommittedStableSave(saved, "Missing framework structure completed.");
    } catch (error) {
      setState((current) => ({
        ...current,
        workspaceFeedback: null,
        error: error instanceof Error ? error.message : "Unable to complete missing framework structure.",
      }));
    }
  };

  const applySafeQualityFixes = () => {
    if (!state.draftBlueprint) {
      return;
    }

    try {
      const saved = blueprintService.applySafeQualityFixes(structuredClone(state.draftBlueprint));
      applyCommittedStableSave(saved, "Safe blueprint quality fixes applied.");
    } catch (error) {
      setState((current) => ({
        ...current,
        workspaceFeedback: null,
        error: error instanceof Error ? error.message : "Unable to apply safe blueprint quality fixes.",
      }));
    }
  };

  const applyQualityFix = (fixId: string) => {
    if (!state.draftBlueprint) {
      return;
    }

    try {
      const saved = blueprintService.applyQualityFix(structuredClone(state.draftBlueprint), fixId);
      applyCommittedStableSave(saved, `Blueprint quality fix applied: ${fixId}.`);
    } catch (error) {
      setState((current) => ({
        ...current,
        workspaceFeedback: null,
        error: error instanceof Error ? error.message : `Unable to apply blueprint quality fix: ${fixId}.`,
      }));
    }
  };

  const confirmPendingChangeReview = () => {
    if (!state.pendingChangeReview) {
      return;
    }

    const committed = blueprintService.commitStableSave({
      review: state.pendingChangeReview,
      confirm: true,
    });

    if (!committed.success) {
      setState((current) => ({
        ...current,
        workspaceFeedback: {
          tone: "error",
          message: committed.reason,
        },
        error: null,
        }));
      return;
    }

    applyCommittedStableSave(committed.savedBlueprint, committed.message);
  };

  const dismissPendingChangeReview = () => {
    setState((current) => ({
      ...current,
      pendingChangeReview: null,
      workspaceFeedback: null,
      error: null,
    }));
  };

  const reextractIntent = () => {
    if (!state.draftBlueprint) {
      return;
    }

    try {
      const saved = blueprintService.reextractIntent(structuredClone(state.draftBlueprint));
      refreshProjects(saved.project.id, { preferLatestRevision: true });
      setState((current) => ({
        ...current,
        draftBlueprint: structuredClone(saved),
        selectedProjectId: saved.project.id,
        pendingChangeReview: null,
        workspaceFeedback: {
          tone: "success",
          message: "Intent and primary outcome were re-extracted and saved.",
        },
        error: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        workspaceFeedback: null,
        error: error instanceof Error ? error.message : "Unable to re-extract intent.",
      }));
    }
  };

  return {
    ...state,
    createProject,
    createEmptyProject,
    selectProject,
    selectRevision,
    setRevisionCompareMode,
    selectCompareRevision,
    selectQuarantinedPayload,
    updateCreateDraft,
    updateGuidedIntakeDraft,
    createProjectFromGuidedIntake,
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
    createManualCheckpoint,
    completeMissingStructure,
    applySafeQualityFixes,
    applyQualityFix,
    confirmPendingChangeReview,
    dismissPendingChangeReview,
    reextractIntent,
  };
};
