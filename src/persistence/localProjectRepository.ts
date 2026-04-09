import type { ProjectBlueprint } from "@/domain/models";
import type { ProjectRepository, StorageLike } from "@/persistence/projectRepository";
import { isPersistenceMigrationError, upgradeStoredProjectsPayload } from "@/persistence/migrations";
import {
  projectsQuarantineStorageKey,
  projectsStorageKey,
  selectedProjectStorageKey,
} from "@/persistence/storageKeys";
import {
  createQuarantinedPayload,
  createRepositoryLoadReport,
  createStoredProjectsDocument,
  type QuarantinedPayload,
  type RepositoryLoadReport,
  type RepositoryLoadResult,
  QuarantinedPayloadSchema,
  StoredProjectsDocumentSchema,
} from "@/persistence/types";

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
  private lastLoadReport: RepositoryLoadReport | null = null;

  constructor(storage?: StorageLike) {
    this.storage = resolveStorage(storage);
  }

  private readQuarantinedPayloads(): QuarantinedPayload[] {
    const raw = this.storage.getItem(projectsQuarantineStorageKey);

    if (!raw) {
      return [];
    }

    try {
      const parsed = QuarantinedPayloadSchema.array().safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : [];
    } catch {
      return [];
    }
  }

  private writeQuarantinedPayloads(entries: QuarantinedPayload[]): void {
    if (entries.length === 0) {
      this.storage.removeItem(projectsQuarantineStorageKey);
      return;
    }

    this.storage.setItem(projectsQuarantineStorageKey, JSON.stringify(entries));
  }

  private quarantineRawPayload(input: {
    rawPayload: unknown;
    detectedStorageVersion: number | null;
    failureStage: QuarantinedPayload["failureStage"];
    reason: string;
    migrationSteps: string[];
    fingerprint: string;
  }): QuarantinedPayload[] {
    const existing = this.readQuarantinedPayloads();
    const alreadyTracked = existing.some((entry) => entry.fingerprint === input.fingerprint);

    if (alreadyTracked) {
      return existing;
    }

    const quarantineEntry = createQuarantinedPayload({
      storageKey: projectsStorageKey,
      detectedStorageVersion: input.detectedStorageVersion,
      failureStage: input.failureStage,
      reason: input.reason,
      rawPayload: input.rawPayload,
      migrationSteps: input.migrationSteps,
      fingerprint: input.fingerprint,
    });
    const next = [...existing, quarantineEntry];
    this.writeQuarantinedPayloads(next);
    return next;
  }

  private writeCurrentDocument(projects: ProjectBlueprint[]): ProjectBlueprint[] {
    const document = createStoredProjectsDocument(projects);
    this.storage.setItem(projectsStorageKey, JSON.stringify(document));
    return projects;
  }

  loadAll(): RepositoryLoadResult {
    const raw = this.storage.getItem(projectsStorageKey);
    const currentQuarantine = this.readQuarantinedPayloads();

    if (!raw) {
      const report = createRepositoryLoadReport({
        status: "empty",
        quarantineCount: currentQuarantine.length,
        message: currentQuarantine.length > 0 ? "No active projects loaded. Quarantined payloads exist." : null,
      });
      this.lastLoadReport = report;

      return {
        projects: [],
        report,
      };
    }

    let rawPayload: unknown;
    try {
      rawPayload = JSON.parse(raw);
    } catch (error) {
      const quarantineEntries = this.quarantineRawPayload({
        rawPayload: raw,
        detectedStorageVersion: null,
        failureStage: "read",
        reason: error instanceof Error ? error.message : "Stored payload is not valid JSON.",
        migrationSteps: ["Failed to parse stored JSON payload."],
        fingerprint: raw,
      });
      const report = createRepositoryLoadReport({
        status: "quarantined",
        quarantineCount: quarantineEntries.length,
        message: "Stored payload could not be parsed and was quarantined.",
      });
      this.lastLoadReport = report;

      return {
        projects: [],
        report,
      };
    }

    try {
      const parsedCurrentDocument = StoredProjectsDocumentSchema.safeParse(rawPayload);
      if (parsedCurrentDocument.success) {
        const report = createRepositoryLoadReport({
          status: "loaded",
          detectedStorageVersion: parsedCurrentDocument.data.storageVersion,
          quarantineCount: currentQuarantine.length,
          message: currentQuarantine.length > 0 ? "Projects loaded. Quarantined payloads also exist." : null,
        });
        this.lastLoadReport = report;

        return {
          projects: parsedCurrentDocument.data.projects,
          report,
        };
      }

      const migrated = upgradeStoredProjectsPayload(rawPayload);
      if (migrated.report.migrated) {
        this.writeCurrentDocument(migrated.document.projects);
      }

      const latestQuarantineCount = this.readQuarantinedPayloads().length;
      const report = createRepositoryLoadReport({
        ...migrated.report,
        quarantineCount: latestQuarantineCount,
        message:
          latestQuarantineCount > 0 && migrated.report.message
            ? `${migrated.report.message} Quarantined payloads also exist.`
            : migrated.report.message,
      });
      this.lastLoadReport = report;

      return {
        projects: migrated.document.projects,
        report,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Stored payload could not be migrated.";
      const failureStage = isPersistenceMigrationError(error) ? error.failureStage : "migrate";
      const detectedStorageVersion = isPersistenceMigrationError(error)
        ? error.detectedStorageVersion
        : null;
      const migrationSteps = isPersistenceMigrationError(error) ? error.migrationSteps : [];
      const fingerprint = JSON.stringify(rawPayload);
      const quarantineEntries = this.quarantineRawPayload({
        rawPayload,
        detectedStorageVersion,
        failureStage,
        reason,
        migrationSteps,
        fingerprint,
      });
      const report = createRepositoryLoadReport({
        status: "quarantined",
        detectedStorageVersion,
        quarantineCount: quarantineEntries.length,
        migrationSteps,
        message: `${reason} The original payload was quarantined instead of being discarded.`,
      });
      this.lastLoadReport = report;

      return {
        projects: [],
        report,
      };
    }
  }

  list(): ProjectBlueprint[] {
    return this.loadAll().projects;
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
    return this.writeCurrentDocument(projects);
  }

  seed(projects: ProjectBlueprint[]): ProjectBlueprint[] {
    const loaded = this.loadAll();
    if (loaded.projects.length > 0 || loaded.report.status !== "empty" || loaded.report.quarantineCount > 0) {
      return loaded.projects;
    }

    this.saveAll(projects);
    if (projects[0]) {
      this.setSelectedProjectId(projects[0].project.id);
    }

    return projects;
  }

  getLastLoadReport(): RepositoryLoadReport | null {
    return this.lastLoadReport;
  }

  listQuarantinedPayloads(): QuarantinedPayload[] {
    return this.readQuarantinedPayloads();
  }

  getQuarantinedPayload(quarantineId: string): QuarantinedPayload | undefined {
    return this.readQuarantinedPayloads().find((entry) => entry.id === quarantineId);
  }

  clearQuarantinedPayloads(quarantineId?: string): void {
    if (!quarantineId) {
      this.writeQuarantinedPayloads([]);
      return;
    }

    this.writeQuarantinedPayloads(
      this.readQuarantinedPayloads().filter((entry) => entry.id !== quarantineId),
    );
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
