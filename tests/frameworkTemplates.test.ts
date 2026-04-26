import { describe, expect, it } from "vitest";

import {
  frameworkTemplates,
  inferFrameworkTemplateId,
  resolveFrameworkTemplate,
  type FrameworkTemplateDefinition,
} from "@/application/templates/frameworkTemplates";

const requiredListFields: Array<keyof FrameworkTemplateDefinition> = [
  "suggestedDomains",
  "suggestedFunctions",
  "suggestedComponents",
  "suggestedRules",
  "suggestedInvariants",
  "suggestedGuardrails",
  "suggestedPhases",
  "suggestedMvpItems",
  "suggestedExpansionItems",
  "suggestedFailureModes",
];

describe("frameworkTemplates", () => {
  it("defines every supported template with usable generation hints", () => {
    expect(frameworkTemplates.map((template) => template.id)).toEqual([
      "software-app",
      "praxis-feature",
      "business-system",
      "coaching-system",
      "content-brand-framework",
      "book-white-paper",
      "sop-workflow",
      "generic-framework",
    ]);

    frameworkTemplates.forEach((template) => {
      expect(template.label).toBeTruthy();
      expect(template.description).toBeTruthy();
      expect(template.promptGuidance).toBeTruthy();
      requiredListFields.forEach((field) => {
        expect(template[field].length).toBeGreaterThan(0);
      });
    });
  });

  it.each([
    ["Praxis feature for safer program logic", "praxis-feature"],
    ["SaaS app for workflow planning", "software-app"],
    ["coaching system for training clients", "coaching-system"],
    ["business offer and sales operations", "business-system"],
    ["content brand media framework", "content-brand-framework"],
    ["book white paper essay outline", "book-white-paper"],
    ["SOP workflow process checklist", "sop-workflow"],
    ["custom decision framework", "generic-framework"],
  ] as const)("infers %s as %s", (input, expectedTemplateId) => {
    expect(inferFrameworkTemplateId(input)).toBe(expectedTemplateId);
  });

  it("resolves custom text to the closest local template", () => {
    expect(resolveFrameworkTemplate("training clients with adaptive feedback").label).toBe("Coaching System");
    expect(resolveFrameworkTemplate("long-form essay with evidence and sections").label).toBe("Book / White Paper");
  });
});
