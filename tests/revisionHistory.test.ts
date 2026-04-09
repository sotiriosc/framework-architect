import { describe, expect, it } from "vitest";

import { compareBlueprints, createBlueprintMeaningfulFingerprint } from "@/application/review/compareBlueprints";
import { createDomain } from "@/domain/defaults";
import { LocalProjectRepository } from "@/persistence/localProjectRepository";
import { createBlueprintRevision } from "@/persistence/revisionTypes";
import {
  projectRevisionsStorageKey,
  projectsQuarantineStorageKey,
  projectsStorageKey,
} from "@/persistence/storageKeys";
import { createQuarantinedPayload, createStoredProjectsDocument } from "@/persistence/types";
import { BlueprintService } from "@/application/services/blueprintService";
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

const setupService = (storage: TestStorage) => {
  const repository = new LocalProjectRepository(storage);
  const service = new BlueprintService(repository);

  return {
    repository,
    service,
  };
};

describe("revision history", () => {
  it("creates an initial revision for the first saved project state", () => {
    const { service } = setupService(createTestStorage());
    const created = service.createProject({
      name: "Revision Project",
      rawIdea: "A raw idea that should create an initial revision.",
    });

    const revisions = service.listProjectRevisions(created.project.id);

    expect(revisions).toHaveLength(1);
    expect(revisions[0]?.revisionNumber).toBe(1);
    expect(revisions[0]?.previousRevisionId).toBeNull();
    expect(revisions[0]?.source).toBe("manualEdit");
  });

  it("creates a new revision for a meaningful manual edit and increments revision numbers", () => {
    const { service } = setupService(createTestStorage());
    const created = service.createProject({
      name: "Meaningful Edit",
      rawIdea: "Track meaningful revision changes.",
    });
    const edited = structuredClone(created);
    edited.project.corePhilosophy = "Architecture changes should create revisions.";

    service.saveBlueprint(edited, "Refined the core philosophy.");
    const revisions = service.listProjectRevisions(created.project.id);

    expect(revisions).toHaveLength(2);
    expect(revisions[0]?.revisionNumber).toBe(2);
    expect(revisions[1]?.revisionNumber).toBe(1);
    expect(revisions[0]?.structuralDiff.projectChanges.some((change) => change.field === "corePhilosophy")).toBe(
      true,
    );
  });

  it("does not create a duplicate revision for a no-op save", () => {
    const { service } = setupService(createTestStorage());
    const created = service.createProject({
      name: "No-op Revision",
      rawIdea: "Saving the same project should not duplicate revisions.",
    });

    const saved = service.saveBlueprint(structuredClone(created), "No-op save.");
    const revisions = service.listProjectRevisions(created.project.id);

    expect(revisions).toHaveLength(1);
    expect(saved.project.version).toBe(created.project.version);
  });

  it("records structural diffs for added, removed, and changed entities", () => {
    const { service } = setupService(createTestStorage());
    const bootstrapped = service.bootstrap();
    const active = bootstrapped.projects[0];

    expect(active).toBeDefined();
    if (!active) {
      throw new Error("Expected a seed blueprint.");
    }

    const edited = structuredClone(active);
    const addedDomain = createDomain();
    addedDomain.name = "Revision Diff Domain";
    edited.domains.push(addedDomain);
    edited.outcomes = edited.outcomes.slice(1);

    if (edited.components[0]) {
      edited.components[0].purpose = "Updated purpose for revision diff.";
    }

    service.saveBlueprint(edited, "Recorded collection-level revision changes.");
    const latest = service.listProjectRevisions(active.project.id)[0];

    expect(latest).toBeDefined();
    const domainDiff = latest?.structuralDiff.collections.find((collection) => collection.key === "domains");
    const outcomeDiff = latest?.structuralDiff.collections.find((collection) => collection.key === "outcomes");
    const componentDiff = latest?.structuralDiff.collections.find((collection) => collection.key === "components");

    expect(domainDiff?.added.some((item) => item.label === "Revision Diff Domain")).toBe(true);
    expect(outcomeDiff?.removed.length).toBeGreaterThan(0);
    expect(componentDiff?.changed.some((item) => item.changedFields.includes("purpose"))).toBe(true);
  });

  it("creates a recoveryRestore revision when quarantine recovery restores a project", () => {
    const storage = createTestStorage();
    const { service } = setupService(storage);
    const bootstrapped = service.bootstrap();
    const active = bootstrapped.projects[0];

    expect(active).toBeDefined();
    if (!active) {
      throw new Error("Expected active seed project.");
    }

    const quarantine = createQuarantinedPayload({
      storageKey: projectsStorageKey,
      detectedStorageVersion: 1,
      failureStage: "migrate",
      failureCategory: "migration",
      reason: "Recovery restore fixture",
      rawPayload: { broken: true },
      migrationSteps: ["Fixture migration failure"],
      fingerprint: "revision-recovery-fixture",
    });
    storage.setItem(projectsQuarantineStorageKey, JSON.stringify([quarantine]));

    const recovered = structuredClone(active);
    recovered.project.rawIdea = "Recovered revision restore payload.";
    const preview = service.previewQuarantinedPayload({
      quarantineId: quarantine.id,
      repairedJson: JSON.stringify(createStoredProjectsDocument([recovered])),
      activeBlueprint: active,
    });

    expect(preview.success).toBe(true);
    const restored = service.restorePreviewCandidate({
      preview,
      confirm: true,
    });

    expect(restored.success).toBe(true);
    const latest = service.listProjectRevisions(active.project.id)[0];
    expect(latest?.source).toBe("recoveryRestore");
    expect(latest?.structuralDiff.projectChanges.some((change) => change.field === "rawIdea")).toBe(true);
  });

  it("stores revision history separately from active project storage", () => {
    const storage = createTestStorage();
    const { service } = setupService(storage);
    const created = service.createProject({
      name: "Separate Revision Store",
      rawIdea: "Keep revisions out of active state storage.",
    });

    const activeRaw = storage.getItem(projectsStorageKey);
    const revisionsRaw = storage.getItem(projectRevisionsStorageKey);

    expect(activeRaw).not.toBeNull();
    expect(revisionsRaw).not.toBeNull();
    expect(JSON.parse(activeRaw ?? "{}")).not.toHaveProperty("revisions");
    expect((JSON.parse(revisionsRaw ?? "[]") as Array<{ projectId: string }>)[0]?.projectId).toBe(created.project.id);
  });

  it("round-trips revisions through the repository", () => {
    const storage = createTestStorage();
    const repository = new LocalProjectRepository(storage);
    const snapshot = createSeedBlueprint();
    const revision = createBlueprintRevision({
      projectId: snapshot.project.id,
      revisionNumber: 1,
      previousRevisionId: null,
      source: "system",
      summary: "Round-trip repository revision.",
      snapshot,
      structuralDiff: compareBlueprints({
        activeBlueprint: null,
        candidateBlueprint: snapshot,
      }),
      meaningfulFingerprint: createBlueprintMeaningfulFingerprint(snapshot),
    });

    repository.appendProjectRevision(revision);

    expect(repository.getLatestProjectRevision(snapshot.project.id)?.id).toBe(revision.id);
    expect(repository.getProjectRevision(revision.id)?.summary).toBe("Round-trip repository revision.");
    expect(repository.listProjectRevisions(snapshot.project.id)).toHaveLength(1);
  });
});
