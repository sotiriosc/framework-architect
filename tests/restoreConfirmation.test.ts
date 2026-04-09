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
    fingerprint: "restore-confirmation-fixture",
  });

const setupService = (storage: TestStorage) => {
  const repository = new LocalProjectRepository(storage);
  const service = new BlueprintService(repository);

  return {
    repository,
    service,
  };
};

describe("restore confirmation", () => {
  it("exposes a single recovered project through preview restore candidate", () => {
    const active = createSeedBlueprint();
    const recovered = structuredClone(active);
    recovered.project.rawIdea = "Recovered project candidate";
    const quarantine = createQuarantineFixture();
    const storage = createTestStorage({
      [projectsStorageKey]: JSON.stringify(createStoredProjectsDocument([active])),
      [projectsQuarantineStorageKey]: JSON.stringify([quarantine]),
    });

    const { service } = setupService(storage);
    const preview = service.previewQuarantinedPayload({
      quarantineId: quarantine.id,
      repairedJson: JSON.stringify(createStoredProjectsDocument([recovered])),
      activeBlueprint: active,
    });

    expect(preview.success).toBe(true);
    if (!preview.success) {
      throw new Error("Expected preview to succeed.");
    }

    expect(preview.restoreCandidate.recoveredProjects).toHaveLength(1);
    expect(preview.restoreCandidate.selectedRecoveredProjectId).toBe(active.project.id);
    expect(preview.restoreCandidate.restoreReady).toBe(true);
  });

  it("restores the explicitly selected recovered project from a multi-project preview", () => {
    const active = createSeedBlueprint();
    const recoveredActive = structuredClone(active);
    recoveredActive.project.rawIdea = "Recovered active candidate";

    const recoveredAlternate = createSeedBlueprint();
    recoveredAlternate.project.name = "Recovered alternate";
    recoveredAlternate.project.rawIdea = "Recovered alternate candidate";

    const quarantine = createQuarantineFixture();
    const storage = createTestStorage({
      [projectsStorageKey]: JSON.stringify(createStoredProjectsDocument([active])),
      [projectsQuarantineStorageKey]: JSON.stringify([quarantine]),
    });

    const { repository, service } = setupService(storage);
    const preview = service.previewQuarantinedPayload({
      quarantineId: quarantine.id,
      repairedJson: JSON.stringify(
        createStoredProjectsDocument([recoveredActive, recoveredAlternate]),
      ),
      activeBlueprint: active,
      selectedRecoveredProjectId: recoveredAlternate.project.id,
    });

    expect(preview.success).toBe(true);
    if (!preview.success) {
      throw new Error("Expected preview to succeed.");
    }
    expect(preview.restoreCandidate.selectedRecoveredProjectId).toBe(recoveredAlternate.project.id);
    expect(preview.restoreCandidate.restoreMode).toBe("append-active");

    const restore = service.restorePreviewCandidate({
      preview,
      confirm: true,
    });

    expect(restore.success).toBe(true);
    if (!restore.success) {
      throw new Error("Expected restore to succeed.");
    }

    const persistedProjects = repository.loadAll().projects;
    expect(persistedProjects).toHaveLength(2);
    expect(persistedProjects.some((project) => project.project.id === active.project.id)).toBe(true);
    expect(
      persistedProjects.some((project) => project.project.id === recoveredAlternate.project.id),
    ).toBe(true);
    expect(repository.getSelectedProjectId()).toBe(recoveredAlternate.project.id);
    expect(repository.listQuarantinedPayloads()).toHaveLength(1);
  });
});
