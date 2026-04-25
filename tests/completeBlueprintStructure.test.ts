import { describe, expect, it } from "vitest";

import { completeBlueprintStructure } from "@/application/intake/completeBlueprintStructure";
import { validateBlueprint } from "@/application/validation/validateBlueprint";
import {
  createActor,
  createEmptyBlueprint,
  createIntent,
  createOutcome,
  createProject,
} from "@/domain/defaults";
import type { ProjectBlueprint } from "@/domain/models";
import { ProjectBlueprintSchema } from "@/schema";
import { createSeedBlueprint } from "@/seed/exampleBlueprint";

const createRawBlueprint = (): ProjectBlueprint => {
  const project = createProject({
    name: "Raw Completion Fixture",
    rawIdea: "Build a deterministic local-first framework builder from a raw idea.",
  });
  const intent = createIntent("Turn a raw idea into a framework blueprint.");
  intent.problemStatement = "A raw project idea lacks structure, governance, scope, and readiness checks.";
  intent.targetAudience = "Framework builder";
  intent.valueHypothesis = "Completing missing structure makes the blueprint practical to inspect and refine.";

  const outcome = createOutcome("A buildable framework blueprint");
  outcome.description = "The user can inspect connected structure before implementation.";
  outcome.successMetric = "The completed blueprint passes structural validation.";

  return createEmptyBlueprint(project, intent, outcome);
};

const expectAllReferencesValid = (references: string[], allowedIds: Set<string>) => {
  expect(references.every((id) => allowedIds.has(id))).toBe(true);
};

describe("completeBlueprintStructure", () => {
  it("turns a raw empty blueprint into a schema-valid build-ready blueprint", () => {
    const raw = createRawBlueprint();
    raw.validation = validateBlueprint(raw);

    expect(raw.validation.buildReady).toBe(false);

    const completed = completeBlueprintStructure(raw);

    expect(ProjectBlueprintSchema.safeParse(completed).success).toBe(true);
    expect(completed.validation.buildReady).toBe(true);
  });

  it("populates the required framework sections", () => {
    const completed = completeBlueprintStructure(createRawBlueprint());

    expect(completed.actors.length).toBeGreaterThan(0);
    expect(completed.domains.length).toBeGreaterThan(0);
    expect(completed.functions.length).toBeGreaterThan(0);
    expect(completed.components.length).toBeGreaterThan(0);
    expect(completed.flows.length).toBeGreaterThan(0);
    expect(completed.phases.length).toBeGreaterThan(0);
    expect(completed.rules.length).toBeGreaterThan(0);
    expect(completed.invariants.length).toBeGreaterThan(0);
    expect(completed.guardrails.length).toBeGreaterThan(0);
    expect(completed.decisionLogic.records.length).toBeGreaterThan(0);
    expect(completed.failureModes.length).toBeGreaterThan(0);
  });

  it("maps every generated function to an outcome", () => {
    const completed = completeBlueprintStructure(createRawBlueprint());
    const outcomeIds = new Set(completed.outcomes.map((outcome) => outcome.id));

    expect(
      completed.functions.every((fn) => fn.outcomeIds.length > 0 && fn.outcomeIds.every((id) => outcomeIds.has(id))),
    ).toBe(true);
  });

  it("maps every generated component to a function", () => {
    const completed = completeBlueprintStructure(createRawBlueprint());
    const functionIds = new Set(completed.functions.map((fn) => fn.id));

    expect(
      completed.components.every(
        (component) => component.functionIds.length > 0 && component.functionIds.every((id) => functionIds.has(id)),
      ),
    ).toBe(true);
  });

  it("creates MVP scope items with valid entity references", () => {
    const completed = completeBlueprintStructure(createRawBlueprint());
    const outcomeIds = new Set(completed.outcomes.map((outcome) => outcome.id));
    const functionIds = new Set(completed.functions.map((fn) => fn.id));
    const componentIds = new Set(completed.components.map((component) => component.id));

    expect(completed.mvpScope.items.length).toBeGreaterThan(0);
    completed.mvpScope.items.forEach((item) => {
      expect(item.outcomeIds.length + item.functionIds.length + item.componentIds.length).toBeGreaterThan(0);
      expectAllReferencesValid(item.outcomeIds, outcomeIds);
      expectAllReferencesValid(item.functionIds, functionIds);
      expectAllReferencesValid(item.componentIds, componentIds);
    });
  });

  it("preserves existing user-authored entities while filling missing sections", () => {
    const raw = createRawBlueprint();
    const actor = createActor();
    actor.name = "Existing strategy lead";
    raw.actors = [actor];

    const completed = completeBlueprintStructure(raw);

    expect(completed.actors).toHaveLength(1);
    expect(completed.actors[0]?.id).toBe(actor.id);
    expect(completed.actors[0]?.name).toBe("Existing strategy lead");
    expect(completed.domains.length).toBeGreaterThan(0);
    expect(completed.validation.buildReady).toBe(true);
  });

  it("keeps the seed blueprint build-ready", () => {
    const seed = createSeedBlueprint();
    const completed = completeBlueprintStructure(seed);

    expect(completed.validation.buildReady).toBe(true);
  });
});
