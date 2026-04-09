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
  currentStorageVersion,
  type QuarantinedPayload,
  type QuarantineFailureCategory,
  type RepositoryLoadReport,
  type RepositoryLoadResult,
  type StoredPayloadHydrationResult,
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

const classifyHydrationFailure = (input: {
  failureStage: QuarantinedPayload["failureStage"];
  detectedStorageVersion: number | null;
}): QuarantineFailureCategory => {
  if (input.failureStage === "read") {
    return "parse";
  }

  if (
    input.failureStage === "detect" &&
    input.detectedStorageVersion !== null &&
    input.detectedStorageVersion > currentStorageVersion
  ) {
    return "unsupported-version";
  }

  if (input.failureStage === "detect") {
    return "format";
  }

  if (input.failureStage === "validate") {
    return "validation";
  }

  return "migration";
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
    failureCategory: QuarantinedPayload["failureCategory"];
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
      failureCategory: input.failureCategory,
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

  hydrateStoredPayload(rawPayload: unknown): StoredPayloadHydrationResult {
    const quarantineCount = this.readQuarantinedPayloads().length;
    const parsedCurrentDocument = StoredProjectsDocumentSchema.safeParse(rawPayload);

    if (parsedCurrentDocument.success) {
      return {
        success: true,
        document: parsedCurrentDocument.data,
        report: createRepositoryLoadReport({
          status: "loaded",
          detectedStorageVersion: parsedCurrentDocument.data.storageVersion,
          quarantineCount,
          message: quarantineCount > 0 ? "Projects loaded. Quarantined payloads also exist." : null,
        }),
      };
    }

    try {
      const migrated = upgradeStoredProjectsPayload(rawPayload);
      return {
        success: true,
        document: migrated.document,
        report: createRepositoryLoadReport({
          ...migrated.report,
          quarantineCount,
          message:
            quarantineCount > 0 && migrated.report.message
              ? `${migrated.report.message} Quarantined payloads also exist.`
              : migrated.report.message,
        }),
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Stored payload could not be migrated.";
      const failureStage = isPersistenceMigrationError(error) ? error.failureStage : "migrate";
      const detectedStorageVersion = isPersistenceMigrationError(error)
        ? error.detectedStorageVersion
        : null;
      const migrationSteps = isPersistenceMigrationError(error) ? error.migrationSteps : [];

      return {
        success: false,
        detectedStorageVersion,
        failureStage,
        failureCategory: classifyHydrationFailure({
          failureStage,
          detectedStorageVersion,
        }),
        migrationSteps,
        reason,
      };
    }
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
        failureCategory: "parse",
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

    const hydrated = this.hydrateStoredPayload(rawPayload);
    if (hydrated.success) {
      if (hydrated.report.migrated) {
        this.writeCurrentDocument(hydrated.document.projects);
      }

      this.lastLoadReport = hydrated.report;

      return {
        projects: hydrated.document.projects,
        report: hydrated.report,
      };
    }

    {
      const fingerprint = JSON.stringify(rawPayload);
      const quarantineEntries = this.quarantineRawPayload({
        rawPayload,
        detectedStorageVersion: hydrated.detectedStorageVersion,
        failureStage: hydrated.failureStage,
        failureCategory: hydrated.failureCategory,
        reason: hydrated.reason,
        migrationSteps: hydrated.migrationSteps,
        fingerprint,
      });
      const report = createRepositoryLoadReport({
        status: "quarantined",
        detectedStorageVersion: hydrated.detectedStorageVersion,
        quarantineCount: quarantineEntries.length,
        migrationSteps: hydrated.migrationSteps,
        message: `${hydrated.reason} The original payload was quarantined instead of being discarded.`,
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
