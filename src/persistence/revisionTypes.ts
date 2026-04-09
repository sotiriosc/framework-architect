import { z } from "zod";

import { BlueprintStructuralDiffSchema } from "@/application/review/diffModel";
import type { ProjectBlueprint } from "@/domain/models";
import { createId, nowIso } from "@/lib/identity";
import { ProjectBlueprintSchema, timestampSchema } from "@/schema";

export const RevisionSourceSchema = z.enum([
  "manualCheckpoint",
  "editSave",
  "recoveryRestore",
  "import",
  "seed",
  "system",
]);

export const BlueprintRevisionSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  revisionNumber: z.number().int().positive(),
  previousRevisionId: z.string().nullable(),
  createdAt: timestampSchema,
  source: RevisionSourceSchema,
  summary: z.string().min(1),
  reason: z.string().nullable(),
  relatedDecisionRecordIds: z.array(z.string()),
  snapshot: ProjectBlueprintSchema,
  structuralDiff: BlueprintStructuralDiffSchema,
  meaningfulFingerprint: z.string().min(1),
});

export type RevisionSource = z.infer<typeof RevisionSourceSchema>;
export type BlueprintRevision = z.infer<typeof BlueprintRevisionSchema>;

export const createBlueprintRevision = (input: {
  projectId: string;
  revisionNumber: number;
  previousRevisionId: string | null;
  source: RevisionSource;
  summary: string;
  reason?: string | null;
  relatedDecisionRecordIds?: string[];
  snapshot: ProjectBlueprint;
  structuralDiff: BlueprintRevision["structuralDiff"];
  meaningfulFingerprint: string;
}): BlueprintRevision => ({
  id: createId("revision"),
  projectId: input.projectId,
  revisionNumber: input.revisionNumber,
  previousRevisionId: input.previousRevisionId,
  createdAt: nowIso(),
  source: input.source,
  summary: input.summary,
  reason: input.reason ?? null,
  relatedDecisionRecordIds: input.relatedDecisionRecordIds ?? [],
  snapshot: input.snapshot,
  structuralDiff: input.structuralDiff,
  meaningfulFingerprint: input.meaningfulFingerprint,
});
