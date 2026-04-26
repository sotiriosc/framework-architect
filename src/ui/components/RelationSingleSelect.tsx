import type { RelationOption } from "@/ui/relationOptions";

type RelationSingleSelectProps = {
  id: string;
  label: string;
  value: string;
  options: RelationOption[];
  onChange: (value: string) => void;
  description?: string;
};

export const RelationSingleSelect = ({
  id,
  label,
  value,
  options,
  onChange,
  description,
}: RelationSingleSelectProps) => {
  const selectedId = value.trim();
  const selectedIsMissing = selectedId.length > 0 && !options.some((option) => option.id === selectedId);

  return (
    <div className="field relation-picker">
      <label htmlFor={id}>
        <span>{label}</span>
      </label>
      {description ? <p className="muted">{description}</p> : null}
      <select
        id={id}
        value={selectedIsMissing ? "__missing__" : selectedId}
        onChange={(event) => onChange(event.target.value === "__missing__" ? selectedId : event.target.value)}
      >
        <option value="">None</option>
        {selectedIsMissing ? <option value="__missing__">Missing: {selectedId}</option> : null}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label} ({option.type})
          </option>
        ))}
      </select>
      {selectedIsMissing ? (
        <div className="relation-picker__missing">
          <strong>Missing ID still selected</strong>
          <code>{selectedId}</code>
        </div>
      ) : null}
      <details className="relation-picker__raw">
        <summary>Raw ID</summary>
        <input
          type="text"
          value={selectedId}
          onChange={(event) => onChange(event.target.value.trim())}
          aria-label={`${label} raw ID`}
        />
      </details>
    </div>
  );
};
