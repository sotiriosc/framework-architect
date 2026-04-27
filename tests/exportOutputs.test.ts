import { describe, expect, it } from "vitest";

import { exportBlueprintJson } from "@/application/export/exportBlueprintJson";
import { exportBlueprintMarkdown } from "@/application/export/exportBlueprintMarkdown";
import { exportCodexTaskPack } from "@/application/export/exportCodexTaskPack";
import { exportCodexPrompt } from "@/application/export/exportCodexPrompt";
import { exportImplementationPlan } from "@/application/export/exportImplementationPlan";
import { exportMvpChecklist } from "@/application/export/exportMvpChecklist";
import {
  composeBlueprintFromGuidedIntake,
  type GuidedIntakeInput,
} from "@/application/intake/composeBlueprintFromGuidedIntake";
import { ProjectBlueprintSchema } from "@/schema";
import { createSeedBlueprint } from "@/seed/exampleBlueprint";

const praxisGuidedInput: GuidedIntakeInput = {
  projectName: "Praxis Feature Framework",
  rawIdea:
    "Create a governed local-first blueprint builder for Praxis feature ideas that can export useful implementation tasks.",
  frameworkType: "Praxis Feature",
  frameworkTemplateId: "praxis-feature",
  targetUser: "Praxis builders",
  problem:
    "Praxis feature ideas arrive as raw notes, then lose assumptions, constraints, scope boundaries, and implementation guardrails.",
  intendedOutcome: "turn feature ideas into build-ready governed implementation briefs",
  corePrinciples: [
    "Preserve existing program logic",
    "Make scope boundaries explicit",
    "Export only after validation",
  ],
  mustRemainTrue: [
    "Generated prompts must not weaken existing Praxis program logic",
    "MVP scope and expansion scope must remain separate",
    "Every component must map to a function",
    "Every function must map to an outcome",
  ],
  mvpBoundary: [
    "Capture raw feature idea",
    "Generate connected framework structure",
    "Validate readiness and missing structure",
    "Export Markdown architecture brief",
    "Export Codex Prompt",
    "Export JSON blueprint",
    "Export MVP Checklist",
  ],
  expansionIdeas: [
    "Template library for Praxis features",
    "AI-assisted extraction from long notes",
    "Saved framework versions",
    "Comparison between framework revisions",
    "One-click Codex task generation",
    "Team review and collaboration",
  ],
  knownRisks: [
    "Generated prompts may accidentally weaken existing Praxis program logic",
    "Expansion ideas may get pulled into the MVP",
  ],
};

describe("blueprint exports", () => {
  it("exports a markdown architecture brief with key sections", () => {
    const blueprint = createSeedBlueprint();
    const markdown = exportBlueprintMarkdown(blueprint);

    expect(markdown).toContain(`# ${blueprint.project.name}`);
    expect(markdown).toContain("## Project");
    expect(markdown).toContain("## Intent");
    expect(markdown).toContain("## Outcomes");
    expect(markdown).toContain("## Actors");
    expect(markdown).toContain("## Domains");
    expect(markdown).toContain("## Functions");
    expect(markdown).toContain("## Components");
    expect(markdown).toContain("## Rules");
    expect(markdown).toContain("## Invariants");
    expect(markdown).toContain("## MVP Scope");
    expect(markdown).toContain("## Decision Records");
    expect(markdown).toContain("## Validation Summary");
    expect(markdown).toContain("## Quality Review");
    expect(markdown).toContain("## Foresight Summary");
    expect(markdown).toContain("## Implementation Plan Summary");
  });

  it("exports a Codex prompt with governance and MVP scope", () => {
    const blueprint = createSeedBlueprint();
    const prompt = exportCodexPrompt(blueprint);

    expect(prompt).toContain(`Implement ${blueprint.project.name}.`);
    expect(prompt).toContain("## Do Not Modify / Do Not Break");
    expect(prompt).toContain(blueprint.rules[0]?.name);
    expect(prompt).toContain(blueprint.invariants[0]?.name);
    expect(prompt).toContain("## MVP Scope (Build Now)");
    expect(prompt).toContain(blueprint.mvpScope.items[0]?.name);
    expect(prompt).toContain("## Recommended First Implementation Task");
    expect(prompt).toContain("## Recommended Future Work / Do Not Build Yet");
    expect(prompt).toContain("Do not bypass governance constraints");
  });

  it("keeps MVP and expansion items distinct in the Codex prompt", () => {
    const blueprint = composeBlueprintFromGuidedIntake(praxisGuidedInput);
    const prompt = exportCodexPrompt(blueprint);
    const expansionSection = prompt.split("## Expansion Scope (Do Not Build Now)")[1]?.split("## Do Not Modify")[0] ?? "";

    expect(expansionSection).toContain("Template library for Praxis features");
    expect(expansionSection).toContain("AI-assisted extraction from long notes");
    expect(expansionSection).not.toContain("Capture raw feature idea");
    expect(expansionSection).not.toContain("Generate connected framework structure");
    expect(expansionSection).not.toContain("Export JSON blueprint");
  });

  it("exports formatted JSON that parses back into a valid blueprint", () => {
    const blueprint = createSeedBlueprint();
    const exported = exportBlueprintJson(blueprint);
    const parsed = JSON.parse(exported) as unknown;

    expect(ProjectBlueprintSchema.safeParse(parsed).success).toBe(true);
  });

  it("exports an MVP checklist with MVP items", () => {
    const blueprint = createSeedBlueprint();
    const checklist = exportMvpChecklist(blueprint);

    expect(checklist).toContain(`# ${blueprint.project.name} MVP Checklist`);
    expect(checklist).toContain("## MVP Scope Items");
    expect(checklist).toContain(blueprint.mvpScope.items[0]?.name);
    expect(checklist).toContain("## Phases");
    expect(checklist).toContain("## Required Functions");
    expect(checklist).toContain("## Validation Blockers");
  });

  it("exports an MVP checklist with relevant function and component references", () => {
    const blueprint = composeBlueprintFromGuidedIntake(praxisGuidedInput);
    const checklist = exportMvpChecklist(blueprint);

    expect(checklist).toContain("Capture raw feature idea");
    expect(checklist).toContain("Capture feature intent");
    expect(checklist).toContain("Feature Intake");
    expect(checklist).toContain("Generate connected framework structure");
    expect(checklist).toContain("Define implementation boundary");
    expect(checklist).toContain("Praxis Logic Boundary");
    expect(checklist).toContain("Validate readiness and missing structure");
    expect(checklist).toContain("Validate readiness");
    expect(checklist).toContain("Safety Review Panel");
    expect(checklist).toContain("Export JSON blueprint");
    expect(checklist).toContain("Export Codex task");
    expect(checklist).toContain("Codex Task Export");
  });

  it("exports implementation plan and Codex task pack artifacts", () => {
    const blueprint = composeBlueprintFromGuidedIntake(praxisGuidedInput);
    const implementationPlan = exportImplementationPlan(blueprint);
    const taskPack = exportCodexTaskPack(blueprint);

    expect(implementationPlan).toContain("## Task Groups");
    expect(implementationPlan).toContain("## Final Acceptance Checklist");
    expect(implementationPlan).toContain("Agent Run Harness workflow");
    expect(implementationPlan).toContain("does not execute or verify code directly");
    expect(taskPack).toContain("## Task 1:");
    expect(taskPack).toContain("## Expected Result Report Format");
    expect(taskPack).toContain("Do not break:");
    expect(taskPack).toContain("Acceptance criteria:");
  });

  it("includes Codex quality warnings only when relevant", () => {
    const strongBlueprint = composeBlueprintFromGuidedIntake(praxisGuidedInput);
    const strongPrompt = exportCodexPrompt(strongBlueprint);
    const weakBlueprint = composeBlueprintFromGuidedIntake(praxisGuidedInput);
    weakBlueprint.expansionScope.items[0]!.name = weakBlueprint.mvpScope.items[0]!.name;
    const weakPrompt = exportCodexPrompt(weakBlueprint);

    expect(strongPrompt).not.toContain("## Quality Warnings");
    expect(weakPrompt).toContain("## Quality Warnings");
    expect(weakPrompt).toContain("MVP and expansion overlap");
  });

  it("includes an improvement plan in markdown when quality is not excellent", () => {
    const weakBlueprint = composeBlueprintFromGuidedIntake(praxisGuidedInput);
    weakBlueprint.invariants[0]!.name = "Must remain true 2";
    const markdown = exportBlueprintMarkdown(weakBlueprint);

    expect(markdown).toContain("## Improvement Plan");
    expect(markdown).toContain("Recommended first action");
  });

  it("includes unresolved manual quality warnings in Codex prompts when relevant", () => {
    const weakBlueprint = composeBlueprintFromGuidedIntake(praxisGuidedInput);
    const sharedFunctionId = weakBlueprint.functions[0]!.id;
    const sharedComponentId = weakBlueprint.components[0]!.id;
    weakBlueprint.mvpScope.items.forEach((item) => {
      item.functionIds = [sharedFunctionId];
      item.componentIds = [sharedComponentId];
    });
    const prompt = exportCodexPrompt(weakBlueprint);

    expect(prompt).toContain("## Manual Quality Warnings");
    expect(prompt).toContain("Review repetitive MVP mappings");
  });
});
