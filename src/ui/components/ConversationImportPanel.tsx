import { useState, type ChangeEvent, type FormEvent } from "react";

import {
  distillConversationToIntake,
} from "@/application/import/distillConversation";
import type {
  ConversationDistillationResult,
  ConversationImportDraft,
  ConversationSourceType,
  DistilledConversationIntake,
} from "@/application/import/conversationImportTypes";
import {
  frameworkTemplates,
  getFrameworkTemplate,
  type FrameworkTemplateId,
} from "@/application/templates/frameworkTemplates";
import { SectionCard } from "@/ui/components/SectionCard";

type ConversationImportPanelProps = {
  onCreateBlueprint: (draft: ConversationImportDraft, intake: DistilledConversationIntake) => void;
  onCancel: () => void;
};

const sourceTypes: ConversationSourceType[] = [
  "chat-transcript",
  "notes",
  "brainstorm",
  "meeting",
  "other",
];

const defaultDraft = (): ConversationImportDraft => ({
  title: "",
  sourceType: "chat-transcript",
  rawText: "",
  optionalSourceLabel: "",
  createdAt: new Date().toISOString(),
});

const joinLines = (items: string[]): string => items.join("\n");

const parseLines = (value: string): string[] =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const updateArrayField = (
  intake: DistilledConversationIntake,
  key: keyof Pick<
    DistilledConversationIntake,
    "corePrinciples" | "mustRemainTrue" | "mvpBoundary" | "expansionIdeas" | "knownRisks" | "hiddenOpportunities"
  >,
  value: string,
): DistilledConversationIntake => ({
  ...intake,
  [key]: parseLines(value),
});

export const ConversationImportPanel = ({
  onCreateBlueprint,
  onCancel,
}: ConversationImportPanelProps) => {
  const [draft, setDraft] = useState<ConversationImportDraft>(() => defaultDraft());
  const [result, setResult] = useState<ConversationDistillationResult | null>(null);
  const [editableIntake, setEditableIntake] = useState<DistilledConversationIntake | null>(null);

  const updateDraft =
    (key: keyof ConversationImportDraft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setDraft((current) => ({
        ...current,
        [key]: event.target.value,
      }));
    };

  const distill = () => {
    const nextDraft = {
      ...draft,
      title: draft.title.trim() || "Imported Conversation Blueprint",
      createdAt: draft.createdAt || new Date().toISOString(),
    };
    const nextResult = distillConversationToIntake(nextDraft);
    setDraft(nextDraft);
    setResult(nextResult);
    setEditableIntake(nextResult.intake);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editableIntake) {
      distill();
      return;
    }

    onCreateBlueprint(draft, editableIntake);
  };

  const updateIntake = (key: keyof DistilledConversationIntake, value: string) => {
    setEditableIntake((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [key]: value,
      };
    });
  };

  const updateTemplate = (event: ChangeEvent<HTMLSelectElement>) => {
    const suggestedTemplateId = event.target.value as FrameworkTemplateId;
    const template = getFrameworkTemplate(suggestedTemplateId);
    setEditableIntake((current) =>
      current
        ? {
            ...current,
            suggestedTemplateId,
            frameworkTypeCandidate: template.label,
          }
        : current,
    );
  };

  return (
    <div className="guided-shell">
      <SectionCard
        title="Import conversation / notes"
        description="Paste a messy thread, notes, or brainstorming log. Distillation creates an editable intake draft before any blueprint is saved."
      >
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Import title</span>
            <input type="text" value={draft.title} onChange={updateDraft("title")} />
          </label>
          <label className="field">
            <span>Source type</span>
            <select value={draft.sourceType} onChange={updateDraft("sourceType")}>
              {sourceTypes.map((sourceType) => (
                <option key={sourceType} value={sourceType}>
                  {sourceType}
                </option>
              ))}
            </select>
          </label>
          <label className="field field--full">
            <span>Optional source label</span>
            <input
              type="text"
              value={draft.optionalSourceLabel ?? ""}
              onChange={updateDraft("optionalSourceLabel")}
              placeholder="Slack thread, client call, ChatGPT session, notebook page"
            />
          </label>
          <label className="field field--full">
            <span>Conversation or notes</span>
            <textarea
              rows={10}
              value={draft.rawText}
              onChange={updateDraft("rawText")}
              placeholder="Paste a transcript, bullet notes, meeting log, or brainstorm here."
            />
          </label>

          <div className="toolbar toolbar--split field--full">
            <button type="button" className="button-secondary" onClick={onCancel}>
              Back to projects
            </button>
            <button type="button" className="button-secondary" onClick={distill} disabled={!draft.rawText.trim()}>
              Distill Conversation
            </button>
            <button type="submit" disabled={!editableIntake}>
              Create blueprint from distilled intake
            </button>
          </div>
        </form>
      </SectionCard>

      {result && editableIntake ? (
        <SectionCard
          title="Review distilled intake"
          description="Edit these fields before creating a blueprint. Source snippets remain visible below for traceability."
        >
          <div className="quality-callout quality-callout--strong">
            <div>
              <span className="eyebrow">Distillation confidence</span>
              <strong>{result.confidence}</strong>
              <p>{result.signals.length} signals extracted from {draft.sourceType}.</p>
            </div>
            <div>
              <span className="eyebrow">Suggested template</span>
              <strong>{getFrameworkTemplate(editableIntake.suggestedTemplateId).label}</strong>
              <p>{getFrameworkTemplate(editableIntake.suggestedTemplateId).description}</p>
            </div>
          </div>

          {result.warnings.length > 0 ? (
            <div className="status-banner status-banner--warning">
              {result.warnings.join(" ")}
            </div>
          ) : null}

          <div className="form-grid">
            <label className="field">
              <span>Project name</span>
              <input
                value={editableIntake.projectNameCandidate}
                onChange={(event) => updateIntake("projectNameCandidate", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Framework template</span>
              <select value={editableIntake.suggestedTemplateId} onChange={updateTemplate}>
                {frameworkTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field--full">
              <span>Raw idea / seed</span>
              <small className="muted">
                This becomes the source idea for the blueprint. Edit it if the distiller missed the main point.
              </small>
              <textarea
                rows={4}
                value={editableIntake.rawIdeaCandidate}
                onChange={(event) => updateIntake("rawIdeaCandidate", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Target user</span>
              <input
                value={editableIntake.targetUserCandidate}
                onChange={(event) => updateIntake("targetUserCandidate", event.target.value)}
              />
              {!editableIntake.targetUserCandidate.trim() ? (
                <small className="muted">Not confidently found - edit before creating blueprint.</small>
              ) : null}
            </label>
            <label className="field">
              <span>Intended outcome</span>
              <input
                value={editableIntake.intendedOutcomeCandidate}
                onChange={(event) => updateIntake("intendedOutcomeCandidate", event.target.value)}
              />
              {!editableIntake.intendedOutcomeCandidate.trim() ? (
                <small className="muted">Not confidently found - edit before creating blueprint.</small>
              ) : null}
            </label>
            <label className="field field--full">
              <span>Problem</span>
              <textarea
                rows={3}
                value={editableIntake.problemCandidate}
                onChange={(event) => updateIntake("problemCandidate", event.target.value)}
              />
              {!editableIntake.problemCandidate.trim() ? (
                <small className="muted">Not confidently found - edit before creating blueprint.</small>
              ) : null}
            </label>
            <label className="field field--full">
              <span>Core principles</span>
              <textarea
                rows={4}
                value={joinLines(editableIntake.corePrinciples)}
                onChange={(event) =>
                  setEditableIntake(updateArrayField(editableIntake, "corePrinciples", event.target.value))
                }
              />
            </label>
            <label className="field field--full">
              <span>Must remain true</span>
              <textarea
                rows={4}
                value={joinLines(editableIntake.mustRemainTrue)}
                onChange={(event) =>
                  setEditableIntake(updateArrayField(editableIntake, "mustRemainTrue", event.target.value))
                }
              />
            </label>
            <label className="field field--full">
              <span>MVP boundary</span>
              <textarea
                rows={4}
                value={joinLines(editableIntake.mvpBoundary)}
                onChange={(event) =>
                  setEditableIntake(updateArrayField(editableIntake, "mvpBoundary", event.target.value))
                }
              />
            </label>
            <label className="field field--full">
              <span>Expansion ideas</span>
              <textarea
                rows={4}
                value={joinLines(editableIntake.expansionIdeas)}
                onChange={(event) =>
                  setEditableIntake(updateArrayField(editableIntake, "expansionIdeas", event.target.value))
                }
              />
            </label>
            <label className="field field--full">
              <span>Known risks</span>
              <textarea
                rows={4}
                value={joinLines(editableIntake.knownRisks)}
                onChange={(event) =>
                  setEditableIntake(updateArrayField(editableIntake, "knownRisks", event.target.value))
                }
              />
            </label>
            <label className="field field--full">
              <span>Hidden opportunities</span>
              <textarea
                rows={4}
                value={joinLines(editableIntake.hiddenOpportunities)}
                onChange={(event) =>
                  setEditableIntake(updateArrayField(editableIntake, "hiddenOpportunities", event.target.value))
                }
              />
            </label>
          </div>

          <details className="quality-detail">
            <summary>Extracted signals ({result.signals.length})</summary>
            <ul className="stacked-list">
              {result.signals.map((signal) => (
                <li key={signal.id} className="stacked-list__item">
                  <div className="tag-row">
                    <span>{signal.kind}</span>
                    <span>{signal.confidence}</span>
                  </div>
                  <strong>{signal.text}</strong>
                  <p>{signal.reason}</p>
                  <p className="muted">source: {signal.sourceSnippet}</p>
                </li>
              ))}
            </ul>
          </details>
        </SectionCard>
      ) : null}
    </div>
  );
};
