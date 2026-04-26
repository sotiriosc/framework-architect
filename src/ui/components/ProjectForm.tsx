import type { ChangeEvent } from "react";

import type { Project } from "@/domain/models";
import { projectStatusValues } from "@/schema";
import { SectionCard } from "@/ui/components/SectionCard";

export type CreateProjectDraft = {
  name: string;
  rawIdea: string;
  corePhilosophy: string;
  invariantPrioritiesText: string;
};

type ProjectFormProps = {
  createDraft: CreateProjectDraft;
  onCreateDraftChange: (draft: CreateProjectDraft) => void;
  onCreateProject: () => void;
  onCreateEmptyProject: () => void;
  project: Project | null;
  onProjectChange: (project: Project) => void;
};

const listToLines = (items: string[]): string => items.join("\n");
const linesToList = (value: string): string[] =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const updateCreateDraft =
  (draft: CreateProjectDraft, onChange: (next: CreateProjectDraft) => void, key: keyof CreateProjectDraft) =>
  (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange({
      ...draft,
      [key]: event.target.value,
    });
  };

export const ProjectForm = ({
  createDraft,
  onCreateDraftChange,
  onCreateProject,
  onCreateEmptyProject,
  project,
  onProjectChange,
}: ProjectFormProps) => (
  <>
    <SectionCard
      title="Raw-idea creation"
      description="Create framework completes structure by default. Empty blueprint is the advanced manual path."
    >
      <div className="form-grid">
        <label className="field">
          <span>Project name</span>
          <input
            type="text"
            value={createDraft.name}
            onChange={updateCreateDraft(createDraft, onCreateDraftChange, "name")}
          />
        </label>
        <label className="field field--full">
          <span>Core philosophy</span>
          <textarea
            rows={3}
            value={createDraft.corePhilosophy}
            onChange={updateCreateDraft(createDraft, onCreateDraftChange, "corePhilosophy")}
          />
        </label>
        <label className="field field--full">
          <span>Raw project idea</span>
          <textarea
            rows={5}
            value={createDraft.rawIdea}
            onChange={updateCreateDraft(createDraft, onCreateDraftChange, "rawIdea")}
          />
        </label>
        <label className="field field--full">
          <span>Invariant priorities</span>
          <textarea
            rows={4}
            value={createDraft.invariantPrioritiesText}
            onChange={updateCreateDraft(createDraft, onCreateDraftChange, "invariantPrioritiesText")}
            placeholder="One invariant priority per line"
          />
        </label>
      </div>
      <div className="toolbar">
        <button type="button" onClick={onCreateProject}>
          Create framework
        </button>
        <button type="button" className="button-secondary" onClick={onCreateEmptyProject}>
          Create empty blueprint
        </button>
      </div>
      <p className="muted">
        Empty blueprints are intentionally not build-ready until required structure, governance, and MVP scope exist.
      </p>
    </SectionCard>

    {project ? (
      <SectionCard title="Project details" description="Edit the saved project context.">
        <div className="form-grid">
          <label className="field">
            <span>Name</span>
            <input
              type="text"
              value={project.name}
              onChange={(event) => onProjectChange({ ...project, name: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Status</span>
            <select
              value={project.status}
              onChange={(event) =>
                onProjectChange({
                  ...project,
                  status: event.target.value as Project["status"],
                })
              }
            >
              {projectStatusValues.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="field field--full">
            <span>Raw idea</span>
            <textarea
              rows={5}
              value={project.rawIdea}
              onChange={(event) => onProjectChange({ ...project, rawIdea: event.target.value })}
            />
          </label>
          <label className="field field--full">
            <span>Core philosophy</span>
            <textarea
              rows={4}
              value={project.corePhilosophy}
              onChange={(event) => onProjectChange({ ...project, corePhilosophy: event.target.value })}
            />
          </label>
          <label className="field field--full">
            <span>Invariant priorities</span>
            <textarea
              rows={4}
              value={listToLines(project.invariantPriorities)}
              onChange={(event) =>
                onProjectChange({
                  ...project,
                  invariantPriorities: linesToList(event.target.value),
                })
              }
            />
          </label>
        </div>
      </SectionCard>
    ) : null}
  </>
);
