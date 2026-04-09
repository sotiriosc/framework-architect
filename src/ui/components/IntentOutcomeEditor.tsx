import type { Intent, Outcome } from "@/domain/models";
import { createOutcome } from "@/domain/defaults";
import { outcomePriorityValues } from "@/schema";
import { CollectionEditor, type EditorField } from "@/ui/components/CollectionEditor";
import { SectionCard } from "@/ui/components/SectionCard";

const outcomeFields: EditorField[] = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description", kind: "textarea" },
  { key: "successMetric", label: "Success metric" },
  { key: "priority", label: "Priority", kind: "select", options: outcomePriorityValues },
  { key: "actorIds", label: "Actor IDs", kind: "csv" },
];

type IntentOutcomeEditorProps = {
  intent: Intent;
  outcomes: Outcome[];
  onIntentChange: (intent: Intent) => void;
  onOutcomesChange: (outcomes: Outcome[]) => void;
  onExtract: () => void;
};

export const IntentOutcomeEditor = ({
  intent,
  outcomes,
  onIntentChange,
  onOutcomesChange,
  onExtract,
}: IntentOutcomeEditorProps) => (
  <>
    <SectionCard
      title="Intent / outcome editor"
      description="Refine the intended outcome and the outcome set extracted from the raw idea."
      action={
        <button type="button" onClick={onExtract}>
          Re-extract from raw idea
        </button>
      }
    >
      <div className="form-grid">
        <label className="field field--full">
          <span>Intent summary</span>
          <textarea
            rows={3}
            value={intent.summary}
            onChange={(event) => onIntentChange({ ...intent, summary: event.target.value })}
          />
        </label>
        <label className="field field--full">
          <span>Problem statement</span>
          <textarea
            rows={4}
            value={intent.problemStatement}
            onChange={(event) => onIntentChange({ ...intent, problemStatement: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Target audience</span>
          <input
            type="text"
            value={intent.targetAudience}
            onChange={(event) => onIntentChange({ ...intent, targetAudience: event.target.value })}
          />
        </label>
        <label className="field field--full">
          <span>Value hypothesis</span>
          <textarea
            rows={3}
            value={intent.valueHypothesis}
            onChange={(event) => onIntentChange({ ...intent, valueHypothesis: event.target.value })}
          />
        </label>
      </div>
    </SectionCard>

    <CollectionEditor
      title="Outcomes"
      description="Outcomes are the builder-facing targets this blueprint must satisfy."
      items={outcomes}
      fields={outcomeFields}
      createItem={() => createOutcome()}
      onChange={onOutcomesChange}
    />
  </>
);
