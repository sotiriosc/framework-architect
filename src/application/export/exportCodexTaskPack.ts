import type { ProjectBlueprint } from "@/domain/models";
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
