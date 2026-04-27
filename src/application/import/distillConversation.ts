import {
  getFrameworkTemplate,
  inferFrameworkTemplateId,
} from "@/application/templates/frameworkTemplates";
import {
  cleanOutcomeText,
  cleanProblemText,
  cleanRawIdeaText,
  cleanTargetUserText,
  isActionableMvpItem,
  isExpansionItem,
  isOpportunityItem,
  isRiskItem,
} from "@/application/intake/intakeTextFilters";
import type {
  ConversationDistillationResult,
  ConversationImportDraft,
  DistillationConfidence,
  DistilledConversationIntake,
  DistilledSignal,
  DistilledSignalKind,
} from "@/application/import/conversationImportTypes";

type SectionKind =
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
  | null;

type CandidateLine = {
  original: string;
  text: string;
  section: SectionKind;
  index: number;
};

const signalKeywords = {
  "raw-idea": ["raw idea", "idea", "concept", "we want", "build", "create"],
  problem: ["problem", "pain", "challenge", "friction", "issue", "because"],
  outcome: ["goal", "outcome", "result", "success", "so that", "we need"],
  principle: ["principle", "must", "should", "always", "keep", "preserve"],
  invariant: ["must remain true", "invariant", "non-negotiable", "cannot", "never"],
  mvp: ["mvp", "first build", "build now", "now", "must include", "v1"],
  expansion: ["later", "future", "eventually", "not yet", "next version", "someday"],
  risk: ["risk", "break", "drift", "failure", "concern", "danger", "fragile"],
  opportunity: ["opportunity", "could", "unlock", "hidden", "next step", "nice to have"],
  "target-user": ["target user", "user", "client", "audience", "customer", "reader", "operator"],
  implementation: ["implement", "codex", "task", "test", "export", "files", "build sequence"],
  "do-not-break": ["do not break", "don't break", "must not break", "do not weaken", "must not weaken"],
} satisfies Record<DistilledSignalKind, string[]>;

const sectionHeadings: Array<[SectionKind, RegExp]> = [
  ["raw-idea", /\b(raw idea|idea|concept|summary)\b/i],
  ["problem", /\b(problem|pain|challenge|friction|issue)\b/i],
  ["outcome", /\b(goal|outcome|success|result)\b/i],
  ["principle", /\b(principles?|values?)\b/i],
  ["invariant", /\b(must remain true|invariants?|non-negotiables?|do not break)\b/i],
  ["mvp", /\b(mvp|first build|build now|v1|must include)\b/i],
  ["expansion", /\b(expansion|later|future|eventually|not yet|next version)\b/i],
  ["risk", /\b(risks?|concerns?|failure modes?|breakage)\b/i],
  ["opportunity", /\b(opportunities|hidden opportunities|nice to have)\b/i],
  ["target-user", /\b(target user|users?|clients?|audience|customers?|readers?)\b/i],
  ["implementation", /\b(implementation|codex|tasks?|tests?|exports?|build sequence)\b/i],
];

const labelPatterns: Array<[DistilledSignalKind, RegExp]> = [
  ["raw-idea", /^(?:raw idea|idea|concept|summary)\s*[:\-]\s*(.+)$/i],
  ["problem", /^(?:problem|pain|challenge|friction|issue)\s*[:\-]\s*(.+)$/i],
  ["outcome", /^(?:goal|outcome|intended outcome|result|success)\s*[:\-]\s*(.+)$/i],
  ["target-user", /^(?:target user|user|users|client|clients|audience|customer|customers|reader|readers)\s*[:\-]\s*(.+)$/i],
  ["principle", /^(?:principle|core principle|should)\s*[:\-]\s*(.+)$/i],
  ["invariant", /^(?:must remain true|invariant|non-negotiable)\s*[:\-]\s*(.+)$/i],
  ["do-not-break", /^(?:do not break|don't break|must not break|do not weaken|must not weaken)\s*[:\-]\s*(.+)$/i],
  ["mvp", /^(?:mvp|first build|build now|now|must include|v1)\s*[:\-]\s*(.+)$/i],
  ["expansion", /^(?:later|future|eventually|not yet|expansion|next version)\s*[:\-]\s*(.+)$/i],
  ["risk", /^(?:risk|concern|failure|failure mode)\s*[:\-]\s*(.+)$/i],
  ["opportunity", /^(?:opportunity|hidden opportunity|could|nice to have)\s*[:\-]\s*(.+)$/i],
  ["implementation", /^(?:implementation|codex task|task|test|export|build sequence)\s*[:\-]\s*(.+)$/i],
];

const proseCuePatterns: Array<[DistilledSignalKind, RegExp]> = [
  ["target-user", /^(?:the\s+)?target user\s+is\s+(.+)$/i],
  ["target-user", /^(?:the\s+)?user\s+is\s+(.+)$/i],
  ["target-user", /^this is for\s+(.+)$/i],
  ["target-user", /^(?:the\s+)?audience\s+is\s+(.+)$/i],
  ["target-user", /^(?:the\s+)?client\s+is\s+(.+)$/i],
  ["problem", /^(?:the\s+)?problem\s+is\s+(.+)$/i],
  ["problem", /^(?:the\s+)?issue\s+is\s+(.+)$/i],
  ["problem", /^(?:the\s+)?challenge\s+is\s+(.+)$/i],
  ["problem", /^(?:the\s+)?friction\s+is\s+(.+)$/i],
  ["outcome", /^(?:the\s+)?intended outcome\s+is\s+(.+)$/i],
  ["outcome", /^(?:the\s+)?goal\s+is\s+(.+)$/i],
  ["outcome", /^(?:the\s+)?outcome\s+is\s+(.+)$/i],
  ["outcome", /^success means\s+(.+)$/i],
  ["outcome", /^the result should be\s+(.+)$/i],
  ["raw-idea", /^(?:i|we)\s+want to build\s+(.+)$/i],
  ["raw-idea", /^build\s+(.+)$/i],
  ["raw-idea", /^create\s+(.+)$/i],
  ["raw-idea", /^the idea is\s+(.+)$/i],
];

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

const stripSpeakerAndBullet = (value: string): string =>
  normalizeWhitespace(
    value
      .replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "")
      .replace(/^\s*(?:user|assistant|me|client|pm|dev|coach|speaker\s+\d+|participant\s+\d+)[:\-]\s*/i, ""),
  );

const isLikelyHeading = (line: string): boolean =>
  line.length <= 80 &&
  (/:\s*$/.test(line) || sectionHeadings.some(([, pattern]) => pattern.test(line))) &&
  !/[.!?]\s*$/.test(line);

const headingKindFor = (line: string): SectionKind =>
  sectionHeadings.find(([, pattern]) => pattern.test(line))?.[0] ?? null;

const textAfterLabel = (line: string): { kind: DistilledSignalKind; text: string } | null => {
  for (const [kind, pattern] of labelPatterns) {
    const match = line.match(pattern);
    if (match?.[1]?.trim()) {
      return { kind, text: normalizeWhitespace(match[1]) };
    }
  }

  return null;
};

const textAfterProseCue = (
  line: CandidateLine,
): { kind: DistilledSignalKind; text: string } | null => {
  for (const [kind, pattern] of proseCuePatterns) {
    const match = line.text.match(pattern);
    if (!match?.[1]?.trim()) {
      continue;
    }

    if (kind === "raw-idea" && line.section && line.section !== "raw-idea") {
      continue;
    }

    const text = normalizeWhitespace(match[1]);
    return {
      kind,
      text: kind === "raw-idea" && /^(build|create)\s/i.test(line.text) ? line.text : text,
    };
  }

  return null;
};

const includesKeyword = (value: string, keywords: string[]): boolean => {
  const normalized = value.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
};

const kindForLine = (line: CandidateLine): { kind: DistilledSignalKind; confidence: DistillationConfidence; reason: string } | null => {
  const labeled = textAfterLabel(line.text);
  if (labeled) {
    return {
      kind: labeled.kind,
      confidence: "high",
      reason: "Extracted from an explicit label.",
    };
  }

  const proseCue = textAfterProseCue(line);
  if (proseCue) {
    return {
      kind: proseCue.kind,
      confidence: "high",
      reason: "Extracted from an explicit prose cue.",
    };
  }

  if (line.section) {
    return {
      kind: line.section,
      confidence: "high",
      reason: "Extracted from a matching section heading.",
    };
  }

  if (includesKeyword(line.text, signalKeywords["do-not-break"])) {
    return { kind: "do-not-break", confidence: "high", reason: "Contains do-not-break language." };
  }

  const priorityKinds: DistilledSignalKind[] = [
    "mvp",
    "expansion",
    "risk",
    "target-user",
    "problem",
    "outcome",
    "invariant",
    "implementation",
    "opportunity",
    "principle",
  ];
  const matchedKind = priorityKinds.find((kind) => includesKeyword(line.text, signalKeywords[kind]));
  if (matchedKind) {
    return {
      kind: matchedKind,
      confidence: matchedKind === "principle" || matchedKind === "opportunity" ? "medium" : "medium",
      reason: `Contains ${matchedKind.replace("-", " ")} keywords.`,
    };
  }

  if (line.index === 0 || line.text.length > 90) {
    return { kind: "raw-idea", confidence: "low", reason: "Used as a strong paragraph fallback." };
  }

  return null;
};

const cleanExtractedText = (line: string): string => {
  const labeled = textAfterLabel(line);
  if (labeled) {
    return labeled.text;
  }

  const proseCue = textAfterProseCue({
    original: line,
    text: stripSpeakerAndBullet(line),
    section: null,
    index: 0,
  });
  if (proseCue) {
    return proseCue.text;
  }

  return stripSpeakerAndBullet(line)
    .replace(/^(?:mvp|later|future|risk|problem|goal|outcome|principle|must remain true)\s*[:\-]\s*/i, "")
    .trim();
};

const sourceSnippet = (line: string): string => normalizeWhitespace(line).slice(0, 240);

const splitCandidateLines = (rawText: string): CandidateLine[] => {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const candidates: CandidateLine[] = [];
  let currentSection: SectionKind = null;

  lines.forEach((original, index) => {
    const wasListItem = /^\s*(?:[-*•]|\d+[.)])\s+/.test(original);
    const cleaned = stripSpeakerAndBullet(original);
    if (!cleaned) {
      return;
    }

    if (!wasListItem && isLikelyHeading(cleaned)) {
      currentSection = headingKindFor(cleaned);
      const labelValue = textAfterLabel(cleaned);
      if (!labelValue || labelValue.text.length < 8) {
        return;
      }
    }

    if (cleaned.length < 8) {
      return;
    }

    candidates.push({
      original,
      text: cleaned,
      section: currentSection,
      index,
    });
  });

  return candidates;
};

const makeSignal = (
  line: CandidateLine,
  kind: DistilledSignalKind,
  confidence: DistillationConfidence,
  reason: string,
  signalIndex: number,
): DistilledSignal => ({
  id: `distilled-${kind}-${signalIndex}`,
  kind,
  text: cleanExtractedText(line.text),
  confidence,
  sourceSnippet: sourceSnippet(line.original),
  reason,
});

const uniqueByNormalizedText = (items: string[]): string[] => {
  const seen = new Set<string>();
  const next: string[] = [];

  items.forEach((item) => {
    const clean = normalizeWhitespace(item);
    const key = clean.toLowerCase();
    if (!clean || clean.length < 5 || seen.has(key)) {
      return;
    }

    seen.add(key);
    next.push(clean);
  });

  return next;
};

const firstSignalText = (signals: DistilledSignal[], kind: DistilledSignalKind): string =>
  signals.find((signal) => signal.kind === kind && signal.text.length >= 8)?.text ?? "";

const signalTexts = (signals: DistilledSignal[], kinds: DistilledSignalKind[]): string[] =>
  uniqueByNormalizedText(
    signals
      .filter((signal) => kinds.includes(signal.kind))
      .map((signal) => signal.text),
  );

const firstStrongParagraph = (rawText: string): string =>
  rawText
    .split(/\n\s*\n|\r?\n/)
    .map(stripSpeakerAndBullet)
    .find((line) => line.length >= 45 && !isLikelyHeading(line)) ??
  stripSpeakerAndBullet(rawText).slice(0, 280);

const titleFromDraft = (draft: ConversationImportDraft): string =>
  draft.title.trim() ||
  draft.optionalSourceLabel?.trim() ||
  "Imported Conversation Blueprint";

const confidenceFor = (signals: DistilledSignal[], warnings: string[]): DistillationConfidence => {
  if (warnings.length >= 4) {
    return "low";
  }

  const highCount = signals.filter((signal) => signal.confidence === "high").length;
  const lowCount = signals.filter((signal) => signal.confidence === "low").length;

  if (highCount >= 5 && lowCount <= Math.max(2, Math.floor(signals.length / 3))) {
    return "high";
  }

  return "medium";
};

export const distillConversationToIntake = (
  draft: ConversationImportDraft,
): ConversationDistillationResult => {
  const rawText = draft.rawText.trim();
  const candidates = splitCandidateLines(rawText);
  const signals = candidates
    .map((line, index) => {
      const match = kindForLine(line);
      return match ? makeSignal(line, match.kind, match.confidence, match.reason, index) : null;
    })
    .filter((signal): signal is DistilledSignal => Boolean(signal))
    .filter((signal) => signal.text.length >= 5);
  const suggestedTemplateId = inferFrameworkTemplateId(
    [draft.title, draft.optionalSourceLabel, rawText].filter(Boolean).join(" "),
  );
  const template = getFrameworkTemplate(suggestedTemplateId);
  const rawIdeaCandidate = cleanRawIdeaText(firstSignalText(signals, "raw-idea") || firstStrongParagraph(rawText));
  const problemCandidate = cleanProblemText(firstSignalText(signals, "problem"));
  const targetUserCandidate = cleanTargetUserText(firstSignalText(signals, "target-user"));
  const intendedOutcomeCandidate = cleanOutcomeText(firstSignalText(signals, "outcome"));
  const corePrinciples = signalTexts(signals, ["principle"]).slice(0, 8);
  const mustRemainTrue = signalTexts(signals, ["invariant", "do-not-break"]).slice(0, 10);
  const mvpBoundary = signalTexts(signals, ["mvp"]).filter(isActionableMvpItem).slice(0, 14);
  const expansionIdeas = signalTexts(signals, ["expansion"]).filter(isExpansionItem).slice(0, 10);
  const knownRisks = signalTexts(signals, ["risk"]).filter(isRiskItem).slice(0, 10);
  const hiddenOpportunities = signalTexts(signals, ["opportunity", "implementation"])
    .filter(isOpportunityItem)
    .slice(0, 10);
  const lowConfidenceCount = signals.filter((signal) => signal.confidence === "low").length;
  const warnings: string[] = [];

  if (rawText.length < 160) {
    warnings.push("Raw text is short; distillation may be weak.");
  }
  if (!targetUserCandidate) {
    warnings.push("No target user, client, audience, or customer was confidently found.");
  }
  if (mvpBoundary.length === 0) {
    warnings.push("No MVP, first-build, now, or must-include boundary was found.");
  }
  if (mustRemainTrue.length === 0) {
    warnings.push("No must-remain-true, invariant, or do-not-break item was found.");
  }
  if (lowConfidenceCount >= Math.max(3, Math.ceil(signals.length / 2))) {
    warnings.push("Many extracted signals are low confidence; review fields before creating a blueprint.");
  }

  const confidence = confidenceFor(signals, warnings);
  const intake: DistilledConversationIntake = {
    projectNameCandidate: titleFromDraft(draft),
    frameworkTypeCandidate: template.label,
    rawIdeaCandidate,
    targetUserCandidate,
    problemCandidate,
    intendedOutcomeCandidate,
    corePrinciples,
    mustRemainTrue,
    mvpBoundary,
    expansionIdeas,
    knownRisks,
    hiddenOpportunities,
    suggestedTemplateId,
    confidence,
    warnings,
  };

  return {
    draft,
    intake,
    signals,
    confidence,
    warnings,
  };
};
