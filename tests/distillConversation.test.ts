import { describe, expect, it } from "vitest";

import {
  distillConversationToIntake,
} from "@/application/import/distillConversation";
import type {
  ConversationImportDraft,
  DistilledConversationIntake,
} from "@/application/import/conversationImportTypes";
import type { GuidedIntakeInput } from "@/application/intake/composeBlueprintFromGuidedIntake";
import { BlueprintService } from "@/application/services/blueprintService";
import { getFrameworkTemplate } from "@/application/templates/frameworkTemplates";
import { LocalProjectRepository } from "@/persistence/localProjectRepository";
import type { StorageLike } from "@/persistence/projectRepository";
import { ProjectBlueprintSchema } from "@/schema";

const createDraft = (rawText: string, title = "Praxis Conversation Import"): ConversationImportDraft => ({
  title,
  sourceType: "chat-transcript",
  rawText,
  optionalSourceLabel: "test transcript",
  createdAt: "2026-04-26T00:00:00.000Z",
});

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

const praxisTranscript = `
User: Raw idea: Build a Praxis feature that turns rough training notes into a governed implementation task pack.
Assistant: Target user: Praxis builders who need safe feature specs.
User: Problem: Feature ideas drift into implementation and can weaken existing Praxis program logic.
User: Goal: Create a build-ready feature blueprint with validation, task prompts, and reviewable boundaries.

Principles:
- The blueprint should keep assumptions explicit.
- We must preserve coaching clarity and user trust.

Must remain true:
- Generated prompts must not weaken existing Praxis program generation logic.
- Do not break progression logic or phase gating.

MVP:
- MVP: Capture raw feature idea.
- First build: Generate connected framework structure.
- Must include exportable Codex task prompts.

Future:
- Later add saved versions.
- Not yet team collaboration.

Risks:
- Risk: expansion ideas drift into MVP.
- Concern: Codex could break existing tests.

Implementation:
- Add regression tests and a bounded Codex task pack.
`;

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
  expansionIdeas: [...intake.expansionIdeas, ...intake.hiddenOpportunities],
  knownRisks: intake.knownRisks,
});

describe("conversation distillation", () => {
  it("distills a chat-like transcript into guided intake candidates", () => {
    const result = distillConversationToIntake(createDraft(praxisTranscript));

    expect(result.intake.projectNameCandidate).toBe("Praxis Conversation Import");
    expect(result.intake.rawIdeaCandidate).toContain("Build a Praxis feature");
    expect(result.intake.targetUserCandidate).toContain("Praxis builders");
    expect(result.intake.problemCandidate).toContain("Feature ideas drift");
    expect(result.intake.intendedOutcomeCandidate).toContain("build-ready feature blueprint");
    expect(result.signals.length).toBeGreaterThan(8);
  });

  it("extracts principles from must, should, and principle lines", () => {
    const result = distillConversationToIntake(createDraft(praxisTranscript));

    expect(result.intake.corePrinciples.join(" ")).toMatch(/assumptions explicit/i);
    expect(result.intake.corePrinciples.join(" ")).toMatch(/coaching clarity|user trust/i);
  });

  it("extracts risks from risk, break, drift, failure, or concern language", () => {
    const result = distillConversationToIntake(createDraft(praxisTranscript));

    expect(result.intake.knownRisks.join(" ")).toMatch(/drift into MVP/i);
    expect(result.intake.knownRisks.join(" ")).toMatch(/break existing tests/i);
  });

  it("extracts MVP items from MVP, first build, now, and must include lines", () => {
    const result = distillConversationToIntake(createDraft(praxisTranscript));

    expect(result.intake.mvpBoundary.join(" ")).toMatch(/Capture raw feature idea/i);
    expect(result.intake.mvpBoundary.join(" ")).toMatch(/Generate connected framework structure/i);
    expect(result.intake.mvpBoundary.join(" ")).toMatch(/exportable Codex task prompts/i);
  });

  it("extracts expansion items from later, future, eventually, and not-yet lines", () => {
    const result = distillConversationToIntake(createDraft(praxisTranscript));

    expect(result.intake.expansionIdeas.join(" ")).toMatch(/saved versions/i);
    expect(result.intake.expansionIdeas.join(" ")).toMatch(/team collaboration/i);
  });

  it("infers Praxis Feature and Business System templates from imported text", () => {
    const praxis = distillConversationToIntake(createDraft(praxisTranscript));
    const business = distillConversationToIntake(
      createDraft(
        "Offer: a premium onboarding service. Customer: small agencies. Revenue: recurring retainer. Problem: delivery is inconsistent. MVP: define offer, customer, delivery process, and pricing risks.",
        "Business Import",
      ),
    );

    expect(praxis.intake.suggestedTemplateId).toBe("praxis-feature");
    expect(business.intake.suggestedTemplateId).toBe("business-system");
  });

  it("keeps low-confidence warnings when key fields are missing", () => {
    const result = distillConversationToIntake(createDraft("Tiny note: maybe build something useful.", "Tiny"));

    expect(result.confidence).toBe("low");
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Raw text is short"),
        expect.stringContaining("No target user"),
        expect.stringContaining("No MVP"),
        expect.stringContaining("No must-remain-true"),
      ]),
    );
  });

  it("creates a valid blueprint from distilled intake through the service path", () => {
    const service = new BlueprintService(new LocalProjectRepository(createTestStorage()));
    const result = distillConversationToIntake(createDraft(praxisTranscript));

    const created = service.createProjectFromGuidedIntake(toGuidedInput(result.intake), {
      conversationImport: {
        sourceType: result.draft.sourceType,
        optionalSourceLabel: result.draft.optionalSourceLabel,
        title: result.draft.title,
      },
    });

    expect(ProjectBlueprintSchema.safeParse(created).success).toBe(true);
    expect(created.validation.buildReady).toBe(true);
    expect(created.memory.projectEntries.some((entry) => entry.tags.includes("conversation-import"))).toBe(true);
    expect(service.listProjectRevisions(created.project.id)).toHaveLength(1);
  });
});
