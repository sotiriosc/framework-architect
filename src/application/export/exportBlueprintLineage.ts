import {
  buildBlueprintLineage,
  type BuildBlueprintLineageInput,
  type BlueprintLineage,
  type BlueprintLineageFruitItem,
  type BlueprintLineageNourishmentItem,
} from "@/application/lineage/buildBlueprintLineage";
import { joinBlocks } from "@/application/export/exportHelpers";

const list = <T>(items: T[], render: (item: T) => string, empty = "- None."): string =>
  items.length > 0 ? items.map((item) => `- ${render(item)}`).join("\n") : empty;

const renderOptionalDate = (createdAt?: string): string => createdAt ? ` Created: ${createdAt}.` : "";

const renderNourishment = (item: BlueprintLineageNourishmentItem): string =>
  `${item.title} [${item.kind}] - ${item.description} Source: ${item.source}.${renderOptionalDate(item.createdAt)}`;

const renderFruit = (item: BlueprintLineageFruitItem): string =>
  `${item.title} [${item.kind}, ${item.trustLevel}] - ${item.description} Produced from: ${item.producedFrom}.`;

export const renderBlueprintLineageReport = (lineage: BlueprintLineage): string =>
  `${joinBlocks([
    "# Blueprint Lineage Report",
    lineage.summary,
    joinBlocks([
      "## Seed",
      `Source kind: ${lineage.seed.sourceKind}`,
      `Source label: ${lineage.seed.sourceLabel}`,
      `Created: ${lineage.seed.createdAt ?? "Unknown"}`,
      `Raw idea: ${lineage.seed.rawIdea}`,
    ]),
    joinBlocks([
      "## Orientation",
      `Template: ${lineage.orientation.templateLabel} (${lineage.orientation.templateId})`,
      `Core philosophy: ${lineage.orientation.corePhilosophy || "Not specified."}`,
      `Invariant priorities: ${lineage.orientation.invariantPriorities.join(", ") || "None"}`,
    ]),
    `## Nourishment\n${list(lineage.nourishment, renderNourishment)}`,
    `## Fruit\n${list(lineage.fruit, renderFruit)}`,
    `## Blueprint Truth\n${lineage.blueprintTruthSummary}`,
    `## External Evidence\n${lineage.externalEvidenceSummary}`,
    `## Trust Boundaries\n${list(lineage.trustBoundaries, (item) => item)}`,
    `## Warnings\n${list(lineage.warnings, (item) => item)}`,
  ])}\n`;

export const exportBlueprintLineage = (input: BuildBlueprintLineageInput): string =>
  renderBlueprintLineageReport(buildBlueprintLineage(input));
