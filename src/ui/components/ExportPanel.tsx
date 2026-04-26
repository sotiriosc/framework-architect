import { exportBlueprintJson } from "@/application/export/exportBlueprintJson";
import { exportBlueprintMarkdown } from "@/application/export/exportBlueprintMarkdown";
import { exportCodexPrompt } from "@/application/export/exportCodexPrompt";
import { exportMvpChecklist } from "@/application/export/exportMvpChecklist";
import type { ProjectBlueprint } from "@/domain/models";
import { SectionCard } from "@/ui/components/SectionCard";

type ExportPanelProps = {
  blueprint: ProjectBlueprint;
};

const downloadTextFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const filenameFor = (blueprint: ProjectBlueprint, suffix: string, extension: string): string =>
  `${blueprint.project.slug || "framework-blueprint"}-${suffix}.${extension}`;

export const ExportPanel = ({ blueprint }: ExportPanelProps) => (
  <SectionCard title="Export outputs" description="Download local implementation artifacts from the current blueprint.">
    <div className="button-row">
      <button
        type="button"
        onClick={() =>
          downloadTextFile(
            filenameFor(blueprint, "architecture-brief", "md"),
            exportBlueprintMarkdown(blueprint),
            "text/markdown",
          )
        }
      >
        Export Markdown
      </button>
      <button
        type="button"
        className="button-secondary"
        onClick={() =>
          downloadTextFile(
            filenameFor(blueprint, "codex-prompt", "md"),
            exportCodexPrompt(blueprint),
            "text/markdown",
          )
        }
      >
        Export Codex Prompt
      </button>
      <button
        type="button"
        className="button-secondary"
        onClick={() =>
          downloadTextFile(
            filenameFor(blueprint, "blueprint", "json"),
            exportBlueprintJson(blueprint),
            "application/json",
          )
        }
      >
        Export JSON
      </button>
      <button
        type="button"
        className="button-secondary"
        onClick={() =>
          downloadTextFile(
            filenameFor(blueprint, "mvp-checklist", "md"),
            exportMvpChecklist(blueprint),
            "text/markdown",
          )
        }
      >
        Export MVP Checklist
      </button>
    </div>
  </SectionCard>
);
