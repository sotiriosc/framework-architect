import { describe, expect, it } from "vitest";

import { createSeedBlueprint } from "@/seed/exampleBlueprint";
import { idSchema, MemoryEntrySchema, ProjectBlueprintSchema, timestampSchema } from "@/schema";

describe("schema hardening", () => {
  it("uses the camelCase blueprint contract internally", () => {
    const seed = createSeedBlueprint();
    const parsed = ProjectBlueprintSchema.parse(seed);

    expect(parsed.decisionLogic.records.length).toBeGreaterThan(0);
    expect(parsed.failureModes.length).toBeGreaterThan(0);
    expect(parsed.mvpScope.items.length).toBeGreaterThan(0);
    expect(parsed.expansionScope.items.length).toBeGreaterThan(0);
  });

  it("normalizes legacy snake_case keys into the internal camelCase contract", () => {
    const seed = createSeedBlueprint();
    const legacy = {
      ...seed,
      decision_logic: seed.decisionLogic,
      failure_modes: seed.failureModes,
      mvp_scope: seed.mvpScope,
      expansion_scope: seed.expansionScope,
    };

    delete (legacy as Record<string, unknown>).decisionLogic;
    delete (legacy as Record<string, unknown>).failureModes;
    delete (legacy as Record<string, unknown>).mvpScope;
    delete (legacy as Record<string, unknown>).expansionScope;

    const parsed = ProjectBlueprintSchema.parse(legacy);

    expect(parsed.decisionLogic.records).toHaveLength(seed.decisionLogic.records.length);
    expect(parsed.failureModes).toHaveLength(seed.failureModes.length);
    expect(parsed.mvpScope.items).toHaveLength(seed.mvpScope.items.length);
    expect(parsed.expansionScope.items).toHaveLength(seed.expansionScope.items.length);
  });

  it("normalizes legacy memory entry keys", () => {
    const parsed = MemoryEntrySchema.parse({
      id: "memory_123e4567-e89b-12d3-a456-426614174000",
      type: "project",
      related_entity_ids: ["proj_123e4567-e89b-12d3-a456-426614174000"],
      summary: "Stored project context",
      reason: "Migration test",
      created_at: "2026-04-09T16:00:00.000Z",
      updated_at: "2026-04-09T16:00:00.000Z",
      tags: ["migration"],
    });

    expect(parsed.relatedEntityIds).toEqual(["proj_123e4567-e89b-12d3-a456-426614174000"]);
    expect(parsed.createdAt).toBe("2026-04-09T16:00:00.000Z");
  });

  it("rejects weak ids and invalid timestamps", () => {
    expect(() => idSchema.parse("123e4567-e89b-12d3-a456-426614174000")).toThrow();
    expect(() => timestampSchema.parse("not-a-date")).toThrow();
  });
});
