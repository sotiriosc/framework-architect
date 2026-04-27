import { useMemo, useState } from "react";

import type { AgentRunJournalEntry } from "@/application/agent/agentRunTypes";
import {
  buildImplementationPlan,
  listImplementationPlanTasks,
} from "@/application/planning/buildImplementationPlan";
import type { ProjectBlueprint } from "@/domain/models";
import { SectionCard } from "@/ui/components/SectionCard";

type AgentRunHarnessPanelProps = {
  blueprint: ProjectBlueprint;
  journalEntries: AgentRunJournalEntry[];
  onCreatePacket: (taskId: string) => AgentRunJournalEntry | null;
  onReviewResult: (packetId: string, rawResultText: string) => AgentRunJournalEntry | null;
};

const formatStatus = (value: string): string =>
  value
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const compactList = (items: string[], empty: string) =>
  items.length > 0 ? (
    <ul className="compact-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  ) : (
    <p className="muted">{empty}</p>
  );

export const AgentRunHarnessPanel = ({
  blueprint,
  journalEntries,
  onCreatePacket,
  onReviewResult,
}: AgentRunHarnessPanelProps) => {
  const plan = useMemo(() => buildImplementationPlan(blueprint), [blueprint]);
  const tasks = useMemo(() => listImplementationPlanTasks(plan), [plan]);
  const [selectedTaskId, setSelectedTaskId] = useState(tasks[0]?.id ?? "");
  const [selectedPacketId, setSelectedPacketId] = useState(journalEntries[0]?.packetId ?? "");
  const [resultText, setResultText] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const selectedEntry =
    journalEntries.find((entry) => entry.packetId === selectedPacketId) ??
    journalEntries[0] ??
    null;
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? tasks[0] ?? null;

  const copyText = async (key: string, value: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
  };

  const createPacket = () => {
    if (!selectedTask) {
      return;
    }

    const entry = onCreatePacket(selectedTask.id);
    if (entry) {
      setSelectedPacketId(entry.packetId);
      setResultText("");
    }
  };

  const reviewResult = () => {
    if (!selectedEntry) {
      return;
    }

    const entry = onReviewResult(selectedEntry.packetId, resultText);
    if (entry) {
      setSelectedPacketId(entry.packetId);
    }
  };

  return (
    <SectionCard
      title="Agent run harness"
      description="Create a bounded packet for one implementation task, paste an external Codex result, and review the report before trusting it."
    >
      <p className="muted">
        This reviews the pasted report. It does not execute Codex, inspect changed code, verify tests, or merge anything directly.
      </p>

      <label className="field">
        <span>Implementation task</span>
        <select
          value={selectedTask?.id ?? ""}
          disabled={tasks.length === 0}
          onChange={(event) => setSelectedTaskId(event.target.value)}
        >
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </select>
      </label>

      <div className="button-row">
        <button type="button" disabled={!selectedTask} onClick={createPacket}>
          Generate agent run packet
        </button>
        <button
          type="button"
          className="button-secondary"
          disabled={!selectedEntry}
          onClick={() => selectedEntry && void copyText("packet", selectedEntry.packetSnapshot.prompt)}
        >
          {copiedKey === "packet" ? "Copied packet" : "Copy packet prompt"}
        </button>
      </div>

      {selectedEntry ? (
        <>
          <details className="quality-detail" open>
            <summary>Current packet</summary>
            <div className="tag-row">
              <span>{formatStatus(selectedEntry.status)}</span>
              <span>{selectedEntry.packetSnapshot.sourceTaskGroup}</span>
            </div>
            <p>
              <strong>{selectedEntry.packetSnapshot.taskTitle}</strong>
            </p>
            <p>{selectedEntry.packetSnapshot.goal}</p>
            <p className="muted">Created: {selectedEntry.createdAt}</p>
            <details className="quality-detail">
              <summary>Acceptance criteria</summary>
              {compactList(selectedEntry.packetSnapshot.acceptanceCriteria, "No criteria listed.")}
            </details>
            <details className="quality-detail">
              <summary>Suggested tests</summary>
              {compactList(selectedEntry.packetSnapshot.suggestedTests, "No suggested tests listed.")}
            </details>
            <details className="quality-detail">
              <summary>Do not break</summary>
              {compactList(selectedEntry.packetSnapshot.doNotBreak, "No constraints listed.")}
            </details>
          </details>

          <label className="field">
            <span>Paste external agent result</span>
            <textarea
              rows={10}
              value={resultText}
              onChange={(event) => setResultText(event.target.value)}
              placeholder="Paste the Codex report here. Include changed files, tests run, acceptance coverage, failures, and followups."
            />
          </label>
          <button type="button" disabled={!resultText.trim()} onClick={reviewResult}>
            Review pasted result
          </button>
        </>
      ) : (
        <p className="muted">Generate a packet to start the execution journal for this blueprint.</p>
      )}

      {selectedEntry?.resultDraft ? (
        <details className="quality-detail" open>
          <summary>Latest pasted result</summary>
          <p>{selectedEntry.resultDraft.summary || "No summary extracted."}</p>
          <div className="quality-callout">
            <div>
              <span className="eyebrow">Changed files</span>
              {compactList(selectedEntry.resultDraft.changedFiles, "No changed files were listed.")}
            </div>
            <div>
              <span className="eyebrow">Tests run</span>
              {compactList(selectedEntry.resultDraft.testsRun, "No tests were listed.")}
            </div>
          </div>
        </details>
      ) : null}

      {selectedEntry?.review ? (
        <details className="quality-detail" open>
          <summary>Harness review: {formatStatus(selectedEntry.review.overall)}</summary>
          <p>{selectedEntry.review.reviewSummary}</p>
          <div className="quality-callout">
            <div>
              <span className="eyebrow">Covered criteria</span>
              {compactList(selectedEntry.review.acceptanceCoverage, "No acceptance criteria were clearly covered.")}
            </div>
            <div>
              <span className="eyebrow">Missing criteria</span>
              {compactList(selectedEntry.review.missingAcceptanceCriteria, "No missing criteria detected.")}
            </div>
          </div>
          <details className="quality-detail">
            <summary>Missing suggested tests</summary>
            {compactList(selectedEntry.review.missingSuggestedTests, "No missing suggested tests detected.")}
          </details>
          <details className="quality-detail">
            <summary>Unexpected touched files</summary>
            {compactList(selectedEntry.review.touchedUnexpectedFiles, "No unexpected files detected from the report.")}
          </details>
          <details className="quality-detail">
            <summary>Do-not-break warnings</summary>
            {compactList(selectedEntry.review.doNotBreakWarnings, "No do-not-break warnings detected from the report.")}
          </details>
          <details className="quality-detail">
            <summary>Followup tasks</summary>
            {compactList(selectedEntry.review.followupTasks, "No followup tasks detected.")}
          </details>
        </details>
      ) : null}

      <details className="quality-detail">
        <summary>Execution journal ({journalEntries.length})</summary>
        {journalEntries.length > 0 ? (
          <ul className="stacked-list">
            {journalEntries.map((entry) => (
              <li key={entry.id} className="stacked-list__item">
                <div className="tag-row">
                  <span>{formatStatus(entry.status)}</span>
                  <span>{entry.createdAt}</span>
                </div>
                <strong>{entry.packetSnapshot.taskTitle}</strong>
                <p>{entry.notes}</p>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setSelectedPacketId(entry.packetId)}
                >
                  Inspect run
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No agent run packets have been created for this project yet.</p>
        )}
      </details>
    </SectionCard>
  );
};
