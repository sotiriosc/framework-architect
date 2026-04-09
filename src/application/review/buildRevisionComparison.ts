import { compareBlueprints } from "@/application/review/compareBlueprints";
import type { BlueprintStructuralDiff } from "@/application/review/diffModel";
import type { ProjectBlueprint } from "@/domain/models";
import type { BlueprintRevision } from "@/persistence/revisionTypes";

export type RevisionComparisonMode = "previous" | "revision" | "current";
export type RevisionComparisonTargetKind = "revision" | "current";
export type RevisionComparisonStatus = "ready" | "empty" | "invalid";

export type RevisionComparisonTarget = {
  kind: RevisionComparisonTargetKind;
  projectId: string;
  revisionId: string | null;
  revisionNumber: number | null;
  label: string;
  detail: string;
};

export type RevisionComparisonResult = {
  status: RevisionComparisonStatus;
  mode: RevisionComparisonMode;
  baseTarget: RevisionComparisonTarget | null;
  compareTarget: RevisionComparisonTarget | null;
  availableRevisionTargets: RevisionComparisonTarget[];
  diff: BlueprintStructuralDiff | null;
  canCompare: boolean;
  message: string;
};

const formatRevisionSourceLabel = (source: BlueprintRevision["source"]): string => {
  switch (source) {
    case "editSave":
      return "edit save";
    case "manualCheckpoint":
      return "manual checkpoint";
    case "recoveryRestore":
      return "recovery restore";
    default:
      return source;
  }
};

const toRevisionTarget = (revision: BlueprintRevision): RevisionComparisonTarget => ({
  kind: "revision",
  projectId: revision.projectId,
  revisionId: revision.id,
  revisionNumber: revision.revisionNumber,
  label: `Revision ${revision.revisionNumber}`,
  detail: `${formatRevisionSourceLabel(revision.source)} | ${revision.createdAt}`,
});

const toCurrentTarget = (blueprint: ProjectBlueprint): RevisionComparisonTarget => ({
  kind: "current",
  projectId: blueprint.project.id,
  revisionId: null,
  revisionNumber: null,
  label: "Current active project",
  detail: `${blueprint.project.name} | ${blueprint.project.status}`,
});

const findPreviousRevision = (
  revisions: BlueprintRevision[],
  baseRevision: BlueprintRevision,
): BlueprintRevision | null =>
  revisions
    .filter((revision) => revision.projectId === baseRevision.projectId && revision.revisionNumber < baseRevision.revisionNumber)
    .sort((left, right) => right.revisionNumber - left.revisionNumber)[0] ?? null;

const findNextRevision = (
  revisions: BlueprintRevision[],
  baseRevision: BlueprintRevision,
): BlueprintRevision | null =>
  revisions
    .filter((revision) => revision.projectId === baseRevision.projectId && revision.revisionNumber > baseRevision.revisionNumber)
    .sort((left, right) => left.revisionNumber - right.revisionNumber)[0] ?? null;

const createResult = (input: {
  status: RevisionComparisonStatus;
  mode: RevisionComparisonMode;
  baseTarget: RevisionComparisonTarget | null;
  compareTarget: RevisionComparisonTarget | null;
  availableRevisionTargets: RevisionComparisonTarget[];
  diff?: BlueprintStructuralDiff | null;
  message: string;
}): RevisionComparisonResult => ({
  status: input.status,
  mode: input.mode,
  baseTarget: input.baseTarget,
  compareTarget: input.compareTarget,
  availableRevisionTargets: input.availableRevisionTargets,
  diff: input.diff ?? null,
  canCompare: input.status === "ready" && Boolean(input.diff && input.compareTarget && input.baseTarget),
  message: input.message,
});

export const buildRevisionComparison = (input: {
  revisions: BlueprintRevision[];
  baseRevisionId: string | null;
  mode?: RevisionComparisonMode;
  compareRevisionId?: string | null;
  activeBlueprint?: ProjectBlueprint | null;
}): RevisionComparisonResult => {
  const revisions = input.revisions
    .slice()
    .sort((left, right) => right.revisionNumber - left.revisionNumber || right.createdAt.localeCompare(left.createdAt));
  const mode = input.mode ?? "previous";

  if (!input.baseRevisionId) {
    return createResult({
      status: "empty",
      mode,
      baseTarget: null,
      compareTarget: null,
      availableRevisionTargets: [],
      message: "Select a revision to start a structural comparison.",
    });
  }

  const baseRevision = revisions.find((revision) => revision.id === input.baseRevisionId) ?? null;
  if (!baseRevision) {
    return createResult({
      status: "invalid",
      mode,
      baseTarget: null,
      compareTarget: null,
      availableRevisionTargets: [],
      message: "The selected revision was not found in the active project history.",
    });
  }

  const baseTarget = toRevisionTarget(baseRevision);
  const availableRevisionTargets = revisions
    .filter((revision) => revision.id !== baseRevision.id)
    .map(toRevisionTarget);
  const previousRevision = findPreviousRevision(revisions, baseRevision);

  if (mode === "previous") {
    if (!previousRevision) {
      return createResult({
        status: "empty",
        mode,
        baseTarget,
        compareTarget: null,
        availableRevisionTargets,
        message: `${baseTarget.label} has no previous revision to compare against.`,
      });
    }

    const compareTarget = toRevisionTarget(previousRevision);
    return createResult({
      status: "ready",
      mode,
      baseTarget,
      compareTarget,
      availableRevisionTargets,
      diff: compareBlueprints({
        activeBlueprint: previousRevision.snapshot,
        candidateBlueprint: baseRevision.snapshot,
      }),
      message: `Comparing ${baseTarget.label} against the immediately previous revision.`,
    });
  }

  if (mode === "revision") {
    if (input.compareRevisionId === baseRevision.id) {
      return createResult({
        status: "invalid",
        mode,
        baseTarget,
        compareTarget: null,
        availableRevisionTargets,
        message: "Choose a different revision as the comparison target.",
      });
    }

    const explicitTarget =
      input.compareRevisionId
        ? revisions.find((revision) => revision.id === input.compareRevisionId) ?? null
        : null;

    if (input.compareRevisionId && !explicitTarget) {
      return createResult({
        status: "invalid",
        mode,
        baseTarget,
        compareTarget: null,
        availableRevisionTargets,
        message: "The selected comparison revision could not be found.",
      });
    }

    const fallbackTarget =
      previousRevision ??
      findNextRevision(revisions, baseRevision) ??
      revisions.find((revision) => revision.id !== baseRevision.id) ??
      null;
    const compareRevision = explicitTarget ?? fallbackTarget;

    if (!compareRevision) {
      return createResult({
        status: "empty",
        mode,
        baseTarget,
        compareTarget: null,
        availableRevisionTargets,
        message: "No other revision is available for comparison.",
      });
    }

    const compareTarget = toRevisionTarget(compareRevision);
    return createResult({
      status: "ready",
      mode,
      baseTarget,
      compareTarget,
      availableRevisionTargets,
      diff: compareBlueprints({
        activeBlueprint: compareRevision.snapshot,
        candidateBlueprint: baseRevision.snapshot,
      }),
      message: `Comparing ${baseTarget.label} against ${compareTarget.label}.`,
    });
  }

  const activeBlueprint = input.activeBlueprint ?? null;
  if (!activeBlueprint) {
    return createResult({
      status: "empty",
      mode,
      baseTarget,
      compareTarget: null,
      availableRevisionTargets,
      message: "No active project state is available to compare against this revision.",
    });
  }

  if (activeBlueprint.project.id !== baseRevision.projectId) {
    return createResult({
      status: "invalid",
      mode,
      baseTarget,
      compareTarget: null,
      availableRevisionTargets,
      message: "The current active project does not match the selected revision's project.",
    });
  }

  const compareTarget = toCurrentTarget(activeBlueprint);
  return createResult({
    status: "ready",
    mode,
    baseTarget,
    compareTarget,
    availableRevisionTargets,
    diff: compareBlueprints({
      activeBlueprint: activeBlueprint,
      candidateBlueprint: baseRevision.snapshot,
    }),
    message: `Comparing ${baseTarget.label} against the current active project state.`,
  });
};
