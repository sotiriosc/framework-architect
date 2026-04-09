import { describe, expect, it } from "vitest";

import { compareBlueprints } from "@/application/review/compareBlueprints";
import { BlueprintService } from "@/application/services/blueprintService";
import { createDomain } from "@/domain/defaults";
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

const setupService = (storage: TestStorage) => {
  const repository = new LocalProjectRepository(storage);
  const service = new BlueprintService(repository);

  return {
    repository,
    service,
  };
};

const createBrokenQuarantine = () =>
  createQuarantinedPayload({
    storageKey: projectsStorageKey,
    detectedStorageVersion: 1,
    failureStage: "migrate",
    failureCategory: "migration",
    reason: "Broken quarantine fixture",
    rawPayload: { broken: true },
    migrationSteps: ["Fixture migration failure"],
    fingerprint: "compare-fixture",
  });

describe("recovery preview compare", () => {
  it("produces an identical compare summary for matching active and recovered blueprints", () => {
    const seed = createSeedBlueprint();
    const summary = compareBlueprints({
      activeBlueprint: seed,
      candidateBlueprint: structuredClone(seed),
    });

    expect(summary.identical).toBe(true);
    expect(summary.totalChangeCount).toBe(0);
    expect(summary.collections.every((collection) => collection.hasChanges === false)).toBe(true);
  });

  it("captures project, intent, and scope scalar differences", () => {
    const active = createSeedBlueprint();
    const candidate = structuredClone(active);

    candidate.project.corePhilosophy = "Recover governance before implementation.";
    candidate.intent.summary = "A revised intent summary";
    candidate.mvpScope.summary = "Updated MVP summary";
    candidate.expansionScope.summary = "Updated expansion summary";

    const summary = compareBlueprints({
      activeBlueprint: active,
      candidateBlueprint: candidate,
    });

    expect(summary.projectChanges.some((change) => change.field === "corePhilosophy")).toBe(true);
    expect(summary.intentChanges.some((change) => change.field === "summary")).toBe(true);
    expect(summary.mvpScopeChanges.some((change) => change.field === "summary")).toBe(true);
    expect(summary.expansionScopeChanges.some((change) => change.field === "summary")).toBe(true);
  });

  it("captures added, removed, and changed entities by collection", () => {
    const active = createSeedBlueprint();
    const candidate = structuredClone(active);
    const addedDomain = createDomain();
    addedDomain.name = "Recovery Domain";

    const removedOutcomeName = candidate.outcomes[0]?.name ?? "";
    const changedComponent = candidate.components[0];
    candidate.domains.push(addedDomain);
    candidate.outcomes = candidate.outcomes.slice(1);

    if (changedComponent) {
      changedComponent.purpose = "Updated purpose for compare preview";
    }

    const summary = compareBlueprints({
      activeBlueprint: active,
      candidateBlueprint: candidate,
    });

    const domainDiff = summary.collections.find((collection) => collection.key === "domains");
    const outcomeDiff = summary.collections.find((collection) => collection.key === "outcomes");
    const componentDiff = summary.collections.find((collection) => collection.key === "components");

    expect(domainDiff?.added.some((item) => item.label === "Recovery Domain")).toBe(true);
    expect(outcomeDiff?.removed.some((item) => item.label === removedOutcomeName)).toBe(true);
    expect(componentDiff?.changed.some((item) => item.changedFields.includes("purpose"))).toBe(true);
  });

  it("previews repaired recovery non-mutatingly and returns a compare summary", () => {
    const active = createSeedBlueprint();
    const candidate = structuredClone(active);
    candidate.project.rawIdea = "Recovered idea from quarantine compare preview.";

    const quarantine = createBrokenQuarantine();
    const storage = createTestStorage({
      [projectsStorageKey]: JSON.stringify(createStoredProjectsDocument([active])),
      [projectsQuarantineStorageKey]: JSON.stringify([quarantine]),
    });

    const { repository, service } = setupService(storage);
    const beforeProjects = repository.loadAll().projects;
    const beforeQuarantine = repository.listQuarantinedPayloads();
    const result = service.previewQuarantinedPayload({
      quarantineId: quarantine.id,
      repairedJson: JSON.stringify(createStoredProjectsDocument([candidate])),
      activeBlueprint: active,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error("Expected preview to succeed.");
    }
    expect(
      result.restoreCandidate.compare.projectChanges.some((change) => change.field === "rawIdea"),
    ).toBe(true);
    expect(repository.loadAll().projects).toEqual(beforeProjects);
    expect(repository.listQuarantinedPayloads()).toEqual(beforeQuarantine);
  });

  it("supports multiple recovered projects and updates compare when selection changes", () => {
    const active = createSeedBlueprint();
    const activeCandidate = structuredClone(active);
    activeCandidate.project.rawIdea = "Recovered active project candidate.";

    const alternate = createSeedBlueprint();
    alternate.project.name = "Alternate recovered project";
    alternate.project.rawIdea = "Recovered alternate project candidate.";

    const quarantine = createBrokenQuarantine();
    const storage = createTestStorage({
      [projectsStorageKey]: JSON.stringify(createStoredProjectsDocument([active])),
      [projectsQuarantineStorageKey]: JSON.stringify([quarantine]),
    });

    const { service } = setupService(storage);

    const defaultPreview = service.previewQuarantinedPayload({
      quarantineId: quarantine.id,
      repairedJson: JSON.stringify(createStoredProjectsDocument([alternate, activeCandidate])),
      activeBlueprint: active,
    });

    expect(defaultPreview.success).toBe(true);
    if (!defaultPreview.success) {
      throw new Error("Expected preview to succeed.");
    }
    expect(defaultPreview.restoreCandidate.recoveredProjects).toHaveLength(2);
    expect(defaultPreview.restoreCandidate.selectedRecoveredProjectId).toBe(active.project.id);
    expect(defaultPreview.restoreCandidate.compare.candidateProjectId).toBe(active.project.id);

    const selectedPreview = service.previewQuarantinedPayload({
      quarantineId: quarantine.id,
      repairedJson: JSON.stringify(createStoredProjectsDocument([alternate, activeCandidate])),
      activeBlueprint: active,
      selectedRecoveredProjectId: alternate.project.id,
    });

    expect(selectedPreview.success).toBe(true);
    if (!selectedPreview.success) {
      throw new Error("Expected preview selection to succeed.");
    }
    expect(selectedPreview.restoreCandidate.selectedRecoveredProjectId).toBe(alternate.project.id);
    expect(selectedPreview.restoreCandidate.compare.candidateProjectId).toBe(alternate.project.id);
    expect(selectedPreview.restoreCandidate.compare.projectChanges.some((change) => change.field === "name")).toBe(
      true,
    );
  });

  it("returns structured preview failure without mutating active state or quarantine", () => {
    const active = createSeedBlueprint();
    const quarantine = createBrokenQuarantine();
    const storage = createTestStorage({
      [projectsStorageKey]: JSON.stringify(createStoredProjectsDocument([active])),
      [projectsQuarantineStorageKey]: JSON.stringify([quarantine]),
    });

    const { repository, service } = setupService(storage);
    const beforeProjects = repository.loadAll().projects;
    const beforeQuarantine = repository.listQuarantinedPayloads();
    const result = service.previewQuarantinedPayload({
      quarantineId: quarantine.id,
      activeBlueprint: active,
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected preview to fail for broken quarantine payload.");
    }
    expect(result.failureCategory).toBe("format");
    expect(repository.loadAll().projects).toEqual(beforeProjects);
    expect(repository.listQuarantinedPayloads()).toEqual(beforeQuarantine);
  });
});
