import type { AgentRunPacket } from "@/application/agent/agentRunTypes";
import {
  buildImplementationPlan,
  findImplementationPlanTask,
} from "@/application/planning/buildImplementationPlan";
import { joinBlocks } from "@/application/export/exportHelpers";
import type { ProjectBlueprint } from "@/domain/models";
import { createId, nowIso } from "@/lib/identity";

const bulletList = (items: string[], empty = "- None specified."): string =>
  items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : empty;

export const expectedAgentRunReportFormat = `Use this exact result report format:

Summary:
- One or two sentences describing what changed.

Changed files:
- path/to/file.ts - short reason

Tests run:
- command - pass/fail/not run and evidence

Acceptance criteria:
- criterion text - covered/not covered and evidence

Failures:
- any failing command, blocked item, or regression risk

Followups:
- any remaining work or explicit "None"`;

export const buildAgentRunPacket = (
  blueprint: ProjectBlueprint,
  taskId: string,
): AgentRunPacket | null => {
  const plan = buildImplementationPlan(blueprint);
  const task = findImplementationPlanTask(plan, taskId);

  if (!task) {
    return null;
  }

  const sourceTaskGroup = plan.taskGroups.find((group) =>
    group.tasks.some((candidate) => candidate.id === taskId),
  );
  const doNotBreak = plan.doNotBreak;
  const scope = joinBlocks([
    task.description,
    `Complete only this implementation task from the ${sourceTaskGroup?.title ?? "implementation"} group.`,
    "Do not broaden the task, rewrite unrelated systems, or invent new product features.",
  ]);
  const prompt = joinBlocks([
    `# Agent Run Packet: ${task.title}`,
    `Project: ${blueprint.project.name}`,
    "You are executing one bounded task from Framework Architect's local implementation plan.",
    "Do exactly one task. Keep edits narrowly scoped. Do not execute unrelated refactors or expand product scope.",
    `Goal:\n${task.description}`,
    `Scope:\n${scope}`,
    `Likely files:\n${bulletList(task.expectedFiles)}`,
    `Acceptance criteria:\n${bulletList(task.acceptanceCriteria)}`,
    `Tests to run:\n${bulletList(task.suggestedTests)}`,
    `Do not break:\n${bulletList(doNotBreak)}`,
    `Do not touch unless necessary:\n${bulletList(task.doNotTouch)}`,
    `Risk notes:\n${bulletList(task.riskNotes)}`,
    "When finished, summarize changed files and be honest about missing tests, failures, or followups.",
    expectedAgentRunReportFormat,
  ]);

  return {
    id: createId("agentpacket"),
    projectId: blueprint.project.id,
    projectName: blueprint.project.name,
    taskId: task.id,
    taskTitle: task.title,
    sourceTaskGroup: sourceTaskGroup?.title ?? "Implementation task",
    createdAt: nowIso(),
    goal: task.description,
    scope,
    likelyFiles: task.expectedFiles,
    acceptanceCriteria: task.acceptanceCriteria,
    suggestedTests: task.suggestedTests,
    doNotBreak,
    doNotTouch: task.doNotTouch,
    riskNotes: task.riskNotes,
    prompt,
    expectedReportFormat: expectedAgentRunReportFormat,
  };
};
