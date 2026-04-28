const normalize = (value: string): string => value.replace(/\s+/g, " ").trim();

const stripTerminalSentencePunctuation = (value: string): string =>
  value.replace(/[.!?]+$/g, "").trim();

const capitalizeFirst = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
};

const removeLeadingPhrase = (value: string, phrases: RegExp[]): string => {
  let next = normalize(value);

  phrases.forEach((phrase) => {
    next = next.replace(phrase, "").trim();
  });

  return next;
};

const splitPersonaFromNeeds = (value: string): string =>
  value
    .replace(
      /\.\s+(?:the\s+user|they|the\s+client|the\s+audience|the\s+customer)\s+(?:need|needs|should|must|want|wants|has to|have to)\b.*$/i,
      "",
    )
    .trim();

const readable = (value: string): string => capitalizeFirst(stripTerminalSentencePunctuation(normalize(value)));

export const cleanExtractedFieldText = (value: string): string => {
  const cleaned = removeLeadingPhrase(value, [
    /^that\s+/i,
    /^that\s+(?:i|we)\s+can\s+/i,
    /^(?:i|we)\s+can\s+/i,
    /^(?:i|we)\s+want\s+to\s+/i,
  ]);

  return readable(cleaned);
};

export const cleanTargetUserText = (value: string): string => {
  const withoutNeeds = splitPersonaFromNeeds(normalize(value));
  const withoutCue = removeLeadingPhrase(withoutNeeds, [
    /^(?:the\s+)?target\s+user\s+is\s+/i,
    /^(?:the\s+)?user\s+is\s+/i,
    /^this\s+is\s+for\s+/i,
    /^(?:the\s+)?audience\s+is\s+/i,
    /^(?:the\s+)?client\s+is\s+/i,
    /^(?:the\s+)?customer\s+is\s+/i,
  ]);
  const withoutArticle = withoutCue.replace(/^(?:a|an|the)\s+/i, "");

  return readable(withoutArticle);
};

export const cleanProblemText = (value: string): string => {
  const withoutCue = removeLeadingPhrase(value, [
    /^(?:the\s+)?problem\s+is\s+/i,
    /^(?:the\s+)?issue\s+is\s+/i,
    /^(?:the\s+)?challenge\s+is\s+/i,
    /^(?:the\s+)?friction\s+is\s+/i,
    /^that\s+/i,
  ]);

  return readable(withoutCue);
};

export const cleanOutcomeText = (value: string): string => {
  const withoutCue = removeLeadingPhrase(value, [
    /^(?:the\s+)?intended\s+outcome\s+is\s+/i,
    /^(?:the\s+)?outcome\s+is\s+/i,
    /^(?:the\s+)?goal\s+is\s+/i,
    /^success\s+means\s+/i,
    /^the\s+result\s+should\s+be\s+/i,
    /^that\s+(?:i|we)\s+can\s+/i,
    /^(?:i|we)\s+can\s+/i,
    /^that\s+/i,
    /^(?:i|we)\s+want\s+to\s+/i,
  ]);

  return readable(withoutCue);
};

export const cleanRawIdeaText = (value: string): string => {
  const withoutCue = removeLeadingPhrase(value, [
    /^(?:the\s+)?idea\s+is\s+/i,
    /^(?:raw\s+idea|idea|concept|summary)\s*[:\-]\s*/i,
    /^(?:i|we)\s+want\s+to\s+/i,
  ]);
  const withoutArticle = withoutCue.replace(/^(?:a|an|the)\s+/i, "");

  return readable(withoutArticle);
};

export const toReadableTitleFragment = (value: string): string => readable(cleanExtractedFieldText(value));

export const isContextProse = (value: string): boolean => {
  const text = normalize(value).toLowerCase();

  return (
    /^(?:mvp:\s*)?(?:the\s+)?(?:target user|user|audience|client|customer)\s+(?:is|needs)\b/.test(text) ||
    /^(?:mvp:\s*)?(?:the\s+)?(?:problem|issue|challenge|friction)\s+is\b/.test(text) ||
    /^(?:mvp:\s*)?(?:the\s+)?intended outcome\s+is\b/.test(text) ||
    /^(?:mvp:\s*)?intended outcome\s+is\b/.test(text) ||
    /^(?:mvp:\s*)?(?:the\s+)?goal\s+is\b/.test(text) ||
    /^(?:mvp:\s*)?(?:the\s+)?outcome\s+is\b/.test(text) ||
    /^(?:mvp:\s*)?success means\b/.test(text) ||
    /^(?:mvp:\s*)?the result should be\b/.test(text) ||
    /^(?:mvp:\s*)?this is a\b/.test(text)
  );
};

export const isActionableMvpItem = (value: string): boolean => {
  const text = normalize(value);

  if (!text || isContextProse(text)) {
    return false;
  }

  return /^(import|distill|create|validate|review|generate|export|store|build|implement|add|confirm|paste|capture|clarify|define|map|prepare|inspect|save|identify|assess|design|track|assign|model|structure|adjust|draft|collect|record|exportable|must include)\b/i.test(
    text,
  );
};

export const isRiskItem = (value: string): boolean => {
  const text = normalize(value);

  if (!text || isContextProse(text)) {
    return false;
  }

  return /\b(risk|may|might|could|accidentally|break|bypass|drift|failure|concern|danger|fragile|weaken|confus(?:e|ion)|missing evidence|not run|not covered|trust|scope|overwhelm|leak|leaks|incorrectly|pretend|verify code|future expansion)\b/i.test(
    text,
  );
};

export const isExpansionItem = (value: string): boolean => {
  const text = normalize(value);

  return Boolean(text) && !isContextProse(text) && !isRiskItem(text);
};

export const isOpportunityItem = (value: string): boolean => {
  const text = normalize(value);

  return Boolean(text) && !isContextProse(text);
};

export const filterContextProse = (items: string[]): string[] =>
  items.map(normalize).filter((item) => item && !isContextProse(item));
