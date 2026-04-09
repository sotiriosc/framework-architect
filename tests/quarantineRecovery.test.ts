import { describe, expect, it } from "vitest";

import { BlueprintService } from "@/application/services/blueprintService";
import { LocalProjectRepository } from "@/persistence/localProjectRepository";
import { projectsQuarantineStorageKey, projectsStorageKey } from "@/persistence/storageKeys";
import { createQuarantinedPayload, createStoredProjectsDocument } from "@/persistence/types";
import { createSeedBlueprint } from "@/seed/exampleBlueprint";

type TestStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const createTestStorage = (initial: Record<string, string> = {}): TestStorage => {
  const state = new Map(Object.entries(initial));

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

const createQuarantineFixture = () =>
  createQuarantinedPayload({
    storageKey: projectsStorageKey,
    detectedStorageVersion: 1,
    failureStage: "migrate",
    failureCategory: "migration",
    reason: "Fixture quarantine entry",
    rawPayload: { broken: true },
    migrationSteps: ["Fixture migration failure"],
    fingerprint: "fixture",
  });

const setupService = (storage: TestStorage) => {
  const repository = new LocalProjectRepository(storage);
  const service = new BlueprintService(repository);

  return {
    repository,
    service,
  };
};

describe("quarantine recovery", () => {
  it("lists and retrieves quarantined payload details", () => {
    const storage = createTestStorage();
    const quarantine = createQuarantineFixture();
    storage.setItem(projectsQuarantineStorageKey, JSON.stringify([quarantine]));

    const { service } = setupService(storage);
    const listed = service.listQuarantinedPayloads();
    const selected = service.getQuarantinedPayload(quarantine.id);

    expect(listed).toHaveLength(1);
    expect(listed[0]?.failureCategory).toBe("migration");
    expect(selected?.reason).toBe("Fixture quarantine entry");
    expect(selected?.rawPayload).toEqual({ broken: true });
  });

  it("exports quarantine payloads without mutating storage", () => {
    const storage = createTestStorage();
    const quarantine = createQuarantineFixture();
    storage.setItem(projectsQuarantineStorageKey, JSON.stringify([quarantine]));

    const { repository, service } = setupService(storage);
    const before = repository.listQuarantinedPayloads();
    const exported = service.exportQuarantinedPayload(quarantine.id);
    const after = repository.listQuarantinedPayloads();

    expect(exported).not.toBeNull();
    expect(JSON.parse(exported?.content ?? "{}")).toMatchObject({
      exportVersion: 1,
      quarantine: {
        id: quarantine.id,
        rawPayload: { broken: true },
      },
    });
    expect(after).toEqual(before);
  });

  it("blocks restore when no successful preview exists", () => {
    const { service } = setupService(createTestStorage());

    const result = service.restorePreviewCandidate({
      preview: null,
      confirm: true,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected restore to be blocked without preview.");
    }
    expect(result.code).toBe("preview-required");
  });

  it("requires explicit confirmation before restore updates active state", () => {
    const storage = createTestStorage();
    const quarantine = createQuarantineFixture();
    const seed = createSeedBlueprint();
    storage.setItem(projectsQuarantineStorageKey, JSON.stringify([quarantine]));

    const { repository, service } = setupService(storage);
    const preview = service.previewQuarantinedPayload({
      quarantineId: quarantine.id,
      repairedJson: JSON.stringify(createStoredProjectsDocument([seed])),
    });

    expect(preview.success).toBe(true);
    const beforeProjects = repository.loadAll().projects;
    const result = service.restorePreviewCandidate({
      preview,
      confirm: false,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected restore to require explicit confirmation.");
    }
    expect(result.code).toBe("confirmation-required");
    expect(repository.loadAll().projects).toEqual(beforeProjects);
    expect(repository.listQuarantinedPayloads()).toHaveLength(1);
  });

  it("restores a confirmed preview into active state and preserves quarantine", () => {
    const active = createSeedBlueprint();
    const recovered = createSeedBlueprint();
    recovered.project.name = "Recovered project";
    const quarantine = createQuarantineFixture();
    const storage = createTestStorage({
      [projectsStorageKey]: JSON.stringify(createStoredProjectsDocument([active])),
      [projectsQuarantineStorageKey]: JSON.stringify([quarantine]),
    });

    const { repository, service } = setupService(storage);
    const preview = service.previewQuarantinedPayload({
      quarantineId: quarantine.id,
      repairedJson: JSON.stringify(createStoredProjectsDocument([recovered])),
      activeBlueprint: active,
      selectedRecoveredProjectId: recovered.project.id,
    });

    expect(preview.success).toBe(true);
    const result = service.restorePreviewCandidate({
      preview,
      confirm: true,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error("Expected restore to succeed.");
    }
    expect(repository.loadAll().projects.some((project) => project.project.id === recovered.project.id)).toBe(true);
    expect(repository.getSelectedProjectId()).toBe(recovered.project.id);
    expect(repository.listQuarantinedPayloads()).toHaveLength(1);
  });

  it("keeps quarantine and active state intact when repaired payload fails preview", () => {
    const seed = createSeedBlueprint();
    const quarantine = createQuarantineFixture();
    const storage = createTestStorage({
      [projectsStorageKey]: JSON.stringify(createStoredProjectsDocument([seed])),
      [projectsQuarantineStorageKey]: JSON.stringify([quarantine]),
    });

    const { repository, service } = setupService(storage);
    const before = repository.loadAll().projects;
    const result = service.previewQuarantinedPayload({
      quarantineId: quarantine.id,
      repairedJson: "{not valid json",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected recovery to fail for invalid JSON.");
    }
    expect(result.failureCategory).toBe("parse");
    expect(repository.loadAll().projects).toEqual(before);
    expect(repository.listQuarantinedPayloads()).toHaveLength(1);
  });

  it("does not replace active state when restore preview selection is invalid", () => {
    const seed = createSeedBlueprint();
    const recovered = createSeedBlueprint();
    const quarantine = createQuarantineFixture();
    const storage = createTestStorage({
      [projectsStorageKey]: JSON.stringify(createStoredProjectsDocument([seed])),
      [projectsQuarantineStorageKey]: JSON.stringify([quarantine]),
    });

    const { repository, service } = setupService(storage);
    const before = repository.loadAll().projects;
    const preview = service.previewQuarantinedPayload({
      quarantineId: quarantine.id,
      repairedJson: JSON.stringify(createStoredProjectsDocument([recovered])),
    });

    expect(preview.success).toBe(true);
    if (!preview.success) {
      throw new Error("Expected preview to succeed.");
    }

    const result = service.restorePreviewCandidate({
      preview: {
        ...preview,
        restoreCandidate: {
          ...preview.restoreCandidate,
          selectedRecoveredProjectId: "proj_missing",
          restoreReady: true,
        },
      },
      confirm: true,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected restore to fail for invalid selected recovered project.");
    }
    expect(result.code).toBe("selection-invalid");
    expect(repository.loadAll().projects).toEqual(before);
    expect(repository.listQuarantinedPayloads()).toHaveLength(1);
  });

  it("accepts exported quarantine documents during preview and restore", () => {
    const storage = createTestStorage();
    const quarantine = createQuarantineFixture();
    const seed = createSeedBlueprint();
    storage.setItem(projectsQuarantineStorageKey, JSON.stringify([quarantine]));

    const { repository, service } = setupService(storage);
    const exported = JSON.parse(service.exportQuarantinedPayload(quarantine.id)?.content ?? "{}") as {
      quarantine?: { rawPayload?: unknown };
    };

    exported.quarantine = {
      ...(exported.quarantine ?? {}),
      rawPayload: createStoredProjectsDocument([seed]),
    };

    const preview = service.previewQuarantinedPayload({
      quarantineId: quarantine.id,
      repairedJson: JSON.stringify(exported),
    });

    expect(preview.success).toBe(true);
    const result = service.restorePreviewCandidate({
      preview,
      confirm: true,
    });

    expect(result.success).toBe(true);
    expect(repository.loadAll().projects[0]?.project.id).toBe(seed.project.id);
  });

  it("clears quarantine entries deliberately", () => {
    const storage = createTestStorage();
    const first = createQuarantineFixture();
    const second = createQuarantinedPayload({
      storageKey: projectsStorageKey,
      detectedStorageVersion: null,
      failureStage: "validate",
      failureCategory: "validation",
      reason: "Second fixture",
      rawPayload: { alsoBroken: true },
      migrationSteps: ["Fixture validation failure"],
      fingerprint: "fixture-2",
    });
    storage.setItem(projectsQuarantineStorageKey, JSON.stringify([first, second]));

    const { service } = setupService(storage);
    service.clearQuarantinedPayload(first.id);
    expect(service.listQuarantinedPayloads()).toHaveLength(1);

    service.clearQuarantinedPayload();
    expect(service.listQuarantinedPayloads()).toHaveLength(0);
  });
});
