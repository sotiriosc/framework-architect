import { describe, expect, it } from "vitest";

import { composeBlueprintFromGuidedIntake } from "@/application/intake/composeBlueprintFromGuidedIntake";
import {
  buildRelationOptionGroups,
  getMissingRelationIds,
  labelsForRelationIds,
  relationTypeForScope,
  toggleRelationId,
} from "@/ui/relationOptions";

const blueprint = composeBlueprintFromGuidedIntake({
  projectName: "Relation Editing Blueprint",
  rawIdea: "Create a Praxis feature editor with relation-aware blueprint controls.",
  frameworkType: "Praxis Feature",
  frameworkTemplateId: "praxis-feature",
  targetUser: "Framework builders",
  problem: "Raw IDs are hard to edit safely.",
  intendedOutcome: "edit relationships by name while preserving IDs",
  corePrinciples: ["Keep IDs stable"],
  mustRemainTrue: ["Every component must map to a function"],
  mvpBoundary: ["Capture raw feature idea", "Validate readiness and missing structure"],
  expansionIdeas: ["Team review and collaboration"],
  knownRisks: ["Invalid IDs may be hidden"],
});

describe("relationOptions", () => {
  it("builds named option groups from a ProjectBlueprint", () => {
    const groups = buildRelationOptionGroups(blueprint);

    expect(groups.outcomes[0]?.label).toBe(blueprint.outcomes[0]?.name);
    expect(groups.functions.map((option) => option.label)).toContain("Capture feature intent");
    expect(groups.components.map((option) => option.label)).toContain("Safety Review Panel");
    expect(groups.scopeItems.length).toBe(
      blueprint.mvpScope.items.length + blueprint.expansionScope.items.length,
    );
    expect(groups.allEntities.some((option) => option.id === blueprint.project.id)).toBe(true);
  });

  it("formats relation labels and preserves missing IDs", () => {
    const groups = buildRelationOptionGroups(blueprint);
    const selectedIds = [blueprint.functions[0]?.id ?? "", "missing_function"].filter(Boolean);

    expect(labelsForRelationIds(selectedIds, groups.functions)).toContain("Capture feature intent");
    expect(labelsForRelationIds(selectedIds, groups.functions)).toContain("Missing: missing_function");
    expect(getMissingRelationIds(selectedIds, groups.functions)).toEqual(["missing_function"]);
  });

  it("toggles selected relation IDs without dropping unrelated invalid IDs", () => {
    const selectedIds = ["missing_id"];
    const functionId = blueprint.functions[0]?.id ?? "";

    expect(toggleRelationId(selectedIds, functionId)).toEqual(["missing_id", functionId]);
    expect(toggleRelationId(["missing_id", functionId], functionId)).toEqual(["missing_id"]);
  });

  it("maps scoped governance fields to the matching relation group", () => {
    expect(relationTypeForScope("function")).toBe("functions");
    expect(relationTypeForScope("component")).toBe("components");
    expect(relationTypeForScope("phase")).toBe("phases");
    expect(relationTypeForScope("global")).toBe("allEntities");
  });
});
