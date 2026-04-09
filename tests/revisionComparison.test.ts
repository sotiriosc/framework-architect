import { describe, expect, it } from "vitest";

import { compareBlueprints } from "@/application/review/compareBlueprints";
import { BlueprintService } from "@/application/services/blueprintService";
import { createDomain } from "@/domain/defaults";
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

const createRevisionFixture = () => {
  const { service } = setupService(createTestStorage());
  const initial = service.createProject({
    name: "Revision compare fixture",
    rawIdea: "Track changes across revisions without adding a second diff engine.",
  });

  const second = structuredClone(initial);
  second.project.corePhilosophy = "A stricter architecture philosophy.";
  const savedSecond = service.saveBlueprint(second, "Updated project philosophy.");

  const third = structuredClone(savedSecond);
  third.intent.summary = "A refined revision comparison intent.";
  const addedDomain = createDomain();
  addedDomain.name = "Revision Comparison Domain";
  third.domains.push(addedDomain);
  const savedThird = service.saveBlueprint(third, "Added a domain and refined the intent.");

  return {
    service,
    initial,
    savedSecond,
    savedThird,
    revisions: service.listProjectRevisions(initial.project.id),
  };
};

describe("revision comparison", () => {
  it("compares a selected revision to the previous revision", () => {
    const { service, savedThird, revisions } = createRevisionFixture();
    const latest = revisions[0];

    expect(latest).toBeDefined();
    const result = service.buildRevisionComparison({
      projectId: savedThird.project.id,
      baseRevisionId: latest?.id ?? null,
      mode: "previous",
      activeBlueprint: savedThird,
    });

    expect(result.status).toBe("ready");
    expect(result.compareTarget?.kind).toBe("revision");
    expect(result.compareTarget?.revisionNumber).toBe(2);
    expect(result.diff?.intentChanges.some((change) => change.field === "summary")).toBe(true);
    expect(result.diff?.collections.find((collection) => collection.key === "domains")?.added.length).toBe(1);
  });

  it("compares a selected revision to another chosen revision", () => {
    const { service, savedThird, revisions } = createRevisionFixture();
    const latest = revisions[0];
    const earliest = revisions[2];

    expect(latest).toBeDefined();
    expect(earliest).toBeDefined();
    const result = service.buildRevisionComparison({
      projectId: savedThird.project.id,
      baseRevisionId: latest?.id ?? null,
      mode: "revision",
      compareRevisionId: earliest?.id ?? null,
      activeBlueprint: savedThird,
    });

    expect(result.status).toBe("ready");
    expect(result.compareTarget?.revisionId).toBe(earliest?.id ?? null);
    expect(result.diff).toEqual(
      compareBlueprints({
        activeBlueprint: earliest?.snapshot ?? null,
        candidateBlueprint: latest?.snapshot ?? null,
      }),
    );
  });

  it("compares a selected revision to the current active project", () => {
    const { service, savedThird, revisions } = createRevisionFixture();
    const middle = revisions[1];
    const currentDraft = structuredClone(savedThird);
    currentDraft.project.rawIdea = "Current unsaved active project state.";

    expect(middle).toBeDefined();
    const result = service.buildRevisionComparison({
      projectId: savedThird.project.id,
      baseRevisionId: middle?.id ?? null,
      mode: "current",
      activeBlueprint: currentDraft,
    });

    expect(result.status).toBe("ready");
    expect(result.compareTarget?.kind).toBe("current");
    expect(result.diff?.projectChanges.some((change) => change.field === "rawIdea")).toBe(true);
  });

  it("defaults another-revision mode to the previous revision when available", () => {
    const { service, savedThird, revisions } = createRevisionFixture();
    const latest = revisions[0];

    const result = service.buildRevisionComparison({
      projectId: savedThird.project.id,
      baseRevisionId: latest?.id ?? null,
      mode: "revision",
      activeBlueprint: savedThird,
    });

    expect(result.status).toBe("ready");
    expect(result.compareTarget?.revisionNumber).toBe(2);
  });

  it("handles the earliest revision gracefully when no previous revision exists", () => {
    const { service, savedThird, revisions } = createRevisionFixture();
    const earliest = revisions[2];

    const result = service.buildRevisionComparison({
      projectId: savedThird.project.id,
      baseRevisionId: earliest?.id ?? null,
      mode: "previous",
      activeBlueprint: savedThird,
    });

    expect(result.status).toBe("empty");
    expect(result.compareTarget).toBeNull();
    expect(result.message).toContain("has no previous revision");
  });

  it("handles invalid comparison targets without crashing", () => {
    const { service, savedThird, revisions } = createRevisionFixture();
    const latest = revisions[0];

    const result = service.buildRevisionComparison({
      projectId: savedThird.project.id,
      baseRevisionId: latest?.id ?? null,
      mode: "revision",
      compareRevisionId: "revision_missing",
      activeBlueprint: savedThird,
    });

    expect(result.status).toBe("invalid");
    expect(result.diff).toBeNull();
    expect(result.message).toContain("could not be found");
  });
});
