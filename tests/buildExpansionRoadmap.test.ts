import { describe, expect, it } from "vitest";

import { buildExpansionRoadmap } from "@/application/expansion/buildExpansionRoadmap";
import { exportBlueprintMarkdown } from "@/application/export/exportBlueprintMarkdown";
import { exportExpansionRoadmap } from "@/application/export/exportExpansionRoadmap";
import {
  composeBlueprintFromGuidedIntake,
  type GuidedIntakeInput,
} from "@/application/intake/composeBlueprintFromGuidedIntake";
import { validateBlueprint } from "@/application/validation/validateBlueprint";
import { createEmptyBlueprint, createIntent, createOutcome, createProject } from "@/domain/defaults";

const createRoadmapInput = (expansionIdeas: string[]): GuidedIntakeInput => ({
  projectName: "Expansion Roadmap Blueprint",
  rawIdea:
    "Create a local-first architecture app that turns messy planning notes into governed blueprints, implementation tasks, and exportable handoffs.",
  frameworkType: "Software App",
  frameworkTemplateId: "software-app",
  targetUser: "Solo builders and small product teams",
  problem:
    "Future ideas can drift into implementation before the MVP is validated, scoped, and governed.",
  intendedOutcome: "produce a build-ready blueprint with clear MVP scope and staged future paths",
  corePrinciples: ["Keep MVP scope explicit", "Stage future work", "Preserve local-first trust"],
  mustRemainTrue: [
    "MVP scope and expansion scope must remain separate",
    "Future ideas must not bypass validation",
    "External reports must not become blueprint truth",
  ],
  mvpBoundary: [
    "Capture messy notes",
    "Compose governed blueprint",
    "Validate blueprint readiness",
    "Export implementation handoff",
  ],
  expansionIdeas,
  knownRisks: [
    "Future automation may bypass validation",
    "Users may confuse future roadmap with MVP scope",
  ],
});

const createBlueprint = (expansionIdeas: string[]) =>
  composeBlueprintFromGuidedIntake(createRoadmapInput(expansionIdeas));

const pathText = (blueprint = createBlueprint(["AI agent"])) => {
  const roadmap = buildExpansionRoadmap(blueprint);
  return [
    roadmap.summary,
    ...roadmap.paths.map((path) => [
      path.title,
      path.category,
      path.summary,
      ...path.stages.map((stage) => `${stage.title} ${stage.description}`),
      ...path.prerequisites,
      ...path.risks,
      ...path.notYet,
      ...path.suggestedExperiments,
      ...path.suggestedMetrics,
    ].join(" ")),
    ...roadmap.notYet,
    ...roadmap.warnings,
  ].join(" ");
};

describe("buildExpansionRoadmap", () => {
  it("turns an AI agent expansion idea into a governed staged path", () => {
    const blueprint = createBlueprint(["AI agent"]);
    const roadmap = buildExpansionRoadmap(blueprint);
    const aiPath = roadmap.paths.find((path) => path.category === "ai-agent");

    expect(aiPath).toBeTruthy();
    expect(aiPath?.title).toContain("Governed AI agent path");
    expect(aiPath?.stages.map((stage) => stage.title)).toEqual([
      "Agent planning harness",
      "Local verification bridge",
      "Confirmed write actions",
      "Governed semi-autonomous loop",
    ]);
    expect(roadmap.recommendedNextExpansion?.category).toBe("ai-agent");
  });

  it("keeps local verification and autonomous execution boundaries explicit for AI agent paths", () => {
    const text = pathText(createBlueprint(["AI agent"]));

    expect(text).toContain("Local verification bridge");
    expect(text).toContain("fully autonomous execution");
    expect(text).toContain("automatic merging");
    expect(text).toContain("bypassing validation/review");
  });

  it("turns cloud sync into a local-first cloud-sync path", () => {
    const blueprint = createBlueprint(["cloud sync"]);
    const roadmap = buildExpansionRoadmap(blueprint);
    const cloudPath = roadmap.paths.find((path) => path.category === "cloud-sync");

    expect(cloudPath?.stages.map((stage) => stage.title)).toEqual([
      "Stable local-first persistence",
      "Export/import backup",
      "Optional account sync",
      "Collaborative cloud workspace",
    ]);
    expect(roadmap.warnings.join(" ")).toMatch(/local-first/i);
    expect(cloudPath?.notYet.join(" ")).toContain("required accounts");
    expect(cloudPath?.notYet.join(" ")).toContain("silent cloud writes");
  });

  it("turns team collaboration into a collaboration path", () => {
    const blueprint = createBlueprint(["team collaboration"]);
    const roadmap = buildExpansionRoadmap(blueprint);
    const collaborationPath = roadmap.paths.find((path) => path.category === "collaboration");

    expect(collaborationPath?.stages.map((stage) => stage.title)).toEqual([
      "Single-user review clarity",
      "Shareable exported artifact",
      "Reviewer comments and decision capture",
      "Multi-user workflow and merge rules",
    ]);
  });

  it("returns not-ready or mvp-first when validation or MVP readiness is weak", () => {
    const project = createProject({
      name: "Weak Expansion Shell",
      rawIdea: "Create an empty shell with AI agent expansion later.",
      corePhilosophy: "Framework template: Generic Framework.",
    });
    const blueprint = createEmptyBlueprint(project, createIntent("Weak expansion shell"), createOutcome("Have a shell"));
    blueprint.validation = validateBlueprint(blueprint);

    const roadmap = buildExpansionRoadmap(blueprint);

    expect(["not-ready", "mvp-first"]).toContain(roadmap.expansionReadiness);
    expect(roadmap.warnings.join(" ")).toMatch(/validation|MVP/i);
  });

  it("exports roadmap stages, prerequisites, risks, and not-yet boundaries", () => {
    const blueprint = createBlueprint(["AI agent"]);
    const report = exportExpansionRoadmap(blueprint);

    expect(report).toContain("# Expansion Roadmap Blueprint: Expansion Roadmap");
    expect(report).toContain("## Paths");
    expect(report).toContain("#### Stages");
    expect(report).toContain("#### Prerequisites");
    expect(report).toContain("#### Risks");
    expect(report).toContain("#### Not Yet Boundaries");
    expect(report).toContain("Local verification bridge");
    expect(report).toContain("fully autonomous execution");
  });

  it("includes a concise expansion roadmap summary in the Markdown architecture brief", () => {
    const blueprint = createBlueprint(["AI agent"]);
    const markdown = exportBlueprintMarkdown(blueprint);

    expect(markdown).toContain("## Expansion Roadmap Summary");
    expect(markdown).toContain("Recommended next expansion:");
    expect(markdown).not.toContain("# Expansion Roadmap Blueprint: Expansion Roadmap");
    expect(markdown).not.toContain("#### Stages");
  });
});
