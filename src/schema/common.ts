import { z } from "zod";

export const projectStatusValues = ["draft", "validated", "build-ready"] as const;
export const priorityValues = ["critical", "high", "medium", "low"] as const;
export const outcomePriorityValues = ["high", "medium", "low"] as const;
export const constraintKindValues = ["business", "technical", "legal", "operational", "scope"] as const;
export const dependencyKindValues = ["internal", "external", "service", "library", "team", "process"] as const;
export const entityScopeValues = [
  "global",
  "project",
  "domain",
  "function",
  "component",
  "phase",
  "flow",
  "actor",
  "scope-item",
] as const;
export const validationStatusValues = ["pass", "warning", "fail"] as const;
export const validationSeverityValues = ["critical", "high", "medium", "low"] as const;
export const reviewSeverityValues = ["blocker", "warning", "notice"] as const;
export const memoryTypeValues = ["project", "structural", "decision"] as const;
export const decisionStatusValues = ["accepted", "rejected", "proposed"] as const;
export const decisionScopeValues = ["mvp", "expansion", "architecture", "governance"] as const;

export const nonEmptyStringSchema = z.string().trim().min(1);
export const idSchema = nonEmptyStringSchema.regex(
  /^[a-z][a-z0-9]{1,23}_[0-9a-f-]{36}$/,
  "IDs must use a prefixed UUID format like proj_<uuid>.",
);
export const slugSchema = nonEmptyStringSchema.regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  "Slugs must use lowercase kebab-case.",
);
export const timestampSchema = z.string().datetime({ offset: true });
export const textSchema = z.string().trim();
export const stringListSchema = z.array(nonEmptyStringSchema);
export const idListSchema = z.array(idSchema);

export const timestampsSchema = z.object({
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const projectStatusSchema = z.enum(projectStatusValues);
export const prioritySchema = z.enum(priorityValues);
export const outcomePrioritySchema = z.enum(outcomePriorityValues);
export const constraintKindSchema = z.enum(constraintKindValues);
export const dependencyKindSchema = z.enum(dependencyKindValues);
export const entityScopeSchema = z.enum(entityScopeValues);
export const validationStatusSchema = z.enum(validationStatusValues);
export const validationSeveritySchema = z.enum(validationSeverityValues);
export const reviewSeveritySchema = z.enum(reviewSeverityValues);
export const memoryTypeSchema = z.enum(memoryTypeValues);
export const decisionStatusSchema = z.enum(decisionStatusValues);
export const decisionScopeSchema = z.enum(decisionScopeValues);

export const baseNamedEntitySchema = z
  .object({
    id: idSchema,
    name: nonEmptyStringSchema,
    description: textSchema,
  })
  .merge(timestampsSchema);
