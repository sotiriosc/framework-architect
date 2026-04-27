import type { ProjectBlueprint } from "@/domain/models";
import { expectedAgentRunReportFormat } from "@/application/agent/buildAgentRunPacket";
import { buildImplementationPlan } from "@/application/planning/buildImplementationPlan";
import { joinBlocks } from "@/application/export/exportHelpers";

export const exportCodexTaskPack = (blueprint: ProjectBlueprint): string => {
  const plan = buildImplementationPlan(blueprint);

  return `${joinBlocks([
    `# ${blueprint.project.name} Codex Task Pack`,
    joinBlocks([
      "## Pack Summary",
      `Readiness: ${plan.readiness}`,
      `Suggested branch: ${plan.suggestedBranchName}`,
      plan.planSummary,
      "Use one task prompt at a time. Do not ask Codex to rewrite the whole app.",
      "When using the Agent Run Harness, paste the result back using the expected report format so the app can review coverage honestly.",
    ]),
    joinBlocks([
      "## Expected Result Report Format",
      expectedAgentRunReportFormat,
    ]),
    ...plan.codexTaskPack.map((item, index) =>
      joinBlocks([
        `## Task ${index + 1}: ${item.title}`,
        item.prompt,
      ]),
    ),
    joinBlocks([
      "## Final Acceptance Checklist",
      plan.finalAcceptanceChecklist.map((item) => `- [ ] ${item}`).join("\n"),
    ]),
  ])}\n`;
};
