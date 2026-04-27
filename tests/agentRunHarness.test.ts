import { describe, expect, it } from "vitest";

import { buildAgentRunPacket } from "@/application/agent/buildAgentRunPacket";
import type { AgentRunPacket } from "@/application/agent/agentRunTypes";
import { parseAgentRunResult } from "@/application/agent/parseAgentRunResult";
import { reviewAgentRunResult } from "@/application/agent/reviewAgentRunResult";
import {
  composeBlueprintFromGuidedIntake,
  type GuidedIntakeInput,
} from "@/application/intake/composeBlueprintFromGuidedIntake";
import { buildImplementationPlan } from "@/application/planning/buildImplementationPlan";
import { BlueprintService } from "@/application/services/blueprintService";
import { LocalAgentRunJournalRepository } from "@/persistence/agentRunJournalRepository";
import { LocalProjectRepository } from "@/persistence/localProjectRepository";
import type { StorageLike } from "@/persistence/projectRepository";

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

const createPraxisInput = (): GuidedIntakeInput => ({
  projectName: "Praxis Agent Harness",
  rawIdea:
    "Create a Praxis feature that turns implementation plans into bounded agent run packets while preserving program generation, progression logic, phase gating, validation, tests, and user trust.",
  frameworkType: "Praxis Feature",
  frameworkTemplateId: "praxis-feature",
  targetUser: "Praxis builders",
  problem:
    "Codex task prompts can drift when execution reports do not clearly cover acceptance criteria, tests, and do-not-break constraints.",
  intendedOutcome: "run safe external Codex tasks with reviewable reports",
  corePrinciples: ["Keep execution bounded", "Review evidence before accepting", "Preserve Praxis trust"],
  mustRemainTrue: [
    "Do not break program generation logic",
    "Do not bypass progression logic or phase gating",
    "Every agent result must be reviewed from evidence",
  ],
  mvpBoundary: [
    "Generate agent run packet",
    "Copy bounded task prompt",
    "Paste external result report",
    "Review acceptance criteria and tests",
  ],
  expansionIdeas: ["Direct GitHub issue creation", "Team review workflow", "Agent result comparison"],
  knownRisks: ["Agent broadens scope", "Tests are not reported", "Do-not-break constraints are ignored"],
});

const createPacket = (): AgentRunPacket => {
  const blueprint = composeBlueprintFromGuidedIntake(createPraxisInput());
  const task = buildImplementationPlan(blueprint).taskGroups[0]!.tasks[0]!;
  const packet = buildAgentRunPacket(blueprint, task.id);

  if (!packet) {
    throw new Error("Expected packet.");
  }

  return packet;
};

describe("Agent Run Harness", () => {
  it("builds a bounded packet for a known implementation task", () => {
    const packet = createPacket();

    expect(packet.taskTitle).toBeTruthy();
    expect(packet.acceptanceCriteria.length).toBeGreaterThan(0);
    expect(packet.suggestedTests.length).toBeGreaterThan(0);
    expect(packet.doNotBreak.join(" ")).toMatch(/program generation|progression|phase gating/i);
  });

  it("includes one-task scope, criteria, tests, do-not-break constraints, and report format in the prompt", () => {
    const prompt = createPacket().prompt;

    expect(prompt).toContain("Do exactly one task");
    expect(prompt).toContain("Acceptance criteria:");
    expect(prompt).toContain("Tests to run:");
    expect(prompt).toContain("Do not break:");
    expect(prompt).toContain("Use this exact result report format");
    expect(prompt).toContain("Changed files:");
  });

  it("parses changed files and tests from a Codex-style result report", () => {
    const result = parseAgentRunResult(`Summary:
- Added the harness packet UI and parser.

Changed files:
- src/application/agent/buildAgentRunPacket.ts - created packet builder
- src/ui/components/AgentRunHarnessPanel.tsx - added UI

Tests run:
- npm run build - passed
- npm run test - passed

Failures:
- None

Followups:
- None`);

    expect(result.changedFiles).toEqual(
      expect.arrayContaining([
        "src/application/agent/buildAgentRunPacket.ts",
        "src/ui/components/AgentRunHarnessPanel.tsx",
      ]),
    );
    expect(result.testsRun).toEqual(expect.arrayContaining(["npm run build - passed", "npm run test - passed"]));
    expect(result.reportedFailures).toEqual([]);
  });

  it("marks missing tests as unclear", () => {
    const packet = createPacket();
    const result = parseAgentRunResult(`Summary:
- Completed the task.

Changed files:
- src/application/agent/buildAgentRunPacket.ts

Acceptance criteria:
- ${packet.acceptanceCriteria[0]}`);
    const review = reviewAgentRunResult(packet, result);

    expect(review.overall).toBe("unclear");
    expect(review.missingSuggestedTests.length).toBeGreaterThan(0);
  });

  it("marks missing acceptance criteria as needs-followup", () => {
    const packet = createPacket();
    const result = parseAgentRunResult(`Summary:
- Completed some of the task.

Changed files:
- src/application/agent/buildAgentRunPacket.ts

Tests run:
${packet.suggestedTests.map((test) => `- ${test} - passed`).join("\n")}

Acceptance criteria:
- Only unrelated implementation notes were reported.`);
    const review = reviewAgentRunResult(packet, result);

    expect(review.overall).toBe("needs-followup");
    expect(review.missingAcceptanceCriteria.length).toBeGreaterThan(0);
  });

  it("flags unexpected touched files when packet has specific likely files", () => {
    const packet: AgentRunPacket = {
      ...createPacket(),
      likelyFiles: ["src/application/agent/buildAgentRunPacket.ts"],
      suggestedTests: ["npm run test"],
      acceptanceCriteria: ["Packet builder returns a bounded prompt"],
    };
    const result = parseAgentRunResult(`Summary:
- Implemented packet builder.

Changed files:
- src/application/agent/buildAgentRunPacket.ts
- src/unrelated/globalRewrite.ts

Tests run:
- npm run test - passed

Acceptance criteria:
- Packet builder returns a bounded prompt - covered`);
    const review = reviewAgentRunResult(packet, result);

    expect(review.touchedUnexpectedFiles).toContain("src/unrelated/globalRewrite.ts");
    expect(review.overall).toBe("needs-followup");
  });

  it("stores and lists journal entries per project", () => {
    const repository = new LocalAgentRunJournalRepository(createTestStorage());
    const packet = createPacket();

    repository.append({
      id: "journal_one",
      projectId: "project_one",
      packetId: packet.id,
      taskId: packet.taskId,
      createdAt: "2026-01-01T00:00:00.000Z",
      status: "packet-created",
      packetSnapshot: { ...packet, projectId: "project_one" },
      notes: "Created packet.",
    });
    repository.append({
      id: "journal_two",
      projectId: "project_two",
      packetId: "packet_two",
      taskId: packet.taskId,
      createdAt: "2026-01-02T00:00:00.000Z",
      status: "packet-created",
      packetSnapshot: { ...packet, id: "packet_two", projectId: "project_two" },
      notes: "Created packet.",
    });

    expect(repository.list("project_one")).toHaveLength(1);
    expect(repository.list(null)).toHaveLength(2);
  });

  it("lets BlueprintService create packets and review pasted results without changing revisions", () => {
    const storage = createTestStorage();
    const service = new BlueprintService(
      new LocalProjectRepository(storage),
      new LocalAgentRunJournalRepository(storage),
    );
    const blueprint = service.createProjectFromGuidedIntake(createPraxisInput());
    const task = buildImplementationPlan(blueprint).taskGroups[0]!.tasks[0]!;
    const packetEntry = service.createAgentRunPacket(blueprint, task.id);
    const reviewedEntry = service.reviewAgentRunResult(
      blueprint.project.id,
      packetEntry.packetId,
      `Summary:
- Completed the bounded task.

Changed files:
- src/application/agent/buildAgentRunPacket.ts

Tests run:
- ${packetEntry.packetSnapshot.suggestedTests[0]} - passed

Acceptance criteria:
- ${packetEntry.packetSnapshot.acceptanceCriteria[0]} - covered

Failures:
- None

Followups:
- None`,
    );

    expect(service.listAgentRunJournal(blueprint.project.id)).toHaveLength(1);
    expect(reviewedEntry.review).toBeDefined();
    expect(service.listProjectRevisions(blueprint.project.id)).toHaveLength(1);
  });
});
