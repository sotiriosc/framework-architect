import { describe, expect, it } from "vitest";

import { exportCodexTaskPack } from "@/application/export/exportCodexTaskPack";
import { exportImplementationPlan } from "@/application/export/exportImplementationPlan";
import {
  composeBlueprintFromGuidedIntake,
  type GuidedIntakeInput,
} from "@/application/intake/composeBlueprintFromGuidedIntake";
import {
  buildImplementationPlan,
} from "@/application/planning/buildImplementationPlan";
import { BlueprintService } from "@/application/services/blueprintService";
import {
  getFrameworkTemplate,
  type FrameworkTemplateId,
} from "@/application/templates/frameworkTemplates";
import { validateBlueprint } from "@/application/validation/validateBlueprint";
import { createEmptyBlueprint, createIntent, createOutcome, createProject } from "@/domain/defaults";
import type { ProjectBlueprint } from "@/domain/models";
import { LocalProjectRepository } from "@/persistence/localProjectRepository";
import type { StorageLike } from "@/persistence/projectRepository";
import { ProjectBlueprintSchema } from "@/schema";

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

const createInputForTemplate = (templateId: FrameworkTemplateId): GuidedIntakeInput => {
  const template = getFrameworkTemplate(templateId);

  return {
    projectName: `${template.label} Implementation Blueprint`,
    rawIdea: `Create a local-first ${template.label.toLowerCase()} that turns a raw idea into governed implementation guidance, exports, and safe Codex task prompts.`,
    frameworkType: template.label,
    frameworkTemplateId: template.id,
    targetUser: `${template.label} operators`,
    problem: `${template.label} implementation becomes risky when scope, quality, governance, and tests are implicit.`,
    intendedOutcome: `produce an implementation-ready ${template.label.toLowerCase()} blueprint`,
    corePrinciples: ["Keep assumptions explicit", "Validate before implementation", "Preserve scope boundaries"],
    mustRemainTrue: [
      "Every function must map to an outcome",
      "Every component must map to a function",
      "MVP scope and expansion scope must remain separate",
    ],
    mvpBoundary: [
      template.suggestedMvpItems[0] ?? "Capture the core idea",
      template.suggestedMvpItems[1] ?? "Structure the first workflow",
      "Validate readiness",
      "Export implementation handoff",
    ],
    expansionIdeas: template.suggestedExpansionItems.slice(0, 4),
    knownRisks: template.suggestedFailureModes.slice(0, 3),
  };
};

const createPraxisInput = (): GuidedIntakeInput => ({
  ...createInputForTemplate("praxis-feature"),
  rawIdea:
    "Create a Praxis feature that turns rough training notes into governed Codex tasks while preserving program generation logic, progression logic, phase gating, validation, existing tests, safety, and coaching clarity.",
  targetUser: "Praxis builders",
  problem:
    "Feature ideas can accidentally weaken the Praxis generator when program logic, progression gates, and safety rules are implicit.",
  intendedOutcome: "ship safe Praxis features with clear implementation boundaries",
  mvpBoundary: [
    "Capture raw feature idea",
    "Define Praxis logic boundary",
    "Validate readiness and safety",
    "Export Codex task",
  ],
  expansionIdeas: [
    "Trainer marketplace",
    "Advanced AI automation",
    "Team collaboration",
  ],
});

const createEmptyShellBlueprint = (): ProjectBlueprint => {
  const project = createProject({
    name: "Implementation Empty Shell",
    rawIdea: "Create an empty shell blueprint.",
    corePhilosophy: "Framework template: Generic Framework.",
  });
  const intent = createIntent("Create a basic shell.");
  const outcome = createOutcome("Have a shell outcome");
  const blueprint = createEmptyBlueprint(project, intent, outcome);
  blueprint.validation = validateBlueprint(blueprint);
  return blueprint;
};

const planText = (blueprint: ProjectBlueprint): string => {
  const plan = buildImplementationPlan(blueprint);
  return [
    plan.planSummary,
    ...plan.doNotBreak,
    ...plan.taskGroups.map((group) => `${group.title} ${group.description}`),
    ...plan.codexTaskPack.map((item) => item.prompt),
  ].join(" ");
};

describe("buildImplementationPlan", () => {
  it("returns not-ready for an empty invalid blueprint", () => {
    const plan = buildImplementationPlan(createEmptyShellBlueprint());

    expect(plan.readiness).toBe("not-ready");
    expect(plan.planSummary).toContain("critical validation failures");
  });

  it("returns ready sequencing or Codex planning for a high-quality Praxis Feature blueprint", () => {
    const blueprint = composeBlueprintFromGuidedIntake(createPraxisInput());
    const plan = buildImplementationPlan(blueprint);

    expect(["ready-for-codex", "ready-for-sequencing"]).toContain(plan.readiness);
    expect(plan.taskGroups.length).toBeGreaterThan(0);
    expect(plan.codexTaskPack.length).toBe(plan.taskGroups.flatMap((group) => group.tasks).length);
  });

  it("includes Praxis do-not-break constraints for program generation, progression, and phase gating", () => {
    const blueprint = composeBlueprintFromGuidedIntake(createPraxisInput());
    const text = planText(blueprint);

    expect(text).toMatch(/program generation/i);
    expect(text).toMatch(/progression logic/i);
    expect(text).toMatch(/phase gating/i);
  });

  it("includes UI, workflow, data, and validation task groups for Software App blueprints", () => {
    const blueprint = composeBlueprintFromGuidedIntake(createInputForTemplate("software-app"));
    const text = planText(blueprint);

    expect(text).toMatch(/workflow/i);
    expect(text).toMatch(/\bUI\b|user interface/i);
    expect(text).toMatch(/data|persistence/i);
    expect(text).toMatch(/validation/i);
  });

  it("includes offer, customer, delivery, revenue, and risk groups for Business System blueprints", () => {
    const blueprint = composeBlueprintFromGuidedIntake(createInputForTemplate("business-system"));
    const text = planText(blueprint);

    expect(text).toMatch(/offer/i);
    expect(text).toMatch(/customer/i);
    expect(text).toMatch(/delivery/i);
    expect(text).toMatch(/revenue/i);
    expect(text).toMatch(/risk/i);
  });

  it("creates Codex prompts with scope, acceptance criteria, tests, and do-not-break rules", () => {
    const blueprint = composeBlueprintFromGuidedIntake(createPraxisInput());
    const prompt = buildImplementationPlan(blueprint).codexTaskPack[0]!.prompt;

    expect(prompt).toContain("Scope:");
    expect(prompt).toContain("Acceptance criteria:");
    expect(prompt).toContain("Tests to run:");
    expect(prompt).toContain("Do not break:");
    expect(prompt).toContain("Summarize changed files");
  });

  it("does not include deferred expansion items in MVP task groups", () => {
    const blueprint = composeBlueprintFromGuidedIntake(createPraxisInput());
    const plan = buildImplementationPlan(blueprint);
    const mvpTaskGroupText = plan.taskGroups
      .filter((group) => group.priority !== "defer" && group.phase !== "future")
      .map((group) => `${group.title} ${group.description} ${group.tasks.map((task) => task.title).join(" ")}`)
      .join(" ");

    expect(plan.deferredItems.map((item) => item.title)).toEqual(
      expect.arrayContaining(["Trainer marketplace", "Advanced AI automation"]),
    );
    expect(mvpTaskGroupText).not.toContain("Trainer marketplace");
    expect(mvpTaskGroupText).not.toContain("Advanced AI automation");
  });

  it("exports an implementation plan with task groups and acceptance checklist", () => {
    const blueprint = composeBlueprintFromGuidedIntake(createPraxisInput());
    const exported = exportImplementationPlan(blueprint);

    expect(exported).toContain("## Task Groups");
    expect(exported).toContain("## Final Acceptance Checklist");
    expect(exported).toContain("Acceptance:");
  });

  it("exports a Codex task pack with multiple prompts", () => {
    const blueprint = composeBlueprintFromGuidedIntake(createPraxisInput());
    const exported = exportCodexTaskPack(blueprint);

    expect(exported).toContain("## Task 1:");
    expect(exported).toContain("## Task 2:");
    expect(exported).toContain("Do not break:");
    expect(exported).toContain("Do not ask Codex to rewrite the whole app");
  });

  it("records selected implementation planner actions through stable save", () => {
    const service = new BlueprintService(new LocalProjectRepository(createTestStorage()));
    const created = service.createProjectFromGuidedIntake(createPraxisInput());
    const plan = buildImplementationPlan(created);
    const task = plan.taskGroups[0]!.tasks[0]!;
    const deferred = plan.deferredItems[0]!;

    const withDecision = service.addImplementationTaskAsDecision(created, task.id);
    const withExpansion = service.addImplementationDeferredItemToExpansion(withDecision, deferred.id);
    const revisions = service.listProjectRevisions(withExpansion.project.id);

    expect(ProjectBlueprintSchema.safeParse(withExpansion).success).toBe(true);
    expect(withExpansion.decisionLogic.records.some((record) => record.title.includes(task.title))).toBe(true);
    expect(withExpansion.expansionScope.items.some((item) => item.name === deferred.title)).toBe(true);
    expect(revisions).toHaveLength(3);
  });
});
