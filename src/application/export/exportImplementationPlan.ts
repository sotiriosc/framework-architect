import type { ProjectBlueprint } from "@/domain/models";
import { buildImplementationPlan } from "@/application/planning/buildImplementationPlan";
import { bulletList, joinBlocks } from "@/application/export/exportHelpers";

export const exportImplementationPlan = (blueprint: ProjectBlueprint): string => {
  const plan = buildImplementationPlan(blueprint);

  return `${joinBlocks([
    `# ${blueprint.project.name} Implementation Plan`,
    joinBlocks([
      "## Summary",
      `Readiness: ${plan.readiness}`,
      `Suggested branch: ${plan.suggestedBranchName}`,
      plan.planSummary,
    ]),
    `## Recommended Build Order\n${bulletList(plan.recommendedBuildOrder, (item) => item)}`,
    `## Task Groups\n${bulletList(
      plan.taskGroups,
      (group) =>
        `${group.title} (${group.phase}, ${group.priority}) - ${group.description}\n${bulletList(
          group.tasks,
          (task) =>
            `${task.title}: ${task.description} Acceptance: ${task.acceptanceCriteria.join(" ")} Tests: ${task.suggestedTests.join(" ")}`,
        )}`,
    )}`,
    `## Test Plan\n${bulletList(plan.testPlan, (item) => item)}`,
    `## Risk Controls\n${bulletList(plan.riskControls, (item) => item)}`,
    `## Dependency Warnings\n${bulletList(plan.dependencyWarnings, (item) => item)}`,
    `## Do Not Break\n${bulletList(plan.doNotBreak, (item) => item)}`,
    `## Deferred Items\n${bulletList(
      plan.deferredItems,
      (item) => `${item.title} (${item.source}) - ${item.description}`,
    )}`,
    `## Suggested Commit Plan\n${bulletList(plan.suggestedCommitPlan, (item) => item)}`,
    `## Final Acceptance Checklist\n${bulletList(plan.finalAcceptanceChecklist, (item) => `[ ] ${item}`)}`,
  ])}\n`;
};
