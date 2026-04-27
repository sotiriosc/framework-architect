import type { FrameworkTemplateId } from "@/application/templates/frameworkTemplates";

export type ConversationSourceType =
  | "chat-transcript"
  | "notes"
  | "brainstorm"
  | "meeting"
  | "other";

export type DistillationConfidence = "high" | "medium" | "low";

export type ConversationImportDraft = {
  title: string;
  sourceType: ConversationSourceType;
  rawText: string;
  optionalSourceLabel?: string;
  createdAt: string;
};

export type DistilledSignalKind =
  | "raw-idea"
  | "problem"
  | "outcome"
  | "principle"
  | "invariant"
  | "mvp"
  | "expansion"
  | "risk"
  | "opportunity"
  | "target-user"
  | "implementation"
  | "do-not-break";

export type DistilledSignal = {
  id: string;
  kind: DistilledSignalKind;
  text: string;
  confidence: DistillationConfidence;
  sourceSnippet: string;
  reason: string;
};

export type DistilledConversationIntake = {
  projectNameCandidate: string;
  frameworkTypeCandidate: string;
  rawIdeaCandidate: string;
  targetUserCandidate: string;
  problemCandidate: string;
  intendedOutcomeCandidate: string;
  corePrinciples: string[];
  mustRemainTrue: string[];
  mvpBoundary: string[];
  expansionIdeas: string[];
  knownRisks: string[];
  hiddenOpportunities: string[];
  suggestedTemplateId: FrameworkTemplateId;
  confidence: DistillationConfidence;
  warnings: string[];
};

export type ConversationDistillationResult = {
  draft: ConversationImportDraft;
  intake: DistilledConversationIntake;
  signals: DistilledSignal[];
  confidence: DistillationConfidence;
  warnings: string[];
};
