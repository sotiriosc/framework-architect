import type { FrameworkTemplateId } from "@/application/templates/frameworkTemplates";

export type TemplateSmokeFixture = {
  id: string;
  title: string;
  expectedTemplateId: FrameworkTemplateId;
  expectedDomainTerms: string[];
  expectedFunctionTerms: string[];
  expectedComponentTerms: string[];
  expectedPlanGroupTerms: string[];
  expectedCodexEmphasis: string;
  expectedMvpTerms: string[];
  expectedExpansionTerms: string[];
  expectedHiddenOpportunityTerm: string;
  text: string;
};

export const templateSmokeFixtures: TemplateSmokeFixture[] = [
  {
    id: "software-app",
    title: "Software App Seed Fixture",
    expectedTemplateId: "software-app",
    expectedDomainTerms: ["User Experience", "Data / Persistence", "Validation / Quality"],
    expectedFunctionTerms: ["Capture user goal", "Model core workflow", "Prepare build prompt"],
    expectedComponentTerms: ["Goal Intake", "Workflow Modeler", "Validation Panel"],
    expectedPlanGroupTerms: ["core app workflow", "UI states", "persistence", "export"],
    expectedCodexEmphasis: "app workflow, UI components, data and persistence assumptions",
    expectedMvpTerms: ["Capture messy notes", "Build project planning workflow"],
    expectedExpansionTerms: ["Team workspaces", "Calendar export"],
    expectedHiddenOpportunityTerm: "local-first planning cockpit",
    text: `Raw idea: Build a local-first software app that turns messy notes into project plans with workflow, UI states, persistence, validation, and export.
Target user: Solo builders and small product teams.
Problem: Project notes are scattered across chats, docs, and meeting fragments, so teams lose workflow steps, assumptions, decisions, and next actions.
Intended outcome: Create a usable app workflow that turns rough notes into a validated project plan and exportable handoff.

Core principles:
- Keep the workflow visible from intake to export
- Make UI states predictable and readable
- Preserve local-first persistence
- Validate before export
- Help first-time users understand what to do next

Must remain true:
- The app must work without backend services
- Saved plans must remain available locally
- Validation cannot be skipped before export
- UI states must not hide missing project information
- Exports must reflect the current plan only

MVP boundary:
- Capture messy notes
- Distill notes into editable project plan fields
- Build project planning workflow
- Save plans locally
- Validate plan completeness
- Show onboarding empty states
- Export Markdown and JSON

Expansion ideas:
- Team workspaces
- Calendar export
- Cloud sync
- Shared plan comments
- Template marketplace

Known risks:
- Users may expect cloud sync in the first build
- Saved local data could be confusing if browser storage is cleared
- Exported plans may drift from current edits
- Onboarding could overwhelm first-time users
- Validation might accidentally allow empty workflow steps

Hidden opportunities:
- The app can become a local-first planning cockpit
- Teams can use exported plans as implementation handoffs
- Templates can teach better project planning habits`,
  },
  {
    id: "business-system",
    title: "Business System Seed Fixture",
    expectedTemplateId: "business-system",
    expectedDomainTerms: ["Offer", "Customer", "Revenue"],
    expectedFunctionTerms: ["Define offer", "Identify customer", "Clarify pricing and revenue"],
    expectedComponentTerms: ["Offer Canvas", "Customer Profile", "Revenue Model"],
    expectedPlanGroupTerms: ["offer and customer", "delivery and revenue", "risk and validation"],
    expectedCodexEmphasis: "offer, customer, delivery, operations, revenue assumptions",
    expectedMvpTerms: ["Define the onboarding offer", "Map delivery process"],
    expectedExpansionTerms: ["Referral partnership playbook", "Automated lead scoring"],
    expectedHiddenOpportunityTerm: "proof library",
    text: `Raw idea: Create a business system for a small service offer that helps gym owners improve client onboarding, retention, and proof of value.
Target user: Independent gym owners and fitness studio operators.
Problem: Gym owners often sell training well but onboard clients inconsistently, which weakens delivery, retention, referrals, and revenue confidence.
Intended outcome: Create a repeatable service offer that clarifies customer fit, delivery steps, operational capacity, proof, pricing, and follow-up.

Core principles:
- Match the offer promise to delivery capacity
- Keep customer assumptions visible
- Make proof and outcomes easy to inspect
- Keep revenue assumptions explicit
- Protect the owner from over-customized delivery

Must remain true:
- The offer must stay aligned with gym owner pain
- Delivery steps must be realistic for a small team
- Pricing assumptions must remain reviewable
- Proof claims must not be overstated
- Operations cannot depend on hidden labor

MVP boundary:
- Define the onboarding offer
- Identify ideal gym owner customers
- Map delivery process
- Clarify pricing and revenue assumptions
- Create proof checklist
- Review delivery risks

Expansion ideas:
- Referral partnership playbook
- Automated lead scoring
- Multi-location gym rollout
- Owner dashboard
- Seasonal campaign calendar

Known risks:
- The offer may promise more than the team can deliver
- Customer segments could become too broad
- Revenue assumptions may be untested
- Proof claims could sound stronger than evidence supports
- Operational handoffs might be missed

Hidden opportunities:
- The system can become a proof library for sales calls
- The service can turn onboarding wins into referral assets
- Delivery metrics can show which gym owners are best fit`,
  },
  {
    id: "coaching-system",
    title: "Coaching System Seed Fixture",
    expectedTemplateId: "coaching-system",
    expectedDomainTerms: ["Client Intake", "Assessment", "Safety / Boundaries"],
    expectedFunctionTerms: ["Capture client goal", "Assess constraints", "Adjust plan"],
    expectedComponentTerms: ["Client Intake Form", "Assessment Lens", "Safety Boundary Review"],
    expectedPlanGroupTerms: ["intake and assessment", "feedback loop", "safety boundaries"],
    expectedCodexEmphasis: "intake, assessment, intervention design, feedback adaptation",
    expectedMvpTerms: ["Capture client goal", "Assess movement constraints"],
    expectedExpansionTerms: ["Client progress dashboard", "Coach-client messaging"],
    expectedHiddenOpportunityTerm: "safer plan changes",
    text: `Raw idea: Build a coaching system for assessing clients and adapting training plans through intake, assessment, intervention, feedback, adaptation, and safety boundaries.
Target user: Strength coaches who train general population clients.
Problem: Coaches collect goals, injuries, constraints, and feedback in scattered places, so training plans may adapt late or miss safety context.
Intended outcome: Create a coaching process that turns assessment and feedback into safer, clearer plan adjustments.

Core principles:
- Start every plan from client context
- Respect assessment constraints
- Make interventions explainable
- Use feedback to adapt the plan
- Keep safety boundaries visible

Must remain true:
- Client pain or safety flags must shape the plan
- Assessment findings cannot be ignored
- Feedback must inform adaptation
- Coaches must see what changed and why
- The system must not promise medical diagnosis

MVP boundary:
- Capture client goal
- Assess movement constraints
- Define initial intervention
- Track session feedback
- Adjust plan from feedback
- Review safety boundaries

Expansion ideas:
- Client progress dashboard
- Coach-client messaging
- Wearable data import
- Template intervention library
- Automated readiness score

Known risks:
- Coaches may treat the system as medical advice
- Pain flags could be missed
- Feedback may be too vague to guide adaptation
- Generic interventions could ignore client constraints
- Safety boundaries might be hidden behind plan details

Hidden opportunities:
- The system can teach safer plan changes
- Feedback patterns can improve future assessments
- Coaches can explain adaptations more clearly to clients`,
  },
  {
    id: "content-brand-framework",
    title: "Content Brand Seed Fixture",
    expectedTemplateId: "content-brand-framework",
    expectedDomainTerms: ["Core Message", "Audience", "Distribution"],
    expectedFunctionTerms: ["Define message", "Identify audience", "Build content pillars"],
    expectedComponentTerms: ["Message Canvas", "Audience Profile", "Content Pillar Map"],
    expectedPlanGroupTerms: ["message and audience", "distribution", "conversion"],
    expectedCodexEmphasis: "audience, message, content pillars, trust proof",
    expectedMvpTerms: ["Define core message", "Identify audience"],
    expectedExpansionTerms: ["Podcast guest strategy", "Paid newsletter funnel"],
    expectedHiddenOpportunityTerm: "editorial compass",
    text: `Raw idea: Create a content and brand framework around alignment, structure, fitness, and AI-assisted building.
Target user: Builders who want a clear public voice across writing, video, and practical tools.
Problem: Content ideas jump between personal philosophy, fitness practice, AI tooling, and product building without a stable message or proof path.
Intended outcome: Create a content system with a clear message, audience, pillars, proof, distribution, and conversion path.

Core principles:
- Keep the core message consistent
- Make audience fit explicit
- Connect content pillars to proof
- Separate distribution from conversion
- Avoid hype around AI-assisted building

Must remain true:
- The message must stay grounded in lived practice
- Fitness and AI claims must remain honest
- Content pillars must support the audience promise
- Distribution should not dilute the brand
- Conversion paths must match proof

MVP boundary:
- Define core message
- Identify audience
- Build content pillars
- Map proof assets
- Create initial distribution plan
- Define conversion path

Expansion ideas:
- Podcast guest strategy
- Paid newsletter funnel
- Community challenges
- Repurposing workflow
- Long-form documentary series

Known risks:
- The brand may become too broad
- AI claims could sound inflated
- Fitness proof might be too anecdotal
- Distribution channels could split attention
- Conversion copy may overpromise

Hidden opportunities:
- The framework can become an editorial compass
- Proof assets can turn ideas into trust
- Content pillars can reveal tool opportunities`,
  },
  {
    id: "book-white-paper",
    title: "White Paper Seed Fixture",
    expectedTemplateId: "book-white-paper",
    expectedDomainTerms: ["Thesis", "Audience", "Evidence"],
    expectedFunctionTerms: ["Define thesis", "Structure argument", "Prepare draft and export"],
    expectedComponentTerms: ["Thesis Canvas", "Argument Map", "Evidence Library"],
    expectedPlanGroupTerms: ["thesis", "argument", "evidence", "sections"],
    expectedCodexEmphasis: "thesis, audience, argument structure, evidence",
    expectedMvpTerms: ["Define thesis", "Identify target reader"],
    expectedExpansionTerms: ["Peer review panel", "Conference talk adaptation"],
    expectedHiddenOpportunityTerm: "standard for governed AI collaboration",
    text: `Raw idea: Write a white paper about governed AI collaboration and structural accountability.
Target user: Product leaders, engineering managers, and AI operations teams.
Problem: Teams adopt AI collaborators quickly but often lack a clear thesis, accountability structure, evidence trail, and publication boundary.
Intended outcome: Create a white paper that argues for governed AI collaboration with credible evidence, sections, and publication scope.

Core principles:
- Keep the thesis explicit
- Connect claims to evidence
- Structure the argument before drafting
- Name accountability boundaries
- Keep publication scope disciplined

Must remain true:
- The white paper must not overclaim what AI can verify
- Evidence must support the central claims
- Sections must serve the target reader
- Governance and accountability must remain concrete
- Publication extras must stay outside the first draft

MVP boundary:
- Define thesis
- Identify target reader
- Structure argument
- Map supporting evidence
- Draft section outline
- Prepare publication boundary

Expansion ideas:
- Peer review panel
- Conference talk adaptation
- Companion workbook
- Citation database
- Executive briefing deck

Known risks:
- The thesis may become too abstract
- Evidence could be too thin
- Sections might sprawl beyond the argument
- Accountability claims may sound vague
- Publication extras could delay the first draft

Hidden opportunities:
- The paper can set a standard for governed AI collaboration
- Evidence review can become a reusable review method
- The argument can become training material for teams`,
  },
  {
    id: "sop-workflow",
    title: "SOP Workflow Seed Fixture",
    expectedTemplateId: "sop-workflow",
    expectedDomainTerms: ["Trigger", "Inputs", "Quality Checks"],
    expectedFunctionTerms: ["Define start condition", "Map steps", "Define completed output"],
    expectedComponentTerms: ["Trigger Definition", "Step Map", "Quality Checkpoints"],
    expectedPlanGroupTerms: ["trigger", "inputs", "ordered steps", "quality checks", "output"],
    expectedCodexEmphasis: "trigger, inputs, ordered steps, role ownership",
    expectedMvpTerms: ["Define review trigger", "Collect required inputs"],
    expectedExpansionTerms: ["Automated pull request labels", "Team training checklist"],
    expectedHiddenOpportunityTerm: "merge confidence",
    text: `Raw idea: Create a repeatable SOP workflow for reviewing Codex output before merging.
Target user: Solo maintainers and small engineering teams using Codex for implementation tasks.
Problem: Codex output can look complete before changed files, tests, acceptance criteria, and exceptions have been reviewed in a consistent order.
Intended outcome: Create a workflow with clear triggers, inputs, steps, roles, checks, output, and exception handling before merge.

Core principles:
- Define the review trigger
- Require evidence before acceptance
- Keep steps ordered and owned
- Make quality checks visible
- Record exceptions explicitly

Must remain true:
- A merge cannot occur before required checks are complete
- Test claims must include evidence
- Unexpected files must be reviewed
- Exceptions must name owner and next step
- The final output must be a clear merge decision

MVP boundary:
- Define review trigger
- Collect required inputs
- Map review steps
- Assign reviewer role
- Add quality checks
- Define completed output
- Record exception handling

Expansion ideas:
- Automated pull request labels
- Team training checklist
- Metrics dashboard
- Slack handoff template
- Release readiness score

Known risks:
- Reviewers may skip evidence checks
- Unexpected file changes could be missed
- The workflow may become too slow for small tasks
- Exception handling might be vague
- Final output could be confused with code verification

Hidden opportunities:
- The workflow can increase merge confidence
- Exception patterns can improve future Codex packets
- The SOP can become onboarding material for new reviewers`,
  },
  {
    id: "generic-framework",
    title: "Structured Action Seed Fixture",
    expectedTemplateId: "generic-framework",
    expectedDomainTerms: ["Intent and Context", "Core Framework", "Governance and Readiness"],
    expectedFunctionTerms: ["Clarify intake assumptions", "Compose governed framework blueprint", "Review readiness and governance"],
    expectedComponentTerms: ["Guided Intake Workspace", "Blueprint Composer", "Readiness Review Surface"],
    expectedPlanGroupTerms: ["decision-to-action", "governance", "action brief"],
    expectedCodexEmphasis: "explicit assumptions, connected structure, governance",
    expectedMvpTerms: ["Capture raw desire", "Clarify decision criteria"],
    expectedExpansionTerms: ["Personal operating cadence", "Shared review ritual"],
    expectedHiddenOpportunityTerm: "pattern language",
    text: `Raw idea: Create a general decision framework for turning raw desire into structured action without relying on a stronger domain template.
Target user: Reflective builders deciding what to do next.
Problem: Raw desire often becomes scattered action before intent, constraints, tradeoffs, and next moves are made explicit.
Intended outcome: Create a reusable framework that turns desire into a clear decision, scope boundary, and action path.

Core principles:
- Name the desire before action
- Clarify assumptions and constraints
- Separate first action from later possibilities
- Make tradeoffs visible
- Review readiness before committing

Must remain true:
- The framework must not prescribe one life domain
- Decisions must remain traceable to intent
- Constraints must be explicit
- First action and later possibilities must stay separate
- Readiness review must occur before commitment

MVP boundary:
- Capture raw desire
- Clarify decision criteria
- Map constraints and tradeoffs
- Define first action
- Validate readiness
- Export action brief

Expansion ideas:
- Personal operating cadence
- Shared review ritual
- Pattern library
- Reflection prompts
- Progress archive

Known risks:
- The framework may become too abstract
- First action could blur into later possibilities
- Constraints might be softened to justify action
- Readiness review may feel like friction
- Users could mistake reflection for completion

Hidden opportunities:
- The framework can become a pattern language
- Repeated decisions can reveal personal operating principles
- Action briefs can reduce decision fatigue`,
  },
];
