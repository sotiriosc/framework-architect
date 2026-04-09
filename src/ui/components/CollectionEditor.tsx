import type { ReactNode } from "react";

import { SectionCard } from "@/ui/components/SectionCard";

export type EditorField = {
  key: string;
  label: string;
  kind?: "text" | "textarea" | "csv" | "select" | "number" | "boolean";
  options?: readonly string[];
  placeholder?: string;
  rows?: number;
};

type CollectionEditorProps<T extends Record<string, unknown>> = {
  title: string;
  description?: string;
  items: T[];
  fields: EditorField[];
  createItem: () => T;
  onChange: (items: T[]) => void;
  getItemLabel?: (item: T, index: number) => string;
  renderMeta?: (item: T) => ReactNode;
};

const stringifyCsv = (value: unknown): string =>
  Array.isArray(value) ? value.map((item) => String(item)).join(", ") : "";

const parseCsv = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const CollectionEditor = <T extends Record<string, unknown>>({
  title,
  description,
  items,
  fields,
  createItem,
  onChange,
  getItemLabel,
  renderMeta,
}: CollectionEditorProps<T>) => {
  const updateItem = (index: number, key: string, value: unknown) => {
    const nextItems = items.map((item, itemIndex) => {
      if (itemIndex !== index) {
        return item;
      }

      const nextItem = {
        ...item,
        [key]: value,
      } as T & { updatedAt?: string };

      if ("updatedAt" in nextItem) {
        nextItem.updatedAt = new Date().toISOString();
      }

      return nextItem;
    });

    onChange(nextItems);
  };

  return (
    <SectionCard
      title={title}
      description={description}
      action={
        <button type="button" onClick={() => onChange([...items, createItem()])}>
          Add
        </button>
      }
    >
      <div className="collection-editor">
        {items.length === 0 ? <p className="muted">No items yet.</p> : null}
        {items.map((item, index) => (
          <details key={String(item.id ?? index)} className="collection-item" open={index === 0}>
            <summary>
              <div>
                <strong>
                  {getItemLabel
                    ? getItemLabel(item, index)
                    : String(item.name ?? item.title ?? `Item ${index + 1}`)}
                </strong>
                <span className="muted"> {String(item.id ?? "")}</span>
              </div>
              <button
                type="button"
                className="danger-link"
                onClick={(event) => {
                  event.preventDefault();
                  onChange(items.filter((_, itemIndex) => itemIndex !== index));
                }}
              >
                Remove
              </button>
            </summary>
            {renderMeta ? <div className="item-meta">{renderMeta(item)}</div> : null}
            <div className="form-grid">
              {fields.map((field) => {
                const fieldValue = item[field.key];
                const inputId = `${title}-${String(item.id)}-${field.key}`;

                if (field.kind === "textarea") {
                  return (
                    <label key={field.key} htmlFor={inputId} className="field field--full">
                      <span>{field.label}</span>
                      <textarea
                        id={inputId}
                        rows={field.rows ?? 4}
                        value={String(fieldValue ?? "")}
                        placeholder={field.placeholder}
                        onChange={(event) => updateItem(index, field.key, event.target.value)}
                      />
                    </label>
                  );
                }

                if (field.kind === "csv") {
                  return (
                    <label key={field.key} htmlFor={inputId} className="field field--full">
                      <span>{field.label}</span>
                      <input
                        id={inputId}
                        type="text"
                        value={stringifyCsv(fieldValue)}
                        placeholder={field.placeholder ?? "comma,separated,values"}
                        onChange={(event) => updateItem(index, field.key, parseCsv(event.target.value))}
                      />
                    </label>
                  );
                }

                if (field.kind === "select") {
                  return (
                    <label key={field.key} htmlFor={inputId} className="field">
                      <span>{field.label}</span>
                      <select
                        id={inputId}
                        value={String(fieldValue ?? "")}
                        onChange={(event) => updateItem(index, field.key, event.target.value)}
                      >
                        {field.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }

                if (field.kind === "number") {
                  return (
                    <label key={field.key} htmlFor={inputId} className="field">
                      <span>{field.label}</span>
                      <input
                        id={inputId}
                        type="number"
                        value={Number(fieldValue ?? 0)}
                        onChange={(event) => updateItem(index, field.key, Number(event.target.value))}
                      />
                    </label>
                  );
                }

                if (field.kind === "boolean") {
                  return (
                    <label key={field.key} htmlFor={inputId} className="field field--checkbox">
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={Boolean(fieldValue)}
                        onChange={(event) => updateItem(index, field.key, event.target.checked)}
                      />
                      <span>{field.label}</span>
                    </label>
                  );
                }

                return (
                  <label key={field.key} htmlFor={inputId} className="field">
                    <span>{field.label}</span>
                    <input
                      id={inputId}
                      type="text"
                      value={String(fieldValue ?? "")}
                      placeholder={field.placeholder}
                      onChange={(event) => updateItem(index, field.key, event.target.value)}
                    />
                  </label>
                );
              })}
            </div>
          </details>
        ))}
      </div>
    </SectionCard>
  );
};
