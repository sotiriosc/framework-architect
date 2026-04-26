import type { ReactNode } from "react";

import { RelationMultiSelect } from "@/ui/components/RelationMultiSelect";
import { RelationSingleSelect } from "@/ui/components/RelationSingleSelect";
import { SectionCard } from "@/ui/components/SectionCard";
import {
  labelsForRelationIds,
  resolveRelationOptions,
  type RelationOptionGroups,
  type RelationType,
} from "@/ui/relationOptions";

export type EditorField = {
  key: string;
  label: string;
  kind?: "text" | "textarea" | "csv" | "select" | "number" | "boolean" | "relation-multi" | "relation-single";
  relationType?: RelationType;
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
  relationOptions?: RelationOptionGroups;
};

const stringifyCsv = (value: unknown): string =>
  Array.isArray(value) ? value.map((item) => String(item)).join(", ") : "";

const parseCsv = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const asStringArray = (value: unknown): string[] => (Array.isArray(value) ? value.map((item) => String(item)) : []);

const getFieldValue = (value: Record<string, unknown>, key: string): unknown =>
  key.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, value);

const setFieldValue = (
  value: Record<string, unknown>,
  key: string,
  nextValue: unknown,
): Record<string, unknown> => {
  const path = key.split(".");
  const nextRecord = { ...value };
  let cursor: Record<string, unknown> = nextRecord;

  path.forEach((segment, index) => {
    if (index === path.length - 1) {
      cursor[segment] = nextValue;
      return;
    }

    const current = cursor[segment];
    cursor[segment] =
      current && typeof current === "object" && !Array.isArray(current)
        ? { ...(current as Record<string, unknown>) }
        : {};
    cursor = cursor[segment] as Record<string, unknown>;
  });

  return nextRecord;
};

const relationOptionsForField = (
  field: EditorField,
  item: Record<string, unknown>,
  relationOptions: RelationOptionGroups | undefined,
) => {
  if (!relationOptions || !field.relationType) {
    return [];
  }

  return resolveRelationOptions(relationOptions, field.relationType, String(getFieldValue(item, "scope") ?? ""));
};

const relationSummaryForItem = (
  item: Record<string, unknown>,
  fields: EditorField[],
  relationOptions: RelationOptionGroups | undefined,
): string[] => {
  if (!relationOptions) {
    return [];
  }

  return fields
    .filter((field) => field.kind === "relation-multi" || field.kind === "relation-single")
    .map((field) => {
      const fieldValue = getFieldValue(item, field.key);
      const ids = field.kind === "relation-single" ? [String(fieldValue ?? "")].filter(Boolean) : asStringArray(fieldValue);
      if (ids.length === 0) {
        return "";
      }

      const options = relationOptionsForField(field, item, relationOptions);
      return `${field.label}: ${labelsForRelationIds(ids, options)}`;
    })
    .filter(Boolean)
    .slice(0, 2);
};

export const CollectionEditor = <T extends Record<string, unknown>>({
  title,
  description,
  items,
  fields,
  createItem,
  onChange,
  getItemLabel,
  renderMeta,
  relationOptions,
}: CollectionEditorProps<T>) => {
  const updateItem = (index: number, key: string, value: unknown) => {
    const nextItems = items.map((item, itemIndex) => {
      if (itemIndex !== index) {
        return item;
      }

      const nextItem = setFieldValue(item, key, value) as T & { updatedAt?: string };

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
                {relationSummaryForItem(item, fields, relationOptions).map((summary) => (
                  <small key={summary} className="relation-summary">
                    {summary}
                  </small>
                ))}
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
                const fieldValue = getFieldValue(item, field.key);
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

                if (field.kind === "relation-multi") {
                  return (
                    <RelationMultiSelect
                      key={field.key}
                      id={inputId}
                      label={field.label}
                      value={asStringArray(fieldValue)}
                      options={relationOptionsForField(field, item, relationOptions)}
                      description={field.relationType === "scopeEntities" ? "Options follow the selected scope." : undefined}
                      onChange={(value) => updateItem(index, field.key, value)}
                    />
                  );
                }

                if (field.kind === "relation-single") {
                  return (
                    <RelationSingleSelect
                      key={field.key}
                      id={inputId}
                      label={field.label}
                      value={String(fieldValue ?? "")}
                      options={relationOptionsForField(field, item, relationOptions)}
                      onChange={(value) => updateItem(index, field.key, value)}
                    />
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
