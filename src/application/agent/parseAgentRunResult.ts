import type { AgentRunResultDraft } from "@/application/agent/agentRunTypes";
import { nowIso } from "@/lib/identity";

type ResultSection =
  | "summary"
  | "changedFiles"
  | "testsRun"
  | "acceptance"
  | "failures"
  | "followups"
  | "other";

const unique = (items: string[]): string[] => [...new Set(items.map((item) => item.trim()).filter(Boolean))];

const cleanLine = (line: string): string =>
  line
    .replace(/^\s*[-*]\s+/, "")
    .replace(/^\s*\d+[.)]\s+/, "")
    .trim();

const normalizeHeading = (line: string): string =>
  line
    .replace(/^#+\s*/, "")
    .replace(/:$/, "")
    .trim()
    .toLowerCase();

const sectionForHeading = (line: string): ResultSection | null => {
  const heading = normalizeHeading(line);

  if (/^summary\b/.test(heading)) {
    return "summary";
  }

  if (/^(changed files?|files changed|modified files|updated files)\b/.test(heading)) {
    return "changedFiles";
  }

  if (/^(tests run|test results?|verification|checks run)\b/.test(heading)) {
    return "testsRun";
  }

  if (/^(acceptance criteria|acceptance|criteria)\b/.test(heading)) {
    return "acceptance";
  }

  if (/^(failures?|failed|errors?|blocked|reported failures)\b/.test(heading)) {
    return "failures";
  }

  if (/^(followups?|follow-ups?|next steps?|remaining work|todos?)\b/.test(heading)) {
    return "followups";
  }

  return null;
};

const sectionize = (rawText: string): Record<ResultSection, string[]> => {
  const sections: Record<ResultSection, string[]> = {
    summary: [],
    changedFiles: [],
    testsRun: [],
    acceptance: [],
    failures: [],
    followups: [],
    other: [],
  };
  let current: ResultSection = "other";

  rawText.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    const heading = sectionForHeading(trimmed);
    if (heading) {
      current = heading;
      return;
    }

    sections[current].push(trimmed);
  });

  return sections;
};

const pathRegex = /(?:[\w@./-]+\/)?[\w.-]+\.(?:tsx|ts|jsx|js|scss|css|json|md|html|yaml|yml|toml|py|go|rs|java|kt|swift|rb|sh|sql)/gi;

const extractPaths = (line: string): string[] => line.match(pathRegex) ?? [];

const isEmptyEvidence = (line: string): boolean =>
  /^(none|n\/a|not applicable|no failures|no followups?|no follow-ups?|all passed)\.?$/i.test(cleanLine(line));

const extractChangedFiles = (sections: Record<ResultSection, string[]>): string[] => {
  const fromSection = sections.changedFiles.flatMap((line) => {
    const paths = extractPaths(line);
    return paths.length > 0 ? paths : [cleanLine(line)];
  });
  const fromOther = sections.other
    .filter((line) => /changed|modified|updated|created|added/i.test(line))
    .flatMap(extractPaths);

  return unique([...fromSection, ...fromOther]).filter((item) => !isEmptyEvidence(item));
};

const extractTestsRun = (sections: Record<ResultSection, string[]>): string[] => {
  const fromSection = sections.testsRun.map(cleanLine);
  const fromOther = sections.other
    .filter((line) => /\b(npm run|vitest|playwright|test|tests|build|lint)\b/i.test(line))
    .map(cleanLine);

  return unique([...fromSection, ...fromOther]).filter((item) => !isEmptyEvidence(item));
};

const extractFailures = (sections: Record<ResultSection, string[]>): string[] => {
  const fromSection = sections.failures.map(cleanLine);
  const fromOther = [...sections.other, ...sections.testsRun, ...sections.acceptance]
    .filter((line) => /\b(fail(?:ed|ing|ure)?|error|blocked|unable|could not|not run|missing)\b/i.test(line))
    .map(cleanLine);

  return unique([...fromSection, ...fromOther]).filter((item) => !isEmptyEvidence(item));
};

const extractFollowups = (sections: Record<ResultSection, string[]>): string[] => {
  const fromSection = sections.followups.map(cleanLine);
  const fromOther = sections.other
    .filter((line) => /\b(follow-?up|todo|remaining|later|next step)\b/i.test(line))
    .map(cleanLine);

  return unique([...fromSection, ...fromOther]).filter((item) => !isEmptyEvidence(item));
};

const extractSummary = (sections: Record<ResultSection, string[]>, rawText: string): string => {
  const summary = sections.summary.map(cleanLine).filter((line) => !isEmptyEvidence(line)).slice(0, 2).join(" ");

  if (summary) {
    return summary;
  }

  return rawText
    .split(/\r?\n/)
    .map(cleanLine)
    .find((line) => line.length > 0) ?? "";
};

export const parseAgentRunResult = (rawResultText: string): AgentRunResultDraft => {
  const sections = sectionize(rawResultText);

  return {
    rawResultText,
    changedFiles: extractChangedFiles(sections),
    testsRun: extractTestsRun(sections),
    reportedFailures: extractFailures(sections),
    reportedFollowups: extractFollowups(sections),
    summary: extractSummary(sections, rawResultText),
    pastedAt: nowIso(),
  };
};
