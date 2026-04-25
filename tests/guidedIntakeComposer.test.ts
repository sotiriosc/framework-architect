import { describe, expect, it } from "vitest";

import {
  composeBlueprintFromGuidedIntake,
  type GuidedIntakeInput,
} from "@/application/intake/composeBlueprintFromGuidedIntake";
import { BlueprintService } from "@/application/services/blueprintService";
import { LocalProjectRepository } from "@/persistence/localProjectRepository";
import type { StorageLike } from "@/persistence/projectRepository";
import { ProjectBlueprintSchema } from "@/schema";

const guidedInput: GuidedIntakeInput = {
  projectName: "Team Decision Framework",
  rawIdea:
    "Create a local-first framework that helps product teams turn messy strategic decisions into governed decision briefs.",
  frameworkType: "decision framework",
  targetUser: "Product leads",
  problem: "Strategic decisions are scattered across notes and lose their assumptions, risks, and scope boundaries.",
  intendedOutcome: "make clearer product decisions with visible tradeoffs",
  corePrinciples: [
    "Assumptions must be visible",
    "Decision records should explain tradeoffs",
    "Scope must stay separate from later ideas",
  ],
  mustRemainTrue: [
    "The framework works without a backend",
    "Every decision remains traceable to an outcome",
  ],
  mvpBoundary: [
    "Capture a decision brief",
    "Review tradeoffs and risks",
    "Validate readiness before implementation",
  ],
  expansionIdeas: [
    "Compare decision briefs across teams",
    "Suggest review prompts from historical patterns",
  ],
  knownRisks: [
    "Teams may treat generated structure as final truth",
    "Expansion ideas may creep into MVP scope",
  ],
};

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

describe("composeBlueprintFromGuidedIntake", () => {
  it("returns a schema-valid, build-ready ProjectBlueprint", () => {
    const blueprint = composeBlueprintFromGuidedIntake(guidedInput);

    expect(ProjectBlueprintSchema.safeParse(blueprint).success).toBe(true);
    expect(blueprint.validation.buildReady).toBe(true);
  });

  it("maps generated functions to outcomes", () => {
    const blueprint = composeBlueprintFromGuidedIntake(guidedInput);
    const outcomeIds = new Set(blueprint.outcomes.map((outcome) => outcome.id));

    expect(blueprint.functions.length).toBeGreaterThan(0);
    expect(
      blueprint.functions.every(
        (fn) => fn.outcomeIds.length > 0 && fn.outcomeIds.every((outcomeId) => outcomeIds.has(outcomeId)),
      ),
    ).toBe(true);
  });

  it("maps generated components to functions", () => {
    const blueprint = composeBlueprintFromGuidedIntake(guidedInput);
    const functionIds = new Set(blueprint.functions.map((fn) => fn.id));

    expect(blueprint.components.length).toBeGreaterThan(0);
    expect(
      blueprint.components.every(
        (component) =>
          component.functionIds.length > 0 &&
          component.functionIds.every((functionId) => functionIds.has(functionId)),
      ),
    ).toBe(true);
  });

  it("keeps MVP and expansion scope items distinct", () => {
    const blueprint = composeBlueprintFromGuidedIntake(guidedInput);
    const mvpNames = new Set(blueprint.mvpScope.items.map((item) => item.name.trim().toLowerCase()));
    const overlappingExpansionItems = blueprint.expansionScope.items.filter((item) =>
      mvpNames.has(item.name.trim().toLowerCase()),
    );

    expect(blueprint.mvpScope.items.length).toBeGreaterThan(0);
    expect(blueprint.expansionScope.items.length).toBeGreaterThan(0);
    expect(overlappingExpansionItems).toHaveLength(0);
  });

  it("creates scope items that reference blueprint entities", () => {
    const blueprint = composeBlueprintFromGuidedIntake(guidedInput);
    const scopeItems = [...blueprint.mvpScope.items, ...blueprint.expansionScope.items];

    expect(
      scopeItems.every(
        (item) =>
          item.outcomeIds.length > 0 || item.functionIds.length > 0 || item.componentIds.length > 0,
      ),
    ).toBe(true);
  });
});

describe("BlueprintService guided intake creation", () => {
  it("persists through stable creation and records a first revision", () => {
    const repository = new LocalProjectRepository(createTestStorage());
    const service = new BlueprintService(repository);
    const created = service.createProjectFromGuidedIntake(guidedInput);
    const revisions = service.listProjectRevisions(created.project.id);

    expect(revisions).toHaveLength(1);
    expect(revisions[0]?.revisionNumber).toBe(1);
    expect(revisions[0]?.source).toBe("editSave");
    expect(created.memory.projectEntries).toHaveLength(1);
    expect(created.memory.structuralEntries).toHaveLength(1);
    expect(created.memory.decisionEntries).toHaveLength(1);
  });
});
