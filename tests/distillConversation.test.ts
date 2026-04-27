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

const praxisV1SmokeFixture = `
Raw idea: Build a Praxis Feature workflow in Framework Architect that turns messy conversation notes into a governed blueprint, implementation plan, Codex task pack, and one bounded Agent Run Packet.
Target user: Praxis builders and feature implementers.
Problem: Praxis feature ideas can move too quickly into implementation, weakening program generation, progression, phase-gating, validation, and user trust.
Intended outcome: Create a build-ready Praxis Feature blueprint that preserves intent, separates MVP from expansion, and reviews pasted Codex results only from reported evidence.

Core principles:
- Preserve intent before implementation
- Structure before code
- Validate before build-ready
- Separate MVP from expansion
- Do not bypass existing app invariants
- Keep coaching clarity and user trust
- Use Codex only through bounded tasks

Must remain true:
- Generated prompts must not weaken existing Praxis program generation logic
- Do not bypass progression logic
- Do not bypass phase gating
- Do not modify generator, progression, repair, or phase-gating logic unless explicitly scoped
- MVP scope and expansion scope must remain separate
- Every implementation task must include acceptance criteria and tests
- Agent Run Harness must not pretend to verify code directly
- Pasted Codex results must be reviewed only from reported evidence

MVP boundary:
- Import conversation or notes
- Distill the thread into editable intake fields
- Create a Praxis Feature blueprint
- Validate structural completeness
- Review quality and apply safe fixes
- Generate foresight suggestions
- Create implementation plan
- Generate Codex Task Pack
- Generate one Agent Run Packet for one implementation task
- Paste a fake Codex result
- Review whether the report satisfies acceptance criteria
- Store the result in the execution journal
- Export Markdown, Codex Prompt, Implementation Plan, Codex Task Pack, JSON, and MVP Checklist

Expansion ideas:
- Direct ChatGPT integration
- Browser extension for sending selected chat text into Framework Architect
- GitHub PR review integration
- Actual code/test verification through a local CLI bridge
- Team collaboration
- Cloud sync
- Reusable Praxis feature template library
- One-click Codex handoff
- Agent result comparison across multiple runs

Known risks:
- Codex may say tests passed when they were not actually run
- A pasted report may say not covered or not run and the harness could accidentally count it as evidence
- The blueprint may become too generic
- The user might confuse quality review with validation
- The app might imply it executes Codex when it only prepares packets
- The MVP checklist might accidentally include future expansion items
- Agent journal entries could be confused with blueprint truth or revisions
- Too many panels could overwhelm the user

Hidden opportunities:
- The app can become a governance harness around AI-assisted development
- Chat can remain the discovery layer while Framework Architect becomes the crystallization layer
- The system can preserve the seed of an idea and show how the thread becomes structure
- The Agent Run Harness can prevent reckless autonomous execution by requiring bounded scope, evidence, and review
- Praxis can use this to build features more safely
`;

const praxisProseFixture = `
The idea is a Praxis Feature workflow that turns rough chat notes into a governed blueprint and task packet.
The target user is an independent builder working on Praxis features. The user needs to preserve intent before implementation.
The problem is that feature ideas often start as scattered conversation and drift into implementation.
The intended outcome is that I can move from rough idea to validated Praxis feature plan with a bounded Codex task and reviewed result report.

MVP boundary:
- Import conversation or notes
- MVP: The intended outcome is that I can move from rough idea to a build-ready blueprint
- Generate one Agent Run Packet for one implementation task
- Store the result in the execution journal

Known risks:
- The target user is an independent builder working on Praxis features.
- The problem is that feature ideas often start as scattered conversation and drift into implementation.
- Codex may say tests passed when they were not actually run.
- The app might imply it executes Codex when it only prepares packets.

Hidden opportunities:
- The app can become a governance harness around AI-assisted development.
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

  it("distills the V1 Praxis smoke fixture into the main guided intake buckets", () => {
    const result = distillConversationToIntake(createDraft(praxisV1SmokeFixture, "Praxis V1 Smoke Fixture"));

    expect(result.intake.suggestedTemplateId).toBe("praxis-feature");
    expect(result.intake.targetUserCandidate).toContain("Praxis builders");
    expect(result.intake.problemCandidate).toMatch(/weakening program generation/i);
    expect(result.intake.mustRemainTrue.join(" ")).toMatch(/phase gating/i);
    expect(result.intake.mustRemainTrue.join(" ")).toMatch(/reviewed only from reported evidence/i);
    expect(result.intake.mvpBoundary.join(" ")).toMatch(/Generate Codex Task Pack/i);
    expect(result.intake.mvpBoundary.join(" ")).toMatch(/Generate one Agent Run Packet/i);
    expect(result.intake.expansionIdeas.join(" ")).toMatch(/GitHub PR review integration/i);
    expect(result.intake.knownRisks.join(" ")).toMatch(/not covered or not run/i);
    expect(result.intake.hiddenOpportunities.join(" ")).toMatch(/governance harness/i);
    expect(result.warnings).toEqual([]);
  });

  it("extracts prose cues without leaking context into MVP or risk buckets", () => {
    const result = distillConversationToIntake(createDraft(praxisProseFixture, "Praxis Prose Fixture"));

    expect(result.intake.rawIdeaCandidate).toMatch(/^Praxis Feature workflow/i);
    expect(result.intake.targetUserCandidate).toBe("Independent builder working on Praxis features");
    expect(result.intake.targetUserCandidate).not.toMatch(/The user needs/i);
    expect(result.intake.problemCandidate).toMatch(/^Feature ideas often start/i);
    expect(result.intake.problemCandidate).not.toMatch(/^that/i);
    expect(result.intake.intendedOutcomeCandidate).toMatch(/^Move from rough idea/i);
    expect(result.intake.intendedOutcomeCandidate).not.toMatch(/^that I can/i);
    expect(result.intake.mvpBoundary).toEqual(
      expect.arrayContaining([
        "Import conversation or notes",
        "Generate one Agent Run Packet for one implementation task",
        "Store the result in the execution journal",
      ]),
    );
    expect(result.intake.mvpBoundary.join(" ")).not.toMatch(/The intended outcome is/i);
    expect(result.intake.knownRisks.join(" ")).not.toMatch(/The target user is/i);
    expect(result.intake.knownRisks.join(" ")).not.toMatch(/The problem is/i);
    expect(result.intake.knownRisks.join(" ")).toMatch(/tests passed when they were not actually run/i);
    expect(result.intake.hiddenOpportunities.join(" ")).toMatch(/governance harness/i);
    expect(result.warnings).not.toContain("No target user, client, audience, or customer was confidently found.");
  });
});
