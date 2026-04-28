import { describe, expect, it } from "vitest";

import { exportBlueprintLineage } from "@/application/export/exportBlueprintLineage";
import { exportBlueprintMarkdown } from "@/application/export/exportBlueprintMarkdown";
import { exportCodexPrompt } from "@/application/export/exportCodexPrompt";
import { exportCodexTaskPack } from "@/application/export/exportCodexTaskPack";
import { exportMvpChecklist } from "@/application/export/exportMvpChecklist";
import { distillConversationToIntake } from "@/application/import/distillConversation";
import type {
  ConversationImportDraft,
  DistilledConversationIntake,
} from "@/application/import/conversationImportTypes";
import {
  composeBlueprintFromGuidedIntake,
  type GuidedIntakeInput,
} from "@/application/intake/composeBlueprintFromGuidedIntake";
import { isActionableMvpItem } from "@/application/intake/intakeTextFilters";
import { buildBlueprintLineage } from "@/application/lineage/buildBlueprintLineage";
import { buildImplementationPlan } from "@/application/planning/buildImplementationPlan";
import { buildBlueprintQualityReview } from "@/application/review/buildBlueprintQualityReview";
import { getFrameworkTemplate } from "@/application/templates/frameworkTemplates";
import { ProjectBlueprintSchema } from "@/schema";
import { templateSmokeFixtures } from "./fixtures/templateSmokeFixtures";

const createDraft = (rawText: string, title: string): ConversationImportDraft => ({
  title,
  sourceType: "notes",
  rawText,
  optionalSourceLabel: "template smoke fixture",
  createdAt: "2026-04-27T00:00:00.000Z",
});

const toGuidedInput = (intake: DistilledConversationIntake): GuidedIntakeInput => ({
  rawIdea: intake.rawIdeaCandidate,
  projectName: intake.projectNameCandidate,
  frameworkType: getFrameworkTemplate(intake.suggestedTemplateId).label,
  frameworkTemplateId: intake.suggestedTemplateId,
  targetUser: intake.targetUserCandidate,
  problem: intake.problemCandidate,
  intendedOutcome: intake.intendedOutcomeCandidate,
  corePrinciples: intake.corePrinciples,
  mustRemainTrue: intake.mustRemainTrue,
  mvpBoundary: intake.mvpBoundary,
  expansionIdeas: [...intake.expansionIdeas, ...intake.hiddenOpportunities.map((item) => `Opportunity: ${item}`)],
  knownRisks: intake.knownRisks,
});

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const hasNoOverlap = (left: string[], right: string[]): boolean => {
  const normalizedRight = new Set(right.map(normalize));
  return left.every((item) => !normalizedRight.has(normalize(item)));
};

const expectTextIncludesAll = (actual: string, expectedTerms: string[]) => {
  expectedTerms.forEach((term) => {
    expect(actual).toContain(term);
  });
};

const expectTextIncludesAllLoose = (actual: string, expectedTerms: string[]) => {
  const normalizedActual = normalize(actual);
  expectedTerms.forEach((term) => {
    expect(normalizedActual).toContain(normalize(term));
  });
};

const buildFixtureBlueprint = (fixture: (typeof templateSmokeFixtures)[number]) => {
  const result = distillConversationToIntake(createDraft(fixture.text, fixture.title));
  return composeBlueprintFromGuidedIntake(toGuidedInput(result.intake));
};

describe("multi-template smoke fixtures", () => {
  it.each(templateSmokeFixtures)(
    "distills $expectedTemplateId fixture into complete guided intake",
    (fixture) => {
      const result = distillConversationToIntake(createDraft(fixture.text, fixture.title));

      expect(result.intake.suggestedTemplateId).toBe(fixture.expectedTemplateId);
      expect(result.intake.rawIdeaCandidate.length).toBeGreaterThan(20);
      expect(result.intake.targetUserCandidate.length).toBeGreaterThan(8);
      expect(result.intake.problemCandidate.length).toBeGreaterThan(20);
      expect(result.intake.intendedOutcomeCandidate.length).toBeGreaterThan(20);
      expect(result.intake.mvpBoundary.length).toBeGreaterThanOrEqual(4);
      expect(result.intake.mvpBoundary.every(isActionableMvpItem)).toBe(true);
      expect(result.intake.expansionIdeas.length).toBeGreaterThanOrEqual(3);
      expect(hasNoOverlap(result.intake.mvpBoundary, result.intake.expansionIdeas)).toBe(true);
      expect(
        result.intake.knownRisks.every(
          (risk) => !/^(?:target user|problem|intended outcome|goal|outcome)\b/i.test(risk),
        ),
      ).toBe(true);
      expect(result.intake.hiddenOpportunities.join(" ")).toContain(fixture.expectedHiddenOpportunityTerm);
    },
  );

  it.each(templateSmokeFixtures)(
    "composes a valid $expectedTemplateId blueprint with expected structure and lineage",
    (fixture) => {
      const blueprint = buildFixtureBlueprint(fixture);
      const quality = buildBlueprintQualityReview(blueprint);
      const lineage = buildBlueprintLineage({ blueprint });

      expect(ProjectBlueprintSchema.safeParse(blueprint).success).toBe(true);
      expect(blueprint.validation.buildReady).toBe(true);
      expect(quality.grade).not.toBe("weak");
      expectTextIncludesAll(
        blueprint.domains.map((domain) => domain.name).join("\n"),
        fixture.expectedDomainTerms,
      );
      expectTextIncludesAll(
        blueprint.functions.map((fn) => fn.name).join("\n"),
        fixture.expectedFunctionTerms,
      );
      expectTextIncludesAll(
        blueprint.components.map((component) => component.name).join("\n"),
        fixture.expectedComponentTerms,
      );
      expect(hasNoOverlap(
        blueprint.mvpScope.items.map((item) => item.name),
        blueprint.expansionScope.items.map((item) => item.name),
      )).toBe(true);
      expect(lineage.orientation.templateId).toBe(fixture.expectedTemplateId);
    },
  );

  it.each(templateSmokeFixtures)(
    "exports complete artifacts for $expectedTemplateId fixture",
    (fixture) => {
      const blueprint = buildFixtureBlueprint(fixture);
      const template = getFrameworkTemplate(fixture.expectedTemplateId);
      const markdown = exportBlueprintMarkdown(blueprint);
      const codexPrompt = exportCodexPrompt(blueprint);
      const implementationPlan = buildImplementationPlan(blueprint);
      const taskPack = exportCodexTaskPack(blueprint);
      const checklist = exportMvpChecklist(blueprint);
      const lineageReport = exportBlueprintLineage({ blueprint });

      expect(markdown).toContain(`Framework template: ${template.label}`);
      expect(codexPrompt).toContain(fixture.expectedCodexEmphasis);
      expect(implementationPlan.readiness).not.toBe("not-ready");
      expect(taskPack).toContain("## Expected Result Report Format");
      expect(taskPack).toContain("Use this exact result report format");
      fixture.expectedExpansionTerms.forEach((term) => {
        expect(checklist).not.toContain(term);
      });
      expect(lineageReport).toContain("## Seed");
      expect(lineageReport).toContain("## Orientation");
      expect(lineageReport).toContain("## Nourishment");
      expect(lineageReport).toContain("## Fruit");
      expect(lineageReport).toContain("## Trust Boundaries");
    },
  );

  it.each(templateSmokeFixtures)(
    "keeps $expectedTemplateId exports free of obvious awkward generator phrases",
    (fixture) => {
      const blueprint = buildFixtureBlueprint(fixture);
      const combinedOutput = [
        exportBlueprintMarkdown(blueprint),
        exportCodexPrompt(blueprint),
        exportCodexTaskPack(blueprint),
        exportMvpChecklist(blueprint),
        exportBlueprintLineage({ blueprint }),
      ].join("\n");

      [
        "Belongs in the first buildable version",
        "generated from this guided intake",
        "Known guided risk",
        "reach that I can",
      ].forEach((phrase) => {
        expect(combinedOutput).not.toContain(phrase);
      });
    },
  );

  it.each(templateSmokeFixtures)(
    "keeps $expectedTemplateId MVP checklist concise and action-oriented",
    (fixture) => {
      const blueprint = buildFixtureBlueprint(fixture);
      const checklistLines = exportMvpChecklist(blueprint)
        .split("\n")
        .filter((line) => line.startsWith("- [ ] MVP:"));

      expect(checklistLines.length).toBeGreaterThanOrEqual(4);
      checklistLines.forEach((line) => {
        expect(line.length).toBeLessThanOrEqual(240);
        expect(line).toMatch(/^- \[ \] MVP: (Capture|Distill|Build|Save|Validate|Export|Define|Identify|Map|Clarify|Create|Review|Assess|Track|Adjust|Draft|Prepare|Collect|Assign|Add|Record|Structure)\b/);
        expect(line).not.toContain(`${fixture.title}:`);
      });
    },
  );

  it.each(templateSmokeFixtures)(
    "uses expected $expectedTemplateId implementation plan groups",
    (fixture) => {
      const blueprint = buildFixtureBlueprint(fixture);
      const implementationPlan = buildImplementationPlan(blueprint);
      const groupTitles = implementationPlan.taskGroups.map((group) => group.title).join("\n");

      expectTextIncludesAllLoose(groupTitles, fixture.expectedPlanGroupTerms);
    },
  );

  it.each(templateSmokeFixtures)(
    "keeps $expectedTemplateId Codex prompt template-specific without Praxis-only constraints",
    (fixture) => {
      const blueprint = buildFixtureBlueprint(fixture);
      const codexPrompt = exportCodexPrompt(blueprint);

      expect(codexPrompt).toContain(fixture.expectedCodexEmphasis);
      expect(codexPrompt).not.toMatch(/Praxis program generation|phase gating|progression logic/i);
    },
  );

  it.each(templateSmokeFixtures)(
    "reports $expectedTemplateId lineage orientation clearly",
    (fixture) => {
      const blueprint = buildFixtureBlueprint(fixture);
      const template = getFrameworkTemplate(fixture.expectedTemplateId);
      const lineageReport = exportBlueprintLineage({ blueprint });

      expect(lineageReport).toContain(`Template: ${template.label} (${fixture.expectedTemplateId})`);
    },
  );
});
