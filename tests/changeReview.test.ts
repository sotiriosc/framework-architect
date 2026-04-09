import { describe, expect, it } from "vitest";

import { compareBlueprints } from "@/application/review/compareBlueprints";
import { BlueprintService } from "@/application/services/blueprintService";
import { createComponent } from "@/domain/defaults";
import { LocalProjectRepository } from "@/persistence/localProjectRepository";
import { ProjectBlueprintSchema } from "@/schema";

type TestStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const createTestStorage = (initial: Record<string, string> = {}): TestStorage => {
  const state = new Map(Object.entries(initial));

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

const setupService = (storage: TestStorage) => {
  const repository = new LocalProjectRepository(storage);
  const service = new BlueprintService(repository);

  return {
    repository,
    service,
  };
};

describe("change review", () => {
  it("returns a no-change review and does not create a revision for a no-op save attempt", () => {
    const { service } = setupService(createTestStorage());
    const created = service.createProject({
      name: "No-op review",
      rawIdea: "Change review should skip identical stable saves.",
    });

    const review = service.reviewStableSave({
      candidate: structuredClone(created),
      reason: "No-op review attempt.",
    });

    expect(review.status).toBe("no-change");
    expect(service.listProjectRevisions(created.project.id)).toHaveLength(1);
  });

  it("commits a clean reviewed save normally", () => {
    const { repository, service } = setupService(createTestStorage());
    const created = service.createProject({
      name: "Clean review",
      rawIdea: "Clean saves should proceed without an extra confirmation step.",
    });
    const edited = structuredClone(created);
    edited.project.corePhilosophy = "Keep the truth path explicit and stable.";

    const review = service.reviewStableSave({
      candidate: edited,
      reason: "Refined the project philosophy.",
    });

    expect(review.status).toBe("ready");
    if (review.status !== "ready") {
      throw new Error("Expected a ready review.");
    }

    expect(review.level).toBe("clean");
    expect(review.confirmationRequired).toBe(false);
    expect(review.structuralDiff).toEqual(
      compareBlueprints({
        activeBlueprint: created,
        candidateBlueprint: edited,
      }),
    );

    const committed = service.commitStableSave({
      review,
      confirm: true,
    });

    expect(committed.success).toBe(true);
    if (!committed.success) {
      throw new Error("Expected the clean reviewed save to commit.");
    }

    expect(committed.savedBlueprint.project.corePhilosophy).toBe("Keep the truth path explicit and stable.");
    expect(repository.find(created.project.id)?.project.corePhilosophy).toBe("Keep the truth path explicit and stable.");
    expect(service.listProjectRevisions(created.project.id)).toHaveLength(2);
  });

  it("requires explicit confirmation for warning-level governance review and does not save when cancelled", () => {
    const { repository, service } = setupService(createTestStorage());
    const active = service.bootstrap().projects[0];

    expect(active).toBeDefined();
    if (!active) {
      throw new Error("Expected a seed blueprint.");
    }

    const edited = structuredClone(active);
    edited.rules[0].enforcement = "Explicitly reviewed before stable persistence completes.";

    const review = service.reviewStableSave({
      candidate: edited,
      reason: "Adjusted the global memory rule.",
    });

    expect(review.status).toBe("ready");
    if (review.status !== "ready") {
      throw new Error("Expected a ready review.");
    }

    expect(review.level).toBe("warning");
    expect(review.confirmationRequired).toBe(true);
    expect(review.affectedRules.some((rule) => rule.name === active.rules[0]?.name)).toBe(true);

    const committed = service.commitStableSave({
      review,
      confirm: false,
    });

    expect(committed.success).toBe(false);
    if (committed.success) {
      throw new Error("Expected the warning-level save to remain uncommitted.");
    }

    expect(committed.code).toBe("confirmation-required");
    expect(repository.find(active.project.id)?.rules[0]?.enforcement).toBe(active.rules[0]?.enforcement);
    expect(service.listProjectRevisions(active.project.id)).toHaveLength(1);
  });

  it("blocks build-ready promotion while still allowing a confirmed save as validated", () => {
    const { repository, service } = setupService(createTestStorage());
    const created = service.createProject({
      name: "Build-ready review",
      rawIdea: "Build-ready promotion should stop when critical validation fails.",
    });
    const edited = structuredClone(created);
    const brokenComponent = createComponent();
    brokenComponent.name = "Broken component";
    edited.components.push(brokenComponent);
    edited.project.status = "build-ready";

    const review = service.reviewStableSave({
      candidate: edited,
      reason: "Attempted to promote to build-ready with a broken component mapping.",
    });

    expect(review.status).toBe("ready");
    if (review.status !== "ready") {
      throw new Error("Expected a ready review.");
    }

    expect(review.reviewTarget).toBe("buildReadyTransition");
    expect(review.level).toBe("blocked");
    expect(review.buildReadyAllowed).toBe(false);
    expect(review.effectiveProjectStatus).toBe("validated");
    expect(review.blockers.some((issue) => issue.code === "BUILD_READY_PROMOTION_BLOCKED")).toBe(true);

    const committed = service.commitStableSave({
      review,
      confirm: true,
    });

    expect(committed.success).toBe(true);
    if (!committed.success) {
      throw new Error("Expected the reviewed save to commit as validated.");
    }

    expect(committed.savedBlueprint.project.status).toBe("validated");
    expect(repository.find(created.project.id)?.project.status).toBe("validated");
    expect(service.listProjectRevisions(created.project.id)).toHaveLength(2);
  });

  it("surfaces affected invariants and rules deterministically", () => {
    const { service } = setupService(createTestStorage());
    const active = service.bootstrap().projects[0];

    expect(active).toBeDefined();
    if (!active) {
      throw new Error("Expected a seed blueprint.");
    }

    const edited = structuredClone(active);
    edited.invariants[0].description = "Governance visibility must stay explicit at every stable boundary.";
    edited.rules[1].description = "Build-ready remains system-gated during stable save review.";

    const review = service.reviewStableSave({
      candidate: edited,
      reason: "Updated review governance wording.",
    });

    expect(review.status).toBe("ready");
    if (review.status !== "ready") {
      throw new Error("Expected a ready review.");
    }

    expect(review.affectedInvariants.map((item) => item.name)).toContain(active.invariants[0]?.name);
    expect(review.affectedRules.map((item) => item.name)).toContain(active.rules[1]?.name);
    expect(review.warnings.some((issue) => issue.category === "invariant")).toBe(true);
    expect(review.warnings.some((issue) => issue.category === "rule")).toBe(true);
  });

  it("uses explicit invariant policy metadata to downgrade save review to a notice", () => {
    const { service } = setupService(createTestStorage());
    const active = service.bootstrap().projects[0];

    expect(active).toBeDefined();
    if (!active) {
      throw new Error("Expected a seed blueprint.");
    }

    const edited = structuredClone(active);
    edited.invariants[0].description = "Notice-level invariant wording update.";
    edited.invariants[0].policy.reviewSeverity = "notice";
    edited.invariants[0].policy.requiresConfirmation = false;
    edited.invariants[0].policy.blocksBuildReady = false;
    edited.invariants[0].policy.reviewMessage = "This invariant touch should remain informational.";

    const review = service.reviewStableSave({
      candidate: edited,
      reason: "Adjusted an invariant with notice-level policy.",
    });

    expect(review.status).toBe("ready");
    if (review.status !== "ready") {
      throw new Error("Expected a ready review.");
    }

    expect(review.level).toBe("clean");
    expect(review.confirmationRequired).toBe(false);
    expect(review.warnings.some((issue) => issue.category === "invariant")).toBe(false);
    const notice = review.notices.find((issue) => issue.category === "invariant");
    expect(notice?.source).toBe("policy");
    expect(notice?.policySource?.entityType).toBe("invariant");
    expect(notice?.policySource?.declaredSeverity).toBe("notice");
  });

  it("promotes notice-level rule policy to a warning when confirmation is explicitly required", () => {
    const { service } = setupService(createTestStorage());
    const active = service.bootstrap().projects[0];

    expect(active).toBeDefined();
    if (!active) {
      throw new Error("Expected a seed blueprint.");
    }

    const edited = structuredClone(active);
    edited.rules[0].enforcement = "Explicit policy-driven confirmation remains required.";
    edited.rules[0].policy.reviewSeverity = "notice";
    edited.rules[0].policy.requiresConfirmation = true;
    edited.rules[0].policy.overrideAllowed = true;
    edited.rules[0].policy.reviewMessage = "This rule still requires human confirmation.";

    const review = service.reviewStableSave({
      candidate: edited,
      reason: "Adjusted a rule with notice severity but explicit confirmation.",
      source: "manualCheckpoint",
    });

    expect(review.status).toBe("ready");
    if (review.status !== "ready") {
      throw new Error("Expected a ready review.");
    }

    expect(review.level).toBe("warning");
    expect(review.confirmationRequired).toBe(true);
    const warning = review.warnings.find((issue) => issue.category === "rule");
    expect(warning?.source).toBe("policy");
    expect(warning?.policySource?.declaredSeverity).toBe("notice");
    expect(warning?.policySource?.appliedSeverity).toBe("warning");
    expect(warning?.overrideAllowed).toBe(true);
  });

  it("uses build-ready policy metadata to block promotion when a changed rule is marked as a blocker", () => {
    const { service } = setupService(createTestStorage());
    const active = service.bootstrap().projects[0];

    expect(active).toBeDefined();
    if (!active) {
      throw new Error("Expected a seed blueprint.");
    }

    const edited = structuredClone(active);
    edited.project.status = "build-ready";
    edited.rules[1].description = "Changed build-ready gate wording.";
    edited.rules[1].policy.reviewSeverity = "notice";
    edited.rules[1].policy.blocksBuildReady = true;
    edited.rules[1].policy.affectsBuildReady = true;
    edited.rules[1].policy.requiresConfirmation = true;

    const review = service.reviewStableSave({
      candidate: edited,
      reason: "Adjusted a build-ready gate rule during promotion.",
    });

    expect(review.status).toBe("ready");
    if (review.status !== "ready") {
      throw new Error("Expected a ready review.");
    }

    expect(review.level).toBe("blocked");
    expect(review.buildReadyAllowed).toBe(false);
    expect(review.effectiveProjectStatus).toBe("validated");
    const blocker = review.blockers.find((issue) => issue.category === "rule");
    expect(blocker?.source).toBe("policy");
    expect(blocker?.policySource?.appliedSeverity).toBe("blocker");
  });

  it("keeps older governance entities without explicit policy metadata backward compatible", () => {
    const { service } = setupService(createTestStorage());
    const active = service.bootstrap().projects[0];

    expect(active).toBeDefined();
    if (!active) {
      throw new Error("Expected a seed blueprint.");
    }

    const legacyPayload = JSON.parse(JSON.stringify(active)) as Record<string, unknown>;
    const firstRule = (legacyPayload.rules as Array<Record<string, unknown>>)[0];
    const firstInvariant = (legacyPayload.invariants as Array<Record<string, unknown>>)[0];

    delete firstRule.policy;
    delete firstInvariant.policy;
    firstInvariant.blocksBuildReady = true;
    firstInvariant.overrideAllowed = false;
    firstInvariant.violationMessage = "Legacy invariant message";

    const parsed = ProjectBlueprintSchema.parse(legacyPayload);

    expect(parsed.rules[0]?.policy.requiresConfirmation).toBe(true);
    expect(parsed.rules[0]?.policy.reviewSeverity).toBe("warning");
    expect(parsed.invariants[0]?.policy.blocksBuildReady).toBe(true);
    expect(parsed.invariants[0]?.policy.reviewMessage).toBe("Legacy invariant message");

    const edited = structuredClone(parsed);
    edited.rules[0].enforcement = "Legacy rule payload still participates in review.";

    const review = service.reviewStableSave({
      candidate: edited,
      reason: "Legacy governance payload review.",
    });

    expect(review.status).toBe("ready");
    if (review.status !== "ready") {
      throw new Error("Expected a ready review.");
    }

    expect(review.warnings.some((issue) => issue.category === "rule")).toBe(true);
  });

  it("does not create revision spam from unsaved draft-only edits", () => {
    const { service } = setupService(createTestStorage());
    const created = service.createProject({
      name: "Draft review boundary",
      rawIdea: "Only explicit stable saves should trigger change review.",
    });
    const draftOnly = structuredClone(created);
    draftOnly.project.rawIdea = "Unsaved draft change only.";

    expect(service.listProjectRevisions(created.project.id)).toHaveLength(1);
  });
});
