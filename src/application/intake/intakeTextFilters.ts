const normalize = (value: string): string => value.replace(/\s+/g, " ").trim();

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

  return /^(import|distill|create|validate|review|generate|export|store|build|implement|add|confirm|paste|capture|clarify|define|map|prepare|inspect|save|identify|assess|design|track|assign|model|structure|exportable|must include)\b/i.test(
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

  return Boolean(text) && !isContextProse(text) && !isRiskItem(text);
};

export const filterContextProse = (items: string[]): string[] =>
  items.map(normalize).filter((item) => item && !isContextProse(item));
