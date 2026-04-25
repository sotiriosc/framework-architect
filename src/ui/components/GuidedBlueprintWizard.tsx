import type { ChangeEvent, FormEvent } from "react";

import { SectionCard } from "@/ui/components/SectionCard";

export type GuidedIntakeDraft = {
  rawIdea: string;
  projectName: string;
  frameworkType: string;
  targetUser: string;
  problem: string;
  intendedOutcome: string;
  corePrinciplesText: string;
  mustRemainTrueText: string;
  mvpBoundaryText: string;
  expansionIdeasText: string;
  knownRisksText: string;
};

type GuidedBlueprintWizardProps = {
  draft: GuidedIntakeDraft;
  onDraftChange: (draft: GuidedIntakeDraft) => void;
  onCreate: () => void;
  onCancel: () => void;
};

const updateDraft =
  (
    draft: GuidedIntakeDraft,
    onChange: (next: GuidedIntakeDraft) => void,
    key: keyof GuidedIntakeDraft,
  ) =>
  (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange({
      ...draft,
      [key]: event.target.value,
    });
  };

export const GuidedBlueprintWizard = ({
  draft,
  onDraftChange,
  onCreate,
  onCancel,
}: GuidedBlueprintWizardProps) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onCreate();
  };

  return (
    <div className="guided-shell">
      <SectionCard
        title="Guided blueprint builder"
        description="A governed blueprint makes assumptions, constraints, rules, and scope explicit before implementation."
      >
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Project name</span>
            <input
              type="text"
              value={draft.projectName}
              onChange={updateDraft(draft, onDraftChange, "projectName")}
            />
          </label>
          <label className="field">
            <span>Framework type</span>
            <input
              type="text"
              value={draft.frameworkType}
              onChange={updateDraft(draft, onDraftChange, "frameworkType")}
              placeholder="Decision framework, onboarding system, operating model"
            />
          </label>
          <label className="field field--full">
            <span>Raw idea</span>
            <textarea
              rows={5}
              value={draft.rawIdea}
              onChange={updateDraft(draft, onDraftChange, "rawIdea")}
            />
          </label>
          <label className="field">
            <span>Target user</span>
            <input
              type="text"
              value={draft.targetUser}
              onChange={updateDraft(draft, onDraftChange, "targetUser")}
            />
          </label>
          <label className="field">
            <span>Intended outcome</span>
            <input
              type="text"
              value={draft.intendedOutcome}
              onChange={updateDraft(draft, onDraftChange, "intendedOutcome")}
            />
          </label>
          <label className="field field--full">
            <span>Problem</span>
            <textarea
              rows={4}
              value={draft.problem}
              onChange={updateDraft(draft, onDraftChange, "problem")}
            />
          </label>
          <label className="field field--full">
            <span>Core principles</span>
            <textarea
              rows={4}
              value={draft.corePrinciplesText}
              onChange={updateDraft(draft, onDraftChange, "corePrinciplesText")}
              placeholder="One principle per line"
            />
          </label>
          <label className="field field--full">
            <span>Must remain true</span>
            <textarea
              rows={4}
              value={draft.mustRemainTrueText}
              onChange={updateDraft(draft, onDraftChange, "mustRemainTrueText")}
              placeholder="One invariant per line"
            />
          </label>
          <label className="field field--full">
            <span>MVP boundary</span>
            <textarea
              rows={4}
              value={draft.mvpBoundaryText}
              onChange={updateDraft(draft, onDraftChange, "mvpBoundaryText")}
              placeholder="One first-build item per line"
            />
          </label>
          <label className="field field--full">
            <span>Expansion ideas</span>
            <textarea
              rows={4}
              value={draft.expansionIdeasText}
              onChange={updateDraft(draft, onDraftChange, "expansionIdeasText")}
              placeholder="One later idea per line"
            />
          </label>
          <label className="field field--full">
            <span>Known risks</span>
            <textarea
              rows={4}
              value={draft.knownRisksText}
              onChange={updateDraft(draft, onDraftChange, "knownRisksText")}
              placeholder="One risk per line"
            />
          </label>
          <div className="toolbar toolbar--split field--full">
            <button type="button" className="button-secondary" onClick={onCancel}>
              Back to projects
            </button>
            <button type="submit">Create guided blueprint</button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
};
