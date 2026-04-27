const namespace =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_STORAGE_NAMESPACE) ||
  "framework-architect";

export const projectsStorageKey = `${namespace}:projects`;
export const selectedProjectStorageKey = `${namespace}:selected-project`;
export const projectsQuarantineStorageKey = `${namespace}:projects-quarantine`;
export const projectRevisionsStorageKey = `${namespace}:project-revisions`;
export const agentRunJournalStorageKey = `${namespace}:agent-run-journal`;
