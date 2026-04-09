import { describe, expect, it } from "vitest";

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
import { createSeedBlueprint } from "@/seed/exampleBlueprint";

describe("validateBlueprint", () => {
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
});
