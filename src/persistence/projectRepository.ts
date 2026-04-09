import type { ProjectBlueprint } from "@/domain/models";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ProjectRepository {
  list(): ProjectBlueprint[];
  find(projectId: string): ProjectBlueprint | undefined;
  save(blueprint: ProjectBlueprint): ProjectBlueprint;
  saveAll(projects: ProjectBlueprint[]): ProjectBlueprint[];
  seed(projects: ProjectBlueprint[]): ProjectBlueprint[];
  getSelectedProjectId(): string | null;
  setSelectedProjectId(projectId: string | null): void;
}
