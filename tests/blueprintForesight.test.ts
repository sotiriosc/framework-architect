import { describe, expect, it } from "vitest";

import { exportMvpChecklist } from "@/application/export/exportMvpChecklist";
import {
  composeBlueprintFromGuidedIntake,
  type GuidedIntakeInput,
} from "@/application/intake/composeBlueprintFromGuidedIntake";
import { buildBlueprintForesight } from "@/application/review/buildBlueprintForesight";
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

const createService = () => new BlueprintService(new LocalProjectRepository(createTestStorage()));

const createInputForTemplate = (templateId: FrameworkTemplateId): GuidedIntakeInput => {
  const template = getFrameworkTemplate(templateId);

  return {
    projectName: `${template.label} Foresight Blueprint`,
    rawIdea: `Create a local-first ${template.label.toLowerCase()} that turns a raw idea into governed implementation guidance, exportable tasks, and a practical next-step roadmap.`,
    frameworkType: template.label,
    frameworkTemplateId: template.id,
    targetUser: `${template.label} operators`,
    problem: `${template.label} ideas are hard to implement when structure, risk, scope, and future opportunities are implicit.`,
    intendedOutcome: `produce a build-ready ${template.label.toLowerCase()} blueprint with a clear first implementation path`,
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
    "Create a Praxis feature that turns rough training notes into governed Codex tasks while preserving program generation logic, progression, phase gating, safety boundaries, and coaching trust.",
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
});

const createEmptyShellBlueprint = (): ProjectBlueprint => {
  const project = createProject({
    name: "Weak Foresight Shell",
    rawIdea: "Create an empty shell blueprint.",
    corePhilosophy: "Framework template: Generic Framework.",
  });
  const intent = createIntent("Create a basic shell.");
  const outcome = createOutcome("Have a shell outcome");
  const blueprint = createEmptyBlueprint(project, intent, outcome);
  blueprint.validation = validateBlueprint(blueprint);
  return blueprint;
};

const allForesightText = (blueprint: ProjectBlueprint): string => {
  const foresight = buildBlueprintForesight(blueprint);
  return [
    foresight.overallSummary,
    foresight.recommendedNextMove?.title ?? "",
    ...foresight.now,
    ...foresight.next,
    ...foresight.later,
    ...foresight.hiddenOpportunities,
    ...foresight.risksToWatch,
    ...foresight.notYet,
    ...foresight.suggestedExperiments,
    ...foresight.suggestedMetrics,
    ...foresight.suggestedTests,
    ...foresight.suggestedCodexTasks,
  ]
    .map((item) => (typeof item === "string" ? item : `${item.title} ${item.description} ${item.codexPromptSeed}`))
    .join(" ");
};

describe("buildBlueprintForesight", () => {
  it("suggests Praxis tests, do-not-break guidance, and an implementation boundary", () => {
    const blueprint = composeBlueprintFromGuidedIntake(createPraxisInput());
    const text = allForesightText(blueprint);

    expect(text).toMatch(/regression/i);
    expect(text).toMatch(/do-not-break|do not break/i);
    expect(text).toMatch(/implementation boundary|isolated implementation boundary|feature flag/i);
  });

  it("suggests onboarding, analytics, and persistence opportunities for Software App blueprints", () => {
    const blueprint = composeBlueprintFromGuidedIntake(createInputForTemplate("software-app"));
    const text = allForesightText(blueprint);

    expect(text).toMatch(/onboarding/i);
    expect(text).toMatch(/analytics|usage/i);
    expect(text).toMatch(/persistence/i);
  });

  it("suggests offer, customer, delivery, and revenue validation for Business System blueprints", () => {
    const blueprint = composeBlueprintFromGuidedIntake(createInputForTemplate("business-system"));
    const text = allForesightText(blueprint);

    expect(text).toMatch(/offer/i);
    expect(text).toMatch(/customer/i);
    expect(text).toMatch(/delivery/i);
    expect(text).toMatch(/revenue|pricing/i);
  });

  it("marks empty or weak blueprints as needing clarity", () => {
    const foresight = buildBlueprintForesight(createEmptyShellBlueprint());

    expect(foresight.strategicPosition).toBe("needs-clarity");
    expect(foresight.recommendedNextMove?.title).toBe("Repair clarity before expansion");
  });

  it("marks high-quality guided blueprints as ready for MVP or expansion foresight", () => {
    const blueprint = composeBlueprintFromGuidedIntake(createPraxisInput());
    const foresight = buildBlueprintForesight(blueprint);

    expect(["mvp-ready", "expansion-ready", "scale-ready"]).toContain(foresight.strategicPosition);
  });

  it("does not include later or not-yet items in the MVP checklist", () => {
    const service = createService();
    const created = service.createProjectFromGuidedIntake(createPraxisInput());
    const notYetItem = buildBlueprintForesight(created).notYet[0]!;
    const saved = service.addForesightItemToExpansion(created, notYetItem.id);
    const checklist = exportMvpChecklist(saved);

    expect(checklist).not.toContain(notYetItem.title);
    expect(checklist).toContain(saved.mvpScope.items[0]!.name);
  });

  it("adds a selected foresight item to expansion through the stable save path", () => {
    const service = createService();
    const created = service.createProjectFromGuidedIntake(createPraxisInput());
    const item = buildBlueprintForesight(created).hiddenOpportunities[0]!;

    const saved = service.addForesightItemToExpansion(created, item.id);
    const revisions = service.listProjectRevisions(saved.project.id);

    expect(ProjectBlueprintSchema.safeParse(saved).success).toBe(true);
    expect(saved.expansionScope.items.some((scopeItem) => scopeItem.name === item.title)).toBe(true);
    expect(saved.validation.buildReady).toBe(true);
    expect(revisions).toHaveLength(2);
    expect(revisions[0]?.reason).toBe(`Added foresight item to expansion: ${item.title}.`);
    expect(saved.memory.projectEntries).toHaveLength(2);
  });

  it("adds a selected foresight item as a decision record through the stable save path", () => {
    const service = createService();
    const created = service.createProjectFromGuidedIntake(createPraxisInput());
    const item = buildBlueprintForesight(created).risksToWatch[0]!;

    const saved = service.addForesightItemAsDecision(created, item.id);
    const revisions = service.listProjectRevisions(saved.project.id);

    expect(ProjectBlueprintSchema.safeParse(saved).success).toBe(true);
    expect(saved.decisionLogic.records.some((record) => record.title === `Foresight: ${item.title}`)).toBe(true);
    expect(saved.validation.buildReady).toBe(true);
    expect(revisions).toHaveLength(2);
    expect(revisions[0]?.reason).toBe(`Recorded foresight decision: ${item.title}.`);
    expect(saved.memory.decisionEntries).toHaveLength(2);
  });
});
