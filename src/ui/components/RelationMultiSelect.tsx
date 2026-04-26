import {
  getMissingRelationIds,
  parseRelationRawValue,
  stringifyRelationIds,
  toggleRelationId,
  type RelationOption,
} from "@/ui/relationOptions";

type RelationMultiSelectProps = {
  id: string;
  label: string;
  value: string[];
  options: RelationOption[];
  onChange: (value: string[]) => void;
  description?: string;
};

export const RelationMultiSelect = ({
  id,
  label,
  value,
  options,
  onChange,
  description,
}: RelationMultiSelectProps) => {
  const selectedIds = Array.isArray(value) ? value : [];
  const missingIds = getMissingRelationIds(selectedIds, options);

  return (
    <div className="field field--full relation-picker">
      <div className="relation-picker__header">
        <span>{label}</span>
        <button type="button" className="button-secondary" onClick={() => onChange([])}>
          Clear
        </button>
      </div>
      {description ? <p className="muted">{description}</p> : null}
      {options.length === 0 ? (
        <p className="muted">No related entities are available yet.</p>
      ) : (
        <div className="relation-picker__options" role="group" aria-labelledby={`${id}-label`}>
          <span id={`${id}-label`} className="sr-only">
            {label}
          </span>
          {options.map((option) => (
            <label key={option.id} className="relation-option">
              <input
                type="checkbox"
                checked={selectedIds.includes(option.id)}
                onChange={() => onChange(toggleRelationId(selectedIds, option.id))}
              />
              <span>
                <strong>{option.label}</strong>
                <small>
                  {option.type}
                  {option.description ? ` - ${option.description}` : ""}
                </small>
              </span>
            </label>
          ))}
        </div>
      )}
      {missingIds.length > 0 ? (
        <div className="relation-picker__missing">
          <strong>Missing IDs still selected</strong>
          <code>{missingIds.join(", ")}</code>
        </div>
      ) : null}
      <details className="relation-picker__raw">
        <summary>Raw IDs</summary>
        <input
          type="text"
          value={stringifyRelationIds(selectedIds)}
          onChange={(event) => onChange(parseRelationRawValue(event.target.value))}
          aria-label={`${label} raw IDs`}
        />
      </details>
    </div>
  );
};
