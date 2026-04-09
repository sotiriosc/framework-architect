import { useState } from "react";

import { BlueprintService } from "@/application/services/blueprintService";
import type { ProjectBlueprint } from "@/domain/models";
import { LocalProjectRepository } from "@/persistence/localProjectRepository";
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

type WorkspaceState = {
  projects: ProjectBlueprint[];
  selectedProjectId: string | null;
  draftBlueprint: ProjectBlueprint | null;
  createDraft: CreateProjectDraft;
  loadReport: RepositoryLoadReport | null;
  quarantinedPayloads: QuarantinedPayload[];
  error: string | null;
};

const initializeWorkspace = (): WorkspaceState => {
  const { projects, selectedProjectId, loadReport, quarantinedPayloads } = blueprintService.bootstrap();
  const selectedProject =
    (selectedProjectId ? projects.find((project) => project.project.id === selectedProjectId) : null) ??
    projects[0] ??
    null;

  return {
    projects,
    selectedProjectId: selectedProject?.project.id ?? null,
    draftBlueprint: selectedProject ? structuredClone(selectedProject) : null,
    createDraft: defaultCreateDraft,
    loadReport,
    quarantinedPayloads,
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

    setState((current) => ({
      ...current,
      projects,
      selectedProjectId: resolvedSelectedProjectId,
      draftBlueprint: selectedProject ? structuredClone(selectedProject) : null,
      loadReport: loaded.report,
      quarantinedPayloads: repository.listQuarantinedPayloads(),
      error: null,
    }));
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
    setState((current) => ({
      ...current,
      selectedProjectId: selected?.project.id ?? null,
      draftBlueprint: selected ? structuredClone(selected) : null,
      error: null,
    }));
  };

  const updateCreateDraft = (createDraft: CreateProjectDraft) => {
    setState((current) => ({
      ...current,
      createDraft,
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
    updateCreateDraft,
    updateDraftBlueprint,
    saveCurrentProject,
    reextractIntent,
  };
};
