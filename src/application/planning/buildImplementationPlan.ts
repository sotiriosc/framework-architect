import type { ProjectBlueprint, ScopeItem } from "@/domain/models";
import { buildBlueprintForesight } from "@/application/review/buildBlueprintForesight";
import { buildBlueprintImprovementPlan } from "@/application/review/buildBlueprintImprovementPlan";
import { buildBlueprintQualityReview } from "@/application/review/buildBlueprintQualityReview";
import {
  describeFrameworkTemplateForBlueprint,
  type FrameworkTemplateId,
} from "@/application/templates/frameworkTemplates";
import { validateBlueprint } from "@/application/validation/validateBlueprint";

export type BlueprintImplementationReadiness =
  | "not-ready"
  | "ready-for-mvp"
  | "ready-for-sequencing"
  | "ready-for-codex";

export type BlueprintImplementationPhase =
  | "foundation"
  | "core-build"
  | "validation"
  | "ui"
  | "export"
  | "polish"
  | "future";

export type BlueprintImplementationPriority = "must" | "should" | "could" | "defer";
export type BlueprintImplementationTaskScope = "small" | "medium" | "large";

export type BlueprintImplementationTask = {
  id: string;
  title: string;
  description: string;
  expectedFiles: string[];
  relatedEntityIds: string[];
  prerequisites: string[];
  acceptanceCriteria: string[];
  suggestedTests: string[];
  riskNotes: string[];
  codexPrompt: string;
  doNotTouch: string[];
  estimatedScope: BlueprintImplementationTaskScope;
  recommendedBranchName: string;
};

export type BlueprintImplementationTaskGroup = {
  id: string;
  title: string;
  description: string;
  phase: BlueprintImplementationPhase;
  priority: BlueprintImplementationPriority;
  relatedEntityIds: string[];
  tasks: BlueprintImplementationTask[];
};

export type BlueprintCodexTaskPackItem = {
  id: string;
  taskId: string;
  title: string;
  prompt: string;
  relatedEntityIds: string[];
  expectedFiles: string[];
  testsToRun: string[];
};

export type BlueprintDeferredImplementationItem = {
  id: string;
  title: string;
  description: string;
  source: "expansion-scope" | "foresight";
  relatedEntityIds: string[];
};

export type BlueprintImplementationPlan = {
  planSummary: string;
  readiness: BlueprintImplementationReadiness;
  recommendedBuildOrder: string[];
  taskGroups: BlueprintImplementationTaskGroup[];
  codexTaskPack: BlueprintCodexTaskPackItem[];
  testPlan: string[];
  riskControls: string[];
  dependencyWarnings: string[];
  doNotBreak: string[];
  deferredItems: BlueprintDeferredImplementationItem[];
  suggestedBranchName: string;
  suggestedCommitPlan: string[];
  finalAcceptanceChecklist: string[];
};

type FocusDefinition = {
  key: string;
  title: string;
  description: string;
  phase: BlueprintImplementationPhase;
  priority: BlueprintImplementationPriority;
  terms: string[];
  expectedFiles: string[];
  acceptanceCriteria: string[];
  suggestedTests: string[];
  riskNotes: string[];
  doNotTouch: string[];
  estimatedScope: BlueprintImplementationTaskScope;
};

type PlanningContext = {
  blueprint: ProjectBlueprint;
  templateId: FrameworkTemplateId;
  templateLabel: string;
  templateGuidance: string;
  readiness: BlueprintImplementationReadiness;
  qualityGrade: string;
  qualityScore: number;
  safeFixCount: number;
  manualFixCount: number;
  doNotBreak: string[];
  deferredItems: BlueprintDeferredImplementationItem[];
};

const unique = (items: string[]): string[] => [...new Set(items.map((item) => item.trim()).filter(Boolean))];

const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56) || "task";

const includesAny = (value: string, terms: string[]): boolean => {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
};

const entityText = (value: { name: string; description?: string }): string =>
  `${value.name} ${value.description ?? ""}`;

const scopeItemText = (item: ScopeItem): string =>
  `${item.name} ${item.description} ${item.rationale}`;

const relatedEntityIdsForTerms = (
  blueprint: ProjectBlueprint,
  terms: string[],
  options: { includeExpansionScope?: boolean } = {},
): string[] => unique([
  ...blueprint.outcomes.filter((item) => includesAny(`${item.name} ${item.description} ${item.successMetric}`, terms)).map((item) => item.id),
  ...blueprint.actors.filter((item) => includesAny(`${item.name} ${item.description} ${item.role} ${item.needs.join(" ")}`, terms)).map((item) => item.id),
  ...blueprint.domains.filter((item) => includesAny(`${item.name} ${item.description} ${item.responsibility}`, terms)).map((item) => item.id),
  ...blueprint.functions.filter((item) => includesAny(entityText(item), terms)).map((item) => item.id),
  ...blueprint.components.filter((item) => includesAny(`${item.name} ${item.description} ${item.purpose}`, terms)).map((item) => item.id),
  ...blueprint.flows.filter((item) => includesAny(`${item.name} ${item.description} ${item.stepSummary}`, terms)).map((item) => item.id),
  ...blueprint.rules.filter((item) => includesAny(entityText(item), terms)).map((item) => item.id),
  ...blueprint.invariants.filter((item) => includesAny(`${item.name} ${item.description} ${item.violationMessage}`, terms)).map((item) => item.id),
  ...blueprint.guardrails.filter((item) => includesAny(`${item.name} ${item.description} ${item.protectedAgainst}`, terms)).map((item) => item.id),
  ...blueprint.phases.filter((item) => includesAny(`${item.name} ${item.description} ${item.objective}`, terms)).map((item) => item.id),
  ...blueprint.mvpScope.items.filter((item) => includesAny(scopeItemText(item), terms)).map((item) => item.id),
  ...(options.includeExpansionScope
    ? blueprint.expansionScope.items.filter((item) => includesAny(scopeItemText(item), terms)).map((item) => item.id)
    : []),
  ...blueprint.failureModes.filter((item) => includesAny(`${item.name} ${item.description} ${item.mitigation}`, terms)).map((item) => item.id),
]);

const hasExportSignal = (blueprint: ProjectBlueprint): boolean =>
  includesAny(
    [
      ...blueprint.functions.map(entityText),
      ...blueprint.components.map((item) => `${item.name} ${item.description} ${item.purpose}`),
      ...blueprint.mvpScope.items.map(scopeItemText),
    ].join(" "),
    ["export", "codex", "prompt", "json", "markdown", "checklist", "handoff", "artifact"],
  );

const renderPolicyLine = (kind: string, name: string, description: string): string =>
  `${kind}: ${name}${description.trim() ? ` - ${description.trim()}` : ""}`;

const templateDoNotBreak = (templateId: FrameworkTemplateId): string[] => {
  switch (templateId) {
    case "praxis-feature":
      return [
        "Do not break Praxis program generation logic.",
        "Do not break progression logic or phase gating.",
        "Do not weaken validation, existing tests, user trust, or coaching clarity.",
      ];
    case "software-app":
      return [
        "Do not weaken the core app workflow, local persistence assumptions, validation gates, or export/share path.",
      ];
    case "business-system":
      return [
        "Do not make offer, customer, delivery, revenue, or risk assumptions invisible.",
      ];
    case "coaching-system":
      return [
        "Do not bypass client intake, assessment, feedback adaptation, safety boundaries, or client-facing clarity.",
      ];
    case "content-brand-framework":
      return [
        "Do not overstate trust claims, blur audience fit, or mix distribution expansion into MVP content work.",
      ];
    case "book-white-paper":
      return [
        "Do not weaken the thesis, argument structure, evidence trail, section coherence, or publication boundary.",
      ];
    case "sop-workflow":
      return [
        "Do not hide triggers, inputs, owners, quality checks, handoffs, or done-state requirements.",
      ];
    default:
      return [
        "Do not bypass validation, governance, relation mapping, MVP/expansion separation, or local-first assumptions.",
      ];
  }
};

const doNotBreakFor = (blueprint: ProjectBlueprint, templateId: FrameworkTemplateId): string[] =>
  unique([
    ...templateDoNotBreak(templateId),
    ...blueprint.rules.slice(0, 6).map((item) => renderPolicyLine("Rule", item.name, item.description || item.enforcement)),
    ...blueprint.invariants.slice(0, 6).map((item) => renderPolicyLine("Invariant", item.name, item.description || item.violationMessage)),
    ...blueprint.guardrails.slice(0, 6).map((item) => renderPolicyLine("Guardrail", item.name, item.protectedAgainst || item.description)),
    "Do not rewrite the whole project or replace user-authored architecture wholesale.",
    "Do not bypass stable save review, memory snapshots, revision history, quarantine recovery, or schema validation.",
  ]);

const readinessFor = (blueprint: ProjectBlueprint): BlueprintImplementationReadiness => {
  const validation = validateBlueprint(blueprint);
  const reviewedBlueprint = structuredClone(blueprint);
  reviewedBlueprint.validation = validation;
  const quality = buildBlueprintQualityReview(reviewedBlueprint);
  const foresight = buildBlueprintForesight(reviewedBlueprint);
  const hasCriticalFailures = validation.checks.some(
    (check) => check.status === "fail" && check.severity === "critical",
  );

  if (hasCriticalFailures) {
    return "not-ready";
  }

  if (quality.grade === "weak") {
    return "ready-for-mvp";
  }

  const hasMvpScope = reviewedBlueprint.mvpScope.items.length > 0 && reviewedBlueprint.mvpScope.summary.trim().length > 0;
  const hasCoreStructure =
    reviewedBlueprint.functions.length > 0 &&
    reviewedBlueprint.components.length > 0 &&
    reviewedBlueprint.rules.length > 0 &&
    reviewedBlueprint.invariants.length > 0;
  const hasTestSignal =
    foresight.suggestedTests.length > 0 ||
    includesAny(
      [
        ...reviewedBlueprint.functions.map(entityText),
        ...reviewedBlueprint.components.map(entityText),
        ...reviewedBlueprint.phases.map((item) => `${item.name} ${item.description} ${item.objective}`),
      ].join(" "),
      ["test", "validation", "quality", "readiness", "review"],
    );

  if (
    validation.buildReady &&
    ["strong", "excellent"].includes(quality.grade) &&
    hasMvpScope &&
    hasCoreStructure &&
    hasExportSignal(reviewedBlueprint) &&
    hasTestSignal
  ) {
    return "ready-for-codex";
  }

  if (validation.buildReady && ["strong", "excellent"].includes(quality.grade)) {
    return "ready-for-sequencing";
  }

  return "ready-for-mvp";
};

const focusDefinitions = {
  "praxis-feature": [
    {
      key: "feature-intent-boundary",
      title: "Confirm feature intent and implementation boundary",
      description: "Translate the Praxis feature goal into a narrow implementation boundary before code changes.",
      phase: "foundation",
      priority: "must",
      terms: ["feature", "intent", "boundary", "mvp"],
      expectedFiles: ["feature intake or planning module", "README/docs for feature boundary"],
      acceptanceCriteria: ["Feature goal is stated in one sentence.", "MVP boundary and out-of-scope Praxis ideas are explicit."],
      suggestedTests: ["Run existing validation and unit tests before implementation."],
      riskNotes: ["A vague boundary can accidentally pull expansion behavior into MVP."],
      doNotTouch: ["Unrelated Praxis generator internals", "Unrelated persistence or revision systems"],
      estimatedScope: "small",
    },
    {
      key: "protect-praxis-invariants",
      title: "Protect existing Praxis invariants",
      description: "Add or confirm regression coverage around program generation, progression logic, and phase gating.",
      phase: "validation",
      priority: "must",
      terms: ["praxis", "program", "generation", "progression", "phase", "gating", "invariant"],
      expectedFiles: ["Praxis engine tests", "program generation test fixtures", "validation tests"],
      acceptanceCriteria: ["Program generation behavior is covered.", "Progression and phase gating are asserted.", "Existing tests still pass."],
      suggestedTests: ["Run Praxis program generation tests.", "Run progression and phase-gating regression tests.", "Run npm run test."],
      riskNotes: ["Regression coverage should precede feature edits that touch core logic."],
      doNotTouch: ["Unrelated exercise selection logic", "Existing passing test expectations unless the blueprint requires it"],
      estimatedScope: "medium",
    },
    {
      key: "praxis-ui-surface",
      title: "Build the Praxis feature UI surface",
      description: "Implement the smallest visible surface needed for the feature while keeping coaching clarity intact.",
      phase: "ui",
      priority: "should",
      terms: ["ui", "experience", "surface", "trust", "coaching"],
      expectedFiles: ["feature UI component", "feature state hook", "styles"],
      acceptanceCriteria: ["UI explains what changed and what did not change.", "No text overlaps on supported viewports.", "User trust copy remains concise."],
      suggestedTests: ["Run component or smoke tests for the feature UI.", "Manually inspect empty/error states."],
      riskNotes: ["A UI that overpromises coaching certainty can weaken trust."],
      doNotTouch: ["Unrelated navigation", "Unrelated dashboard panels"],
      estimatedScope: "medium",
    },
    {
      key: "praxis-codex-handoff",
      title: "Prepare export and Codex handoff",
      description: "Package the implementation task so Codex receives bounded scope, tests, and do-not-break constraints.",
      phase: "export",
      priority: "should",
      terms: ["export", "codex", "prompt", "handoff", "task"],
      expectedFiles: ["export utility", "Codex prompt template", "MVP checklist"],
      acceptanceCriteria: ["Prompt names files likely touched.", "Prompt includes do-not-break constraints.", "MVP and expansion work remain separate."],
      suggestedTests: ["Export Codex prompt and confirm Praxis constraints are present.", "Run export utility tests."],
      riskNotes: ["A broad task prompt can cause rewrites instead of bounded implementation."],
      doNotTouch: ["Unrelated export formats", "Storage or backend assumptions"],
      estimatedScope: "small",
    },
  ],
  "software-app": [
    {
      key: "model-core-workflow",
      title: "Implement the core app workflow",
      description: "Build the main user path from goal capture through the first useful result.",
      phase: "core-build",
      priority: "must",
      terms: ["workflow", "goal", "user", "product"],
      expectedFiles: ["workflow state module", "core application logic", "workflow tests"],
      acceptanceCriteria: ["The main workflow can be completed once.", "State transitions are explicit.", "No expansion features are required."],
      suggestedTests: ["Run workflow unit tests.", "Run npm run test."],
      riskNotes: ["Workflow ambiguity causes scattered UI and fragile state."],
      doNotTouch: ["Authentication or backend code unless explicitly in MVP"],
      estimatedScope: "medium",
    },
    {
      key: "build-ui-states",
      title: "Build UI states and empty states",
      description: "Implement the screens, empty states, and error states required for the MVP workflow.",
      phase: "ui",
      priority: "must",
      terms: ["ui", "experience", "empty", "error", "state"],
      expectedFiles: ["UI components", "styles", "component tests"],
      acceptanceCriteria: ["Primary screens are usable.", "Empty and error states explain next steps.", "Layout remains stable on mobile and desktop."],
      suggestedTests: ["Run UI/component tests.", "Manual responsive smoke test."],
      riskNotes: ["Missing empty states make the app feel broken during first use."],
      doNotTouch: ["Unrelated design system changes"],
      estimatedScope: "medium",
    },
    {
      key: "data-persistence-validation",
      title: "Wire data, persistence, and validation",
      description: "Connect the workflow to local data handling and validation gates without adding backend assumptions.",
      phase: "foundation",
      priority: "must",
      terms: ["data", "persistence", "validation", "quality"],
      expectedFiles: ["local persistence adapter", "validation module", "persistence tests"],
      acceptanceCriteria: ["Local data survives reload.", "Invalid states show clear feedback.", "Validation blocks incomplete output."],
      suggestedTests: ["Run persistence tests.", "Run validation tests.", "Run npm run build."],
      riskNotes: ["Data loss breaks trust in a local-first app."],
      doNotTouch: ["External auth or database integrations"],
      estimatedScope: "large",
    },
    {
      key: "export-share-path",
      title: "Prepare export or share path",
      description: "Create the implementation handoff path for users to take the app output elsewhere.",
      phase: "export",
      priority: "should",
      terms: ["export", "share", "delivery", "handoff"],
      expectedFiles: ["export utility", "download UI", "export tests"],
      acceptanceCriteria: ["Export output is deterministic.", "Filename is safe.", "Export does not mutate state."],
      suggestedTests: ["Run export tests.", "Parse exported JSON or text where relevant."],
      riskNotes: ["Export/share should not imply accounts or sync unless explicitly accepted."],
      doNotTouch: ["Billing, auth, or backend share services"],
      estimatedScope: "small",
    },
  ],
  "business-system": [
    {
      key: "offer-customer",
      title: "Define offer and customer proof",
      description: "Turn the offer and target customer into testable assumptions.",
      phase: "foundation",
      priority: "must",
      terms: ["offer", "customer", "proof", "trust"],
      expectedFiles: ["offer brief", "customer profile", "validation experiment doc"],
      acceptanceCriteria: ["Offer promise is explicit.", "Customer segment is narrow.", "Proof gaps are listed."],
      suggestedTests: ["Run a customer-objection review.", "Validate offer language with a small user sample."],
      riskNotes: ["A broad customer definition weakens every downstream decision."],
      doNotTouch: ["Scale or hiring plans before delivery is proven"],
      estimatedScope: "small",
    },
    {
      key: "delivery-revenue",
      title: "Map delivery and revenue assumptions",
      description: "Model fulfillment, capacity, pricing, and revenue assumptions before optimizing operations.",
      phase: "core-build",
      priority: "must",
      terms: ["delivery", "revenue", "pricing", "operations"],
      expectedFiles: ["delivery map", "revenue model", "operations checklist"],
      acceptanceCriteria: ["Delivery steps match the offer promise.", "Pricing and capacity assumptions are visible.", "Bottlenecks are named."],
      suggestedTests: ["Run a fulfillment checklist review.", "Stress-test pricing assumptions."],
      riskNotes: ["Revenue assumptions can hide delivery cost and capacity constraints."],
      doNotTouch: ["Automation or dashboards before assumptions are tested"],
      estimatedScope: "medium",
    },
    {
      key: "risk-validation-experiment",
      title: "Run risk and validation experiment",
      description: "Test the highest-risk business assumption before scaling the system.",
      phase: "validation",
      priority: "should",
      terms: ["risk", "validation", "experiment", "bottleneck"],
      expectedFiles: ["risk register", "experiment plan", "decision record"],
      acceptanceCriteria: ["Highest-risk assumption is named.", "Experiment has pass/fail criteria.", "Decision is recorded."],
      suggestedTests: ["Review failure modes and mitigations.", "Run the smallest viable validation experiment."],
      riskNotes: ["Skipping validation can make operations optimize the wrong promise."],
      doNotTouch: ["Team scale or large campaigns"],
      estimatedScope: "small",
    },
  ],
  "coaching-system": [
    {
      key: "intake-assessment",
      title: "Build intake and assessment checks",
      description: "Capture goals, constraints, readiness, and safety signals before intervention design.",
      phase: "foundation",
      priority: "must",
      terms: ["intake", "assessment", "client", "constraints"],
      expectedFiles: ["intake form", "assessment logic", "intake tests"],
      acceptanceCriteria: ["Client goal is explicit.", "Constraints are captured.", "Missing safety data blocks overconfident guidance."],
      suggestedTests: ["Run intake validation tests.", "Test missing/edge client constraint states."],
      riskNotes: ["Weak intake makes coaching outputs unreliable."],
      doNotTouch: ["Automated coaching before assessment logic is reliable"],
      estimatedScope: "medium",
    },
    {
      key: "intervention-feedback",
      title: "Implement intervention design and feedback loop",
      description: "Design the first intervention path and the feedback signals that adapt it.",
      phase: "core-build",
      priority: "must",
      terms: ["intervention", "feedback", "adaptation", "progress"],
      expectedFiles: ["program designer", "feedback loop", "adaptation tests"],
      acceptanceCriteria: ["Intervention maps to assessment.", "Feedback can adjust the plan.", "Adaptation reasons are visible."],
      suggestedTests: ["Run adaptation rule tests.", "Test progress signal scenarios."],
      riskNotes: ["Opaque adaptation can undermine client trust."],
      doNotTouch: ["Safety boundaries", "Client data assumptions"],
      estimatedScope: "large",
    },
    {
      key: "safety-client-clarity",
      title: "Strengthen safety boundaries and client clarity",
      description: "Make coaching boundaries, escalation points, and explanation copy visible.",
      phase: "validation",
      priority: "must",
      terms: ["safety", "boundaries", "clarity", "trust"],
      expectedFiles: ["safety review", "client explanation copy", "boundary tests"],
      acceptanceCriteria: ["Safety boundaries are named.", "Client-facing copy avoids overclaiming.", "Escalation path is visible."],
      suggestedTests: ["Review safety boundary cases.", "Run copy review for overclaiming."],
      riskNotes: ["Safety assumptions should never hide inside implementation details."],
      doNotTouch: ["Medical, legal, or high-risk advice outside scope"],
      estimatedScope: "small",
    },
  ],
  "content-brand-framework": [
    {
      key: "message-audience",
      title: "Define message and audience",
      description: "Clarify the core message, audience, and proof needed before producing content.",
      phase: "foundation",
      priority: "must",
      terms: ["message", "audience", "proof", "trust"],
      expectedFiles: ["message canvas", "audience profile", "proof inventory"],
      acceptanceCriteria: ["Core message is specific.", "Audience is narrow.", "Trust claims map to proof."],
      suggestedTests: ["Run audience proof review.", "Audit trust claims."],
      riskNotes: ["Generic message and broad audience create weak content."],
      doNotTouch: ["Large campaigns before message proof"],
      estimatedScope: "small",
    },
    {
      key: "pillars-distribution-conversion",
      title: "Build pillars, distribution, and conversion path",
      description: "Create content pillars, initial distribution cadence, and a practical conversion path.",
      phase: "core-build",
      priority: "should",
      terms: ["pillar", "distribution", "conversion", "content"],
      expectedFiles: ["content pillar map", "distribution planner", "conversion path"],
      acceptanceCriteria: ["Each pillar supports the message.", "Cadence is sustainable.", "Conversion path is explicit."],
      suggestedTests: ["Run small pillar tests.", "Measure early engagement or conversion signals."],
      riskNotes: ["Distribution can amplify weak message fit."],
      doNotTouch: ["Paid or large campaign rollout before proof"],
      estimatedScope: "medium",
    },
  ],
  "book-white-paper": [
    {
      key: "thesis-argument",
      title: "Stress-test thesis and argument map",
      description: "Turn the thesis into a coherent argument map before drafting sections.",
      phase: "foundation",
      priority: "must",
      terms: ["thesis", "argument", "reader"],
      expectedFiles: ["thesis brief", "argument map", "reader promise"],
      acceptanceCriteria: ["Thesis is one clear sentence.", "Main claims are ordered.", "Reader promise is visible."],
      suggestedTests: ["Run thesis objection review.", "Check claim order against reader promise."],
      riskNotes: ["A weak thesis makes section work sprawl."],
      doNotTouch: ["Publication campaign before outline is strong"],
      estimatedScope: "small",
    },
    {
      key: "evidence-sections-export",
      title: "Map evidence, sections, and draft export",
      description: "Connect evidence to claims, sections, and the first draft/export path.",
      phase: "core-build",
      priority: "should",
      terms: ["evidence", "section", "draft", "export", "publication"],
      expectedFiles: ["evidence library", "section planner", "draft export"],
      acceptanceCriteria: ["Claims have evidence or open questions.", "Sections support the thesis.", "Draft export preserves the outline."],
      suggestedTests: ["Review evidence gaps.", "Export outline and inspect section order."],
      riskNotes: ["Publication pressure can pull expansion work into first draft."],
      doNotTouch: ["Publication campaign automation"],
      estimatedScope: "medium",
    },
  ],
  "sop-workflow": [
    {
      key: "trigger-inputs-steps",
      title: "Define trigger, inputs, and ordered steps",
      description: "Make the workflow start condition, required inputs, and step sequence explicit.",
      phase: "foundation",
      priority: "must",
      terms: ["trigger", "inputs", "steps", "start", "workflow"],
      expectedFiles: ["trigger definition", "input checklist", "step map"],
      acceptanceCriteria: ["Trigger is checkable.", "Inputs are listed.", "Steps are ordered."],
      suggestedTests: ["Walk through workflow from trigger to output.", "Test missing input cases."],
      riskNotes: ["Unclear start conditions cause inconsistent execution."],
      doNotTouch: ["Automation before manual workflow is clear"],
      estimatedScope: "small",
    },
    {
      key: "roles-checks-output",
      title: "Assign roles, quality checks, and output state",
      description: "Add owners, handoffs, checks, and a done-state definition.",
      phase: "validation",
      priority: "must",
      terms: ["roles", "quality", "checks", "output", "done", "handoff"],
      expectedFiles: ["role matrix", "quality checks", "output definition"],
      acceptanceCriteria: ["Each critical step has an owner.", "Checks gate output acceptance.", "Done state is explicit."],
      suggestedTests: ["Run role/handoff review.", "Test failed quality-check paths."],
      riskNotes: ["Unowned steps and missing checks are where SOPs fail."],
      doNotTouch: ["External automation services"],
      estimatedScope: "medium",
    },
  ],
  "generic-framework": [
    {
      key: "mvp-foundation",
      title: "Model the first decision-to-action path",
      description: "Build the smallest path that turns intent, constraints, tradeoffs, and readiness into one useful action brief.",
      phase: "foundation",
      priority: "must",
      terms: ["mvp", "foundation", "intent", "decision", "action"],
      expectedFiles: ["decision model", "action brief surface", "readiness checks"],
      acceptanceCriteria: ["A user can move from intent to first action.", "Action output stays connected to outcomes.", "Readiness review remains visible."],
      suggestedTests: ["Run tests for decision criteria and readiness checks.", "Run npm run test."],
      riskNotes: ["Do not build future automation before the first action path is useful."],
      doNotTouch: ["Backend, auth, billing, or external AI unless explicitly in scope"],
      estimatedScope: "medium",
    },
    {
      key: "governance-export",
      title: "Preserve governance and action brief export",
      description: "Preserve rules, invariants, validation, and the action brief export through the first implementation path.",
      phase: "export",
      priority: "should",
      terms: ["governance", "validation", "export", "handoff"],
      expectedFiles: ["readiness review", "action brief export", "scope boundary checks"],
      acceptanceCriteria: ["Governance remains inspectable.", "Action brief export is deterministic.", "MVP and expansion remain distinct."],
      suggestedTests: ["Run validation tests.", "Run export tests."],
      riskNotes: ["Export text should not silently add future possibilities to first action scope."],
      doNotTouch: ["Persistence format unless required"],
      estimatedScope: "small",
    },
  ],
} satisfies Record<FrameworkTemplateId, FocusDefinition[]>;

const branchNameFor = (blueprint: ProjectBlueprint, suffix: string): string =>
  `implement-${slug(blueprint.project.slug || blueprint.project.name)}-${slug(suffix)}`.slice(0, 96);

const codexPromptFor = (
  ctx: PlanningContext,
  task: Omit<BlueprintImplementationTask, "codexPrompt">,
): string => [
  `Goal: ${task.title}`,
  `Project: ${ctx.blueprint.project.name}`,
  `Template: ${ctx.templateLabel}`,
  `Scope: ${task.description}`,
  "",
  "Files likely touched:",
  ...task.expectedFiles.map((item) => `- ${item}`),
  "",
  "Acceptance criteria:",
  ...task.acceptanceCriteria.map((item) => `- ${item}`),
  "",
  "Tests to run:",
  ...task.suggestedTests.map((item) => `- ${item}`),
  "",
  "Do not break:",
  ...ctx.doNotBreak.map((item) => `- ${item}`),
  "",
  "Do not touch unless required by this task:",
  ...task.doNotTouch.map((item) => `- ${item}`),
  "",
  "Instructions:",
  "- Keep the change small and scoped to this task.",
  "- Do not rewrite the whole app.",
  "- Preserve existing validation, governance, local-first behavior, memory, revisions, stable save review, and quarantine recovery.",
  "- Summarize changed files and verification results when done.",
].join("\n");

const buildTaskGroup = (
  ctx: PlanningContext,
  focus: FocusDefinition,
  index: number,
): BlueprintImplementationTaskGroup => {
  const groupId = `group-${ctx.templateId}-${slug(focus.key)}`;
  const relatedEntityIds = relatedEntityIdsForTerms(ctx.blueprint, focus.terms, {
    includeExpansionScope: focus.phase === "future",
  });
  const taskBase = {
    id: `task-${ctx.templateId}-${slug(focus.key)}`,
    title: focus.title,
    description: focus.description,
    expectedFiles: focus.expectedFiles,
    relatedEntityIds,
    prerequisites: index === 0 ? [] : [`Complete ${focusDefinitions[ctx.templateId][index - 1]!.title}.`],
    acceptanceCriteria: focus.acceptanceCriteria,
    suggestedTests: focus.suggestedTests,
    riskNotes: focus.riskNotes,
    doNotTouch: focus.doNotTouch,
    estimatedScope: focus.estimatedScope,
    recommendedBranchName: branchNameFor(ctx.blueprint, focus.key),
  } satisfies Omit<BlueprintImplementationTask, "codexPrompt">;

  const task: BlueprintImplementationTask = {
    ...taskBase,
    codexPrompt: codexPromptFor(ctx, taskBase),
  };

  return {
    id: groupId,
    title: focus.title,
    description: focus.description,
    phase: focus.phase,
    priority: focus.priority,
    relatedEntityIds,
    tasks: [task],
  };
};

const deferredItemsFor = (blueprint: ProjectBlueprint): BlueprintDeferredImplementationItem[] => {
  const foresight = buildBlueprintForesight(blueprint);
  const expansionItems = blueprint.expansionScope.items.map((item) => ({
    id: `deferred-expansion-${slug(item.id)}`,
    title: item.name,
    description: item.description || item.rationale || "Expansion scope item deferred from MVP implementation.",
    source: "expansion-scope" as const,
    relatedEntityIds: unique([item.id, ...item.outcomeIds, ...item.functionIds, ...item.componentIds]),
  }));
  const foresightItems = [...foresight.later, ...foresight.notYet].map((item) => ({
    id: `deferred-foresight-${slug(item.id)}`,
    title: item.title,
    description: item.description,
    source: "foresight" as const,
    relatedEntityIds: unique([...item.prerequisiteEntityIds, ...item.relatedEntityIds]),
  }));

  return [...expansionItems, ...foresightItems];
};

const dependencyWarningsFor = (blueprint: ProjectBlueprint): string[] => {
  const dependencyValidationFailures = blueprint.validation.checks.filter(
    (check) => check.status === "fail" && /DEPENDENCY|REFERENCE/.test(check.code),
  );

  return unique([
    ...dependencyValidationFailures.map((check) => `${check.code}: ${check.message}`),
    ...(blueprint.dependencies.length === 0
      ? ["No explicit dependencies are modeled; confirm implementation order before assigning tasks."]
      : blueprint.dependencies.map((item) => `${item.name}: ${item.sourceEntityId} -> ${item.targetEntityId}`)),
  ]);
};

const riskControlsFor = (blueprint: ProjectBlueprint): string[] => {
  const foresight = buildBlueprintForesight(blueprint);

  return unique([
    ...blueprint.failureModes.slice(0, 6).map((item) => `${item.name}: ${item.mitigation || item.description}`),
    ...foresight.risksToWatch.slice(0, 6).map((item) => `${item.title}: ${item.whyItMatters}`),
  ]);
};

const createPlanningContext = (blueprint: ProjectBlueprint): PlanningContext => {
  const next = structuredClone(blueprint);
  next.validation = validateBlueprint(next);
  const template = describeFrameworkTemplateForBlueprint(next);
  const quality = buildBlueprintQualityReview(next);
  const improvementPlan = buildBlueprintImprovementPlan(next);

  return {
    blueprint: next,
    templateId: template.id,
    templateLabel: template.label,
    templateGuidance: template.promptGuidance,
    readiness: readinessFor(next),
    qualityGrade: quality.grade,
    qualityScore: quality.overallScore,
    safeFixCount: improvementPlan.safeFixes.length,
    manualFixCount: improvementPlan.manualFixes.length,
    doNotBreak: doNotBreakFor(next, template.id),
    deferredItems: deferredItemsFor(next),
  };
};

export const listImplementationPlanTasks = (
  plan: BlueprintImplementationPlan,
): BlueprintImplementationTask[] => plan.taskGroups.flatMap((group) => group.tasks);

export const findImplementationPlanTask = (
  plan: BlueprintImplementationPlan,
  taskId: string,
): BlueprintImplementationTask | null =>
  listImplementationPlanTasks(plan).find((task) => task.id === taskId) ?? null;

export const findImplementationDeferredItem = (
  plan: BlueprintImplementationPlan,
  deferredItemId: string,
): BlueprintDeferredImplementationItem | null =>
  plan.deferredItems.find((item) => item.id === deferredItemId) ?? null;

export const buildImplementationPlan = (blueprint: ProjectBlueprint): BlueprintImplementationPlan => {
  const ctx = createPlanningContext(blueprint);
  const taskGroups = focusDefinitions[ctx.templateId].map((focus, index) => buildTaskGroup(ctx, focus, index));
  const tasks = taskGroups.flatMap((group) => group.tasks);
  const codexTaskPack = tasks.map((task) => ({
    id: `codex-pack-${task.id}`,
    taskId: task.id,
    title: task.title,
    prompt: task.codexPrompt,
    relatedEntityIds: task.relatedEntityIds,
    expectedFiles: task.expectedFiles,
    testsToRun: task.suggestedTests,
  }));
  const mvpTaskGroups = taskGroups.filter((group) => group.priority !== "defer" && group.phase !== "future");
  const recommendedBuildOrder = mvpTaskGroups.map((group, index) => `${index + 1}. ${group.title}`);
  const suggestedCommitPlan = mvpTaskGroups.map(
    (group, index) => `Commit ${index + 1}: ${group.phase} - ${group.title}`,
  );
  const testPlan = unique([
    ...tasks.flatMap((task) => task.suggestedTests),
    "Run npm run build.",
    "Run npm run test.",
  ]);
  const finalAcceptanceChecklist = unique([
    "No critical validation failures remain.",
    "Quality review is strong enough for implementation or remaining manual fixes are documented.",
    "Every MVP task group meets its acceptance criteria.",
    "Codex task prompts include bounded scope, expected files, tests, and do-not-break constraints.",
    "MVP checklist excludes deferred and not-yet work.",
    "Exports still preserve rules, invariants, guardrails, and validation expectations.",
  ]);
  const readinessCopy = {
    "not-ready": "The blueprint has critical validation failures; fix validation before implementation.",
    "ready-for-mvp": "The blueprint can support MVP planning, but quality warnings should stay visible.",
    "ready-for-sequencing": "The blueprint is ready for ordered implementation sequencing.",
    "ready-for-codex": "The blueprint is ready for small, Codex-ready implementation tasks.",
  } satisfies Record<BlueprintImplementationReadiness, string>;

  return {
    planSummary: `${readinessCopy[ctx.readiness]} ${ctx.templateLabel} planning is based on ${taskGroups.length} task group${taskGroups.length === 1 ? "" : "s"}, ${ctx.qualityScore}/100 quality, ${ctx.safeFixCount} safe fix${ctx.safeFixCount === 1 ? "" : "es"}, and ${ctx.manualFixCount} manual review fix${ctx.manualFixCount === 1 ? "" : "es"}.`,
    readiness: ctx.readiness,
    recommendedBuildOrder,
    taskGroups,
    codexTaskPack,
    testPlan,
    riskControls: riskControlsFor(ctx.blueprint),
    dependencyWarnings: dependencyWarningsFor(ctx.blueprint),
    doNotBreak: ctx.doNotBreak,
    deferredItems: ctx.deferredItems,
    suggestedBranchName: tasks[0]?.recommendedBranchName ?? branchNameFor(ctx.blueprint, "implementation-plan"),
    suggestedCommitPlan,
    finalAcceptanceChecklist,
  };
};
