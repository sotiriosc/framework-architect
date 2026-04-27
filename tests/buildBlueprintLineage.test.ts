import { describe, expect, it } from "vitest";

import { exportBlueprintLineage } from "@/application/export/exportBlueprintLineage";
import { exportBlueprintMarkdown } from "@/application/export/exportBlueprintMarkdown";
import {
  composeBlueprintFromGuidedIntake,
  type GuidedIntakeInput,
} from "@/application/intake/composeBlueprintFromGuidedIntake";
import { buildBlueprintLineage } from "@/application/lineage/buildBlueprintLineage";
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

const praxisInput: GuidedIntakeInput = {
  projectName: "Praxis Source Lineage",
  rawIdea:
    "Create a Praxis feature that shows where a blueprint came from, what shaped it, and which outputs were produced.",
  frameworkType: "Praxis Feature",
  frameworkTemplateId: "praxis-feature",
  targetUser: "Praxis builders",
  problem:
    "Blueprints can become strong enough to implement before users understand their seed, template, journal evidence, and export boundary.",
  intendedOutcome: "understand blueprint provenance before implementation",
  corePrinciples: ["Keep provenance transparent", "Separate truth from evidence"],
  mustRemainTrue: [
    "Do not weaken program generation logic",
    "Do not bypass progression logic or phase gating",
    "Agent reports must not become blueprint truth",
  ],
  mvpBoundary: [
    "Show source lineage",
    "Show seed provenance",
    "Export lineage report",
    "Review agent journal evidence",
  ],
  expansionIdeas: ["Compare lineage across revisions", "Export lineage graph"],
  knownRisks: ["Agent reports may be confused with verified code", "Exports may be confused with saved truth"],
};

const createService = () => {
  const storage = createTestStorage();
  return new BlueprintService(
    new LocalProjectRepository(storage),
    new LocalAgentRunJournalRepository(storage),
  );
};

describe("buildBlueprintLineage", () => {
  it("marks conversation-imported blueprint lineage as conversation-import", () => {
    const service = createService();
    const blueprint = service.createProjectFromGuidedIntake(praxisInput, {
      conversationImport: {
        sourceType: "notes",
        optionalSourceLabel: "Praxis planning notes",
        title: "Praxis lineage discussion",
      },
    });
    const lineage = buildBlueprintLineage({
      blueprint,
      revisions: service.listProjectRevisions(blueprint.project.id),
      agentRunJournal: service.listAgentRunJournal(blueprint.project.id),
    });

    expect(lineage.seed.sourceKind).toBe("conversation-import");
    expect(lineage.nourishment.some((item) => item.kind === "conversation-signal")).toBe(true);
  });

  it("marks a raw idea blueprint lineage as raw-idea", () => {
    const service = createService();
    const blueprint = service.createProject({
      name: "Raw Provenance",
      rawIdea: "Create a local-first provenance layer for project ideas and exports.",
    });
    const lineage = buildBlueprintLineage({
      blueprint,
      revisions: service.listProjectRevisions(blueprint.project.id),
      agentRunJournal: [],
    });

    expect(lineage.seed.sourceKind).toBe("raw-idea");
  });

  it("identifies template orientation", () => {
    const blueprint = composeBlueprintFromGuidedIntake(praxisInput);
    const lineage = buildBlueprintLineage({ blueprint });

    expect(lineage.orientation.templateId).toBe("praxis-feature");
    expect(lineage.orientation.templateLabel).toBe("Praxis Feature");
  });

  it("keeps agent run journal entries as external evidence and fruit, not blueprint truth", () => {
    const service = createService();
    const blueprint = service.createProjectFromGuidedIntake(praxisInput);
    const task = buildImplementationPlan(blueprint).taskGroups[0]!.tasks[0]!;
    const packetEntry = service.createAgentRunPacket(blueprint, task.id);
    service.reviewAgentRunResult(
      blueprint.project.id,
      packetEntry.packetId,
      `Summary:
- Completed the bounded lineage task from the packet.

Changed files:
- src/application/lineage/buildBlueprintLineage.ts - added derived lineage projection

Tests run:
- ${packetEntry.packetSnapshot.suggestedTests[0]} - passed

Acceptance criteria:
- ${packetEntry.packetSnapshot.acceptanceCriteria[0]} - covered

Failures:
- None

Followups:
- None`,
    );

    const lineage = buildBlueprintLineage({
      blueprint,
      revisions: service.listProjectRevisions(blueprint.project.id),
      agentRunJournal: service.listAgentRunJournal(blueprint.project.id),
    });
    const resultReview = lineage.fruit.find((item) => item.kind === "agent-result-review");

    expect(resultReview?.trustLevel).toBe("external-report");
    expect(lineage.fruit.filter((item) => item.trustLevel === "blueprint-truth").map((item) => item.kind)).toEqual([
      "blueprint",
    ]);
    expect(lineage.externalEvidenceSummary).toContain("supporting evidence, not blueprint truth");
    expect(lineage.blueprintTruthSummary).not.toContain("Agent Run Journal");
  });

  it("exports a lineage report with seed, orientation, nourishment, fruit, and trust boundaries", () => {
    const blueprint = composeBlueprintFromGuidedIntake(praxisInput);
    const report = exportBlueprintLineage({ blueprint });

    expect(report).toContain("## Seed");
    expect(report).toContain("## Orientation");
    expect(report).toContain("## Nourishment");
    expect(report).toContain("## Fruit");
    expect(report).toContain("## Trust Boundaries");
  });

  it("includes a concise lineage summary in the Markdown architecture brief", () => {
    const blueprint = composeBlueprintFromGuidedIntake(praxisInput);
    const markdown = exportBlueprintMarkdown(blueprint);

    expect(markdown).toContain("## Lineage Summary");
    expect(markdown).toContain("Blueprint truth remains ProjectBlueprint");
    expect(markdown).not.toContain("# Blueprint Lineage Report");
  });
});
