const normalizeSentence = (value: string): string => value.replace(/\s+/g, " ").trim();

const stripLeadIn = (value: string): string =>
  value
    .replace(/^i want to\s+/i, "")
    .replace(/^we need to\s+/i, "")
    .replace(/^build\s+/i, "")
    .replace(/^create\s+/i, "")
    .replace(/^make\s+/i, "")
    .trim();

const capitalize = (value: string): string => {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
};

export type ExtractedIntent = {
  summary: string;
  problemStatement: string;
  targetAudience: string;
  valueHypothesis: string;
  outcomeName: string;
  outcomeDescription: string;
};

export const extractIntentFromRawIdea = (rawIdea: string): ExtractedIntent => {
  const normalized = normalizeSentence(rawIdea);
  const firstSentence = normalizeSentence(normalized.split(/[.!?]/)[0] ?? normalized);
  const stripped = stripLeadIn(firstSentence);
  const summary = capitalize(stripped || firstSentence || normalized);
  const outcomeName = capitalize(
    summary.length > 72 ? `${summary.slice(0, 69).trimEnd()}...` : summary,
  );

  return {
    summary: outcomeName || "Clarify the intended outcome",
    problemStatement: normalized,
    targetAudience: "Builder team",
    valueHypothesis: `If the architecture is explicit, builders can implement ${summary.toLowerCase()} with less ambiguity.`,
    outcomeName: outcomeName || "Primary outcome",
    outcomeDescription: normalized,
  };
};
