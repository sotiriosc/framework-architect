import type { ProjectBlueprint, ScopeItem } from "@/domain/models";
import { buildImplementationPlan } from "@/application/planning/buildImplementationPlan";
import { buildBlueprintForesight } from "@/application/review/buildBlueprintForesight";
import { buildBlueprintQualityReview } from "@/application/review/buildBlueprintQualityReview";
import { describeFrameworkTemplateForBlueprint } from "@/application/templates/frameworkTemplates";

export type BlueprintExpansionReadiness =
  | "not-ready"
  | "mvp-first"
  | "ready-to-plan"
  | "ready-to-sequence";

export type BlueprintExpansionCategory =
  | "ai-agent"
  | "automation"
  | "collaboration"
  | "cloud-sync"
  | "analytics"
  | "templates"
  | "integration"
  | "monetization"
  | "content"
  | "operations"
  | "generic";

export type BlueprintExpansionStageHorizon = "next" | "later" | "not-yet";

export type BlueprintExpansionStage = {
  id: string;
  title: string;
  description: string;
  sequence: number;
  horizon: BlueprintExpansionStageHorizon;
  acceptanceCriteria: string[];
  dependencies: string[];
  riskControls: string[];
};

export type BlueprintExpansionPath = {
  id: string;
  title: string;
  sourceExpansionItemId?: string;
  sourceText: string;
  category: BlueprintExpansionCategory;
  summary: string;
  stages: BlueprintExpansionStage[];
  prerequisites: string[];
  risks: string[];
  notYet: string[];
  suggestedExperiments: string[];
  suggestedMetrics: string[];
  relatedEntityIds: string[];
};

export type BlueprintExpansionRoadmap = {
  summary: string;
  expansionReadiness: BlueprintExpansionReadiness;
  paths: BlueprintExpansionPath[];
  notYet: string[];
  prerequisites: string[];
  riskWarnings: string[];
  recommendedNextExpansion: BlueprintExpansionPath | null;
  templateSignals: string[];
  warnings: string[];
};

type ExpansionSource = {
  id?: string;
  text: string;
  relatedEntityIds: string[];
};

type StageDraft = Omit<BlueprintExpansionStage, "id" | "sequence">;

type CategoryPattern = {
  title: string;
  summary: string;
  stages: StageDraft[];
  prerequisites: string[];
  risks: string[];
  notYet: string[];
  suggestedExperiments: string[];
  suggestedMetrics: string[];
};

const unique = (items: string[]): string[] => [...new Set(items.map((item) => item.trim()).filter(Boolean))];

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/^expansion:\s*/i, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const slug = (value: string): string =>
  normalize(value)
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "expansion";

const cleanSourceText = (value: string): string => value.replace(/^Expansion:\s*/i, "").trim();

const includesAny = (value: string, terms: string[]): boolean => {
  const normalized = normalize(value);
  return terms.some((term) => normalized.includes(normalize(term)));
};

const classifyExpansion = (sourceText: string): BlueprintExpansionCategory => {
  if (includesAny(sourceText, ["AI agent", "agent", "autonomous", "copilot"])) return "ai-agent";
  if (includesAny(sourceText, ["automation", "auto", "one-click"])) return "automation";
  if (includesAny(sourceText, ["team", "collaboration", "review", "comments"])) return "collaboration";
  if (includesAny(sourceText, ["cloud", "sync", "account"])) return "cloud-sync";
  if (includesAny(sourceText, ["analytics", "dashboard", "metrics"])) return "analytics";
  if (includesAny(sourceText, ["template", "library", "marketplace"])) return "templates";
  if (includesAny(sourceText, ["github", "slack", "calendar", "browser extension", "integration"])) return "integration";
  if (includesAny(sourceText, ["billing", "pricing", "paid", "subscription"])) return "monetization";
  if (includesAny(sourceText, ["content", "campaign", "newsletter", "media"])) return "content";
  if (includesAny(sourceText, ["operations", "workflow", "sop", "handoff"])) return "operations";
  return "generic";
};

const stage = (
  title: string,
  description: string,
  horizon: BlueprintExpansionStageHorizon,
  acceptanceCriteria: string[],
  dependencies: string[],
  riskControls: string[],
): StageDraft => ({
  title,
  description,
  horizon,
  acceptanceCriteria,
  dependencies,
  riskControls,
});

const patternFor = (category: BlueprintExpansionCategory): CategoryPattern => {
  switch (category) {
    case "ai-agent":
      return {
        title: "Governed AI agent path",
        summary: "Turns a vague agent idea into a bounded execution path with evidence review, local verification, confirmed writes, and human approval gates.",
        stages: [
          stage(
            "Agent planning harness",
            "User selects one implementation task, the system generates a bounded run packet, an external result is pasted back, and review is based on reported evidence only.",
            "next",
            [
              "One implementation task can produce a bounded agent run packet.",
              "Pasted results are reviewed only against reported evidence.",
              "The execution journal records the packet and review without changing blueprint truth.",
            ],
            ["Build-ready blueprint", "Implementation plan task", "Agent Run Harness"],
            ["Do not execute or verify code directly inside the app.", "Keep packet scope to exactly one task."],
          ),
          stage(
            "Local verification bridge",
            "A local CLI or bridge can inspect files and run tests, then report changed files, test evidence, failures, and followups without automatic merge.",
            "later",
            [
              "Bridge reports changed files, tests, failures, and evidence.",
              "Verification output is separate from blueprint truth until reviewed.",
              "No automatic merge occurs.",
            ],
            ["Stable agent report format", "Local CLI boundary", "Explicit file/test evidence"],
            ["Require user review before trusting bridge output.", "Block silent filesystem or repository-wide access."],
          ),
          stage(
            "Confirmed write actions",
            "The agent can propose edits inside a scoped boundary, the user confirms before write, and stable save/review records any blueprint decisions.",
            "later",
            [
              "Write scope is declared before edits.",
              "User confirmation is required before write actions.",
              "Stable save/review records any blueprint truth changes.",
            ],
            ["Local verification bridge", "Scoped write boundary", "Stable save review"],
            ["Prevent unconfirmed writes.", "Record decisions separately from external execution reports."],
          ),
          stage(
            "Governed semi-autonomous loop",
            "The agent acts only inside blueprint constraints, validation and tests gate advancement, and human approval remains required for truth changes.",
            "not-yet",
            [
              "Agent actions stay inside blueprint constraints.",
              "Validation and tests gate every advancement.",
              "Human approval remains required for truth changes.",
            ],
            ["Confirmed write actions", "Reliable validation/test gate", "Human approval workflow"],
            ["Prevent fully autonomous execution.", "Prevent bypassing validation, review, or scope boundaries."],
          ),
        ],
        prerequisites: [
          "MVP validation is build-ready.",
          "Implementation tasks are bounded and acceptance criteria are explicit.",
          "Agent reports remain supporting evidence until reviewed.",
        ],
        risks: [
          "Users may confuse pasted agent reports with verified code.",
          "Unscoped agent work can modify unrelated files or weaken governance.",
          "Autonomous execution can bypass validation, review, or user trust.",
        ],
        notYet: [
          "fully autonomous execution",
          "automatic merging",
          "unscoped repository-wide edits",
          "bypassing validation/review",
        ],
        suggestedExperiments: [
          "Run one bounded agent packet for the first implementation task and compare the report against acceptance criteria.",
          "Prototype a local verification report format before allowing any write behavior.",
        ],
        suggestedMetrics: [
          "Percent of packet acceptance criteria clearly covered by reports.",
          "Missing suggested tests per pasted agent result.",
          "Unexpected file touch count per run.",
        ],
      };
    case "automation":
      return {
        title: "Governed automation path",
        summary: "Moves from a manual repeatable workflow to previewable and confirmed automation without hiding decisions.",
        stages: [
          stage("Manual repeatable workflow", "Document the manual steps, inputs, outputs, owners, and review points before automating.", "next", ["Manual steps are documented.", "Inputs and outputs are explicit."], ["Validated MVP workflow"], ["Keep manual fallback available."]),
          stage("Assisted one-click preparation", "Prepare the next artifact or packet with one click while leaving preview and confirmation to the user.", "later", ["Prepared output can be previewed.", "User can cancel without side effects."], ["Manual workflow baseline"], ["Do not skip preview."]),
          stage("Guarded automation with preview", "Automate repeated preparation steps with a clear preview before any durable change.", "later", ["Preview names every planned change.", "No durable write happens before confirmation."], ["Preview model", "Stable review"], ["Block hidden writes."]),
          stage("Controlled automation with rollback/confirmation", "Allow confirmed automation only when rollback or explicit confirmation protects the user.", "not-yet", ["Confirmation or rollback path exists.", "Failures are recoverable."], ["Guarded preview", "Recovery path"], ["Keep rollback visible.", "Do not automate irreversible changes first."]),
        ],
        prerequisites: ["Manual workflow is stable.", "Inputs, outputs, and review criteria are explicit."],
        risks: ["Automation may hide important judgment.", "One-click flows can make destructive actions too easy."],
        notYet: ["silent automation", "irreversible automated changes", "automation that skips preview"],
        suggestedExperiments: ["Automate preparation of one low-risk artifact and require preview before use."],
        suggestedMetrics: ["Manual steps removed", "Preview cancellations", "Automation reversions"],
      };
    case "collaboration":
      return {
        title: "Collaboration path",
        summary: "Stages collaboration from clear single-user review into shared artifacts, comments, decisions, and multi-user rules.",
        stages: [
          stage("Single-user review clarity", "Make the current review state understandable before involving other people.", "next", ["One user can tell what is ready, blocked, and deferred."], ["Command center and review panels"], ["Do not add collaboration before review states are clear."]),
          stage("Shareable exported artifact", "Use exported briefs and task packs as the first collaboration handoff.", "later", ["Exported artifacts explain scope, risks, and next steps."], ["Export surface"], ["Label exports as derived artifacts."]),
          stage("Reviewer comments and decision capture", "Capture comments and decisions without treating discussion as blueprint truth until saved.", "later", ["Comments link to entities.", "Accepted decisions use stable save review."], ["Revision history", "Decision records"], ["Separate comments from saved truth."]),
          stage("Multi-user workflow and merge rules", "Define ownership, conflict handling, and merge rules before real-time collaboration.", "not-yet", ["Merge rules are explicit.", "Conflicts have an owner and resolution path."], ["Reviewer decisions", "Storage strategy"], ["Do not overwrite local truth silently."]),
        ],
        prerequisites: ["Single-user review flow is understandable.", "Exported artifacts carry enough context for reviewers."],
        risks: ["Comments may be confused with accepted blueprint truth.", "Multi-user edits can create conflicting project state."],
        notYet: ["silent multi-user merging", "comments treated as saved decisions", "collaboration without conflict rules"],
        suggestedExperiments: ["Send one Markdown brief to a reviewer and capture decisions manually."],
        suggestedMetrics: ["Review comments resolved", "Decision records created from review", "Conflicts prevented"],
      };
    case "cloud-sync":
      return {
        title: "Local-first cloud sync path",
        summary: "Keeps local-first behavior stable before adding backup, optional account sync, or collaborative cloud workspace features.",
        stages: [
          stage("Stable local-first persistence", "Confirm local storage, migration, recovery, and revision history work without required accounts.", "next", ["Local projects load reliably.", "Quarantine recovery remains available."], ["Current local persistence"], ["Do not require accounts for baseline use."]),
          stage("Export/import backup", "Provide explicit backup and restore artifacts before any silent sync behavior.", "later", ["Users can export and re-import project data.", "Backup restore is previewable."], ["Quarantine recovery", "JSON export"], ["Do not replace local data without preview."]),
          stage("Optional account sync", "Add account sync only as an opt-in layer over local truth.", "not-yet", ["Sync is optional.", "Users can continue local-only."], ["Backup/import path", "Conflict model"], ["No silent cloud writes.", "No required login for local use."]),
          stage("Collaborative cloud workspace", "Introduce shared workspace behavior only after ownership, conflict, and rollback rules exist.", "not-yet", ["Workspace ownership is explicit.", "Conflict resolution is reviewable."], ["Optional sync", "Collaboration rules"], ["Do not replace local-first behavior."]),
        ],
        prerequisites: ["Local-first persistence is stable.", "Export/import backup is reliable.", "Conflict handling is designed before sync."],
        risks: ["Cloud sync can silently overwrite local work.", "Required accounts would break the local-first promise.", "Collaborative sync can blur blueprint truth."],
        notYet: ["required accounts", "silent cloud writes", "replacing local-first behavior"],
        suggestedExperiments: ["Test export/import backup before building sync.", "Define conflict examples before adding account state."],
        suggestedMetrics: ["Successful local loads", "Recovery previews completed", "Sync conflicts detected"],
      };
    case "analytics":
      return {
        title: "Analytics path",
        summary: "Stages measurement from useful metric definition to local capture, dashboard summaries, and trend-based guidance.",
        stages: [
          stage("Define useful metrics", "Name the few metrics that would actually improve user decisions.", "next", ["Metrics connect to user decisions.", "Vanity metrics are excluded."], ["Validated blueprint outcomes"], ["Do not measure everything."]),
          stage("Local event or log capture", "Capture events locally before sending or aggregating data elsewhere.", "later", ["Events are locally inspectable.", "Privacy assumptions are explicit."], ["Metric definitions"], ["Keep capture minimal and transparent."]),
          stage("Dashboard summary", "Summarize metrics in a focused dashboard that explains readiness, risk, or usage.", "later", ["Dashboard answers one clear question.", "Empty states are understandable."], ["Local events"], ["Do not imply certainty beyond available data."]),
          stage("Trend-based guidance", "Use trends to suggest next reviews or improvements without making automatic truth changes.", "not-yet", ["Guidance is advisory.", "Trend assumptions are visible."], ["Dashboard history"], ["Do not automate decisions from weak trends."]),
        ],
        prerequisites: ["Clear outcome metrics exist.", "Data capture is local and reviewable first."],
        risks: ["Analytics may become vanity reporting.", "Data capture can create privacy or trust concerns."],
        notYet: ["opaque tracking", "automatic decisions from analytics", "sharing analytics without consent"],
        suggestedExperiments: ["Track one local readiness metric and show it in a summary."],
        suggestedMetrics: ["Metric usage", "Decision changes caused by metrics", "Unclear metric removals"],
      };
    case "templates":
      return {
        title: "Template library path",
        summary: "Moves from canonical fixtures to reusable templates, user-created variants, and a governed library or marketplace.",
        stages: [
          stage("Canonical fixtures", "Prove templates with paste-ready fixtures and regression tests.", "next", ["Fixtures cover supported template types.", "Regression tests protect inference and outputs."], ["Template registry"], ["Do not expose noisy fixtures in the main UI."]),
          stage("Reusable templates", "Turn stable fixture patterns into reusable templates with clear labels and expected structure.", "later", ["Templates produce validated blueprints.", "Template guidance remains inspectable."], ["Canonical fixtures"], ["Do not hide template assumptions."]),
          stage("User-created templates", "Allow users to save their own patterns after validation and review.", "later", ["Saved templates pass validation checks.", "User template scope is visible."], ["Reusable templates", "Stable save review"], ["Prevent invalid templates from spreading."]),
          stage("Marketplace or library", "Share templates only after provenance, quality, and compatibility checks exist.", "not-yet", ["Published templates include provenance.", "Compatibility is checked before use."], ["User-created templates", "Review workflow"], ["Do not treat third-party templates as trusted truth."]),
        ],
        prerequisites: ["Canonical fixtures exist.", "Template outputs are validated across multiple seed types."],
        risks: ["Template sprawl can make outputs generic.", "Unreviewed templates can weaken blueprint quality."],
        notYet: ["unreviewed marketplace templates", "template publishing without provenance", "template changes that bypass tests"],
        suggestedExperiments: ["Promote one fixture into a reusable template candidate and compare outputs."],
        suggestedMetrics: ["Template inference accuracy", "Validation pass rate per template", "User template reuse"],
      };
    case "integration":
      return {
        title: "Governed integration path",
        summary: "Starts with exports and manual handoff before adding connectors, browser extensions, or two-way integrations.",
        stages: [
          stage("Export/import path", "Use explicit files as the first integration boundary.", "next", ["Exported artifacts include enough context.", "Imports are previewable before restore."], ["Export panel", "Recovery preview"], ["Do not write into external systems silently."]),
          stage("Manual handoff", "Define the exact handoff format and review step for the external tool.", "later", ["Handoff includes scope and expected result format.", "Return evidence is reviewable."], ["Export/import path"], ["Keep external reports separate from blueprint truth."]),
          stage("Connector or browser extension", "Add a connector only after manual handoff proves the shape and risk controls.", "not-yet", ["Connector actions are scoped.", "User can inspect data before sending."], ["Manual handoff", "Permission model"], ["Do not add broad permissions first."]),
          stage("Governed two-way integration", "Allow two-way updates only with conflict handling, preview, and stable save review.", "not-yet", ["Inbound changes are previewed.", "Accepted changes use stable save review."], ["Connector", "Conflict model"], ["Prevent silent inbound truth changes."]),
        ],
        prerequisites: ["Export/import flow is reliable.", "External handoff format is explicit.", "Permission boundaries are designed."],
        risks: ["Integration can leak more context than intended.", "Inbound updates can bypass stable review."],
        notYet: ["unscoped external permissions", "silent two-way writes", "inbound changes without preview"],
        suggestedExperiments: ["Run one manual external handoff and capture the result format gaps."],
        suggestedMetrics: ["Manual handoff success", "Connector permission scope", "Inbound changes reviewed"],
      };
    case "monetization":
      return {
        title: "Monetization path",
        summary: "Defers billing until value, paid boundaries, prototype flow, and entitlement rules are clear.",
        stages: [
          stage("Prove unpaid value", "Confirm the core workflow delivers value before pricing or billing work.", "next", ["Users can complete the valuable workflow without payment.", "Value evidence is recorded."], ["Validated MVP"], ["Do not monetize before the promise is clear."]),
          stage("Define paid boundary", "Name exactly what becomes paid and what remains available.", "later", ["Paid features are explicit.", "Free/local-first expectations are preserved."], ["Value evidence"], ["Avoid hiding essential trust features behind unclear plans."]),
          stage("Billing prototype", "Prototype billing only after pricing, plan, and entitlement assumptions are reviewable.", "not-yet", ["Billing flow can be tested safely.", "Plan assumptions are documented."], ["Paid boundary"], ["No real billing until reviewed."]),
          stage("Plan and entitlement enforcement", "Enforce paid access only after users can inspect plan rules and failure states.", "not-yet", ["Entitlements are deterministic.", "Failure states are humane and reversible."], ["Billing prototype"], ["Do not block local truth unexpectedly."]),
        ],
        prerequisites: ["Core value is proven.", "Paid/free boundary is explicit.", "Billing assumptions are reviewed."],
        risks: ["Billing can distract from value proof.", "Entitlements can block access to local project truth."],
        notYet: ["required billing for local use", "unclear paid boundaries", "real payments before review"],
        suggestedExperiments: ["Write a pricing boundary note and test whether users understand it."],
        suggestedMetrics: ["Value moments observed", "Paid-boundary comprehension", "Upgrade intent"],
      };
    case "content":
      return {
        title: "Content expansion path",
        summary: "Stages content growth from a proof-backed message into distribution, conversion, and larger media bets.",
        stages: [
          stage("Proof-backed message pilot", "Test one content thread against the audience promise and available proof.", "next", ["Message matches the audience.", "Proof is linked to claims."], ["Core message", "Audience definition"], ["Do not overclaim."]),
          stage("Repeatable distribution lane", "Choose one distribution lane and repeat it before expanding channels.", "later", ["Cadence is sustainable.", "Channel feedback is reviewed."], ["Message pilot"], ["Do not split attention too early."]),
          stage("Conversion path", "Connect content to a clear next action without overselling.", "later", ["Conversion promise matches proof.", "Next action is explicit."], ["Distribution lane", "Proof assets"], ["Keep claims grounded."]),
          stage("Scaled media system", "Scale into larger media or campaigns only after the core message and conversion path hold.", "not-yet", ["Scaled content preserves the message.", "Production effort is sustainable."], ["Conversion path"], ["Do not scale unclear positioning."]),
        ],
        prerequisites: ["Core message is explicit.", "Audience and proof assets are inspectable."],
        risks: ["Content can drift into broad positioning.", "Conversion copy can overpromise."],
        notYet: ["multi-channel sprawl", "conversion without proof", "large media bets before message fit"],
        suggestedExperiments: ["Publish one proof-backed content piece and record audience response."],
        suggestedMetrics: ["Audience response quality", "Proof references used", "Conversion clarity"],
      };
    case "operations":
      return {
        title: "Operations expansion path",
        summary: "Builds from manual handoff clarity into owned workflows, exception tracking, and operational scaling.",
        stages: [
          stage("Manual handoff baseline", "Define the current handoff, trigger, owner, and done state.", "next", ["Trigger, owner, and done state are visible.", "Required inputs are named."], ["Current MVP workflow"], ["Do not automate unclear handoffs."]),
          stage("Standardized owners and checks", "Assign owners and checks so repeated work has accountable review points.", "later", ["Each step has an owner.", "Checks are visible before completion."], ["Manual handoff baseline"], ["Avoid hidden labor."]),
          stage("Exception tracking", "Record exceptions, skipped checks, and followups before increasing volume.", "later", ["Exceptions name owner and next step.", "Patterns are reviewed."], ["Standard checks"], ["Do not bury exceptions in notes."]),
          stage("Operational scale rules", "Scale volume only after capacity, exceptions, and rollback rules are understood.", "not-yet", ["Capacity is explicit.", "Rollback or recovery path exists."], ["Exception tracking"], ["Do not scale a brittle workflow."]),
        ],
        prerequisites: ["Manual workflow is explicit.", "Owners and done states are defined."],
        risks: ["Operations may depend on hidden labor.", "Exceptions can become normal without review."],
        notYet: ["scaling before capacity review", "hidden handoffs", "exceptions without owner"],
        suggestedExperiments: ["Run the workflow once with explicit owner/check notes."],
        suggestedMetrics: ["Skipped checks", "Exception recurrence", "Handoff time"],
      };
    default:
      return {
        title: "Future option path",
        summary: "Clarifies a future idea before it earns a place in the roadmap.",
        stages: [
          stage("Clarify future intent", "Name what the future option is meant to improve and who it serves.", "next", ["Intent is specific.", "Audience or beneficiary is named."], ["Expansion signal"], ["Do not promote vague ideas into build scope."]),
          stage("Define prerequisites", "List what must be true before the idea is worth building.", "later", ["Prerequisites are explicit.", "MVP dependency is named."], ["Clarified intent"], ["Keep prerequisites separate from MVP work."]),
          stage("Test one small expansion", "Run one small experiment before committing to a broader roadmap.", "later", ["Experiment has a clear outcome.", "Risks are reviewed."], ["Prerequisites"], ["Keep experiment bounded."]),
          stage("Promote into roadmap", "Only promote the option after the experiment proves value and scope.", "not-yet", ["Promotion decision is recorded.", "MVP and expansion remain separate."], ["Small experiment"], ["Do not promote without evidence."]),
        ],
        prerequisites: ["Future intent is clarified.", "MVP dependency is understood."],
        risks: ["The idea may remain too vague to sequence.", "Future scope can leak into MVP work."],
        notYet: ["promoting vague ideas into the build plan", "future scope inside MVP", "roadmap commitment without evidence"],
        suggestedExperiments: ["Write one acceptance test for what this future option would make possible."],
        suggestedMetrics: ["Clarity score", "Prerequisites identified", "Experiment outcome"],
      };
  }
};

const buildStage = (pathId: string, draft: StageDraft, index: number): BlueprintExpansionStage => ({
  ...draft,
  id: `${pathId}-stage-${index + 1}`,
  sequence: index + 1,
});

const createPath = (source: ExpansionSource): BlueprintExpansionPath => {
  const sourceText = cleanSourceText(source.text);
  const category = classifyExpansion(sourceText);
  const pattern = patternFor(category);
  const pathId = `expansion-path-${slug(`${category}-${source.id ?? sourceText}`)}`;

  return {
    id: pathId,
    title: `${pattern.title}: ${sourceText}`,
    sourceExpansionItemId: source.id,
    sourceText,
    category,
    summary: pattern.summary,
    stages: pattern.stages.map((draft, index) => buildStage(pathId, draft, index)),
    prerequisites: pattern.prerequisites,
    risks: pattern.risks,
    notYet: pattern.notYet,
    suggestedExperiments: pattern.suggestedExperiments,
    suggestedMetrics: pattern.suggestedMetrics,
    relatedEntityIds: unique(source.relatedEntityIds),
  };
};

const scopeSource = (item: ScopeItem): ExpansionSource => ({
  id: item.id,
  text: cleanSourceText(item.name),
  relatedEntityIds: unique([item.id, ...item.outcomeIds, ...item.functionIds, ...item.componentIds]),
});

const sourcesFor = (blueprint: ProjectBlueprint): ExpansionSource[] => {
  const itemSources = blueprint.expansionScope.items.map(scopeSource);
  const knownTexts = new Set(itemSources.map((source) => normalize(source.text)));
  const signalSources = blueprint.expansionScope.futureSignals
    .map(cleanSourceText)
    .filter((signal) => signal && !knownTexts.has(normalize(signal)))
    .map((signal) => ({
      text: signal,
      relatedEntityIds: [blueprint.expansionScope.id],
    }));

  return [...itemSources, ...signalSources];
};

const hasCriticalValidationFailures = (blueprint: ProjectBlueprint): boolean =>
  blueprint.validation.checks.some((check) => check.status === "fail" && check.severity === "critical");

const hasThinMvp = (blueprint: ProjectBlueprint): boolean =>
  blueprint.mvpScope.items.length < 2 ||
  blueprint.mvpScope.summary.trim().length < 16 ||
  blueprint.mvpScope.successDefinition.trim().length < 16;

const hasDistinctScope = (blueprint: ProjectBlueprint): boolean => {
  const mvpNames = new Set(blueprint.mvpScope.items.map((item) => normalize(item.name)));
  return blueprint.expansionScope.items.every((item) => !mvpNames.has(normalize(item.name)));
};

const readinessFor = (blueprint: ProjectBlueprint): BlueprintExpansionReadiness => {
  const quality = buildBlueprintQualityReview(blueprint);
  const implementationPlan = buildImplementationPlan(blueprint);

  if (hasCriticalValidationFailures(blueprint)) {
    return "not-ready";
  }

  if (!blueprint.validation.buildReady || hasThinMvp(blueprint) || quality.grade === "weak") {
    return "mvp-first";
  }

  if (implementationPlan.readiness === "ready-for-codex" && hasDistinctScope(blueprint)) {
    return "ready-to-sequence";
  }

  if (quality.grade === "strong" || quality.grade === "excellent") {
    return "ready-to-plan";
  }

  return "mvp-first";
};

const categoryPriority = (category: BlueprintExpansionCategory): number => {
  switch (category) {
    case "ai-agent":
      return 1;
    case "cloud-sync":
    case "collaboration":
      return 2;
    case "automation":
    case "integration":
      return 3;
    case "analytics":
    case "templates":
      return 4;
    case "monetization":
      return 5;
    default:
      return 6;
  }
};

const recommendationFor = (
  paths: BlueprintExpansionPath[],
  readiness: BlueprintExpansionReadiness,
): BlueprintExpansionPath | null => {
  if (paths.length === 0) {
    return null;
  }

  const sorted = [...paths].sort((left, right) =>
    categoryPriority(left.category) - categoryPriority(right.category) || left.title.localeCompare(right.title),
  );

  if (readiness === "not-ready" || readiness === "mvp-first") {
    return sorted[0] ?? null;
  }

  return sorted.find((path) => path.category !== "generic") ?? sorted[0] ?? null;
};

const summaryFor = (
  readiness: BlueprintExpansionReadiness,
  paths: BlueprintExpansionPath[],
  recommended: BlueprintExpansionPath | null,
): string => {
  if (paths.length === 0) {
    return "No expansion paths can be staged yet because no future expansion signals are present.";
  }

  const readinessPhrase =
    readiness === "ready-to-sequence"
      ? "ready to sequence future work"
      : readiness === "ready-to-plan"
        ? "ready to plan future paths"
        : readiness === "mvp-first"
          ? "should stabilize the MVP before expanding"
          : "must resolve validation blockers before expansion planning";

  return `${paths.length} expansion path${paths.length === 1 ? "" : "s"} derived from future scope. The blueprint ${readinessPhrase}. Recommended next expansion: ${recommended?.title ?? "None"}.`;
};

export const buildExpansionRoadmap = (blueprint: ProjectBlueprint): BlueprintExpansionRoadmap => {
  const template = describeFrameworkTemplateForBlueprint(blueprint);
  const foresight = buildBlueprintForesight(blueprint);
  const paths = sourcesFor(blueprint).map(createPath);
  const expansionReadiness = readinessFor(blueprint);
  const recommendedNextExpansion = recommendationFor(paths, expansionReadiness);
  const pathNotYet = paths.flatMap((path) => path.notYet);
  const pathPrerequisites = paths.flatMap((path) => path.prerequisites);
  const pathRisks = paths.flatMap((path) => path.risks);
  const categories = unique(paths.map((path) => path.category));
  const warnings: string[] = [];

  if (paths.length === 0) {
    warnings.push("No expansion scope items or future signals exist yet.");
  }

  if (expansionReadiness === "not-ready") {
    warnings.push("Resolve critical validation failures before expansion planning.");
  } else if (expansionReadiness === "mvp-first") {
    warnings.push("Stabilize MVP scope and quality before sequencing expansion work.");
  }

  if (categories.includes("cloud-sync")) {
    warnings.push("Cloud-sync paths must preserve local-first behavior and avoid required accounts or silent cloud writes.");
  }

  if (categories.includes("ai-agent")) {
    warnings.push("AI-agent paths must not imply direct code execution, code verification, automatic merging, or unscoped autonomous work.");
  }

  const notYet = unique([
    ...pathNotYet,
    ...foresight.notYet.slice(0, 5).map((item) => item.title),
  ]);
  const prerequisites = unique([
    "MVP scope remains separate from expansion scope.",
    ...pathPrerequisites,
  ]);
  const riskWarnings = unique([
    ...pathRisks,
    ...foresight.risksToWatch.slice(0, 5).map((item) => item.title),
  ]);

  return {
    summary: summaryFor(expansionReadiness, paths, recommendedNextExpansion),
    expansionReadiness,
    paths,
    notYet,
    prerequisites,
    riskWarnings,
    recommendedNextExpansion,
    templateSignals: unique([
      `Template: ${template.label}`,
      template.promptGuidance,
      ...categories.map((category) => `Expansion category: ${category}`),
      ...foresight.templateSignals.slice(0, 5),
    ]),
    warnings: unique(warnings),
  };
};
