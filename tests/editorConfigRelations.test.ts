import { describe, expect, it } from "vitest";

import {
  componentFields,
  decisionRecordFields,
  dependencyFields,
  domainFields,
  failureModeFields,
  flowFields,
  functionFields,
  guardrailFields,
  invariantFields,
  phaseFields,
  ruleFields,
  scopeItemFields,
} from "@/ui/editorConfig";
import type { EditorField } from "@/ui/components/CollectionEditor";
import type { RelationType } from "@/ui/relationOptions";

const expectRelationField = (
  fields: EditorField[],
  key: string,
  kind: "relation-multi" | "relation-single",
  relationType: RelationType,
) => {
  const field = fields.find((item) => item.key === key);

  expect(field).toMatchObject({ kind, relationType });
};

describe("editor relation field config", () => {
  it("uses relation fields for core mapping IDs", () => {
    expectRelationField(domainFields, "outcomeIds", "relation-multi", "outcomes");
    expectRelationField(functionFields, "domainIds", "relation-multi", "domains");
    expectRelationField(functionFields, "outcomeIds", "relation-multi", "outcomes");
    expectRelationField(functionFields, "actorIds", "relation-multi", "actors");
    expectRelationField(componentFields, "functionIds", "relation-multi", "functions");
    expectRelationField(flowFields, "componentIds", "relation-multi", "components");
    expectRelationField(phaseFields, "functionIds", "relation-multi", "functions");
    expectRelationField(scopeItemFields, "componentIds", "relation-multi", "components");
  });

  it("uses all-entity relation fields for cross-entity references", () => {
    expectRelationField(dependencyFields, "sourceEntityId", "relation-single", "allEntities");
    expectRelationField(dependencyFields, "targetEntityId", "relation-single", "allEntities");
    expectRelationField(decisionRecordFields, "relatedEntityIds", "relation-multi", "allEntities");
    expectRelationField(failureModeFields, "relatedEntityIds", "relation-multi", "allEntities");
  });

  it("uses scope-aware relation fields for governance scopes", () => {
    expectRelationField(ruleFields, "scopeEntityIds", "relation-multi", "scopeEntities");
    expectRelationField(invariantFields, "scopeEntityIds", "relation-multi", "scopeEntities");
    expectRelationField(guardrailFields, "scopeEntityIds", "relation-multi", "scopeEntities");
  });
});
