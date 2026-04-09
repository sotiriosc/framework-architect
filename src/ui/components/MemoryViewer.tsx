import type { MemoryEntry, MemoryState } from "@/domain/models";
import { SectionCard } from "@/ui/components/SectionCard";

const renderEntries = (entries: MemoryEntry[]) => {
  if (entries.length === 0) {
    return <p className="muted">No memory recorded yet.</p>;
  }

  return (
    <ul className="stacked-list">
      {entries
        .slice()
        .reverse()
        .map((entry) => (
          <li key={entry.id} className="stacked-list__item">
            <strong>{entry.summary}</strong>
            <p>{entry.reason}</p>
            <div className="tag-row">
              <span>{entry.type}</span>
              {entry.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <p className="muted">
              related: {entry.relatedEntityIds.join(", ") || "none"} | updated {entry.updatedAt}
            </p>
          </li>
        ))}
    </ul>
  );
};

type MemoryViewerProps = {
  memory: MemoryState;
};

export const MemoryViewer = ({ memory }: MemoryViewerProps) => (
  <SectionCard title="Memory viewer" description="Project, structural, and decision memory are persistent from v1.">
    <div className="memory-grid">
      <div>
        <h3>Project memory</h3>
        {renderEntries(memory.projectEntries)}
      </div>
      <div>
        <h3>Structural memory</h3>
        {renderEntries(memory.structuralEntries)}
      </div>
      <div>
        <h3>Decision memory</h3>
        {renderEntries(memory.decisionEntries)}
      </div>
    </div>
  </SectionCard>
);
