import type { ProjectBlueprint } from "@/domain/models";

export type FrameworkTemplateId =
  | "software-app"
  | "praxis-feature"
  | "business-system"
  | "coaching-system"
  | "content-brand-framework"
  | "book-white-paper"
  | "sop-workflow"
  | "generic-framework";

export type FrameworkTemplateDefinition = {
  id: FrameworkTemplateId;
  label: string;
  description: string;
  suggestedDomains: string[];
  suggestedFunctions: string[];
  suggestedComponents: string[];
  suggestedRules: string[];
  suggestedInvariants: string[];
  suggestedGuardrails: string[];
  suggestedPhases: string[];
  suggestedMvpItems: string[];
  suggestedExpansionItems: string[];
  suggestedFailureModes: string[];
  promptGuidance: string;
  keywords: string[];
};

export const frameworkTemplates: FrameworkTemplateDefinition[] = [
  {
    id: "software-app",
    label: "Software App",
    description: "Shapes a product or SaaS idea into app workflow, components, data, validation, and delivery.",
    suggestedDomains: [
      "Product Intent",
      "User Experience",
      "Application Logic",
      "Data / Persistence",
      "Validation / Quality",
      "Delivery / Export",
    ],
    suggestedFunctions: [
      "Capture user goal",
      "Model core workflow",
      "Define application components",
      "Validate requirements",
      "Prepare build prompt",
    ],
    suggestedComponents: [
      "Goal Intake",
      "Workflow Modeler",
      "Component Planner",
      "Data and Persistence Plan",
      "Validation Panel",
      "Build Prompt Export",
    ],
    suggestedRules: [
      "User workflow must remain explicit",
      "Data persistence assumptions must stay visible",
      "Validation must block incomplete app requirements",
    ],
    suggestedInvariants: [
      "Core app workflow remains traceable",
      "Components map to required app behavior",
      "Data and local persistence assumptions remain explicit",
      "MVP and expansion scope remain separate",
    ],
    suggestedGuardrails: [
      "Prevent UI components without mapped behavior",
      "Prevent hidden persistence assumptions",
      "Prevent expansion features from entering MVP",
    ],
    suggestedPhases: ["Product Definition", "Workflow and Component Model", "Validation", "Build Handoff"],
    suggestedMvpItems: [
      "Capture user goal",
      "Model core app workflow",
      "Define MVP components",
      "Validate requirements and readiness",
      "Export build prompt",
    ],
    suggestedExpansionItems: [
      "User accounts and collaboration",
      "Advanced analytics",
      "Multi-device sync",
      "Template marketplace",
    ],
    suggestedFailureModes: [
      "Workflow is unclear to the target user",
      "Components are built without data assumptions",
      "Expansion features dilute MVP implementation",
    ],
    promptGuidance:
      "Emphasize app workflow, UI components, data and persistence assumptions, validation, and implementation handoff.",
    keywords: ["app", "application", "software", "saas", "platform", "product", "web app", "mobile app"],
  },
  {
    id: "praxis-feature",
    label: "Praxis Feature",
    description: "Shapes a Praxis feature into user intent, engine logic, UI experience, safety, and Codex handoff.",
    suggestedDomains: [
      "User Intent",
      "Praxis Engine / Logic",
      "UI Experience",
      "Validation and Safety",
      "Export / Implementation Handoff",
    ],
    suggestedFunctions: [
      "Capture feature intent",
      "Protect existing Praxis invariants",
      "Define implementation boundary",
      "Validate readiness",
      "Export Codex task",
    ],
    suggestedComponents: [
      "Feature Intake",
      "Praxis Logic Boundary",
      "Experience Surface",
      "Safety Review Panel",
      "Codex Task Export",
    ],
    suggestedRules: [
      "Feature work must preserve existing Praxis behavior",
      "Implementation must respect progression and phase gating",
      "MVP changes must stay separate from future Praxis ideas",
    ],
    suggestedInvariants: [
      "Do not weaken program generation logic",
      "Do not bypass progression or phase gating",
      "Keep MVP separate from expansion",
      "Preserve user trust and coaching clarity",
    ],
    suggestedGuardrails: [
      "Prevent changes that weaken Praxis program logic",
      "Prevent hidden coaching or safety assumptions",
      "Prevent future feature ideas from entering MVP",
    ],
    suggestedPhases: ["Feature Intent", "Logic Boundary", "Experience and Safety Review", "Codex Handoff"],
    suggestedMvpItems: [
      "Capture raw feature idea",
      "Define Praxis logic boundary",
      "Validate readiness and safety",
      "Export Codex task",
    ],
    suggestedExpansionItems: [
      "Template library for Praxis features",
      "AI-assisted extraction from long notes",
      "Saved framework versions",
      "Comparison between framework revisions",
      "One-click Codex task generation",
      "Team review and collaboration",
    ],
    suggestedFailureModes: [
      "Generated prompts weaken existing Praxis program logic",
      "Progression or phase gating is bypassed",
      "Expansion scope contaminates the MVP",
    ],
    promptGuidance:
      "Emphasize not breaking existing Praxis program, generator, progression, phase gating, coaching clarity, or user trust.",
    keywords: ["praxis", "program logic", "generator", "progression", "phase gating", "coaching app"],
  },
  {
    id: "business-system",
    label: "Business System",
    description: "Shapes an operating, offer, sales, or delivery system around customers, revenue, risk, and operations.",
    suggestedDomains: ["Offer", "Customer", "Delivery", "Operations", "Revenue", "Risk"],
    suggestedFunctions: [
      "Define offer",
      "Identify customer",
      "Map delivery process",
      "Clarify pricing and revenue",
      "Identify bottlenecks and risks",
    ],
    suggestedComponents: [
      "Offer Canvas",
      "Customer Profile",
      "Delivery Map",
      "Operations Board",
      "Revenue Model",
      "Risk Review",
    ],
    suggestedRules: [
      "Offer promises must match delivery capacity",
      "Revenue assumptions must remain visible",
      "Operational risks must be reviewed before implementation",
    ],
    suggestedInvariants: [
      "Offer stays aligned with customer need",
      "Delivery process remains explicit",
      "Revenue logic remains inspectable",
      "Risks remain visible before scale",
    ],
    suggestedGuardrails: [
      "Prevent vague customer definitions",
      "Prevent unsupported revenue assumptions",
      "Prevent operational risk from being hidden",
    ],
    suggestedPhases: ["Offer Definition", "Customer and Delivery Model", "Operations and Revenue Review", "Risk Review"],
    suggestedMvpItems: [
      "Define core offer",
      "Identify target customer",
      "Map delivery process",
      "Clarify revenue assumptions",
      "Validate business readiness",
    ],
    suggestedExpansionItems: [
      "Additional customer segments",
      "Automated sales workflows",
      "Partner delivery channels",
      "Revenue dashboards",
    ],
    suggestedFailureModes: [
      "Offer is disconnected from customer demand",
      "Delivery process cannot support the promise",
      "Revenue assumptions are untested",
    ],
    promptGuidance:
      "Emphasize offer, customer, delivery, operations, revenue assumptions, bottlenecks, and business risk.",
    keywords: ["business", "offer", "sales", "revenue", "customer", "operations", "service", "go to market"],
  },
  {
    id: "coaching-system",
    label: "Coaching System",
    description: "Shapes a coaching or training system around intake, assessment, intervention, adaptation, and boundaries.",
    suggestedDomains: [
      "Client Intake",
      "Assessment",
      "Program Design",
      "Delivery",
      "Feedback / Adaptation",
      "Safety / Boundaries",
    ],
    suggestedFunctions: [
      "Capture client goal",
      "Assess constraints",
      "Design intervention",
      "Track feedback",
      "Adjust plan",
    ],
    suggestedComponents: [
      "Client Intake Form",
      "Assessment Lens",
      "Program Designer",
      "Delivery Tracker",
      "Feedback Loop",
      "Safety Boundary Review",
    ],
    suggestedRules: [
      "Client constraints must shape the plan",
      "Feedback must inform adaptation",
      "Safety boundaries must stay explicit",
    ],
    suggestedInvariants: [
      "Client goal remains visible",
      "Assessment constraints remain respected",
      "Plan adaptation remains feedback-driven",
      "Safety boundaries remain explicit",
    ],
    suggestedGuardrails: [
      "Prevent generic interventions without assessment",
      "Prevent ignored client constraints",
      "Prevent hidden safety or scope boundaries",
    ],
    suggestedPhases: ["Client Intake", "Assessment", "Program Design", "Delivery and Adaptation"],
    suggestedMvpItems: [
      "Capture client goal",
      "Assess constraints",
      "Design initial intervention",
      "Track feedback",
      "Validate safety boundaries",
    ],
    suggestedExpansionItems: [
      "Progress dashboards",
      "Coach-client messaging",
      "Template intervention library",
      "Outcome analytics",
    ],
    suggestedFailureModes: [
      "Plan ignores client constraints",
      "Feedback is not used to adapt the plan",
      "Safety boundaries are unclear",
    ],
    promptGuidance:
      "Emphasize intake, assessment, intervention design, feedback adaptation, safety boundaries, and client clarity.",
    keywords: ["coaching", "coach", "training clients", "client", "intervention", "program design", "assessment"],
  },
  {
    id: "content-brand-framework",
    label: "Content / Brand Framework",
    description: "Shapes message, audience, content pillars, proof, distribution, and conversion.",
    suggestedDomains: ["Core Message", "Audience", "Content Pillars", "Distribution", "Trust / Proof", "Conversion"],
    suggestedFunctions: [
      "Define message",
      "Identify audience",
      "Build content pillars",
      "Create posting and asset plan",
      "Preserve brand truth",
    ],
    suggestedComponents: [
      "Message Canvas",
      "Audience Profile",
      "Content Pillar Map",
      "Distribution Planner",
      "Trust Proof Library",
      "Conversion Path",
    ],
    suggestedRules: [
      "Content must support the core message",
      "Audience assumptions must remain explicit",
      "Brand proof must not be overstated",
    ],
    suggestedInvariants: [
      "Core message remains consistent",
      "Audience fit remains explicit",
      "Content pillars support brand truth",
      "Trust proof remains honest",
    ],
    suggestedGuardrails: [
      "Prevent generic content without audience fit",
      "Prevent claims without proof",
      "Prevent distribution plans that dilute the message",
    ],
    suggestedPhases: ["Message Definition", "Audience and Pillars", "Distribution Plan", "Trust and Conversion Review"],
    suggestedMvpItems: [
      "Define core message",
      "Identify target audience",
      "Build content pillars",
      "Create initial distribution plan",
      "Validate trust proof",
    ],
    suggestedExpansionItems: [
      "Campaign calendar",
      "Multi-channel repurposing",
      "Audience testing",
      "Conversion analytics",
    ],
    suggestedFailureModes: [
      "Message becomes generic",
      "Audience is too broad",
      "Trust claims lack proof",
    ],
    promptGuidance:
      "Emphasize audience, message, content pillars, trust proof, distribution, and conversion boundaries.",
    keywords: ["content", "brand", "media", "newsletter", "social", "marketing", "creator", "pillar"],
  },
  {
    id: "book-white-paper",
    label: "Book / White Paper",
    description: "Shapes long-form thinking around thesis, audience, argument, evidence, sections, and publication.",
    suggestedDomains: ["Thesis", "Audience", "Argument Structure", "Evidence", "Sections", "Publication / Distribution"],
    suggestedFunctions: [
      "Define thesis",
      "Structure argument",
      "Map sections",
      "Identify supporting evidence",
      "Prepare draft and export",
    ],
    suggestedComponents: [
      "Thesis Canvas",
      "Audience Lens",
      "Argument Map",
      "Evidence Library",
      "Section Planner",
      "Draft Export",
    ],
    suggestedRules: [
      "Arguments must support the thesis",
      "Evidence must remain connected to claims",
      "Sections must serve the intended audience",
    ],
    suggestedInvariants: [
      "Thesis remains explicit",
      "Evidence supports key claims",
      "Section structure remains coherent",
      "Audience promise remains visible",
    ],
    suggestedGuardrails: [
      "Prevent unsupported claims",
      "Prevent section sprawl",
      "Prevent publication scope from entering the first draft too early",
    ],
    suggestedPhases: ["Thesis Definition", "Argument and Evidence Map", "Section Plan", "Draft Export"],
    suggestedMvpItems: [
      "Define thesis",
      "Identify target reader",
      "Structure argument",
      "Map sections",
      "Prepare draft outline",
    ],
    suggestedExpansionItems: [
      "Citation management",
      "Editorial review workflow",
      "Publication campaign",
      "Companion media assets",
    ],
    suggestedFailureModes: [
      "Thesis is unclear",
      "Evidence does not support claims",
      "Sections do not build a coherent argument",
    ],
    promptGuidance:
      "Emphasize thesis, audience, argument structure, evidence, sections, draft/export, and publication boundaries.",
    keywords: ["book", "white paper", "whitepaper", "essay", "paper", "report", "manuscript", "thesis"],
  },
  {
    id: "sop-workflow",
    label: "SOP / Workflow",
    description: "Shapes an operating procedure around triggers, inputs, steps, roles, checks, and output.",
    suggestedDomains: ["Trigger", "Inputs", "Steps", "Roles", "Quality Checks", "Output"],
    suggestedFunctions: [
      "Define start condition",
      "Map steps",
      "Assign roles",
      "Add checks",
      "Define completed output",
    ],
    suggestedComponents: [
      "Trigger Definition",
      "Input Checklist",
      "Step Map",
      "Role Assignment Matrix",
      "Quality Checkpoints",
      "Output Definition",
    ],
    suggestedRules: [
      "Workflow must define its start and done states",
      "Every critical step must have an owner",
      "Quality checks must be visible before output is accepted",
    ],
    suggestedInvariants: [
      "Trigger remains explicit",
      "Steps remain ordered and owned",
      "Quality checks remain inspectable",
      "Completed output remains defined",
    ],
    suggestedGuardrails: [
      "Prevent unowned workflow steps",
      "Prevent missing input requirements",
      "Prevent output acceptance without checks",
    ],
    suggestedPhases: ["Trigger and Inputs", "Step Mapping", "Roles and Checks", "Output Review"],
    suggestedMvpItems: [
      "Define start condition",
      "Map required steps",
      "Assign roles",
      "Add quality checks",
      "Define completed output",
    ],
    suggestedExpansionItems: [
      "Automation triggers",
      "Exception handling",
      "Metrics dashboard",
      "Team training materials",
    ],
    suggestedFailureModes: [
      "Workflow start condition is unclear",
      "Steps lack owners",
      "Completed output is not checkable",
    ],
    promptGuidance:
      "Emphasize trigger, inputs, ordered steps, role ownership, checks, done state, and usable output.",
    keywords: ["sop", "workflow", "process", "procedure", "operations manual", "checklist", "steps"],
  },
  {
    id: "generic-framework",
    label: "Generic Framework",
    description: "Shapes a general idea into intent, framework structure, governance, readiness, and export.",
    suggestedDomains: ["Intent and Context", "Core Framework", "Governance and Readiness", "Implementation Output"],
    suggestedFunctions: [
      "Clarify intake assumptions",
      "Compose governed framework blueprint",
      "Review readiness and governance",
      "Export implementation artifacts",
    ],
    suggestedComponents: [
      "Guided Intake Workspace",
      "Blueprint Composer",
      "Readiness Review Surface",
      "Export Panel",
    ],
    suggestedRules: [
      "Assumptions stay explicit",
      "MVP and expansion remain separate",
      "Build-ready requires connected structure",
    ],
    suggestedInvariants: [
      "The blueprint remains governed by explicit rules, invariants, and scope boundaries",
      "Every component must map to a function",
      "Every function must map to an outcome",
      "MVP scope and expansion scope must remain separate",
    ],
    suggestedGuardrails: [
      "Protect MVP boundary",
      "Keep known risks visible",
      "Prevent hidden assumptions",
    ],
    suggestedPhases: ["MVP Foundation", "Governance Review", "Implementation Output"],
    suggestedMvpItems: [
      "Capture raw idea",
      "Generate connected framework structure",
      "Validate readiness and missing structure",
      "Inspect and refine blueprint",
    ],
    suggestedExpansionItems: [
      "Reusable templates",
      "Advanced export workflows",
      "Collaboration and review",
      "Version comparison",
    ],
    suggestedFailureModes: [
      "Hidden assumptions make the implementation ambiguous",
      "Unmapped entities create confusion",
      "Expansion scope contaminates MVP",
    ],
    promptGuidance:
      "Emphasize explicit assumptions, connected structure, governance, scope separation, validation, and handoff.",
    keywords: ["framework", "decision", "model", "system", "architecture", "blueprint"],
  },
];

const templateById = new Map<FrameworkTemplateId, FrameworkTemplateDefinition>(
  frameworkTemplates.map((template) => [template.id, template]),
);

export const getFrameworkTemplate = (id: FrameworkTemplateId): FrameworkTemplateDefinition => {
  const template = templateById.get(id);
  if (!template) {
    return templateById.get("generic-framework")!;
  }

  return template;
};

export const isFrameworkTemplateId = (value: string): value is FrameworkTemplateId =>
  templateById.has(value as FrameworkTemplateId);

const normalizeForMatch = (value: string): string => value.trim().toLowerCase();

export const inferFrameworkTemplateId = (value: string): FrameworkTemplateId => {
  const normalized = normalizeForMatch(value);
  if (!normalized) {
    return "generic-framework";
  }

  const exactTemplate = frameworkTemplates.find(
    (template) =>
      template.id === normalized ||
      template.label.toLowerCase() === normalized ||
      template.label.toLowerCase().replace(/\s*\/\s*/g, " / ") === normalized,
  );
  if (exactTemplate) {
    return exactTemplate.id;
  }

  const priorityMatches: Array<[FrameworkTemplateId, string[]]> = [
    ["praxis-feature", ["praxis", "program logic", "progression", "phase gating"]],
    ["software-app", ["saas", "software", "app", "application", "platform"]],
    ["coaching-system", ["coaching", "training clients", "coach"]],
    ["business-system", ["business", "offer", "sales", "revenue"]],
    ["content-brand-framework", ["content", "brand", "media"]],
    ["book-white-paper", ["book", "white paper", "whitepaper", "essay"]],
    ["sop-workflow", ["sop", "workflow", "process", "procedure"]],
  ];
  const priorityMatch = priorityMatches.find(([, keywords]) =>
    keywords.some((keyword) => normalized.includes(keyword)),
  );
  if (priorityMatch) {
    return priorityMatch[0];
  }

  const scores = frameworkTemplates.map((template) => ({
    id: template.id,
    score: template.keywords.reduce(
      (score, keyword) => (normalized.includes(keyword.toLowerCase()) ? score + keyword.length : score),
      0,
    ),
  }));
  const best = scores
    .filter((score) => score.id !== "generic-framework")
    .sort((left, right) => right.score - left.score)[0];

  return best && best.score > 0 ? best.id : "generic-framework";
};

export const resolveFrameworkTemplate = (value: string): FrameworkTemplateDefinition =>
  getFrameworkTemplate(inferFrameworkTemplateId(value));

export const describeFrameworkTemplateForBlueprint = (
  blueprint: ProjectBlueprint,
): FrameworkTemplateDefinition => {
  const explicitTemplate = frameworkTemplates.find((template) =>
    blueprint.project.corePhilosophy.toLowerCase().includes(`framework template: ${template.label.toLowerCase()}`),
  );

  if (explicitTemplate) {
    return explicitTemplate;
  }

  return resolveFrameworkTemplate(
    [
      blueprint.project.corePhilosophy,
      blueprint.intent.summary,
      blueprint.intent.problemStatement,
      blueprint.project.rawIdea,
    ].join(" "),
  );
};
