import { exportBlueprintJson } from "@/application/export/exportBlueprintJson";
import { exportBlueprintLineage } from "@/application/export/exportBlueprintLineage";
import { exportBlueprintMarkdown } from "@/application/export/exportBlueprintMarkdown";
import { exportCodexPrompt } from "@/application/export/exportCodexPrompt";
import { exportCodexTaskPack } from "@/application/export/exportCodexTaskPack";
import { exportImplementationPlan } from "@/application/export/exportImplementationPlan";
import { exportMvpChecklist } from "@/application/export/exportMvpChecklist";
import type { AgentRunJournalEntry } from "@/application/agent/agentRunTypes";
import type { ProjectBlueprint } from "@/domain/models";
import type { BlueprintRevision } from "@/persistence/revisionTypes";
import { SectionCard } from "@/ui/components/SectionCard";

type ExportPanelProps = {
  blueprint: ProjectBlueprint | null;
  revisions?: BlueprintRevision[];
  agentRunJournal?: AgentRunJournalEntry[];
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

export const ExportPanel = ({
  blueprint,
  revisions = [],
  agentRunJournal = [],
}: ExportPanelProps) => {
  if (!blueprint) {
    return (
      <SectionCard
        title="Export outputs"
        description="Select or create a blueprint before downloading implementation artifacts."
      >
        <p className="muted">No exportable blueprint is selected.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Export outputs" description="Download local implementation artifacts from the current blueprint.">
      <div className="button-row">
        <button
          type="button"
          onClick={() =>
            downloadTextFile(
              filenameFor(blueprint, "architecture-brief", "md"),
              exportBlueprintMarkdown(blueprint, { revisions, agentRunJournal }),
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
              filenameFor(blueprint, "implementation-plan", "md"),
              exportImplementationPlan(blueprint),
              "text/markdown",
            )
          }
        >
          Export Implementation Plan
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={() =>
            downloadTextFile(
              filenameFor(blueprint, "codex-task-pack", "md"),
              exportCodexTaskPack(blueprint),
              "text/markdown",
            )
          }
        >
          Export Codex Task Pack
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
        <button
          type="button"
          className="button-secondary"
          onClick={() =>
            downloadTextFile(
              filenameFor(blueprint, "lineage-report", "md"),
              exportBlueprintLineage({ blueprint, revisions, agentRunJournal }),
              "text/markdown",
            )
          }
        >
          Export Lineage Report
        </button>
      </div>
    </SectionCard>
  );
};
