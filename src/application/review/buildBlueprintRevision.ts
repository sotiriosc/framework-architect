import {
  compareBlueprints,
  createBlueprintMeaningfulFingerprint,
} from "@/application/review/compareBlueprints";
import type { ProjectBlueprint } from "@/domain/models";
import {
  createBlueprintRevision,
  type BlueprintRevision,
  type RevisionSource,
} from "@/persistence/revisionTypes";

const pluralize = (count: number, singular: string, plural = `${singular}s`): string =>
  count === 1 ? singular : plural;

const summarizeRevision = (input: {
  source: RevisionSource;
  revisionNumber: number;
  structuralDiff: BlueprintRevision["structuralDiff"];
}): string => {
  if (input.revisionNumber === 1) {
    switch (input.source) {
      case "seed":
        return "Initial seed snapshot recorded.";
      case "system":
        return "Initial revision backfilled from active storage.";
      case "recoveryRestore":
        return "Initial revision created from recovered project restore.";
      case "import":
        return "Initial revision created from imported project state.";
      case "manualCheckpoint":
        return "Initial manual checkpoint recorded.";
      case "editSave":
        return "Initial stable saved project state recorded.";
      default:
        return "Initial project revision recorded.";
    }
  }

  const changeCount = input.structuralDiff.totalChangeCount;
  const sourceLabel =
    input.source === "recoveryRestore"
      ? "Recovery restore"
      : input.source === "manualCheckpoint"
        ? "Manual checkpoint"
        : input.source === "editSave"
          ? "Saved edit"
          : input.source === "import"
            ? "Import"
            : input.source === "seed"
              ? "Seed snapshot"
            : "System update";

  if (changeCount === 0) {
    return `${sourceLabel} recorded revision ${input.revisionNumber}.`;
  }

  return `${sourceLabel} recorded revision ${input.revisionNumber} with ${changeCount} structural ${pluralize(changeCount, "change")}.`;
};

export const buildBlueprintRevision = (input: {
  snapshot: ProjectBlueprint;
  previousRevision: BlueprintRevision | null;
  source: RevisionSource;
  summary?: string;
  reason?: string | null;
  relatedDecisionRecordIds?: string[];
}): BlueprintRevision | null => {
  const snapshot = structuredClone(input.snapshot);
  const meaningfulFingerprint = createBlueprintMeaningfulFingerprint(snapshot);

  if (input.previousRevision?.meaningfulFingerprint === meaningfulFingerprint) {
    return null;
  }

  const previousSnapshot = input.previousRevision?.snapshot ?? null;
  const structuralDiff = compareBlueprints({
    activeBlueprint: previousSnapshot,
    candidateBlueprint: snapshot,
  });
  const revisionNumber = (input.previousRevision?.revisionNumber ?? 0) + 1;

  return createBlueprintRevision({
    projectId: snapshot.project.id,
    revisionNumber,
    previousRevisionId: input.previousRevision?.id ?? null,
    source: input.source,
    summary:
      input.summary?.trim() ||
      summarizeRevision({
        source: input.source,
        revisionNumber,
        structuralDiff,
      }),
    reason: input.reason?.trim() || null,
    relatedDecisionRecordIds: input.relatedDecisionRecordIds ?? [],
    snapshot,
    structuralDiff,
    meaningfulFingerprint,
  });
};
