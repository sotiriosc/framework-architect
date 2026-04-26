import type { ProjectBlueprint } from "@/domain/models";
import { buildBlueprintImprovementPlan } from "@/application/review/buildBlueprintImprovementPlan";
import { buildBlueprintQualityReview } from "@/application/review/buildBlueprintQualityReview";
import {
  describeFrameworkTemplateForBlueprint,
  type FrameworkTemplateDefinition,
  type FrameworkTemplateId,
} from "@/application/templates/frameworkTemplates";
import { validateBlueprint } from "@/application/validation/validateBlueprint";

export type BlueprintStrategicPosition =
  | "foundation"
  | "mvp-ready"
  | "expansion-ready"
  | "scale-ready"
  | "needs-clarity";

export type BlueprintForesightItemCategory =
  | "product"
  | "technical"
  | "quality"
  | "governance"
  | "growth"
  | "monetization"
  | "user-trust"
  | "automation"
  | "testing"
  | "operations";

export type BlueprintForesightHorizon = "now" | "next" | "later" | "not-yet";
export type BlueprintForesightLevel = "high" | "medium" | "low";

export type BlueprintForesightItem = {
  id: string;
  title: string;
  description: string;
  category: BlueprintForesightItemCategory;
  horizon: BlueprintForesightHorizon;
  impact: BlueprintForesightLevel;
  effort: BlueprintForesightLevel;
  confidence: BlueprintForesightLevel;
  sourceSignals: string[];
  prerequisiteEntityIds: string[];
  relatedEntityIds: string[];
  acceptanceCriteria: string[];
  whyItMatters: string;
  whyNowOrLater: string;
  codexPromptSeed: string;
};

export type BlueprintForesight = {
  overallSummary: string;
  strategicPosition: BlueprintStrategicPosition;
  now: BlueprintForesightItem[];
  next: BlueprintForesightItem[];
  later: BlueprintForesightItem[];
  hiddenOpportunities: BlueprintForesightItem[];
  risksToWatch: BlueprintForesightItem[];
  notYet: BlueprintForesightItem[];
  recommendedNextMove: BlueprintForesightItem | null;
  templateSignals: string[];
  suggestedExperiments: BlueprintForesightItem[];
  suggestedMetrics: BlueprintForesightItem[];
  suggestedTests: BlueprintForesightItem[];
  suggestedCodexTasks: BlueprintForesightItem[];
};

type ForesightLane = "hidden" | "risk" | "experiment" | "metric" | "test" | "codex";

type ForesightDraft = Omit<
  BlueprintForesightItem,
  "id" | "sourceSignals" | "prerequisiteEntityIds" | "relatedEntityIds"
> & {
  key: string;
  lanes?: ForesightLane[];
  sourceSignals?: string[];
  prerequisiteEntityIds?: string[];
  relatedEntityIds?: string[];
};

type ForesightContext = {
  blueprint: ProjectBlueprint;
  template: FrameworkTemplateDefinition;
  validationBuildReady: boolean;
  qualityScore: number;
  qualityGrade: string;
  safeFixCount: number;
  manualFixCount: number;
  sourceSignals: string[];
  projectIds: string[];
  governanceIds: string[];
  outcomeIds: string[];
  functionIds: string[];
  componentIds: string[];
  exportEntityIds: string[];
  riskEntityIds: string[];
  text: string;
};

const unique = (items: string[]): string[] => [...new Set(items.filter(Boolean))];

const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "item";

const includesAny = (value: string, terms: string[]): boolean => {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
};

const entityText = (entity: { name: string; description?: string }): string =>
  `${entity.name} ${entity.description ?? ""}`;

const matchingEntityIds = (
  blueprint: ProjectBlueprint,
  terms: string[],
): string[] => [
  ...blueprint.outcomes.filter((item) => includesAny(entityText(item), terms)).map((item) => item.id),
  ...blueprint.domains.filter((item) => includesAny(`${item.name} ${item.description} ${item.responsibility}`, terms)).map((item) => item.id),
  ...blueprint.functions.filter((item) => includesAny(entityText(item), terms)).map((item) => item.id),
  ...blueprint.components.filter((item) => includesAny(`${item.name} ${item.description} ${item.purpose}`, terms)).map((item) => item.id),
  ...blueprint.rules.filter((item) => includesAny(entityText(item), terms)).map((item) => item.id),
  ...blueprint.invariants.filter((item) => includesAny(`${item.name} ${item.description} ${item.violationMessage}`, terms)).map((item) => item.id),
  ...blueprint.guardrails.filter((item) => includesAny(`${item.name} ${item.description} ${item.protectedAgainst}`, terms)).map((item) => item.id),
  ...blueprint.mvpScope.items.filter((item) => includesAny(`${item.name} ${item.description} ${item.rationale}`, terms)).map((item) => item.id),
  ...blueprint.expansionScope.items.filter((item) => includesAny(`${item.name} ${item.description} ${item.rationale}`, terms)).map((item) => item.id),
  ...blueprint.failureModes.filter((item) => includesAny(`${item.name} ${item.description} ${item.mitigation}`, terms)).map((item) => item.id),
];

const levelRank = (level: BlueprintForesightLevel): number => {
  switch (level) {
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
};

const effortRank = (level: BlueprintForesightLevel): number => {
  switch (level) {
    case "low":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
};

const buildPromptSeed = (ctx: ForesightContext, title: string, action: string): string =>
  [
    `Use the Framework Architect blueprint "${ctx.blueprint.project.name}" to ${action}.`,
    `Template: ${ctx.template.label}. ${ctx.template.promptGuidance}`,
    "Preserve validation, governance constraints, MVP/expansion separation, and all existing user-authored blueprint content.",
    `Do not bypass rules, invariants, guardrails, stable save review, local-first persistence, memory, revision history, or quarantine recovery.`,
    `Task: ${title}.`,
  ].join(" ");

const draft = (ctx: ForesightContext, input: ForesightDraft): ForesightDraft => ({
  ...input,
  sourceSignals: unique([...(input.sourceSignals ?? []), ...ctx.sourceSignals]),
  prerequisiteEntityIds: unique(input.prerequisiteEntityIds ?? []),
  relatedEntityIds: unique(input.relatedEntityIds ?? []),
});

const commonDrafts = (ctx: ForesightContext): ForesightDraft[] => {
  const drafts: ForesightDraft[] = [];

  if (!ctx.validationBuildReady || ctx.qualityScore < 70) {
    drafts.push(
      draft(ctx, {
        key: "repair-clarity-before-expansion",
        title: "Repair clarity before expansion",
        description: "Resolve validation or quality weaknesses before treating future opportunities as implementation work.",
        category: "quality",
        horizon: "now",
        impact: "high",
        effort: "medium",
        confidence: "high",
        lanes: ["codex"],
        prerequisiteEntityIds: ctx.projectIds,
        relatedEntityIds: ctx.projectIds,
        acceptanceCriteria: [
          "No critical validation failures remain.",
          "Quality review reaches at least a strong grade or the next manual fix is explicit.",
          "MVP and expansion scope remain separate.",
        ],
        whyItMatters: "Foresight is only useful when the current blueprint is coherent enough to trust.",
        whyNowOrLater: "Fix this now because weak structure makes future suggestions noisy.",
        codexPromptSeed: buildPromptSeed(ctx, "Repair clarity before expansion", "strengthen the current blueprint before adding future work"),
      }),
    );
  }

  if (ctx.exportEntityIds.length > 0) {
    drafts.push(
      draft(ctx, {
        key: "package-export-handoff",
        title: "Package the export handoff",
        description: "Turn the export surface into a short, repeatable handoff path that explains what to export and when.",
        category: "operations",
        horizon: "next",
        impact: "medium",
        effort: "low",
        confidence: "high",
        lanes: ["hidden", "codex"],
        prerequisiteEntityIds: ctx.exportEntityIds.slice(0, 4),
        relatedEntityIds: ctx.exportEntityIds,
        acceptanceCriteria: [
          "Markdown, Codex prompt, JSON, and MVP checklist outputs have clear use cases.",
          "The handoff does not add later scope to the MVP.",
          "Export wording references rules and invariants when relevant.",
        ],
        whyItMatters: "Completed blueprints become more useful when the export path is easy to repeat.",
        whyNowOrLater: "Do this after the MVP blueprint is coherent, before broader sharing workflows.",
        codexPromptSeed: buildPromptSeed(ctx, "Package the export handoff", "improve the implementation handoff around the existing export outputs"),
      }),
    );
  }

  drafts.push(
    draft(ctx, {
      key: "define-foresight-success-signals",
      title: "Define success signals for the next iteration",
      description: "Name the small set of signals that prove the blueprint is becoming more useful after the first build.",
      category: "quality",
      horizon: "next",
      impact: "medium",
      effort: "low",
      confidence: "high",
      lanes: ["metric", "experiment"],
      prerequisiteEntityIds: ctx.outcomeIds.slice(0, 2),
      relatedEntityIds: [...ctx.outcomeIds.slice(0, 2), ...ctx.functionIds.slice(0, 2)],
      acceptanceCriteria: [
        "At least three measurable success signals are named.",
        "Each signal maps to an outcome or MVP scope item.",
        "Signals do not imply building expansion items immediately.",
      ],
      whyItMatters: "Metrics keep future work grounded in observable usefulness instead of feature appetite.",
      whyNowOrLater: "Define these after validation so the next iteration has a target.",
      codexPromptSeed: buildPromptSeed(ctx, "Define success signals for the next iteration", "add non-invasive success metrics and experiment notes"),
    }),
  );

  return drafts;
};

const praxisDrafts = (ctx: ForesightContext): ForesightDraft[] => [
  draft(ctx, {
    key: "praxis-regression-tests",
    title: "Add Praxis engine regression tests",
    description: "Protect existing Praxis generation, progression, and phase-gating behavior before implementing the feature.",
    category: "testing",
    horizon: "now",
    impact: "high",
    effort: "medium",
    confidence: "high",
    lanes: ["test", "codex", "risk"],
    prerequisiteEntityIds: matchingEntityIds(ctx.blueprint, ["praxis", "logic", "progression", "gating"]).slice(0, 6),
    relatedEntityIds: [...ctx.governanceIds, ...matchingEntityIds(ctx.blueprint, ["praxis", "program", "generator"]).slice(0, 4)],
    acceptanceCriteria: [
      "Regression coverage exists for existing Praxis program generation behavior.",
      "Progression and phase-gating expectations are asserted.",
      "The new feature can fail without changing existing generator outcomes.",
    ],
    whyItMatters: "Praxis feature work is risky when implementation touches existing program logic.",
    whyNowOrLater: "Do this now because safety comes before expanding feature behavior.",
    codexPromptSeed: buildPromptSeed(ctx, "Add Praxis engine regression tests", "write regression tests for existing Praxis engine behavior before feature changes"),
  }),
  draft(ctx, {
    key: "praxis-do-not-break-instructions",
    title: "Write explicit do-not-break instructions",
    description: "Create implementation instructions that name the Praxis program, generator, progression, and coaching constraints that must not change.",
    category: "governance",
    horizon: "now",
    impact: "high",
    effort: "low",
    confidence: "high",
    lanes: ["codex", "risk"],
    prerequisiteEntityIds: ctx.governanceIds.slice(0, 8),
    relatedEntityIds: ctx.governanceIds,
    acceptanceCriteria: [
      "Codex instructions include a Do not break section.",
      "Existing Praxis generator, progression, phase gating, and coaching clarity are named.",
      "The instructions tell Codex to preserve validation and stable save behavior.",
    ],
    whyItMatters: "A precise negative boundary prevents helpful implementation work from weakening core Praxis behavior.",
    whyNowOrLater: "Do this now before creating task breakdowns or code edits.",
    codexPromptSeed: buildPromptSeed(ctx, "Write explicit do-not-break instructions", "draft implementation constraints for a Praxis feature without changing blueprint structure"),
  }),
  draft(ctx, {
    key: "praxis-isolated-implementation-boundary",
    title: "Define an isolated implementation boundary",
    description: "Use a feature flag, adapter, or narrow module boundary so the Praxis feature can be tested without destabilizing the engine.",
    category: "technical",
    horizon: "next",
    impact: "high",
    effort: "medium",
    confidence: "medium",
    lanes: ["hidden", "codex"],
    prerequisiteEntityIds: matchingEntityIds(ctx.blueprint, ["boundary", "logic", "implementation"]).slice(0, 6),
    relatedEntityIds: matchingEntityIds(ctx.blueprint, ["feature", "boundary", "component", "logic"]).slice(0, 8),
    acceptanceCriteria: [
      "The boundary identifies which modules can change.",
      "Existing generator logic remains outside the first implementation surface unless tests cover it.",
      "A rollback or isolation path is documented.",
    ],
    whyItMatters: "Isolation lets the team move faster without making the core Praxis engine fragile.",
    whyNowOrLater: "Do this after do-not-break guidance, before larger implementation tasks.",
    codexPromptSeed: buildPromptSeed(ctx, "Define an isolated implementation boundary", "plan a small, isolated Praxis feature implementation boundary"),
  }),
  draft(ctx, {
    key: "praxis-user-trust-surface",
    title: "Add a user trust explanation surface",
    description: "Explain what the feature changes, what it does not change, and why the generated guidance remains trustworthy.",
    category: "user-trust",
    horizon: "next",
    impact: "medium",
    effort: "low",
    confidence: "medium",
    lanes: ["hidden", "codex"],
    prerequisiteEntityIds: ctx.outcomeIds.slice(0, 2),
    relatedEntityIds: matchingEntityIds(ctx.blueprint, ["trust", "coaching", "clarity", "safety"]).slice(0, 8),
    acceptanceCriteria: [
      "The user-facing explanation avoids overpromising.",
      "The explanation names unchanged Praxis behavior.",
      "Safety or coaching caveats remain visible.",
    ],
    whyItMatters: "Trust copy lowers confusion when a feature affects coaching or generated programs.",
    whyNowOrLater: "Do this after the implementation boundary is clear.",
    codexPromptSeed: buildPromptSeed(ctx, "Add a user trust explanation surface", "draft concise user-facing trust copy for the Praxis feature"),
  }),
  draft(ctx, {
    key: "praxis-safety-pain-risk-guardrails",
    title: "Check safety and pain-risk guardrails",
    description: "If the feature touches pain, injury, recovery, or training intensity, make safety guardrails explicit before build work.",
    category: "user-trust",
    horizon: includesAny(ctx.text, ["pain", "injury", "recovery", "safety", "risk"]) ? "now" : "later",
    impact: "high",
    effort: "low",
    confidence: includesAny(ctx.text, ["pain", "injury", "recovery", "safety"]) ? "high" : "medium",
    lanes: ["risk"],
    prerequisiteEntityIds: ctx.governanceIds.slice(0, 6),
    relatedEntityIds: matchingEntityIds(ctx.blueprint, ["safety", "pain", "injury", "risk", "guardrail"]).slice(0, 8),
    acceptanceCriteria: [
      "Safety-relevant user states are named.",
      "The feature does not imply medical or injury advice outside scope.",
      "Guardrails are inspectable before implementation.",
    ],
    whyItMatters: "Training products can harm trust when safety assumptions stay implicit.",
    whyNowOrLater: "Do this now when safety language appears; otherwise revisit before expanding coaching automation.",
    codexPromptSeed: buildPromptSeed(ctx, "Check safety and pain-risk guardrails", "review and strengthen Praxis safety guardrails without adding external services"),
  }),
  draft(ctx, {
    key: "praxis-codex-task-breakdown",
    title: "Create an exportable Codex task breakdown",
    description: "Split the feature into implementation tasks that preserve governance, tests, and MVP boundaries.",
    category: "automation",
    horizon: "next",
    impact: "medium",
    effort: "low",
    confidence: "high",
    lanes: ["hidden", "codex"],
    prerequisiteEntityIds: ctx.exportEntityIds.slice(0, 4),
    relatedEntityIds: [...ctx.exportEntityIds, ...ctx.functionIds.slice(0, 4)],
    acceptanceCriteria: [
      "Each task has a bounded write scope.",
      "Regression tests and do-not-break instructions are included.",
      "Expansion ideas are listed as future work, not MVP work.",
    ],
    whyItMatters: "A clear task breakdown makes the export output safer to use in real implementation.",
    whyNowOrLater: "Do this after tests and implementation boundary are clear.",
    codexPromptSeed: buildPromptSeed(ctx, "Create an exportable Codex task breakdown", "turn the Praxis feature blueprint into a safe Codex task list"),
  }),
  draft(ctx, {
    key: "praxis-trainer-marketplace-not-yet",
    title: "Trainer marketplace",
    description: "A marketplace is a scale feature and should wait until the single-user feature path is proven.",
    category: "growth",
    horizon: "not-yet",
    impact: "medium",
    effort: "high",
    confidence: "medium",
    lanes: ["hidden"],
    prerequisiteEntityIds: ctx.outcomeIds.slice(0, 1),
    relatedEntityIds: ctx.projectIds,
    acceptanceCriteria: [
      "Single-user feature adoption is proven.",
      "Trust, safety, and moderation rules are explicit.",
      "Collaboration or account requirements are intentionally accepted.",
    ],
    whyItMatters: "Marketplace features can distort the MVP around scale before usefulness is proven.",
    whyNowOrLater: "Not yet because single-user trust and engine safety come first.",
    codexPromptSeed: buildPromptSeed(ctx, "Trainer marketplace", "document why marketplace work is out of scope for the current Praxis MVP"),
  }),
  draft(ctx, {
    key: "praxis-advanced-ai-automation-not-yet",
    title: "Advanced AI automation",
    description: "Automated extraction or generation should wait until deterministic Praxis boundaries are reliable.",
    category: "automation",
    horizon: "not-yet",
    impact: "high",
    effort: "high",
    confidence: "high",
    lanes: ["risk"],
    prerequisiteEntityIds: ctx.governanceIds.slice(0, 4),
    relatedEntityIds: ctx.projectIds,
    acceptanceCriteria: [
      "Deterministic flow is validated without AI.",
      "Safety and do-not-break guardrails are explicit.",
      "Manual review remains available.",
    ],
    whyItMatters: "Automation can hide assumptions and weaken user trust if introduced too early.",
    whyNowOrLater: "Not yet because the local-first deterministic path should prove itself first.",
    codexPromptSeed: buildPromptSeed(ctx, "Advanced AI automation", "write a future-scope note for AI automation without adding external AI calls"),
  }),
  draft(ctx, {
    key: "praxis-collaboration-not-yet",
    title: "Team collaboration",
    description: "Collaboration should wait until the single-user guided loop, validation, fixes, foresight, and exports are stable.",
    category: "growth",
    horizon: "not-yet",
    impact: "medium",
    effort: "high",
    confidence: "medium",
    lanes: ["hidden"],
    prerequisiteEntityIds: ctx.projectIds,
    relatedEntityIds: ctx.projectIds,
    acceptanceCriteria: [
      "Single-user revision and export workflows are stable.",
      "Conflict and review rules are designed.",
      "Local-first assumptions are not silently replaced with backend assumptions.",
    ],
    whyItMatters: "Collaboration adds coordination complexity that can obscure the core product loop.",
    whyNowOrLater: "Not yet because single-user flow quality is the current proof point.",
    codexPromptSeed: buildPromptSeed(ctx, "Team collaboration", "document future collaboration prerequisites without adding backend infrastructure"),
  }),
];

const softwareDrafts = (ctx: ForesightContext): ForesightDraft[] => [
  draft(ctx, {
    key: "software-onboarding-flow",
    title: "Add a first-run onboarding flow",
    description: "Guide new users from first idea to a saved, validated blueprint without needing to understand every section.",
    category: "product",
    horizon: "next",
    impact: "high",
    effort: "medium",
    confidence: "high",
    lanes: ["hidden", "codex"],
    prerequisiteEntityIds: ctx.outcomeIds.slice(0, 1),
    relatedEntityIds: matchingEntityIds(ctx.blueprint, ["user", "workflow", "intake", "experience"]).slice(0, 8),
    acceptanceCriteria: [
      "A new user can complete the primary flow without reading debug surfaces.",
      "Empty states explain the next action.",
      "The flow still keeps manual editing available.",
    ],
    whyItMatters: "Software MVPs often fail when the first usable path is unclear.",
    whyNowOrLater: "Build after the blueprint is validated, before optimizing advanced workflows.",
    codexPromptSeed: buildPromptSeed(ctx, "Add a first-run onboarding flow", "design a local-first onboarding path for the app MVP"),
  }),
  draft(ctx, {
    key: "software-analytics-events",
    title: "Define local usage and quality events",
    description: "Name privacy-safe events or counters that show whether users complete the core workflow.",
    category: "growth",
    horizon: "later",
    impact: "medium",
    effort: "medium",
    confidence: "medium",
    lanes: ["metric", "experiment"],
    prerequisiteEntityIds: ctx.functionIds.slice(0, 3),
    relatedEntityIds: matchingEntityIds(ctx.blueprint, ["workflow", "validation", "export"]).slice(0, 8),
    acceptanceCriteria: [
      "Events are optional and local-first unless the architecture explicitly changes.",
      "Events measure completion, validation, quality, and export actions.",
      "No external analytics dependency is introduced by default.",
    ],
    whyItMatters: "Metrics reveal whether the workflow is useful without guessing.",
    whyNowOrLater: "Later because the deterministic MVP should work before measurement expands.",
    codexPromptSeed: buildPromptSeed(ctx, "Define local usage and quality events", "propose local-first usage signals without adding external analytics"),
  }),
  draft(ctx, {
    key: "software-persistence-audit",
    title: "Run a data persistence audit",
    description: "Review local storage, migration, recovery, revision, and export paths for data loss risks.",
    category: "technical",
    horizon: "now",
    impact: "high",
    effort: "medium",
    confidence: "high",
    lanes: ["risk", "test", "codex"],
    prerequisiteEntityIds: matchingEntityIds(ctx.blueprint, ["data", "persistence", "storage", "revision", "recovery"]).slice(0, 8),
    relatedEntityIds: ctx.governanceIds,
    acceptanceCriteria: [
      "Old projects still load or quarantine explicitly.",
      "Revisions are recorded after stable saves.",
      "Exported JSON parses back into a valid blueprint.",
    ],
    whyItMatters: "A local-first app must earn trust by protecting user-authored work.",
    whyNowOrLater: "Do this now before adding accounts, sync, or sharing.",
    codexPromptSeed: buildPromptSeed(ctx, "Run a data persistence audit", "audit local persistence, migration, revision, and quarantine behavior"),
  }),
  draft(ctx, {
    key: "software-empty-error-states",
    title: "Harden empty and error states",
    description: "Make empty, invalid, loading, and recovery states tell users what happened and what to do next.",
    category: "quality",
    horizon: "now",
    impact: "medium",
    effort: "low",
    confidence: "high",
    lanes: ["codex", "test"],
    prerequisiteEntityIds: ctx.componentIds.slice(0, 4),
    relatedEntityIds: matchingEntityIds(ctx.blueprint, ["ui", "panel", "validation", "workspace"]).slice(0, 8),
    acceptanceCriteria: [
      "No major panel has a blank empty state.",
      "Error copy names the safe next step.",
      "Advanced recovery remains explicit and non-destructive.",
    ],
    whyItMatters: "Clear states make the product feel safe during manual testing.",
    whyNowOrLater: "Do this now because it is low effort and improves the whole loop.",
    codexPromptSeed: buildPromptSeed(ctx, "Harden empty and error states", "improve app empty and error state copy without broad rewrites"),
  }),
  draft(ctx, {
    key: "software-smoke-tests",
    title: "Add core product smoke tests",
    description: "Cover guided creation, validation, quality, safe fixes, foresight, and exports as one product loop.",
    category: "testing",
    horizon: "now",
    impact: "high",
    effort: "medium",
    confidence: "high",
    lanes: ["test", "codex"],
    prerequisiteEntityIds: ctx.projectIds,
    relatedEntityIds: ctx.functionIds.slice(0, 6),
    acceptanceCriteria: [
      "The default create path produces a build-ready structured blueprint.",
      "Safe fixes preserve validation and revisions.",
      "MVP checklist excludes later and not-yet work.",
    ],
    whyItMatters: "Smoke tests keep the product loop stable as the UI and exports evolve.",
    whyNowOrLater: "Do this now before deeper manual QA.",
    codexPromptSeed: buildPromptSeed(ctx, "Add core product smoke tests", "add targeted tests for the full Framework Architect product loop"),
  }),
  draft(ctx, {
    key: "software-accounts-not-yet",
    title: "Accounts and team features",
    description: "User accounts, teams, and cloud sync should wait until the local-first MVP is proven.",
    category: "growth",
    horizon: "not-yet",
    impact: "medium",
    effort: "high",
    confidence: "high",
    lanes: ["risk"],
    prerequisiteEntityIds: ctx.projectIds,
    relatedEntityIds: ctx.projectIds,
    acceptanceCriteria: [
      "Local-first workflow is stable.",
      "Data ownership and sync conflict rules are designed.",
      "The product intentionally accepts backend complexity.",
    ],
    whyItMatters: "Accounts can pull the app away from its local-first promise.",
    whyNowOrLater: "Not yet because local persistence and manual QA should mature first.",
    codexPromptSeed: buildPromptSeed(ctx, "Accounts and team features", "document account and team-feature prerequisites without adding backend work"),
  }),
];

const businessDrafts = (ctx: ForesightContext): ForesightDraft[] => [
  draft(ctx, {
    key: "business-offer-validation-experiment",
    title: "Run an offer validation experiment",
    description: "Test whether the stated offer, customer, and outcome are compelling before scaling delivery.",
    category: "growth",
    horizon: "now",
    impact: "high",
    effort: "low",
    confidence: "high",
    lanes: ["experiment", "metric"],
    prerequisiteEntityIds: ctx.outcomeIds.slice(0, 2),
    relatedEntityIds: matchingEntityIds(ctx.blueprint, ["offer", "customer", "outcome"]).slice(0, 8),
    acceptanceCriteria: [
      "One testable offer promise is written.",
      "Target customers and objections are captured.",
      "A pass/fail signal is named before delivery expansion.",
    ],
    whyItMatters: "Business systems should prove demand before optimizing operations.",
    whyNowOrLater: "Do this now because it reduces the risk of building around an unproven promise.",
    codexPromptSeed: buildPromptSeed(ctx, "Run an offer validation experiment", "turn the business blueprint into a small offer validation experiment"),
  }),
  draft(ctx, {
    key: "business-customer-objections",
    title: "Build a customer objections list",
    description: "Capture likely objections, trust gaps, and proof needs before turning the system into sales material.",
    category: "user-trust",
    horizon: "next",
    impact: "medium",
    effort: "low",
    confidence: "high",
    lanes: ["hidden"],
    prerequisiteEntityIds: matchingEntityIds(ctx.blueprint, ["customer", "offer"]).slice(0, 4),
    relatedEntityIds: matchingEntityIds(ctx.blueprint, ["customer", "trust", "proof"]).slice(0, 8),
    acceptanceCriteria: [
      "At least five objections are named.",
      "Each objection maps to proof, delivery, price, or risk.",
      "Unanswered objections become decision records or open questions.",
    ],
    whyItMatters: "Objections reveal missing capabilities before the system reaches customers.",
    whyNowOrLater: "Do this after the offer is explicit and before scaling acquisition.",
    codexPromptSeed: buildPromptSeed(ctx, "Build a customer objections list", "derive a customer objection and proof checklist from the business blueprint"),
  }),
  draft(ctx, {
    key: "business-fulfillment-checklist",
    title: "Create a fulfillment checklist",
    description: "Turn delivery promises into operational steps, owners, quality checks, and handoff points.",
    category: "operations",
    horizon: "next",
    impact: "high",
    effort: "medium",
    confidence: "high",
    lanes: ["codex", "metric"],
    prerequisiteEntityIds: matchingEntityIds(ctx.blueprint, ["delivery", "operations"]).slice(0, 6),
    relatedEntityIds: matchingEntityIds(ctx.blueprint, ["delivery", "operations", "risk"]).slice(0, 8),
    acceptanceCriteria: [
      "Every delivery promise has a checkable step.",
      "Bottlenecks and owner gaps are visible.",
      "Revenue or pricing assumptions do not hide delivery cost.",
    ],
    whyItMatters: "An offer is only useful if delivery can keep the promise.",
    whyNowOrLater: "Do this before revenue scaling or team growth.",
    codexPromptSeed: buildPromptSeed(ctx, "Create a fulfillment checklist", "create an operational fulfillment checklist from the business blueprint"),
  }),
  draft(ctx, {
    key: "business-pricing-assumptions",
    title: "Clarify pricing and revenue assumptions",
    description: "Make pricing, cost, conversion, and capacity assumptions explicit before treating the model as reliable.",
    category: "monetization",
    horizon: "next",
    impact: "high",
    effort: "medium",
    confidence: "medium",
    lanes: ["metric", "risk"],
    prerequisiteEntityIds: matchingEntityIds(ctx.blueprint, ["revenue", "pricing"]).slice(0, 4),
    relatedEntityIds: matchingEntityIds(ctx.blueprint, ["revenue", "pricing", "cost", "capacity"]).slice(0, 8),
    acceptanceCriteria: [
      "Pricing assumptions are named.",
      "Delivery cost and capacity assumptions are named.",
      "Unknowns are captured as open questions or experiments.",
    ],
    whyItMatters: "Revenue logic is fragile when assumptions are implicit.",
    whyNowOrLater: "Do this before dashboards, automation, or team scale.",
    codexPromptSeed: buildPromptSeed(ctx, "Clarify pricing and revenue assumptions", "write a pricing and revenue assumption review from the business blueprint"),
  }),
  draft(ctx, {
    key: "business-bottleneck-proof-map",
    title: "Map bottlenecks and proof assets",
    description: "Identify the delivery bottlenecks, proof assets, trust signals, and missing evidence that could block sales or fulfillment.",
    category: "operations",
    horizon: "next",
    impact: "medium",
    effort: "low",
    confidence: "high",
    lanes: ["hidden", "metric"],
    prerequisiteEntityIds: matchingEntityIds(ctx.blueprint, ["delivery", "operations", "risk"]).slice(0, 6),
    relatedEntityIds: matchingEntityIds(ctx.blueprint, ["bottleneck", "proof", "trust", "delivery", "customer"]).slice(0, 8),
    acceptanceCriteria: [
      "Top bottlenecks are named.",
      "Each trust claim has a proof asset or an evidence gap.",
      "Missing proof becomes future work, not hidden sales copy.",
    ],
    whyItMatters: "Bottlenecks and proof gaps usually surface before a business system can scale.",
    whyNowOrLater: "Do this after the offer and revenue assumptions are explicit.",
    codexPromptSeed: buildPromptSeed(ctx, "Map bottlenecks and proof assets", "derive a bottleneck and proof-asset map from the business blueprint"),
  }),
  draft(ctx, {
    key: "business-scale-team-not-yet",
    title: "Scale the team",
    description: "Team scale should wait until offer, delivery, revenue, and bottleneck assumptions are proven.",
    category: "operations",
    horizon: "not-yet",
    impact: "medium",
    effort: "high",
    confidence: "high",
    lanes: ["risk"],
    prerequisiteEntityIds: ctx.projectIds,
    relatedEntityIds: ctx.projectIds,
    acceptanceCriteria: [
      "Delivery process is proven.",
      "Revenue assumptions are tested.",
      "Bottleneck map identifies where extra capacity helps.",
    ],
    whyItMatters: "Adding people before delivery is proven can increase complexity without increasing value.",
    whyNowOrLater: "Not yet because the operating system needs proof first.",
    codexPromptSeed: buildPromptSeed(ctx, "Scale the team", "document why team scaling belongs outside the current business-system MVP"),
  }),
];

const coachingDrafts = (ctx: ForesightContext): ForesightDraft[] => [
  draft(ctx, {
    key: "coaching-intake-quality-checks",
    title: "Add client intake quality checks",
    description: "Check whether goals, constraints, readiness, and boundaries are explicit before designing interventions.",
    category: "quality",
    horizon: "now",
    impact: "high",
    effort: "low",
    confidence: "high",
    lanes: ["test", "codex"],
    prerequisiteEntityIds: matchingEntityIds(ctx.blueprint, ["intake", "client", "assessment"]).slice(0, 6),
    relatedEntityIds: matchingEntityIds(ctx.blueprint, ["intake", "client", "goal"]).slice(0, 8),
    acceptanceCriteria: [
      "Client goal, constraints, and readiness are checkable.",
      "Missing intake information blocks plan confidence.",
      "Safety boundaries remain visible.",
    ],
    whyItMatters: "Coaching quality depends on what is known before intervention design.",
    whyNowOrLater: "Do this now because weak intake makes adaptation unreliable.",
    codexPromptSeed: buildPromptSeed(ctx, "Add client intake quality checks", "add deterministic intake quality checks to the coaching blueprint"),
  }),
  draft(ctx, {
    key: "coaching-safety-boundaries",
    title: "Strengthen safety boundaries",
    description: "Make scope, contraindications, escalation points, and non-advice boundaries visible before delivery.",
    category: "user-trust",
    horizon: "now",
    impact: "high",
    effort: "medium",
    confidence: "high",
    lanes: ["risk", "codex"],
    prerequisiteEntityIds: ctx.governanceIds.slice(0, 8),
    relatedEntityIds: matchingEntityIds(ctx.blueprint, ["safety", "boundaries", "risk"]).slice(0, 8),
    acceptanceCriteria: [
      "Safety boundaries are explicit.",
      "Escalation or referral conditions are named when relevant.",
      "Automation does not replace human assessment.",
    ],
    whyItMatters: "Coaching systems need visible boundaries to preserve trust.",
    whyNowOrLater: "Do this before delivery automation or personalization.",
    codexPromptSeed: buildPromptSeed(ctx, "Strengthen safety boundaries", "review coaching-system safety boundaries without adding external services"),
  }),
  draft(ctx, {
    key: "coaching-feedback-loop",
    title: "Design a feedback loop",
    description: "Define how client feedback, progress signals, and constraints adjust the plan.",
    category: "product",
    horizon: "next",
    impact: "high",
    effort: "medium",
    confidence: "high",
    lanes: ["metric", "experiment"],
    prerequisiteEntityIds: matchingEntityIds(ctx.blueprint, ["feedback", "adaptation", "track"]).slice(0, 6),
    relatedEntityIds: ctx.functionIds.slice(0, 6),
    acceptanceCriteria: [
      "Progress signals are named.",
      "Feedback can change plan recommendations.",
      "Changes remain inspectable to the coach or user.",
    ],
    whyItMatters: "Adaptation is the difference between static content and a coaching system.",
    whyNowOrLater: "Do this after intake and safety checks are explicit.",
    codexPromptSeed: buildPromptSeed(ctx, "Design a feedback loop", "define feedback and adaptation rules for the coaching blueprint"),
  }),
  draft(ctx, {
    key: "coaching-progress-explanation-templates",
    title: "Prepare progress signals and explanation templates",
    description: "Name the progress signals, adaptation rules, and coach-facing explanation templates that make plan changes understandable.",
    category: "user-trust",
    horizon: "next",
    impact: "medium",
    effort: "low",
    confidence: "high",
    lanes: ["metric", "hidden", "codex"],
    prerequisiteEntityIds: matchingEntityIds(ctx.blueprint, ["feedback", "adaptation", "progress"]).slice(0, 6),
    relatedEntityIds: matchingEntityIds(ctx.blueprint, ["coach", "explanation", "progress", "plan"]).slice(0, 8),
    acceptanceCriteria: [
      "Progress signals are named in plain language.",
      "Adaptation rules explain why the plan changes.",
      "Coach-facing copy does not overstate certainty.",
    ],
    whyItMatters: "Coaching systems need transparent adaptation so users and coaches trust plan changes.",
    whyNowOrLater: "Do this after intake and safety boundaries are reliable.",
    codexPromptSeed: buildPromptSeed(ctx, "Prepare progress signals and explanation templates", "draft progress-signal and coach-facing explanation templates"),
  }),
  draft(ctx, {
    key: "coaching-automation-not-yet",
    title: "Automated coaching adjustments",
    description: "Automation should wait until assessment logic and feedback rules are reliable.",
    category: "automation",
    horizon: "not-yet",
    impact: "high",
    effort: "high",
    confidence: "high",
    lanes: ["risk"],
    prerequisiteEntityIds: ctx.governanceIds.slice(0, 4),
    relatedEntityIds: ctx.projectIds,
    acceptanceCriteria: [
      "Assessment quality is validated.",
      "Feedback loop has proven signals.",
      "Safety boundaries are explicit and reviewed.",
    ],
    whyItMatters: "Premature automation can make coaching advice feel authoritative without enough context.",
    whyNowOrLater: "Not yet because reliable assessment should come first.",
    codexPromptSeed: buildPromptSeed(ctx, "Automated coaching adjustments", "document automation prerequisites for the coaching blueprint"),
  }),
];

const contentDrafts = (ctx: ForesightContext): ForesightDraft[] => [
  draft(ctx, {
    key: "content-audience-proof",
    title: "Gather audience proof",
    description: "Collect concrete signals that the message, audience, and trust claims fit a real audience.",
    category: "growth",
    horizon: "now",
    impact: "high",
    effort: "low",
    confidence: "high",
    lanes: ["experiment", "metric"],
    prerequisiteEntityIds: matchingEntityIds(ctx.blueprint, ["audience", "message"]).slice(0, 6),
    relatedEntityIds: matchingEntityIds(ctx.blueprint, ["audience", "trust", "proof"]).slice(0, 8),
    acceptanceCriteria: [
      "Audience proof is concrete, not assumed.",
      "Trust claims map to evidence.",
      "Message tests do not require a large campaign.",
    ],
    whyItMatters: "Brand frameworks get stronger when audience proof guides the message.",
    whyNowOrLater: "Do this now before scaling distribution.",
    codexPromptSeed: buildPromptSeed(ctx, "Gather audience proof", "turn the content blueprint into audience proof experiments"),
  }),
  draft(ctx, {
    key: "content-pillar-testing",
    title: "Test content pillars",
    description: "Run small content tests to see which pillars create trust, clarity, and conversion movement.",
    category: "growth",
    horizon: "next",
    impact: "medium",
    effort: "medium",
    confidence: "medium",
    lanes: ["experiment", "metric"],
    prerequisiteEntityIds: matchingEntityIds(ctx.blueprint, ["pillar", "content"]).slice(0, 6),
    relatedEntityIds: ctx.functionIds.slice(0, 6),
    acceptanceCriteria: [
      "Each pillar has one test asset.",
      "A useful signal is defined before posting.",
      "Weak pillars can be retired without changing the whole framework.",
    ],
    whyItMatters: "Pillar testing prevents the framework from becoming a static opinion map.",
    whyNowOrLater: "Do this after the core message and audience are clear.",
    codexPromptSeed: buildPromptSeed(ctx, "Test content pillars", "create a concise content pillar testing plan"),
  }),
  draft(ctx, {
    key: "content-trust-claims-audit",
    title: "Audit trust claims",
    description: "Review every proof, authority, transformation, or conversion claim for evidence and overstatement risk.",
    category: "user-trust",
    horizon: "now",
    impact: "high",
    effort: "low",
    confidence: "high",
    lanes: ["risk", "codex"],
    prerequisiteEntityIds: ctx.governanceIds.slice(0, 6),
    relatedEntityIds: matchingEntityIds(ctx.blueprint, ["trust", "proof", "claim"]).slice(0, 8),
    acceptanceCriteria: [
      "Claims are supported by evidence or softened.",
      "Trust proof is mapped to audience concerns.",
      "Conversion copy does not overpromise.",
    ],
    whyItMatters: "Trust can be lost quickly when brand claims exceed proof.",
    whyNowOrLater: "Do this before distribution cadence or conversion optimization.",
    codexPromptSeed: buildPromptSeed(ctx, "Audit trust claims", "audit brand trust claims and proof language"),
  }),
  draft(ctx, {
    key: "content-distribution-conversion-path",
    title: "Define distribution cadence and conversion path",
    description: "Set a sustainable publishing cadence, channel focus, conversion path, and repurposing workflow before scaling output.",
    category: "growth",
    horizon: "next",
    impact: "medium",
    effort: "medium",
    confidence: "medium",
    lanes: ["metric", "codex"],
    prerequisiteEntityIds: matchingEntityIds(ctx.blueprint, ["distribution", "conversion", "audience"]).slice(0, 6),
    relatedEntityIds: matchingEntityIds(ctx.blueprint, ["cadence", "conversion", "distribution", "repurposing"]).slice(0, 8),
    acceptanceCriteria: [
      "Cadence is realistic for the team.",
      "Conversion path is explicit.",
      "Repurposing does not dilute the core message.",
    ],
    whyItMatters: "Distribution only compounds when message, cadence, and conversion path fit together.",
    whyNowOrLater: "Do this after audience proof and pillar testing.",
    codexPromptSeed: buildPromptSeed(ctx, "Define distribution cadence and conversion path", "create a concise distribution, conversion, and repurposing plan"),
  }),
  draft(ctx, {
    key: "content-large-campaign-not-yet",
    title: "Large campaign rollout",
    description: "A large campaign should wait until message, audience proof, and conversion path are validated.",
    category: "growth",
    horizon: "not-yet",
    impact: "medium",
    effort: "high",
    confidence: "high",
    lanes: ["risk"],
    prerequisiteEntityIds: ctx.outcomeIds.slice(0, 1),
    relatedEntityIds: ctx.projectIds,
    acceptanceCriteria: [
      "Message and audience proof are validated.",
      "A distribution cadence is sustainable.",
      "Conversion path is clear.",
    ],
    whyItMatters: "Scale amplifies weak message-market fit.",
    whyNowOrLater: "Not yet because proof should precede campaign scale.",
    codexPromptSeed: buildPromptSeed(ctx, "Large campaign rollout", "document why campaign scale is not in current content MVP"),
  }),
];

const bookDrafts = (ctx: ForesightContext): ForesightDraft[] => [
  draft(ctx, {
    key: "book-thesis-stress-test",
    title: "Run a thesis stress test",
    description: "Challenge the thesis against reader objections, competing explanations, and evidence gaps.",
    category: "quality",
    horizon: "now",
    impact: "high",
    effort: "low",
    confidence: "high",
    lanes: ["experiment", "codex"],
    prerequisiteEntityIds: matchingEntityIds(ctx.blueprint, ["thesis", "argument"]).slice(0, 6),
    relatedEntityIds: matchingEntityIds(ctx.blueprint, ["thesis", "evidence", "reader"]).slice(0, 8),
    acceptanceCriteria: [
      "The thesis can be stated in one sentence.",
      "Top objections are named.",
      "Evidence gaps become scope items or open questions.",
    ],
    whyItMatters: "Long-form work becomes clearer when the thesis survives pressure.",
    whyNowOrLater: "Do this now before expanding sections or publication plans.",
    codexPromptSeed: buildPromptSeed(ctx, "Run a thesis stress test", "stress-test the thesis and identify evidence gaps"),
  }),
  draft(ctx, {
    key: "book-argument-map",
    title: "Build an argument map",
    description: "Map claims, evidence, sections, and reader promise so the draft has a coherent spine.",
    category: "product",
    horizon: "next",
    impact: "high",
    effort: "medium",
    confidence: "high",
    lanes: ["codex"],
    prerequisiteEntityIds: matchingEntityIds(ctx.blueprint, ["argument", "section", "evidence"]).slice(0, 6),
    relatedEntityIds: ctx.functionIds.slice(0, 6),
    acceptanceCriteria: [
      "Each section serves the thesis.",
      "Claims have evidence or are flagged.",
      "Reader promise remains visible.",
    ],
    whyItMatters: "An argument map prevents section sprawl and unsupported claims.",
    whyNowOrLater: "Do this after the thesis is clear.",
    codexPromptSeed: buildPromptSeed(ctx, "Build an argument map", "turn the book blueprint into an argument map"),
  }),
  draft(ctx, {
    key: "book-evidence-reader-promise",
    title: "Inventory evidence gaps and reader promise",
    description: "List unsupported claims, missing evidence, reader objections, and the promise each section must fulfill.",
    category: "quality",
    horizon: "now",
    impact: "high",
    effort: "medium",
    confidence: "high",
    lanes: ["risk", "codex"],
    prerequisiteEntityIds: matchingEntityIds(ctx.blueprint, ["evidence", "reader", "claim"]).slice(0, 6),
    relatedEntityIds: matchingEntityIds(ctx.blueprint, ["evidence", "reader", "promise", "section"]).slice(0, 8),
    acceptanceCriteria: [
      "Evidence gaps are listed.",
      "Reader promise is explicit.",
      "Unsupported claims become open questions or future research.",
    ],
    whyItMatters: "Evidence gaps and reader promise determine whether long-form work earns trust.",
    whyNowOrLater: "Do this before expanding the outline or publication path.",
    codexPromptSeed: buildPromptSeed(ctx, "Inventory evidence gaps and reader promise", "identify evidence gaps and reader-promise risks"),
  }),
  draft(ctx, {
    key: "book-outline-publication-path",
    title: "Prepare outline sections and publication path",
    description: "Turn the argument map into section-level outline decisions, then defer publication planning until the draft spine is strong.",
    category: "operations",
    horizon: "later",
    impact: "medium",
    effort: "medium",
    confidence: "medium",
    lanes: ["hidden"],
    prerequisiteEntityIds: matchingEntityIds(ctx.blueprint, ["section", "draft", "publication"]).slice(0, 6),
    relatedEntityIds: matchingEntityIds(ctx.blueprint, ["outline", "section", "publication", "distribution"]).slice(0, 8),
    acceptanceCriteria: [
      "Sections support the thesis in order.",
      "Publication path does not drive first-draft scope.",
      "Distribution ideas stay in expansion until the outline is strong.",
    ],
    whyItMatters: "A publication path is useful only after the thesis and sections are coherent.",
    whyNowOrLater: "Later because the first job is a strong outline and evidence base.",
    codexPromptSeed: buildPromptSeed(ctx, "Prepare outline sections and publication path", "outline sections and capture publication path as later work"),
  }),
  draft(ctx, {
    key: "book-publication-campaign-not-yet",
    title: "Publication campaign",
    description: "Publication and promotion should wait until thesis, outline, and evidence are strong.",
    category: "growth",
    horizon: "not-yet",
    impact: "medium",
    effort: "high",
    confidence: "high",
    lanes: ["risk"],
    prerequisiteEntityIds: matchingEntityIds(ctx.blueprint, ["publication", "distribution"]).slice(0, 4),
    relatedEntityIds: ctx.projectIds,
    acceptanceCriteria: [
      "Thesis is stable.",
      "Outline and evidence are coherent.",
      "Reader promise has been reviewed.",
    ],
    whyItMatters: "Promotion cannot compensate for a weak argument.",
    whyNowOrLater: "Not yet because the draft spine should come first.",
    codexPromptSeed: buildPromptSeed(ctx, "Publication campaign", "capture publication campaign prerequisites as future work"),
  }),
];

const sopDrafts = (ctx: ForesightContext): ForesightDraft[] => [
  draft(ctx, {
    key: "sop-step-owners",
    title: "Assign an owner to each step",
    description: "Make each workflow step accountable by naming the owner, handoff, and done state.",
    category: "operations",
    horizon: "now",
    impact: "high",
    effort: "low",
    confidence: "high",
    lanes: ["codex", "metric"],
    prerequisiteEntityIds: matchingEntityIds(ctx.blueprint, ["steps", "roles"]).slice(0, 6),
    relatedEntityIds: ctx.functionIds.slice(0, 6),
    acceptanceCriteria: [
      "Every critical step has an owner.",
      "Handoffs are visible.",
      "Done state is checkable.",
    ],
    whyItMatters: "Unowned steps are where workflows break.",
    whyNowOrLater: "Do this now before automation or training materials.",
    codexPromptSeed: buildPromptSeed(ctx, "Assign an owner to each step", "add step ownership and done-state guidance to the SOP blueprint"),
  }),
  draft(ctx, {
    key: "sop-exception-handling",
    title: "Add exception handling",
    description: "Document what happens when inputs are missing, checks fail, or a handoff is blocked.",
    category: "operations",
    horizon: "next",
    impact: "high",
    effort: "medium",
    confidence: "high",
    lanes: ["risk", "test"],
    prerequisiteEntityIds: matchingEntityIds(ctx.blueprint, ["checks", "output", "steps"]).slice(0, 6),
    relatedEntityIds: ctx.governanceIds,
    acceptanceCriteria: [
      "Common exceptions have a response path.",
      "Failed checks do not silently pass.",
      "Manual escalation remains clear.",
    ],
    whyItMatters: "Workflow quality depends on what happens when the happy path fails.",
    whyNowOrLater: "Do this after the baseline steps and owners are explicit.",
    codexPromptSeed: buildPromptSeed(ctx, "Add exception handling", "define exception paths for the SOP blueprint"),
  }),
  draft(ctx, {
    key: "sop-trigger-handoff-metrics",
    title: "Clarify trigger, handoffs, quality checks, and metrics",
    description: "Make the start condition, done state, handoff points, quality checks, and operating metrics explicit.",
    category: "operations",
    horizon: "now",
    impact: "high",
    effort: "medium",
    confidence: "high",
    lanes: ["metric", "test", "codex"],
    prerequisiteEntityIds: matchingEntityIds(ctx.blueprint, ["trigger", "checks", "output"]).slice(0, 6),
    relatedEntityIds: matchingEntityIds(ctx.blueprint, ["trigger", "handoff", "quality", "metric", "output"]).slice(0, 8),
    acceptanceCriteria: [
      "Trigger and done state are checkable.",
      "Handoff points have owners.",
      "Quality metrics tell whether the workflow is working.",
    ],
    whyItMatters: "A workflow is hard to train or improve when trigger, handoff, checks, and metrics are implicit.",
    whyNowOrLater: "Do this before automation or team training.",
    codexPromptSeed: buildPromptSeed(ctx, "Clarify trigger, handoffs, quality checks, and metrics", "strengthen SOP trigger, handoff, quality check, and metrics guidance"),
  }),
  draft(ctx, {
    key: "sop-automation-not-yet",
    title: "Automate the workflow",
    description: "Automation should wait until triggers, owners, exceptions, and quality checks are reliable manually.",
    category: "automation",
    horizon: "not-yet",
    impact: "high",
    effort: "high",
    confidence: "high",
    lanes: ["risk"],
    prerequisiteEntityIds: ctx.functionIds.slice(0, 4),
    relatedEntityIds: ctx.projectIds,
    acceptanceCriteria: [
      "Manual workflow is proven.",
      "Exceptions are handled.",
      "Quality checks have stable acceptance criteria.",
    ],
    whyItMatters: "Automation can scale mistakes when the manual workflow is unclear.",
    whyNowOrLater: "Not yet because manual clarity comes first.",
    codexPromptSeed: buildPromptSeed(ctx, "Automate the workflow", "capture workflow automation as future scope only"),
  }),
];

const genericDrafts = (ctx: ForesightContext): ForesightDraft[] => [
  draft(ctx, {
    key: "generic-user-validation-experiment",
    title: "Run a small user validation experiment",
    description: "Test whether the framework helps a real user make a better decision or implementation plan.",
    category: "product",
    horizon: "now",
    impact: "high",
    effort: "low",
    confidence: "high",
    lanes: ["experiment", "metric"],
    prerequisiteEntityIds: ctx.outcomeIds.slice(0, 2),
    relatedEntityIds: ctx.functionIds.slice(0, 4),
    acceptanceCriteria: [
      "A target user can complete one practical workflow.",
      "The result is more specific than the starting idea.",
      "Validation or quality weaknesses are visible.",
    ],
    whyItMatters: "A framework is useful only if it improves user judgment or implementation readiness.",
    whyNowOrLater: "Do this now after the blueprint is structurally complete.",
    codexPromptSeed: buildPromptSeed(ctx, "Run a small user validation experiment", "design a small validation experiment for the blueprint"),
  }),
  draft(ctx, {
    key: "generic-governance-review",
    title: "Review governance before implementation",
    description: "Check that rules, invariants, guardrails, decisions, and failure modes still match the raw idea.",
    category: "governance",
    horizon: "now",
    impact: "medium",
    effort: "low",
    confidence: "high",
    lanes: ["risk", "codex"],
    prerequisiteEntityIds: ctx.governanceIds.slice(0, 8),
    relatedEntityIds: ctx.governanceIds,
    acceptanceCriteria: [
      "Governance names are clear.",
      "Failure modes include mitigations.",
      "Decision records explain tradeoffs.",
    ],
    whyItMatters: "Governance prevents a framework from becoming a list of unreviewed ideas.",
    whyNowOrLater: "Do this before exporting implementation tasks.",
    codexPromptSeed: buildPromptSeed(ctx, "Review governance before implementation", "audit governance language and failure modes without deleting user content"),
  }),
  draft(ctx, {
    key: "generic-collaboration-not-yet",
    title: "Collaboration workflow",
    description: "Collaboration should wait until the single-user blueprint, validation, quality, foresight, and export loop is stable.",
    category: "growth",
    horizon: "not-yet",
    impact: "medium",
    effort: "high",
    confidence: "medium",
    lanes: ["risk"],
    prerequisiteEntityIds: ctx.projectIds,
    relatedEntityIds: ctx.projectIds,
    acceptanceCriteria: [
      "Single-user flow is stable.",
      "Review and conflict rules are designed.",
      "Local-first data expectations remain explicit.",
    ],
    whyItMatters: "Collaboration can obscure whether the core framework loop works.",
    whyNowOrLater: "Not yet because product coherence matters first.",
    codexPromptSeed: buildPromptSeed(ctx, "Collaboration workflow", "record collaboration as future work without changing storage architecture"),
  }),
];

const templateDrafts = {
  "praxis-feature": praxisDrafts,
  "software-app": softwareDrafts,
  "business-system": businessDrafts,
  "coaching-system": coachingDrafts,
  "content-brand-framework": contentDrafts,
  "book-white-paper": bookDrafts,
  "sop-workflow": sopDrafts,
  "generic-framework": genericDrafts,
} satisfies Record<FrameworkTemplateId, (ctx: ForesightContext) => ForesightDraft[]>;

const createContext = (
  blueprint: ProjectBlueprint,
  template: FrameworkTemplateDefinition,
): ForesightContext => {
  const validation = validateBlueprint(blueprint);
  const reviewedBlueprint = structuredClone(blueprint);
  reviewedBlueprint.validation = validation;
  const quality = buildBlueprintQualityReview(reviewedBlueprint);
  const plan = buildBlueprintImprovementPlan(reviewedBlueprint);
  const text = [
    reviewedBlueprint.project.rawIdea,
    reviewedBlueprint.project.corePhilosophy,
    reviewedBlueprint.intent.summary,
    reviewedBlueprint.intent.problemStatement,
    reviewedBlueprint.intent.targetAudience,
    ...reviewedBlueprint.outcomes.map((item) => `${item.name} ${item.description} ${item.successMetric}`),
    ...reviewedBlueprint.mvpScope.items.map((item) => `${item.name} ${item.description} ${item.rationale}`),
    ...reviewedBlueprint.expansionScope.items.map((item) => `${item.name} ${item.description} ${item.rationale}`),
    ...reviewedBlueprint.failureModes.map((item) => `${item.name} ${item.description} ${item.mitigation}`),
  ].join(" ");
  const exportEntityIds = matchingEntityIds(reviewedBlueprint, [
    "export",
    "codex",
    "prompt",
    "json",
    "markdown",
    "checklist",
    "handoff",
    "output",
    "artifact",
  ]);
  const riskEntityIds = matchingEntityIds(reviewedBlueprint, [
    "risk",
    "safety",
    "trust",
    "failure",
    "guardrail",
    "invariant",
    "validation",
  ]);

  return {
    blueprint: reviewedBlueprint,
    template,
    validationBuildReady: validation.buildReady,
    qualityScore: quality.overallScore,
    qualityGrade: quality.grade,
    safeFixCount: plan.safeFixes.length,
    manualFixCount: plan.manualFixes.length,
    sourceSignals: [
      `Template: ${template.label}`,
      validation.buildReady ? "Validation build-ready" : "Validation needs work",
      `Quality: ${quality.overallScore}/100 (${quality.grade})`,
      plan.safeFixes.length > 0 ? `${plan.safeFixes.length} safe quality fix(es) available` : "No safe quality fixes pending",
    ],
    projectIds: [reviewedBlueprint.project.id, reviewedBlueprint.intent.id],
    governanceIds: [
      ...reviewedBlueprint.rules.map((item) => item.id),
      ...reviewedBlueprint.invariants.map((item) => item.id),
      ...reviewedBlueprint.guardrails.map((item) => item.id),
      ...reviewedBlueprint.decisionLogic.records.map((item) => item.id),
      ...reviewedBlueprint.failureModes.map((item) => item.id),
    ],
    outcomeIds: reviewedBlueprint.outcomes.map((item) => item.id),
    functionIds: reviewedBlueprint.functions.map((item) => item.id),
    componentIds: reviewedBlueprint.components.map((item) => item.id),
    exportEntityIds,
    riskEntityIds,
    text,
  };
};

const toItem = (
  ctx: ForesightContext,
  itemDraft: ForesightDraft,
): BlueprintForesightItem => ({
  id: `foresight-${ctx.template.id}-${slug(itemDraft.key || itemDraft.title)}`,
  title: itemDraft.title,
  description: itemDraft.description,
  category: itemDraft.category,
  horizon: itemDraft.horizon,
  impact: itemDraft.impact,
  effort: itemDraft.effort,
  confidence: itemDraft.confidence,
  sourceSignals: unique(itemDraft.sourceSignals ?? ctx.sourceSignals),
  prerequisiteEntityIds: unique(itemDraft.prerequisiteEntityIds ?? []),
  relatedEntityIds: unique(itemDraft.relatedEntityIds ?? []),
  acceptanceCriteria: unique(itemDraft.acceptanceCriteria),
  whyItMatters: itemDraft.whyItMatters,
  whyNowOrLater: itemDraft.whyNowOrLater,
  codexPromptSeed: itemDraft.codexPromptSeed,
});

const uniqueItemsById = (items: BlueprintForesightItem[]): BlueprintForesightItem[] => {
  const seen = new Set<string>();
  const next: BlueprintForesightItem[] = [];

  items.forEach((item) => {
    if (seen.has(item.id)) {
      return;
    }

    seen.add(item.id);
    next.push(item);
  });

  return next;
};

const rankItems = (items: BlueprintForesightItem[]): BlueprintForesightItem[] =>
  [...items].sort((left, right) => {
    const impactDelta = levelRank(right.impact) - levelRank(left.impact);
    if (impactDelta !== 0) return impactDelta;

    const effortDelta = effortRank(right.effort) - effortRank(left.effort);
    if (effortDelta !== 0) return effortDelta;

    return levelRank(right.confidence) - levelRank(left.confidence);
  });

const strategicPositionFor = (ctx: ForesightContext): BlueprintStrategicPosition => {
  if (!ctx.validationBuildReady || ctx.qualityGrade === "weak") {
    return "needs-clarity";
  }

  if (ctx.safeFixCount > 0 || ctx.manualFixCount > 2 || ctx.qualityScore < 70) {
    return "foundation";
  }

  if (
    ctx.qualityScore >= 94 &&
    ctx.blueprint.expansionScope.items.length >= 6 &&
    ctx.blueprint.decisionLogic.records.length >= 4 &&
    ctx.blueprint.failureModes.length >= 4
  ) {
    return "scale-ready";
  }

  if (ctx.qualityScore >= 85 && ctx.blueprint.expansionScope.items.length >= 3) {
    return "expansion-ready";
  }

  return "mvp-ready";
};

const summaryFor = (ctx: ForesightContext, position: BlueprintStrategicPosition): string => {
  switch (position) {
    case "needs-clarity":
      return "Foresight is available, but the blueprint should resolve validation or clarity issues before acting on future opportunities.";
    case "foundation":
      return "The blueprint has a useful foundation; the next move is to tighten quality and governance before broader expansion.";
    case "mvp-ready":
      return "The blueprint is ready to support first-build decisions; foresight should guide tests, handoff, and the next careful iteration.";
    case "expansion-ready":
      return "The blueprint is strong enough to evaluate expansion opportunities while keeping MVP boundaries intact.";
    case "scale-ready":
      return "The blueprint has enough structure, governance, and expansion clarity to consider scale patterns deliberately.";
  }
};

const selectRecommendedNextMove = (items: BlueprintForesightItem[]): BlueprintForesightItem | null =>
  rankItems(items.filter((item) => item.horizon === "now"))[0] ??
  rankItems(items.filter((item) => item.horizon === "next"))[0] ??
  null;

export const listBlueprintForesightItems = (
  foresight: BlueprintForesight,
): BlueprintForesightItem[] =>
  uniqueItemsById([
    ...foresight.now,
    ...foresight.next,
    ...foresight.later,
    ...foresight.hiddenOpportunities,
    ...foresight.risksToWatch,
    ...foresight.notYet,
    ...foresight.suggestedExperiments,
    ...foresight.suggestedMetrics,
    ...foresight.suggestedTests,
    ...foresight.suggestedCodexTasks,
  ]);

export const buildBlueprintForesight = (blueprint: ProjectBlueprint): BlueprintForesight => {
  const template = describeFrameworkTemplateForBlueprint(blueprint);
  const ctx = createContext(blueprint, template);
  const drafts = [
    ...commonDrafts(ctx),
    ...templateDrafts[template.id](ctx),
  ];
  const items = uniqueItemsById(drafts.map((itemDraft) => toItem(ctx, itemDraft)));
  const itemsByLane = (lane: ForesightLane): BlueprintForesightItem[] =>
    items.filter((item) => drafts.find((itemDraft) => `foresight-${ctx.template.id}-${slug(itemDraft.key || itemDraft.title)}` === item.id)?.lanes?.includes(lane));
  const strategicPosition = strategicPositionFor(ctx);
  const rankedItems = rankItems(items);
  const now = rankItems(rankedItems.filter((item) => item.horizon === "now"));
  const next = rankItems(rankedItems.filter((item) => item.horizon === "next"));
  const later = rankItems(rankedItems.filter((item) => item.horizon === "later"));
  const notYet = rankItems(rankedItems.filter((item) => item.horizon === "not-yet"));
  const recommendedNextMove =
    strategicPosition === "needs-clarity"
      ? now.find((item) => item.id.endsWith("repair-clarity-before-expansion")) ?? selectRecommendedNextMove(items)
      : selectRecommendedNextMove(items);

  return {
    overallSummary: summaryFor(ctx, strategicPosition),
    strategicPosition,
    now,
    next,
    later,
    hiddenOpportunities: rankItems(itemsByLane("hidden")),
    risksToWatch: rankItems(uniqueItemsById([...itemsByLane("risk"), ...items.filter((item) => item.category === "governance" && item.impact === "high")])),
    notYet,
    recommendedNextMove,
    templateSignals: [
      `Detected template: ${template.label}`,
      template.promptGuidance,
      ctx.validationBuildReady ? "Validation currently supports build-ready." : "Validation should be fixed before build-ready claims.",
      `Quality review: ${ctx.qualityScore}/100 (${ctx.qualityGrade}).`,
      ctx.safeFixCount > 0
        ? `${ctx.safeFixCount} safe quality fix(es) are available before acting on foresight.`
        : "No safe quality fixes are pending.",
    ],
    suggestedExperiments: rankItems(itemsByLane("experiment")),
    suggestedMetrics: rankItems(itemsByLane("metric")),
    suggestedTests: rankItems(itemsByLane("test")),
    suggestedCodexTasks: rankItems(itemsByLane("codex")),
  };
};
