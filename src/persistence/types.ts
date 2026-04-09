import { z } from "zod";

import type { ProjectBlueprint } from "@/domain/models";
import { createId, nowIso } from "@/lib/identity";
import { ProjectBlueprintSchema, timestampSchema } from "@/schema";

export const currentStorageVersion = 2;

export const QuarantineFailureStageSchema = z.enum(["read", "detect", "migrate", "validate"]);

export const QuarantinedPayloadSchema = z.object({
  id: z.string(),
  storageKey: z.string(),
  detectedStorageVersion: z.number().int().nullable(),
  failureStage: QuarantineFailureStageSchema,
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

export type QuarantineFailureStage = z.infer<typeof QuarantineFailureStageSchema>;
export type QuarantinedPayload = z.infer<typeof QuarantinedPayloadSchema>;
export type StoredProjectsDocument = z.infer<typeof StoredProjectsDocumentSchema>;

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
  reason: string;
  rawPayload: unknown;
  migrationSteps: string[];
  fingerprint: string;
}): QuarantinedPayload => ({
  id: createId("quarantine"),
  storageKey: input.storageKey,
  detectedStorageVersion: input.detectedStorageVersion,
  failureStage: input.failureStage,
  reason: input.reason,
  rawPayload: input.rawPayload,
  createdAt: nowIso(),
  migrationSteps: input.migrationSteps,
  fingerprint: input.fingerprint,
});
