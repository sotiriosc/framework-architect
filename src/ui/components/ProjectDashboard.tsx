import type { ProjectBlueprint, ValidationState } from "@/domain/models";
import { describeFrameworkTemplateForBlueprint } from "@/application/templates/frameworkTemplates";
import { SectionCard } from "@/ui/components/SectionCard";

type ProjectDashboardProps = {
  projects: ProjectBlueprint[];
  selectedProjectId: string | null;
  latestRevisionNumbers: Record<string, number | null>;
  onOpenProject: (projectId: string) => void;
  onCreateGuidedBlueprint: () => void;
  onImportConversation: () => void;
};

const summarizeValidation = (validation: ValidationState) =>
  validation.checks.reduce(
    (counts, check) => {
      counts[check.status] += 1;
      return counts;
    },
    { pass: 0, warning: 0, fail: 0 },
  );

export const ProjectDashboard = ({
  projects,
  selectedProjectId,
  latestRevisionNumbers,
  onOpenProject,
  onCreateGuidedBlueprint,
  onImportConversation,
}: ProjectDashboardProps) => (
  <div className="dashboard-stack">
    <SectionCard
      title="Projects"
      description="V1 loop: Conversation or idea -> Template -> Blueprint -> Validation -> Quality -> Foresight -> Implementation Plan -> Agent Run Harness -> Export."
    >
      <div className="toolbar toolbar--split">
        <p className="muted">
          Local projects stay in browser storage with validation, memory snapshots, and revision history.
        </p>
        <div className="button-row">
          <button type="button" onClick={onCreateGuidedBlueprint}>
            Create guided framework
          </button>
          <button type="button" className="button-secondary" onClick={onImportConversation}>
            Import conversation / notes
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <p className="muted">
          No projects yet. Create a guided framework to start from a populated blueprint, or open the full workspace
          for the advanced empty-blueprint path.
        </p>
      ) : (
        <div className="project-card-grid">
          {projects.map((blueprint) => {
            const validationSummary = summarizeValidation(blueprint.validation);
            const latestRevisionNumber = latestRevisionNumbers[blueprint.project.id] ?? null;
            const template = describeFrameworkTemplateForBlueprint(blueprint);

            return (
              <article
                key={blueprint.project.id}
                className={`project-card${
                  blueprint.project.id === selectedProjectId ? " project-card--selected" : ""
                }`}
              >
                <div className="project-card__header">
                  <div>
                    <p className="eyebrow">{blueprint.project.status}</p>
                    <h2>{blueprint.project.name}</h2>
                    <p className="muted">{template.label}</p>
                  </div>
                  <button type="button" onClick={() => onOpenProject(blueprint.project.id)}>
                    Open
                  </button>
                </div>
                <p className="muted">{blueprint.intent.summary}</p>
                <div className="project-card__stats">
                  <div>
                    <span className="eyebrow">Build-ready</span>
                    <strong>{blueprint.validation.buildReady ? "Yes" : "No"}</strong>
                  </div>
                  <div>
                    <span className="eyebrow">Validation</span>
                    <strong>
                      {validationSummary.pass} pass / {validationSummary.warning} warning / {validationSummary.fail} fail
                    </strong>
                  </div>
                  <div>
                    <span className="eyebrow">Latest revision</span>
                    <strong>{latestRevisionNumber ? `#${latestRevisionNumber}` : "None"}</strong>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </SectionCard>
  </div>
);
