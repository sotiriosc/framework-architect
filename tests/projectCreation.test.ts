import { describe, expect, it } from "vitest";

import { BlueprintService } from "@/application/services/blueprintService";
import { LocalProjectRepository } from "@/persistence/localProjectRepository";
import type { StorageLike } from "@/persistence/projectRepository";

const createTestStorage = (): StorageLike => {
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

const createService = () => new BlueprintService(new LocalProjectRepository(createTestStorage()));

describe("project creation", () => {
  it("default create produces populated framework structure", () => {
    const service = createService();
    const created = service.createProject({
      name: "Default Framework",
      rawIdea: "Create a framework that helps teams turn rough operating ideas into governed implementation plans.",
    });

    expect(created.actors.length).toBeGreaterThan(0);
    expect(created.domains.length).toBeGreaterThan(0);
    expect(created.functions.length).toBeGreaterThan(0);
    expect(created.components.length).toBeGreaterThan(0);
    expect(created.mvpScope.items.length).toBeGreaterThan(0);
    expect(created.phases.length).toBeGreaterThan(0);
    expect(created.invariants.length).toBeGreaterThan(0);
    expect(created.rules.length + created.guardrails.length).toBeGreaterThan(0);
    expect(created.validation.buildReady).toBe(true);
  });

  it("manual empty blueprint creation remains possible", () => {
    const service = createService();
    const created = service.createEmptyProject({
      name: "Manual Empty Blueprint",
      rawIdea: "Create an empty shell for a user who wants to model every section manually.",
    });

    expect(created.outcomes.length).toBe(1);
    expect(created.actors).toHaveLength(0);
    expect(created.domains).toHaveLength(0);
    expect(created.functions).toHaveLength(0);
    expect(created.components).toHaveLength(0);
    expect(created.mvpScope.items).toHaveLength(0);
    expect(created.validation.buildReady).toBe(false);
  });
});
