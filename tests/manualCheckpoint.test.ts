import { describe, expect, it } from "vitest";

import { BlueprintService } from "@/application/services/blueprintService";
import { createComponent } from "@/domain/defaults";
import { LocalProjectRepository } from "@/persistence/localProjectRepository";

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

describe("manual checkpoint", () => {
  it("creates a manual checkpoint revision and persists its note", () => {
    const { service } = setupService(createTestStorage());
    const created = service.createProject({
      name: "Checkpoint project",
      rawIdea: "Checkpoint the project at a deliberate milestone.",
    });
    const edited = structuredClone(created);
    edited.intent.summary = "Checkpointed architecture milestone.";

    const checkpointed = service.createManualCheckpoint(
      edited,
      "Milestone: initial architecture stabilized.",
    );
    const revisions = service.listProjectRevisions(created.project.id);

    expect(checkpointed.intent.summary).toBe("Checkpointed architecture milestone.");
    expect(revisions).toHaveLength(2);
    expect(revisions[0]?.source).toBe("manualCheckpoint");
    expect(revisions[0]?.reason).toBe("Milestone: initial architecture stabilized.");
  });

  it("does not create a duplicate revision for a no-op checkpoint", () => {
    const { service } = setupService(createTestStorage());
    const created = service.createProject({
      name: "No-op checkpoint",
      rawIdea: "Duplicate checkpoints should be ignored.",
    });

    const checkpointed = service.createManualCheckpoint(
      structuredClone(created),
      "No-op checkpoint note.",
    );
    const revisions = service.listProjectRevisions(created.project.id);

    expect(checkpointed.project.version).toBe(created.project.version);
    expect(revisions).toHaveLength(1);
    expect(revisions[0]?.source).toBe("editSave");
  });

  it("requires explicit confirmation for warning-level checkpoint review and does not create a revision when cancelled", () => {
    const { repository, service } = setupService(createTestStorage());
    const active = service.bootstrap().projects[0];

    expect(active).toBeDefined();
    if (!active) {
      throw new Error("Expected a seed blueprint.");
    }

    const edited = structuredClone(active);
    edited.rules[0].enforcement = "Checkpointed governance wording update.";

    const review = service.reviewStableSave({
      candidate: edited,
      reason: "Checkpoint note for governance wording.",
      source: "manualCheckpoint",
    });

    expect(review.status).toBe("ready");
    if (review.status !== "ready") {
      throw new Error("Expected a ready review.");
    }

    expect(review.level).toBe("warning");
    expect(review.saveSource).toBe("manualCheckpoint");
    const committed = service.commitStableSave({
      review,
      confirm: false,
    });

    expect(committed.success).toBe(false);
    if (committed.success) {
      throw new Error("Expected checkpoint commit to require confirmation.");
    }

    expect(committed.code).toBe("confirmation-required");
    expect(repository.find(active.project.id)?.rules[0]?.enforcement).toBe(active.rules[0]?.enforcement);
    expect(service.listProjectRevisions(active.project.id)).toHaveLength(1);
  });

  it("keeps build-ready blocker behavior under checkpoint flow", () => {
    const { repository, service } = setupService(createTestStorage());
    const created = service.createProject({
      name: "Checkpoint build-ready",
      rawIdea: "Checkpointing should not weaken build-ready protections.",
    });
    const edited = structuredClone(created);
    const brokenComponent = createComponent();
    brokenComponent.name = "Broken checkpoint component";
    edited.components.push(brokenComponent);
    edited.project.status = "build-ready";

    const review = service.reviewStableSave({
      candidate: edited,
      reason: "Checkpoint before build-ready handoff.",
      source: "manualCheckpoint",
    });

    expect(review.status).toBe("ready");
    if (review.status !== "ready") {
      throw new Error("Expected a ready review.");
    }

    expect(review.level).toBe("blocked");
    expect(review.effectiveProjectStatus).toBe("validated");

    const committed = service.commitStableSave({
      review,
      confirm: true,
    });

    expect(committed.success).toBe(true);
    if (!committed.success) {
      throw new Error("Expected blocked build-ready checkpoint to save as validated.");
    }

    expect(committed.savedBlueprint.project.status).toBe("validated");
    expect(repository.find(created.project.id)?.project.status).toBe("validated");
    expect(service.listProjectRevisions(created.project.id)[0]?.source).toBe("manualCheckpoint");
  });

  it("keeps mixed editSave and manualCheckpoint revisions ordered and comparable", () => {
    const { service } = setupService(createTestStorage());
    const created = service.createProject({
      name: "Mixed revision history",
      rawIdea: "Save and checkpoint should share the same history timeline cleanly.",
    });

    const checkpointDraft = structuredClone(created);
    checkpointDraft.intent.summary = "Checkpoint milestone summary.";
    service.createManualCheckpoint(checkpointDraft, "Checkpoint milestone note.");

    const savedDraft = structuredClone(checkpointDraft);
    savedDraft.project.corePhilosophy = "Saved edit after the checkpoint.";
    service.saveBlueprint(savedDraft, "Saved edit after checkpoint.");

    const revisions = service.listProjectRevisions(created.project.id);

    expect(revisions).toHaveLength(3);
    expect(revisions.map((revision) => revision.source)).toEqual([
      "editSave",
      "manualCheckpoint",
      "editSave",
    ]);

    const comparison = service.buildRevisionComparison({
      projectId: created.project.id,
      baseRevisionId: revisions[0]?.id ?? null,
      mode: "previous",
      activeBlueprint: savedDraft,
    });

    expect(comparison.status).toBe("ready");
    expect(comparison.compareTarget?.revisionNumber).toBe(2);
  });
});
