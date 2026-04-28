import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AgentRunJournalEntry } from "@/application/agent/agentRunTypes";
import type {
  ConversationImportDraft,
  DistilledConversationIntake,
} from "@/application/import/conversationImportTypes";
import { distillConversationToIntake } from "@/application/import/distillConversation";
import {
  composeBlueprintFromGuidedIntake,
  type GuidedIntakeInput,
} from "@/application/intake/composeBlueprintFromGuidedIntake";
import { buildImplementationPlan, listImplementationPlanTasks } from "@/application/planning/buildImplementationPlan";
import { getFrameworkTemplate } from "@/application/templates/frameworkTemplates";
import {
  BlueprintCommandCenter,
  buildBlueprintCommandCenterModel,
} from "@/ui/components/BlueprintCommandCenter";
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

const buildFixtureBlueprint = (fixture: (typeof templateSmokeFixtures)[number]) => {
  const result = distillConversationToIntake(createDraft(fixture.text, fixture.title));
  return composeBlueprintFromGuidedIntake(toGuidedInput(result.intake));
};

const fakeJournalEntry = (blueprint: ReturnType<typeof buildFixtureBlueprint>): AgentRunJournalEntry => {
  const plan = buildImplementationPlan(blueprint);
  const task = listImplementationPlanTasks(plan)[0];

  if (!task) {
    throw new Error("Expected fixture blueprint to produce at least one implementation task.");
  }

  return {
    id: "journal-1",
    projectId: blueprint.project.id,
    packetId: "packet-1",
    taskId: task.id,
    createdAt: "2026-04-27T01:00:00.000Z",
    status: "reviewed",
    notes: "Reviewed pasted report.",
    packetSnapshot: {
      id: "packet-1",
      projectId: blueprint.project.id,
      projectName: blueprint.project.name,
      taskId: task.id,
      taskTitle: task.title,
      sourceTaskGroup: plan.taskGroups[0]?.title ?? "Implementation task",
      createdAt: "2026-04-27T00:30:00.000Z",
      goal: task.title,
      scope: task.description,
      likelyFiles: task.expectedFiles,
      acceptanceCriteria: task.acceptanceCriteria,
      suggestedTests: task.suggestedTests,
      doNotBreak: plan.doNotBreak,
      doNotTouch: task.doNotTouch,
      riskNotes: task.riskNotes,
      prompt: task.codexPrompt,
      expectedReportFormat: "Changed files, tests run, acceptance coverage, failures, followups.",
    },
  };
};

describe("blueprint command center", () => {
  it.each(templateSmokeFixtures)(
    "summarizes readiness and actions for $expectedTemplateId",
    (fixture) => {
      const blueprint = buildFixtureBlueprint(fixture);
      const template = getFrameworkTemplate(fixture.expectedTemplateId);
      const model = buildBlueprintCommandCenterModel({ blueprint });
      const actionIds = model.primaryActions.map((action) => action.id);

      expect(model.templateLabel).toBe(template.label);
      expect(model.buildReadyLabel).toBe("Build-ready");
      expect(model.implementationReadiness).not.toBe("not-ready");
      expect(model.firstImplementationTaskId).toBeTruthy();
      expect(model.exportReadiness).toContain("Markdown");
      expect(model.primaryActions.length).toBeGreaterThanOrEqual(4);
      expect(model.primaryActions.length).toBeLessThanOrEqual(5);
      expect(actionIds).toContain("view-implementation-plan");
      expect(actionIds).toContain("generate-agent-run-packet");
      expect(actionIds).toContain("export-codex-task-pack");
      expect(actionIds).toContain("export-markdown-brief");
    },
  );

  it("summarizes agent journal status without treating reports as blueprint truth", () => {
    const blueprint = buildFixtureBlueprint(templateSmokeFixtures[0]);
    const journalEntry = fakeJournalEntry(blueprint);
    const model = buildBlueprintCommandCenterModel({
      blueprint,
      agentRunJournal: [journalEntry],
    });

    expect(model.agentHarnessStatus).toContain("1 journal entry");
    expect(model.agentHarnessStatus).toContain("Reviewed");
    expect(model.recommendedNextMoveTitle).not.toContain("truth");
  });

  it("renders the guided surface before detailed panels", () => {
    const blueprint = buildFixtureBlueprint(templateSmokeFixtures[0]);
    const markup = renderToStaticMarkup(
      <BlueprintCommandCenter
        blueprint={blueprint}
        onApplySafeFixes={() => undefined}
        onCreateAgentRunPacket={() => null}
      />,
    );

    expect(markup).toContain("Blueprint command center");
    expect(markup).toContain("Recommended next move");
    expect(markup).toContain("First task");
    expect(markup).toContain("Export Codex Task Pack");
    expect(markup).toContain("Journal reports stay outside blueprint truth.");
  });
});
