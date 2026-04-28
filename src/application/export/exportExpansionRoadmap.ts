import { buildExpansionRoadmap, type BlueprintExpansionPath } from "@/application/expansion/buildExpansionRoadmap";
import { joinBlocks } from "@/application/export/exportHelpers";
import type { ProjectBlueprint } from "@/domain/models";

const list = (items: string[], empty = "- None."): string =>
  items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : empty;

const renderPath = (path: BlueprintExpansionPath): string =>
  joinBlocks([
    `### ${path.title}`,
    `Category: ${path.category}`,
    `Source: ${path.sourceText}`,
    path.summary,
    joinBlocks([
      "#### Stages",
      path.stages
        .map((stage) =>
          joinBlocks([
            `- ${stage.sequence}. ${stage.title} (${stage.horizon}) - ${stage.description}`,
            `  Acceptance: ${stage.acceptanceCriteria.join(" ") || "None listed."}`,
            `  Dependencies: ${stage.dependencies.join(", ") || "None listed."}`,
            `  Risk controls: ${stage.riskControls.join(" ") || "None listed."}`,
          ]),
        )
        .join("\n"),
    ]),
    joinBlocks(["#### Prerequisites", list(path.prerequisites)]),
    joinBlocks(["#### Risks", list(path.risks)]),
    joinBlocks(["#### Not Yet Boundaries", list(path.notYet)]),
    joinBlocks(["#### Suggested Experiments", list(path.suggestedExperiments)]),
    joinBlocks(["#### Suggested Metrics", list(path.suggestedMetrics)]),
  ]);

export const exportExpansionRoadmap = (blueprint: ProjectBlueprint): string => {
  const roadmap = buildExpansionRoadmap(blueprint);

  return `${joinBlocks([
    `# ${blueprint.project.name}: Expansion Roadmap`,
    roadmap.summary,
    joinBlocks([
      "## Expansion Readiness",
      roadmap.expansionReadiness,
      roadmap.recommendedNextExpansion
        ? `Recommended next expansion: ${roadmap.recommendedNextExpansion.title}`
        : "Recommended next expansion: None.",
    ]),
    joinBlocks(["## Template Signals", list(roadmap.templateSignals)]),
    joinBlocks(["## Prerequisites", list(roadmap.prerequisites)]),
    joinBlocks(["## Risk Warnings", list(roadmap.riskWarnings)]),
    joinBlocks(["## Not Yet Boundaries", list(roadmap.notYet)]),
    joinBlocks([
      "## Paths",
      roadmap.paths.length > 0
        ? roadmap.paths.map(renderPath).join("\n\n")
        : "No expansion paths are available yet.",
    ]),
    roadmap.warnings.length > 0 ? joinBlocks(["## Warnings", list(roadmap.warnings)]) : "",
    joinBlocks([
      "## Trust Boundary",
      "Expansion Roadmap is a derived planning report. It does not change MVP scope, ProjectBlueprint truth, validation state, or revision history.",
    ]),
  ])}\n`;
};
