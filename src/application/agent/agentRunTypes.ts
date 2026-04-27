export type AgentRunStatus =
  | "packet-created"
  | "result-pasted"
  | "reviewed"
  | "accepted"
  | "needs-followup";

export type AgentRunPacket = {
  id: string;
  projectId: string;
  projectName: string;
  taskId: string;
  taskTitle: string;
  sourceTaskGroup: string;
  createdAt: string;
  goal: string;
  scope: string;
  likelyFiles: string[];
  acceptanceCriteria: string[];
  suggestedTests: string[];
  doNotBreak: string[];
  doNotTouch: string[];
  riskNotes: string[];
  prompt: string;
  expectedReportFormat: string;
};

export type AgentRunResultDraft = {
  rawResultText: string;
  changedFiles: string[];
  testsRun: string[];
  reportedFailures: string[];
  reportedFollowups: string[];
  summary: string;
  pastedAt: string;
};

export type AgentRunReview = {
  overall: "accepted" | "needs-followup" | "unclear";
  acceptanceCoverage: string[];
  missingAcceptanceCriteria: string[];
  testCoverage: string[];
  missingSuggestedTests: string[];
  touchedUnexpectedFiles: string[];
  doNotBreakWarnings: string[];
  followupTasks: string[];
  reviewSummary: string;
};

export type AgentRunJournalEntry = {
  id: string;
  projectId: string;
  packetId: string;
  taskId: string;
  createdAt: string;
  status: AgentRunStatus;
  packetSnapshot: AgentRunPacket;
  resultDraft?: AgentRunResultDraft;
  review?: AgentRunReview;
  notes: string;
};
