import { describe, expect, it } from "vitest";

import {
  composeBlueprintFromGuidedIntake,
  type GuidedIntakeInput,
} from "@/application/intake/composeBlueprintFromGuidedIntake";
import {
  getFrameworkTemplate,
  type FrameworkTemplateId,
} from "@/application/templates/frameworkTemplates";
import { exportCodexPrompt } from "@/application/export/exportCodexPrompt";
import { ProjectBlueprintSchema } from "@/schema";

const templateIdsToExercise: FrameworkTemplateId[] = [
  "praxis-feature",
  "software-app",
  "business-system",
  "coaching-system",
  "book-white-paper",
];

const createInputForTemplate = (templateId: FrameworkTemplateId): GuidedIntakeInput => {
  const template = getFrameworkTemplate(templateId);

  return {
    projectName: `${template.label} Test Blueprint`,
    rawIdea: `Create a local-first ${template.label.toLowerCase()} that turns a raw idea into governed implementation guidance.`,
    frameworkType: template.label,
    frameworkTemplateId: template.id,
    targetUser: `${template.label} operators`,
    problem: `${template.label} ideas are hard to implement when structure, scope, and governance are implicit.`,
    intendedOutcome: `produce a build-ready ${template.label.toLowerCase()} blueprint`,
    corePrinciples: ["Keep assumptions explicit", "Validate before implementation"],
    mustRemainTrue: [],
    mvpBoundary: [],
    expansionIdeas: [],
    knownRisks: [],
  };
};

describe("template-guided blueprint composition", () => {
  it.each(templateIdsToExercise)("creates a schema-valid, build-ready %s blueprint", (templateId) => {
    const template = getFrameworkTemplate(templateId);
    const blueprint = composeBlueprintFromGuidedIntake(createInputForTemplate(templateId));
    const domainNames = blueprint.domains.map((domain) => domain.name);
    const functionNames = blueprint.functions.map((fn) => fn.name);
    const componentNames = blueprint.components.map((component) => component.name);
    const mvpNames = new Set(blueprint.mvpScope.items.map((item) => item.name.trim().toLowerCase()));
    const overlappingExpansionItems = blueprint.expansionScope.items.filter((item) =>
      mvpNames.has(item.name.trim().toLowerCase()),
    );

    expect(ProjectBlueprintSchema.safeParse(blueprint).success).toBe(true);
    expect(blueprint.validation.buildReady).toBe(true);
    expect(domainNames).toEqual(expect.arrayContaining(template.suggestedDomains));
    expect(functionNames).toEqual(expect.arrayContaining(template.suggestedFunctions));
    expect(componentNames).toEqual(expect.arrayContaining(template.suggestedComponents));
    expect(overlappingExpansionItems).toHaveLength(0);
  });

  it.each(templateIdsToExercise)("exports a Codex prompt with %s template guidance", (templateId) => {
    const template = getFrameworkTemplate(templateId);
    const blueprint = composeBlueprintFromGuidedIntake(createInputForTemplate(templateId));
    const prompt = exportCodexPrompt(blueprint);

    expect(prompt).toContain(`Framework template: ${template.label}`);
    expect(prompt).toContain(template.promptGuidance);
  });

  it("emphasizes Praxis generator and progression safety in Codex prompts", () => {
    const blueprint = composeBlueprintFromGuidedIntake(createInputForTemplate("praxis-feature"));
    const prompt = exportCodexPrompt(blueprint);

    expect(prompt).toContain("existing Praxis program, generator, progression, phase gating");
    expect(prompt).toContain("Do not weaken program generation logic");
    expect(prompt).toContain("Do not bypass progression or phase gating");
  });
});
