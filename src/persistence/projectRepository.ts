import type { ProjectBlueprint } from "@/domain/models";
import type {
  QuarantinedPayload,
  RepositoryLoadReport,
  RepositoryLoadResult,
} from "@/persistence/types";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ProjectRepository {
  loadAll(): RepositoryLoadResult;
  list(): ProjectBlueprint[];
  find(projectId: string): ProjectBlueprint | undefined;
  save(blueprint: ProjectBlueprint): ProjectBlueprint;
  saveAll(projects: ProjectBlueprint[]): ProjectBlueprint[];
  seed(projects: ProjectBlueprint[]): ProjectBlueprint[];
  getLastLoadReport(): RepositoryLoadReport | null;
  listQuarantinedPayloads(): QuarantinedPayload[];
  getQuarantinedPayload(quarantineId: string): QuarantinedPayload | undefined;
  clearQuarantinedPayloads(quarantineId?: string): void;
  getSelectedProjectId(): string | null;
  setSelectedProjectId(projectId: string | null): void;
}
