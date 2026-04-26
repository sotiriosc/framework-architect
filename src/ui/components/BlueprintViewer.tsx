import type { ProjectBlueprint } from "@/domain/models";
import { SectionCard } from "@/ui/components/SectionCard";

type BlueprintViewerProps = {
  blueprint: ProjectBlueprint;
};

export const BlueprintViewer = ({ blueprint }: BlueprintViewerProps) => (
  <SectionCard title="Blueprint JSON" description="Advanced debug view of the current structured blueprint document.">
    <pre className="json-viewer">{JSON.stringify(blueprint, null, 2)}</pre>
  </SectionCard>
);
