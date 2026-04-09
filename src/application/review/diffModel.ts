import { z } from "zod";

export const structuralDiffCollectionKeys = [
  "outcomes",
  "actors",
  "constraints",
  "domains",
  "functions",
  "components",
  "flows",
  "dependencies",
  "rules",
  "invariants",
  "guardrails",
  "phases",
  "mvpScopeItems",
  "expansionScopeItems",
  "decisionRecords",
  "failureModes",
] as const;

export const CompareScalarValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.null(),
]);

export const ScalarFieldChangeSchema = z.object({
  field: z.string(),
  currentValue: CompareScalarValueSchema,
  candidateValue: CompareScalarValueSchema,
});

export const StructuralDiffCollectionKeySchema = z.enum(structuralDiffCollectionKeys);

export const CollectionItemSummarySchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const CollectionItemChangeSchema = CollectionItemSummarySchema.extend({
  changedFields: z.array(z.string()),
});

export const CollectionCompareSummarySchema = z.object({
  key: StructuralDiffCollectionKeySchema,
  label: z.string(),
  added: z.array(CollectionItemSummarySchema),
  removed: z.array(CollectionItemSummarySchema),
  changed: z.array(CollectionItemChangeSchema),
  hasChanges: z.boolean(),
});

export const BlueprintStructuralDiffSchema = z.object({
  identical: z.boolean(),
  hasActiveBlueprint: z.boolean(),
  activeProjectId: z.string().nullable(),
  activeProjectName: z.string().nullable(),
  candidateProjectId: z.string().nullable(),
  candidateProjectName: z.string().nullable(),
  projectChanges: z.array(ScalarFieldChangeSchema),
  intentChanges: z.array(ScalarFieldChangeSchema),
  decisionLogicChanges: z.array(ScalarFieldChangeSchema),
  mvpScopeChanges: z.array(ScalarFieldChangeSchema),
  expansionScopeChanges: z.array(ScalarFieldChangeSchema),
  collections: z.array(CollectionCompareSummarySchema),
  totalChangeCount: z.number().int().nonnegative(),
});

export type CompareScalarValue = z.infer<typeof CompareScalarValueSchema>;
export type ScalarFieldChange = z.infer<typeof ScalarFieldChangeSchema>;
export type StructuralDiffCollectionKey = z.infer<typeof StructuralDiffCollectionKeySchema>;
export type CollectionItemSummary = z.infer<typeof CollectionItemSummarySchema>;
export type CollectionItemChange = z.infer<typeof CollectionItemChangeSchema>;
export type CollectionCompareSummary = z.infer<typeof CollectionCompareSummarySchema>;
export type BlueprintStructuralDiff = z.infer<typeof BlueprintStructuralDiffSchema>;
