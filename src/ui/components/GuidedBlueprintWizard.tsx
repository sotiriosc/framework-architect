import type { ChangeEvent, FormEvent } from "react";

import {
  frameworkTemplates,
  getFrameworkTemplate,
  isFrameworkTemplateId,
  resolveFrameworkTemplate,
  type FrameworkTemplateId,
} from "@/application/templates/frameworkTemplates";
import { SectionCard } from "@/ui/components/SectionCard";

export type GuidedIntakeDraft = {
  rawIdea: string;
  projectName: string;
  frameworkType: string;
  customFrameworkType: string;
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
  (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
  const selectedTemplateValue = isFrameworkTemplateId(draft.frameworkType)
    ? draft.frameworkType
    : draft.frameworkType.trim()
      ? "custom"
      : "generic-framework";
  const selectedTemplate =
    selectedTemplateValue === "custom"
      ? resolveFrameworkTemplate(draft.customFrameworkType || draft.frameworkType)
      : getFrameworkTemplate(selectedTemplateValue as FrameworkTemplateId);
  const helperDescription =
    selectedTemplateValue === "custom"
      ? `Closest template: ${selectedTemplate.label}. ${selectedTemplate.description}`
      : selectedTemplate.description;
  const updateTemplateSelection = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as FrameworkTemplateId | "custom";
    onDraftChange({
      ...draft,
      frameworkType: value === "custom" ? draft.customFrameworkType : value,
      customFrameworkType: value === "custom" ? draft.customFrameworkType : "",
    });
  };
  const updateCustomFrameworkType = (event: ChangeEvent<HTMLInputElement>) => {
    onDraftChange({
      ...draft,
      frameworkType: event.target.value,
      customFrameworkType: event.target.value,
    });
  };

  return (
    <div className="guided-shell">
      <SectionCard
        title="Guided framework builder"
        description="Turn the idea into a template-shaped blueprint with explicit assumptions, constraints, rules, and scope."
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
            <span>Framework template</span>
            <select value={selectedTemplateValue} onChange={updateTemplateSelection}>
              {frameworkTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
              <option value="custom">Custom type</option>
            </select>
            <p className="muted">{helperDescription}</p>
          </label>
          {selectedTemplateValue === "custom" ? (
            <label className="field">
              <span>Custom framework type</span>
              <input
                type="text"
                value={draft.customFrameworkType || draft.frameworkType}
                onChange={updateCustomFrameworkType}
                placeholder="Decision framework, onboarding system, operating model"
              />
            </label>
          ) : null}
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
            <button type="submit">Create framework</button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
};
