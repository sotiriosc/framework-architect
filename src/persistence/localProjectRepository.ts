import { z } from "zod";

import type { ProjectBlueprint } from "@/domain/models";
import type { ProjectRepository, StorageLike } from "@/persistence/projectRepository";
import { projectsStorageKey, selectedProjectStorageKey } from "@/persistence/storageKeys";
import { ProjectBlueprintSchema } from "@/schema";

const ProjectBlueprintListSchema = z.array(ProjectBlueprintSchema);

const createMemoryStorage = (): StorageLike => {
  const state = new Map<string, string>();

  return {
    getItem: (key) => state.get(key) ?? null,
    setItem: (key, value) => {
      state.set(key, value);
    },
    removeItem: (key) => {
      state.delete(key);
    },
  };
};

const resolveStorage = (storage?: StorageLike): StorageLike => {
  if (storage) {
    return storage;
  }

  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }

  return createMemoryStorage();
};

export class LocalProjectRepository implements ProjectRepository {
  private readonly storage: StorageLike;

  constructor(storage?: StorageLike) {
    this.storage = resolveStorage(storage);
  }

  list(): ProjectBlueprint[] {
    const raw = this.storage.getItem(projectsStorageKey);

    if (!raw) {
      return [];
    }

    try {
      const parsed = ProjectBlueprintListSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : [];
    } catch {
      return [];
    }
  }

  find(projectId: string): ProjectBlueprint | undefined {
    return this.list().find((project) => project.project.id === projectId);
  }

  save(blueprint: ProjectBlueprint): ProjectBlueprint {
    const projects = this.list();
    const existingIndex = projects.findIndex((item) => item.project.id === blueprint.project.id);

    if (existingIndex >= 0) {
      projects[existingIndex] = blueprint;
    } else {
      projects.push(blueprint);
    }

    this.saveAll(projects);
    return blueprint;
  }

  saveAll(projects: ProjectBlueprint[]): ProjectBlueprint[] {
    this.storage.setItem(projectsStorageKey, JSON.stringify(projects));
    return projects;
  }

  seed(projects: ProjectBlueprint[]): ProjectBlueprint[] {
    const existing = this.list();
    if (existing.length > 0) {
      return existing;
    }

    this.saveAll(projects);
    if (projects[0]) {
      this.setSelectedProjectId(projects[0].project.id);
    }

    return projects;
  }

  getSelectedProjectId(): string | null {
    return this.storage.getItem(selectedProjectStorageKey);
  }

  setSelectedProjectId(projectId: string | null): void {
    if (!projectId) {
      this.storage.removeItem(selectedProjectStorageKey);
      return;
    }

    this.storage.setItem(selectedProjectStorageKey, projectId);
  }
}
