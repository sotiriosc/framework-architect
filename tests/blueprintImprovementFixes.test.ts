import { describe, expect, it } from "vitest";

import { completeBlueprintStructure } from "@/application/intake/completeBlueprintStructure";
import {
  composeBlueprintFromGuidedIntake,
  type GuidedIntakeInput,
} from "@/application/intake/composeBlueprintFromGuidedIntake";
import {
  applyBlueprintImprovementFix,
  applySafeBlueprintImprovementFixes,
} from "@/application/review/applyBlueprintImprovementFixes";
import { buildBlueprintImprovementPlan } from "@/application/review/buildBlueprintImprovementPlan";
import { buildBlueprintQualityReview } from "@/application/review/buildBlueprintQualityReview";
import { BlueprintService } from "@/application/services/blueprintService";
import { validateBlueprint } from "@/application/validation/validateBlueprint";
import { createEmptyBlueprint, createIntent, createOutcome, createProject } from "@/domain/defaults";
import type { ProjectBlueprint } from "@/domain/models";
import { LocalProjectRepository } from "@/persistence/localProjectRepository";
import type { StorageLike } from "@/persistence/projectRepository";
import { ProjectBlueprintSchema } from "@/schema";

const praxisGuidedInput: GuidedIntakeInput = {
  projectName: "Praxis Improvement Framework",
  rawIdea:
    "Create a Praxis feature workflow that turns rough feature notes into governed Codex implementation tasks while preserving program logic, progression gates, safety, and coaching trust.",
  frameworkType: "Praxis Feature",
  frameworkTemplateId: "praxis-feature",
  targetUser: "Praxis builders",
  problem:
    "Feature notes can weaken existing Praxis behavior when implementation boundaries and safety rules are implicit.",
  intendedOutcome: "ship safe Praxis improvements with clear implementation boundaries",
  corePrinciples: ["Preserve program logic", "Keep progression gating intact"],
  mustRemainTrue: [
    "Generated prompts must not weaken existing Praxis program logic",
    "MVP scope and expansion scope must remain separate",
    "Every component must map to a function",
    "Every function must map to an outcome",
  ],
  mvpBoundary: [
    "Capture raw feature idea",
    "Generate connected framework structure",
    "Validate readiness and safety",
    "Export Codex Prompt",
  ],
  expansionIdeas: ["Template library for Praxis features", "Saved framework versions"],
  knownRisks: ["Generated prompts may accidentally weaken existing Praxis program logic"],
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

const createPraxisBlueprint = (): ProjectBlueprint => composeBlueprintFromGuidedIntake(praxisGuidedInput);

const createEmptyShellBlueprint = (): ProjectBlueprint => {
  const project = createProject({
    name: "Weak Empty Shell",
    rawIdea:
      "Create a detailed governed software app framework for teams to convert messy product ideas into implementation artifacts, validation gates, export checklists, and clear safety rules.",
    corePhilosophy: "Framework template: Software App.",
  });
  const intent = createIntent("Create a weak shell.");
  intent.problemStatement = "Teams need something better but the structure is not filled in yet.";
  intent.targetAudience = "Product teams";
  const outcome = createOutcome("Have a usable framework");
  outcome.description = "A builder can use the framework.";
  outcome.successMetric = "Builder can inspect the result.";
  const blueprint = createEmptyBlueprint(project, intent, outcome);
  blueprint.validation = validateBlueprint(blueprint);
  return blueprint;
};

const removeExportSurfaceNames = (blueprint: ProjectBlueprint): ProjectBlueprint => {
  blueprint.functions.forEach((fn) => {
    if (/export|codex|prompt|handoff|output|artifact/i.test(fn.name)) {
      fn.name = "Implementation Package";
      fn.description = "Prepare implementation material.";
    }
  });
  blueprint.components.forEach((component) => {
    if (/export|codex|prompt|handoff|output|artifact/i.test(component.name)) {
      component.name = "Implementation Surface";
      component.description = "Shows implementation material.";
      component.purpose = "Shows implementation material.";
    }
  });
  blueprint.validation = validateBlueprint(blueprint);
  return blueprint;
};

const entityIds = (blueprint: ProjectBlueprint): Set<string> =>
  new Set([
    blueprint.project.id,
    blueprint.intent.id,
    ...blueprint.outcomes.map((item) => item.id),
    ...blueprint.actors.map((item) => item.id),
    ...blueprint.domains.map((item) => item.id),
    ...blueprint.functions.map((item) => item.id),
    ...blueprint.components.map((item) => item.id),
    ...blueprint.flows.map((item) => item.id),
    ...blueprint.dependencies.map((item) => item.id),
    ...blueprint.rules.map((item) => item.id),
    ...blueprint.invariants.map((item) => item.id),
    ...blueprint.guardrails.map((item) => item.id),
    ...blueprint.phases.map((item) => item.id),
    ...blueprint.mvpScope.items.map((item) => item.id),
    ...blueprint.expansionScope.items.map((item) => item.id),
    ...blueprint.decisionLogic.records.map((item) => item.id),
    ...blueprint.failureModes.map((item) => item.id),
  ]);

describe("blueprint improvement planning and fixes", () => {
  it("creates naming fixes for generic invariant names", () => {
    const blueprint = createPraxisBlueprint();
    blueprint.invariants[0]!.name = "Must remain true 2";

    const plan = buildBlueprintImprovementPlan(blueprint);

    expect(plan.safeFixes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "rename-generic-invariants",
          category: "naming",
          safety: "safe",
        }),
      ]),
    );
  });

  it("renames generic invariants when applying an individual safe fix", () => {
    const blueprint = createPraxisBlueprint();
    blueprint.invariants[0]!.name = "Must remain true 2";

    const fixed = applyBlueprintImprovementFix(blueprint, "rename-generic-invariants");

    expect(fixed.invariants[0]?.name).not.toMatch(/^Must remain true/i);
    expect(fixed.invariants[0]?.name).toContain("Praxis");
  });

  it("plans export-readiness fixes when export MVP items lack an export function or component", () => {
    const blueprint = removeExportSurfaceNames(createPraxisBlueprint());

    const plan = buildBlueprintImprovementPlan(blueprint);

    expect(plan.safeFixes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "add-export-surface",
          category: "export-readiness",
          safety: "safe",
        }),
      ]),
    );
  });

  it("applies safe fixes while preserving schema validity", () => {
    const blueprint = removeExportSurfaceNames(createPraxisBlueprint());
    blueprint.invariants[0]!.name = "Must remain true 2";
    blueprint.failureModes[0]!.mitigation = "";

    const fixed = applySafeBlueprintImprovementFixes(blueprint);

    expect(ProjectBlueprintSchema.safeParse(fixed).success).toBe(true);
    expect(fixed.validation.checks.length).toBeGreaterThan(0);
    expect(fixed.functions.some((fn) => /export/i.test(fn.name))).toBe(true);
    expect(fixed.components.some((component) => /export/i.test(component.name))).toBe(true);
    expect(fixed.failureModes[0]?.mitigation).not.toBe("");
  });

  it("does not remove existing user-authored entities when applying safe fixes", () => {
    const blueprint = removeExportSurfaceNames(createPraxisBlueprint());
    blueprint.invariants[0]!.name = "Must remain true 2";
    const beforeIds = entityIds(blueprint);

    const fixed = applySafeBlueprintImprovementFixes(blueprint);
    const afterIds = entityIds(fixed);

    beforeIds.forEach((id) => {
      expect(afterIds.has(id)).toBe(true);
    });
  });

  it("does not apply manual or risky fixes through the safe fix path", () => {
    const blueprint = createPraxisBlueprint();
    const sharedFunctionId = blueprint.functions[0]!.id;
    const sharedComponentId = blueprint.components[0]!.id;
    blueprint.mvpScope.items.forEach((item) => {
      item.functionIds = [sharedFunctionId];
      item.componentIds = [sharedComponentId];
    });
    blueprint.project.corePhilosophy = "Framework template: Software App.";

    const plan = buildBlueprintImprovementPlan(blueprint);
    const fixed = applySafeBlueprintImprovementFixes(blueprint);

    expect(plan.manualFixes.some((fix) => fix.id === "review-repetitive-mvp-mapping")).toBe(true);
    expect(plan.riskyFixes.some((fix) => fix.id === "replace-structure-from-template")).toBe(true);
    expect(fixed.mvpScope.items.every((item) => item.functionIds[0] === sharedFunctionId)).toBe(true);
    expect(fixed.project.corePhilosophy).toBe("Framework template: Software App.");
  });

  it("service quality fixes save through the stable path and record a revision", () => {
    const repository = new LocalProjectRepository(createTestStorage());
    const service = new BlueprintService(repository);
    const created = service.createProjectFromGuidedIntake(praxisGuidedInput);
    const draft = structuredClone(created);
    draft.invariants[0]!.name = "Must remain true 2";
    draft.invariants[0]!.description = "Export handoff must remain inspectable and governed.";

    const saved = service.applySafeQualityFixes(draft);
    const revisions = service.listProjectRevisions(saved.project.id);

    expect(saved.invariants[0]?.name).not.toMatch(/^Must remain true/i);
    expect(revisions).toHaveLength(2);
    expect(revisions[0]?.reason).toBe("Applied safe blueprint quality fixes.");
    expect(saved.memory.projectEntries).toHaveLength(2);
  });

  it("improves quality score after safe fixes on a weak blueprint", () => {
    const weak = completeBlueprintStructure(createEmptyShellBlueprint());
    weak.invariants[0]!.name = "Must remain true 2";
    weak.failureModes[0]!.mitigation = "";
    weak.expansionScope.items[0]!.name = weak.mvpScope.items[0]!.name;
    weak.validation = validateBlueprint(weak);
    const before = buildBlueprintQualityReview(weak);

    const fixed = applySafeBlueprintImprovementFixes(weak);
    const after = buildBlueprintQualityReview(fixed);

    expect(after.overallScore).toBeGreaterThan(before.overallScore);
    expect(after.issues.map((issue) => issue.code)).not.toContain("MVP_EXPANSION_OVERLAP");
  });
});
