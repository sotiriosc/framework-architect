import { describe, expect, it } from "vitest";

import { createEmptyBlueprint, createIntent, createOutcome, createProject, createScopeItem } from "@/domain/defaults";
import type { ProjectBlueprint } from "@/domain/models";
import {
  buildBlueprintQualityReview,
  type BlueprintQualityIssue,
} from "@/application/review/buildBlueprintQualityReview";
import { composeBlueprintFromGuidedIntake } from "@/application/intake/composeBlueprintFromGuidedIntake";
import { validateBlueprint } from "@/application/validation/validateBlueprint";

const createPraxisBlueprint = (): ProjectBlueprint =>
  composeBlueprintFromGuidedIntake({
    projectName: "Praxis Quality Blueprint",
    rawIdea:
      "Create a Praxis feature that turns raw training feedback into governed implementation tasks while preserving program generation logic, progression, phase gating, coaching clarity, and user trust.",
    frameworkType: "Praxis Feature",
    frameworkTemplateId: "praxis-feature",
    targetUser: "Praxis builders",
    problem:
      "Feature notes can weaken existing Praxis program logic if implementation boundaries, safety rules, and scope are not explicit.",
    intendedOutcome: "ship safe Praxis features with clear implementation boundaries",
    corePrinciples: ["Preserve program logic", "Keep progression gating intact"],
    mustRemainTrue: [
      "Generated prompts must not weaken existing Praxis program logic",
      "MVP scope and expansion scope must remain separate",
      "Every component must map to a function",
      "Every function must map to an outcome",
    ],
    mvpBoundary: [
      "Capture raw feature idea",
      "Define Praxis logic boundary",
      "Validate readiness and safety",
      "Export Codex task",
    ],
    expansionIdeas: ["Template library for Praxis features", "Saved framework versions"],
    knownRisks: ["Generated prompts may accidentally weaken existing Praxis program logic"],
  });

const createEmptyShellBlueprint = (): ProjectBlueprint => {
  const project = createProject({
    name: "Empty Shell",
    rawIdea: "Create an empty shell blueprint.",
    corePhilosophy: "Framework template: Generic Framework.",
  });
  const intent = createIntent("Create a basic shell.");
  const outcome = createOutcome("Have a shell outcome");
  const blueprint = createEmptyBlueprint(project, intent, outcome);
  blueprint.validation = validateBlueprint(blueprint);
  return blueprint;
};

const issueCodes = (issues: BlueprintQualityIssue[]) => issues.map((issue) => issue.code);

describe("buildBlueprintQualityReview", () => {
  it("scores a high-quality guided Praxis Feature blueprint as strong or excellent", () => {
    const review = buildBlueprintQualityReview(createPraxisBlueprint());

    expect(["strong", "excellent"]).toContain(review.grade);
    expect(review.overallScore).toBeGreaterThanOrEqual(80);
    expect(review.templateFit.templateLabel).toBe("Praxis Feature");
    expect(review.templateFit.score).toBeGreaterThanOrEqual(90);
    expect(review.nextBestFix).toBeNull();
  });

  it("scores an empty shell blueprint as weak", () => {
    const review = buildBlueprintQualityReview(createEmptyShellBlueprint());

    expect(review.grade).toBe("weak");
    expect(review.overallScore).toBeLessThan(45);
    expect(review.nextBestFix?.code).toBe("VALIDATION_FAILURES");
  });

  it("detects generic invariant names", () => {
    const blueprint = createPraxisBlueprint();
    blueprint.invariants[0]!.name = "Must remain true 2";
    const review = buildBlueprintQualityReview(blueprint);

    expect(issueCodes(review.issues)).toContain("GENERIC_GOVERNANCE_NAMES");
  });

  it("detects MVP and expansion overlap", () => {
    const blueprint = createPraxisBlueprint();
    blueprint.expansionScope.items[0]!.name = blueprint.mvpScope.items[0]!.name;
    const review = buildBlueprintQualityReview(blueprint);

    expect(issueCodes(review.issues)).toContain("MVP_EXPANSION_OVERLAP");
    expect(review.nextBestFix?.code).toBe("MVP_EXPANSION_OVERLAP");
  });

  it("lowers export readiness when export items lack an export function or component", () => {
    const blueprint = composeBlueprintFromGuidedIntake({
      projectName: "Missing Export Surface",
      rawIdea: "Create a generic governed framework that eventually needs implementation exports.",
      frameworkType: "Generic Framework",
      frameworkTemplateId: "generic-framework",
      targetUser: "Builders",
      problem: "Implementation handoff is unclear.",
      intendedOutcome: "produce a usable handoff",
      corePrinciples: ["Keep handoff explicit"],
      mustRemainTrue: ["Every function must map to an outcome"],
      mvpBoundary: ["Capture raw idea", "Validate readiness and missing structure"],
      expansionIdeas: ["Reusable templates"],
      knownRisks: ["Export expectations may be hidden"],
    });
    const exportItem = createScopeItem("Export Codex Prompt");
    exportItem.description = "Export a useful implementation prompt.";
    exportItem.outcomeIds = [blueprint.outcomes[0]!.id];
    exportItem.functionIds = [blueprint.functions[0]!.id];
    exportItem.componentIds = [blueprint.components[0]!.id];
    blueprint.mvpScope.items = [...blueprint.mvpScope.items, exportItem];
    blueprint.functions.forEach((fn) => {
      if (/export|prompt|handoff|output|artifact/i.test(fn.name)) {
        fn.name = "Prepare implementation package";
      }
    });
    blueprint.components.forEach((component) => {
      if (/export|prompt|handoff|output|artifact/i.test(component.name)) {
        component.name = "Implementation Surface";
      }
    });
    blueprint.validation = validateBlueprint(blueprint);

    const review = buildBlueprintQualityReview(blueprint);

    expect(review.sectionScores.exportReadiness).toBeLessThan(100);
    expect(issueCodes(review.issues)).toContain("EXPORT_SURFACE_MISSING");
  });

  it("lowers template fit when the blueprint structure does not match the detected template", () => {
    const blueprint = composeBlueprintFromGuidedIntake({
      projectName: "Template Mismatch",
      rawIdea: "Create a software app for planning work.",
      frameworkType: "Software App",
      frameworkTemplateId: "software-app",
      targetUser: "Product teams",
      problem: "Work planning is scattered.",
      intendedOutcome: "plan work clearly",
      corePrinciples: ["Keep workflow explicit"],
      mustRemainTrue: ["Every function must map to an outcome"],
      mvpBoundary: [],
      expansionIdeas: [],
      knownRisks: [],
    });
    blueprint.project.corePhilosophy = "Framework template: Praxis Feature. Structure was manually changed.";

    const review = buildBlueprintQualityReview(blueprint);

    expect(review.templateFit.templateLabel).toBe("Praxis Feature");
    expect(review.templateFit.score).toBeLessThan(75);
    expect(issueCodes(review.issues)).toContain("TEMPLATE_FIT_WEAK");
  });

  it("chooses the highest-impact issue as next best fix", () => {
    const blueprint = createPraxisBlueprint();
    blueprint.invariants[0]!.name = "Must remain true 2";
    blueprint.expansionScope.items[0]!.name = blueprint.mvpScope.items[0]!.name;

    const review = buildBlueprintQualityReview(blueprint);

    expect(review.nextBestFix?.code).toBe("MVP_EXPANSION_OVERLAP");
  });
});
