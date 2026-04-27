import { z } from "zod";

import type {
  AgentRunJournalEntry,
  AgentRunPacket,
  AgentRunResultDraft,
  AgentRunReview,
  AgentRunStatus,
} from "@/application/agent/agentRunTypes";
import type { StorageLike } from "@/persistence/projectRepository";
import { agentRunJournalStorageKey } from "@/persistence/storageKeys";

const createMemoryStorage = (): StorageLike => {
  const state = new Map<string, string>();

  return {
    getItem: (key) => state.get(key) ?? null,
    setItem: (key, value) => {
      state.set(key, value);
    },
    removeItem: (key) => {
      state.delete(key);
    },
  };
};

const resolveStorage = (storage?: StorageLike): StorageLike => {
  if (storage) {
    return storage;
  }

  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }

  return createMemoryStorage();
};

const AgentRunStatusSchema = z.enum([
  "packet-created",
  "result-pasted",
  "reviewed",
  "accepted",
  "needs-followup",
]) satisfies z.ZodType<AgentRunStatus>;

const AgentRunPacketSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  projectName: z.string(),
  taskId: z.string(),
  taskTitle: z.string(),
  sourceTaskGroup: z.string(),
  createdAt: z.string(),
  goal: z.string(),
  scope: z.string(),
  likelyFiles: z.string().array(),
  acceptanceCriteria: z.string().array(),
  suggestedTests: z.string().array(),
  doNotBreak: z.string().array(),
  doNotTouch: z.string().array(),
  riskNotes: z.string().array(),
  prompt: z.string(),
  expectedReportFormat: z.string(),
}) satisfies z.ZodType<AgentRunPacket>;

const AgentRunResultDraftSchema = z.object({
  rawResultText: z.string(),
  changedFiles: z.string().array(),
  testsRun: z.string().array(),
  reportedFailures: z.string().array(),
  reportedFollowups: z.string().array(),
  summary: z.string(),
  pastedAt: z.string(),
}) satisfies z.ZodType<AgentRunResultDraft>;

const AgentRunReviewSchema = z.object({
  overall: z.enum(["accepted", "needs-followup", "unclear"]),
  acceptanceCoverage: z.string().array(),
  missingAcceptanceCriteria: z.string().array(),
  testCoverage: z.string().array(),
  missingSuggestedTests: z.string().array(),
  touchedUnexpectedFiles: z.string().array(),
  doNotBreakWarnings: z.string().array(),
  followupTasks: z.string().array(),
  reviewSummary: z.string(),
}) satisfies z.ZodType<AgentRunReview>;

const AgentRunJournalEntrySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  packetId: z.string(),
  taskId: z.string(),
  createdAt: z.string(),
  status: AgentRunStatusSchema,
  packetSnapshot: AgentRunPacketSchema,
  resultDraft: AgentRunResultDraftSchema.optional(),
  review: AgentRunReviewSchema.optional(),
  notes: z.string(),
}) satisfies z.ZodType<AgentRunJournalEntry>;

export interface AgentRunJournalRepository {
  append(entry: AgentRunJournalEntry): AgentRunJournalEntry;
  update(entry: AgentRunJournalEntry): AgentRunJournalEntry;
  get(packetId: string): AgentRunJournalEntry | undefined;
  list(projectId: string | null): AgentRunJournalEntry[];
}

export class LocalAgentRunJournalRepository implements AgentRunJournalRepository {
  private readonly storage: StorageLike;

  constructor(storage?: StorageLike) {
    this.storage = resolveStorage(storage);
  }

  private readAll(): AgentRunJournalEntry[] {
    const raw = this.storage.getItem(agentRunJournalStorageKey);

    if (!raw) {
      return [];
    }

    try {
      const parsed = AgentRunJournalEntrySchema.array().safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : [];
    } catch {
      return [];
    }
  }

  private writeAll(entries: AgentRunJournalEntry[]): void {
    if (entries.length === 0) {
      this.storage.removeItem(agentRunJournalStorageKey);
      return;
    }

    this.storage.setItem(agentRunJournalStorageKey, JSON.stringify(entries));
  }

  append(entry: AgentRunJournalEntry): AgentRunJournalEntry {
    const parsed = AgentRunJournalEntrySchema.parse(entry);
    this.writeAll([parsed, ...this.readAll()]);
    return parsed;
  }

  update(entry: AgentRunJournalEntry): AgentRunJournalEntry {
    const parsed = AgentRunJournalEntrySchema.parse(entry);
    const existing = this.readAll();
    const next = existing.some((candidate) => candidate.packetId === parsed.packetId)
      ? existing.map((candidate) => (candidate.packetId === parsed.packetId ? parsed : candidate))
      : [parsed, ...existing];

    this.writeAll(next);
    return parsed;
  }

  get(packetId: string): AgentRunJournalEntry | undefined {
    return this.readAll().find((entry) => entry.packetId === packetId);
  }

  list(projectId: string | null): AgentRunJournalEntry[] {
    const entries = this.readAll();
    const filtered = projectId ? entries.filter((entry) => entry.projectId === projectId) : entries;
    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
