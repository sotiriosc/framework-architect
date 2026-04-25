import { describe, expect, it } from "vitest";

import { BlueprintService } from "@/application/services/blueprintService";
import { validateBlueprint } from "@/application/validation/validateBlueprint";
import {
  createComponent,
  createDependency,
  createEmptyBlueprint,
  createInvariant,
  createIntent,
  createOutcome,
  createProject,
  createProjectFunction,
  createRule,
} from "@/domain/defaults";
import { LocalProjectRepository } from "@/persistence/localProjectRepository";
import type { StorageLike } from "@/persistence/projectRepository";
import { createSeedBlueprint } from "@/seed/exampleBlueprint";

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

describe("validateBlueprint", () => {
  it("does not treat a raw-idea-only project as build-ready", () => {
    const service = new BlueprintService(new LocalProjectRepository(createTestStorage()));
    const created = service.createProject({
      name: "Raw Idea Only",
      rawIdea: "Build a tiny tool from a raw idea before the architecture is filled in.",
    });

    expect(created.validation.buildReady).toBe(false);
    expect(
      created.validation.checks.some((check) => check.code === "FUNCTION_REQUIRED" && check.status === "fail"),
    ).toBe(true);
    expect(
      created.validation.checks.some((check) => check.code === "COMPONENT_REQUIRED" && check.status === "fail"),
    ).toBe(true);
    expect(
      created.validation.checks.some((check) => check.code === "MVP_SCOPE_REQUIRED" && check.status === "fail"),
    ).toBe(true);
  });

  it("flags unmapped functions and components as critical failures", () => {
    const project = createProject({
      name: "Validation Example",
      rawIdea: "Build a tool that captures ideas and validates structure.",
    });
    const intent = createIntent("Capture ideas and validate structure.");
    const outcome = createOutcome("Valid architecture");
    const blueprint = createEmptyBlueprint(project, intent, outcome);

    blueprint.functions = [createProjectFunction()];
    blueprint.components = [createComponent()];

    const validation = validateBlueprint(blueprint);

    expect(validation.buildReady).toBe(false);
    expect(validation.checks.some((check) => check.code === "FUNCTION_OUTCOME_MAPPING" && check.status === "fail")).toBe(
      true,
    );
    expect(
      validation.checks.some((check) => check.code === "COMPONENT_FUNCTION_MAPPING" && check.status === "fail"),
    ).toBe(true);
  });

  it("flags invalid dependency references", () => {
    const seed = createSeedBlueprint();
    const dependency = createDependency();
    dependency.name = "Broken dependency";
    dependency.sourceEntityId = "component_123e4567-e89b-12d3-a456-426614174111";
    dependency.targetEntityId = "function_123e4567-e89b-12d3-a456-426614174222";
    seed.dependencies.push(dependency);

    const validation = validateBlueprint(seed);

    expect(validation.checks.some((check) => check.code === "DEPENDENCY_REFERENCES" && check.status === "fail")).toBe(
      true,
    );
  });

  it("flags invalid scoped governance references", () => {
    const seed = createSeedBlueprint();
    const rule = createRule();
    rule.name = "Component rule with bad scope";
    rule.scope = "component";
    rule.scopeEntityIds = ["component_123e4567-e89b-12d3-a456-426614174999"];

    const invariant = createInvariant();
    invariant.name = "Invariant missing semantics";
    invariant.violationMessage = "";
    invariant.scope = "function";
    invariant.scopeEntityIds = [];

    seed.rules.push(rule);
    seed.invariants.push(invariant);

    const validation = validateBlueprint(seed);

    expect(validation.checks.some((check) => check.code === "RULE_SCOPE_REFERENCES" && check.status === "fail")).toBe(
      true,
    );
    expect(validation.checks.some((check) => check.code === "INVARIANT_SCOPE" && check.status === "fail")).toBe(true);
  });

  it("returns a build-ready validation state for the seed blueprint", () => {
    const seed = createSeedBlueprint();
    expect(seed.validation.buildReady).toBe(true);
  });

  it("fails FUNCTION_REQUIRED when a blueprint has no functions", () => {
    const seed = createSeedBlueprint();
    seed.functions = [];

    const validation = validateBlueprint(seed);

    expect(validation.buildReady).toBe(false);
    expect(validation.checks.some((check) => check.code === "FUNCTION_REQUIRED" && check.status === "fail")).toBe(
      true,
    );
  });

  it("fails COMPONENT_REQUIRED when a blueprint has no components", () => {
    const seed = createSeedBlueprint();
    seed.components = [];

    const validation = validateBlueprint(seed);

    expect(validation.buildReady).toBe(false);
    expect(validation.checks.some((check) => check.code === "COMPONENT_REQUIRED" && check.status === "fail")).toBe(
      true,
    );
  });

  it("fails MVP_SCOPE_REQUIRED when MVP scope items are missing", () => {
    const seed = createSeedBlueprint();
    seed.mvpScope.items = [];

    const validation = validateBlueprint(seed);

    expect(validation.buildReady).toBe(false);
    expect(validation.checks.some((check) => check.code === "MVP_SCOPE_REQUIRED" && check.status === "fail")).toBe(
      true,
    );
  });
});
