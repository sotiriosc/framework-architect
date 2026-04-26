import type { ProjectBlueprint } from "@/domain/models";
import { ProjectBlueprintSchema } from "@/schema";

export const exportBlueprintJson = (blueprint: ProjectBlueprint): string =>
  `${JSON.stringify(ProjectBlueprintSchema.parse(structuredClone(blueprint)), null, 2)}\n`;
