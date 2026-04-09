import { z } from "zod";

import type { ProjectBlueprint } from "@/domain/models";
import { createId, nowIso } from "@/lib/identity";
import { ProjectBlueprintSchema, timestampSchema } from "@/schema";

export const currentStorageVersion = 2;

export const QuarantineFailureStageSchema = z.enum(["read", "detect", "migrate", "validate"]);
export const QuarantineFailureCategorySchema = z.enum([
  "parse",
  "format",
  "unsupported-version",
  "migration",
  "validation",
]);

export const QuarantinedPayloadSchema = z.object({
  id: z.string(),
  storageKey: z.string(),
  detectedStorageVersion: z.number().int().nullable(),
  failureStage: QuarantineFailureStageSchema,
  failureCategory: QuarantineFailureCategorySchema.default("migration"),
  reason: z.string(),
  rawPayload: z.unknown(),
  createdAt: timestampSchema,
  migrationSteps: z.array(z.string()),
  fingerprint: z.string(),
});

export const StoredProjectsDocumentSchema = z.object({
  storageVersion: z.literal(currentStorageVersion),
  storedAt: timestampSchema,
  projects: z.array(ProjectBlueprintSchema),
});

export const QuarantineExportDocumentSchema = z.object({
  exportVersion: z.literal(1),
  quarantine: QuarantinedPayloadSchema,
});

export type QuarantineFailureStage = z.infer<typeof QuarantineFailureStageSchema>;
export type QuarantineFailureCategory = z.infer<typeof QuarantineFailureCategorySchema>;
export type QuarantinedPayload = z.infer<typeof QuarantinedPayloadSchema>;
export type StoredProjectsDocument = z.infer<typeof StoredProjectsDocumentSchema>;
export type QuarantineExportDocument = z.infer<typeof QuarantineExportDocumentSchema>;

export type RepositoryLoadStatus = "empty" | "loaded" | "migrated" | "quarantined";

export type RepositoryLoadReport = {
  status: RepositoryLoadStatus;
  detectedStorageVersion: number | null;
  currentStorageVersion: number;
  migrated: boolean;
  migrationSteps: string[];
  quarantineCount: number;
  message: string | null;
};

export type RepositoryLoadResult = {
  projects: ProjectBlueprint[];
  report: RepositoryLoadReport;
};

export type StoredPayloadHydrationSuccess = {
  success: true;
  document: StoredProjectsDocument;
  report: RepositoryLoadReport;
};

export type StoredPayloadHydrationFailure = {
  success: false;
  detectedStorageVersion: number | null;
  failureStage: QuarantineFailureStage;
  failureCategory: QuarantineFailureCategory;
  migrationSteps: string[];
  reason: string;
};

export type StoredPayloadHydrationResult = StoredPayloadHydrationSuccess | StoredPayloadHydrationFailure;

export const createStoredProjectsDocument = (projects: ProjectBlueprint[]): StoredProjectsDocument => ({
  storageVersion: currentStorageVersion,
  storedAt: nowIso(),
  projects,
});

export const createRepositoryLoadReport = (
  input: Partial<RepositoryLoadReport> & Pick<RepositoryLoadReport, "status">,
): RepositoryLoadReport => ({
  status: input.status,
  detectedStorageVersion: input.detectedStorageVersion ?? null,
  currentStorageVersion,
  migrated: input.migrated ?? false,
  migrationSteps: input.migrationSteps ?? [],
  quarantineCount: input.quarantineCount ?? 0,
  message: input.message ?? null,
});

export const createQuarantinedPayload = (input: {
  storageKey: string;
  detectedStorageVersion: number | null;
  failureStage: QuarantineFailureStage;
  failureCategory: QuarantineFailureCategory;
  reason: string;
  rawPayload: unknown;
  migrationSteps: string[];
  fingerprint: string;
}): QuarantinedPayload => ({
  id: createId("quarantine"),
  storageKey: input.storageKey,
  detectedStorageVersion: input.detectedStorageVersion,
  failureStage: input.failureStage,
  failureCategory: input.failureCategory,
  reason: input.reason,
  rawPayload: input.rawPayload,
  createdAt: nowIso(),
  migrationSteps: input.migrationSteps,
  fingerprint: input.fingerprint,
});
