import type {
  AgentRunPacket,
  AgentRunResultDraft,
  AgentRunReview,
} from "@/application/agent/agentRunTypes";

const stopWords = new Set([
  "about",
  "acceptance",
  "after",
  "and",
  "before",
  "build",
  "criteria",
  "does",
  "each",
  "from",
  "have",
  "into",
  "must",
  "that",
  "the",
  "this",
  "with",
  "without",
]);

const unique = (items: string[]): string[] => [...new Set(items.map((item) => item.trim()).filter(Boolean))];

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9/_.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokensFor = (value: string): string[] =>
  unique(
    normalize(value)
      .split(" ")
      .filter((token) => token.length > 3 && !stopWords.has(token)),
  );

const hasEvidenceFor = (expected: string, evidence: string): boolean => {
  const normalizedExpected = normalize(expected);
  const normalizedEvidence = normalize(evidence);

  if (!normalizedExpected) {
    return false;
  }

  if (normalizedEvidence.includes(normalizedExpected)) {
    return true;
  }

  const expectedTokens = tokensFor(expected);
  if (expectedTokens.length === 0) {
    return false;
  }

  const overlap = expectedTokens.filter((token) => normalizedEvidence.includes(token)).length;
  const requiredOverlap = Math.min(4, Math.max(1, Math.ceil(expectedTokens.length * 0.35)));
  return overlap >= requiredOverlap;
};

const coveredItems = (expectedItems: string[], evidence: string): string[] =>
  expectedItems.filter((item) => hasEvidenceFor(item, evidence));

const missingItems = (expectedItems: string[], covered: string[]): string[] => {
  const coveredSet = new Set(covered);
  return expectedItems.filter((item) => !coveredSet.has(item));
};

const isSpecificFileHint = (value: string): boolean =>
  /\/|\\|\.(?:ts|tsx|js|jsx|css|json|md|html|yml|yaml|toml|py|go|rs|java|kt|swift|rb|sh|sql)\b/i.test(value);

const likelyFileMatches = (changedFile: string, likelyFile: string): boolean => {
  const changed = normalize(changedFile);
  const likely = normalize(likelyFile);

  if (!changed || !likely) {
    return false;
  }

  if (changed.includes(likely) || likely.includes(changed)) {
    return true;
  }

  const likelyDirectory = likely.includes("/") ? likely.split("/").slice(0, -1).join("/") : "";
  if (likelyDirectory && changed.startsWith(likelyDirectory)) {
    return true;
  }

  const changedTokens = tokensFor(changedFile);
  const likelyTokens = tokensFor(likelyFile);
  return changedTokens.some((token) => likelyTokens.includes(token));
};

const unexpectedTouchedFiles = (packet: AgentRunPacket, result: AgentRunResultDraft): string[] => {
  const specificHints = packet.likelyFiles.filter(isSpecificFileHint);
  if (specificHints.length === 0) {
    return [];
  }

  return result.changedFiles.filter(
    (changedFile) => !specificHints.some((likelyFile) => likelyFileMatches(changedFile, likelyFile)),
  );
};

const doNotBreakWarnings = (packet: AgentRunPacket, result: AgentRunResultDraft): string[] => {
  const concernText = [result.rawResultText, ...result.reportedFailures].join(" ");
  const hasConcernLanguage = /\b(broke|break|regression|failed|failure|removed|skipped|weakened|could not|unable)\b/i.test(
    concernText,
  );

  if (!hasConcernLanguage) {
    return [];
  }

  const warnings = packet.doNotBreak.filter((constraint) => hasEvidenceFor(constraint, concernText));
  return warnings.length > 0 ? warnings : result.reportedFailures;
};

export const reviewAgentRunResult = (
  packet: AgentRunPacket,
  result: AgentRunResultDraft,
): AgentRunReview => {
  const acceptanceEvidence = [
    result.rawResultText,
    result.summary,
    result.reportedFollowups.join(" "),
  ].join(" ");
  const acceptanceCoverage = coveredItems(packet.acceptanceCriteria, acceptanceEvidence);
  const missingAcceptanceCriteria = missingItems(packet.acceptanceCriteria, acceptanceCoverage);
  const testEvidence = result.testsRun.join(" ");
  const testCoverage = coveredItems(packet.suggestedTests, testEvidence);
  const missingSuggestedTests = missingItems(packet.suggestedTests, testCoverage);
  const touchedUnexpectedFiles = unexpectedTouchedFiles(packet, result);
  const breakWarnings = doNotBreakWarnings(packet, result);

  const unclearReasons = unique([
    result.changedFiles.length === 0 ? "Changed files were not listed in the pasted report." : "",
    packet.suggestedTests.length > 0 && result.testsRun.length === 0
      ? "Suggested tests were not mentioned in the pasted report."
      : "",
  ]);
  const followupTasks = unique([
    ...missingAcceptanceCriteria.map((item) => `Add evidence for acceptance criterion: ${item}`),
    ...missingSuggestedTests.map((item) => `Run or explain missing suggested test: ${item}`),
    ...touchedUnexpectedFiles.map((item) => `Explain or revert unexpected touched file: ${item}`),
    ...breakWarnings.map((item) => `Resolve do-not-break concern: ${item}`),
    ...result.reportedFailures.map((item) => `Resolve reported failure: ${item}`),
    ...result.reportedFollowups,
  ]);
  const hasFollowupNeed =
    missingAcceptanceCriteria.length > 0 ||
    missingSuggestedTests.length > 0 ||
    touchedUnexpectedFiles.length > 0 ||
    breakWarnings.length > 0 ||
    result.reportedFailures.length > 0 ||
    result.reportedFollowups.length > 0;
  const overall =
    unclearReasons.length > 0
      ? "unclear"
      : hasFollowupNeed
        ? "needs-followup"
        : "accepted";
  const reviewSummary =
    overall === "accepted"
      ? "Based only on the pasted report, the task appears to cover acceptance criteria, suggested tests, and stated constraints."
      : overall === "unclear"
        ? `The pasted report is incomplete: ${unclearReasons.join(" ")}`
        : "The pasted report shows remaining followup before this run should be accepted.";

  return {
    overall,
    acceptanceCoverage,
    missingAcceptanceCriteria,
    testCoverage,
    missingSuggestedTests,
    touchedUnexpectedFiles,
    doNotBreakWarnings: breakWarnings,
    followupTasks,
    reviewSummary,
  };
};
