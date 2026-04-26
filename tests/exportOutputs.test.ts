import { describe, expect, it } from "vitest";

import { exportBlueprintJson } from "@/application/export/exportBlueprintJson";
import { exportBlueprintMarkdown } from "@/application/export/exportBlueprintMarkdown";
import { exportCodexPrompt } from "@/application/export/exportCodexPrompt";
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
});
