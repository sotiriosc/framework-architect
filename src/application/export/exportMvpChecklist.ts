import type { ProjectBlueprint } from "@/domain/models";
import {
  checklist,
  createNameLookup,
  joinBlocks,
  renderFunction,
  renderPhase,
  renderScopeItem,
} from "@/application/export/exportHelpers";

export const exportMvpChecklist = (blueprint: ProjectBlueprint): string => {
  const lookup = createNameLookup(blueprint);
  const validationBlockers = blueprint.validation.checks.filter((check) => check.status === "fail");

  return `${joinBlocks([
    `# ${blueprint.project.name} MVP Checklist`,
    `## MVP Scope Items\n${checklist(blueprint.mvpScope.items, (item) => renderScopeItem(item, lookup))}`,
    `## Phases\n${checklist(blueprint.phases, (phase) => renderPhase(phase, lookup))}`,
    `## Required Functions\n${checklist(blueprint.functions, (fn) => renderFunction(fn, lookup))}`,
    `## Validation Blockers\n${checklist(
      validationBlockers,
      (check) => `${check.code}: ${check.message}${check.recommendation ? ` Recommendation: ${check.recommendation}` : ""}`,
      "- [x] No validation blockers.",
    )}`,
  ])}\n`;
};
