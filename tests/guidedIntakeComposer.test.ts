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

const praxisGuidedInput: GuidedIntakeInput = {
  projectName: "Praxis Feature Framework",
  rawIdea:
    "Create a governed local-first blueprint builder for Praxis feature ideas that can export useful implementation tasks.",
  frameworkType: "feature architecture framework",
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

  it("creates expansion scope items from guided expansion ideas instead of MVP items", () => {
    const blueprint = composeBlueprintFromGuidedIntake(praxisGuidedInput);
    const expansionNames = blueprint.expansionScope.items.map((item) => item.name).join("\n");

    praxisGuidedInput.expansionIdeas.forEach((idea) => {
      expect(expansionNames).toContain(idea);
    });
    praxisGuidedInput.mvpBoundary.forEach((mvpItem) => {
      expect(expansionNames).not.toContain(mvpItem);
    });
  });

  it("maps MVP items to the most relevant functions and components", () => {
    const blueprint = composeBlueprintFromGuidedIntake(praxisGuidedInput);
    const functionNamesById = new Map(blueprint.functions.map((fn) => [fn.id, fn.name]));
    const componentNamesById = new Map(blueprint.components.map((component) => [component.id, component.name]));
    const expectScopeReferences = (label: string, functionName: string, componentName: string) => {
      const scopeItem = blueprint.mvpScope.items.find((item) => item.name.includes(label));

      expect(scopeItem).toBeDefined();
      expect(scopeItem?.functionIds.map((id) => functionNamesById.get(id))).toContain(functionName);
      expect(scopeItem?.componentIds.map((id) => componentNamesById.get(id))).toContain(componentName);
    };

    expectScopeReferences("Capture raw feature idea", "Clarify intake assumptions", "Guided Intake Workspace");
    expectScopeReferences(
      "Generate connected framework structure",
      "Compose governed framework blueprint",
      "Blueprint Composer",
    );
    expectScopeReferences(
      "Validate readiness and missing structure",
      "Review readiness and governance",
      "Readiness Review Surface",
    );
    expectScopeReferences("Export Markdown architecture brief", "Export implementation artifacts", "Export Panel");
    expectScopeReferences("Export Codex Prompt", "Export implementation artifacts", "Export Panel");
    expectScopeReferences("Export JSON blueprint", "Export implementation artifacts", "Export Panel");
    expectScopeReferences("Export MVP Checklist", "Export implementation artifacts", "Export Panel");
  });

  it("derives meaningful invariant names from guided invariant text", () => {
    const blueprint = composeBlueprintFromGuidedIntake(praxisGuidedInput);
    const invariantNames = blueprint.invariants.map((invariant) => invariant.name);

    expect(invariantNames).toEqual(
      expect.arrayContaining([
        "Preserve Praxis Program Logic",
        "Separate MVP and Expansion",
        "Components Map to Functions",
        "Functions Map to Outcomes",
      ]),
    );
    expect(invariantNames.some((name) => /^Must remain true/i.test(name))).toBe(false);
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
