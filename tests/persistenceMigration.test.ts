import { describe, expect, it } from "vitest";

import { validateBlueprint } from "@/application/validation/validateBlueprint";
import type { ProjectBlueprint } from "@/domain/models";
import { LocalProjectRepository } from "@/persistence/localProjectRepository";
import { projectsQuarantineStorageKey, projectsStorageKey } from "@/persistence/storageKeys";
import { createStoredProjectsDocument, currentStorageVersion } from "@/persistence/types";
import { createSeedBlueprint } from "@/seed/exampleBlueprint";

type TestStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  dump(): Record<string, string>;
};

const createTestStorage = (initial: Record<string, string> = {}): TestStorage => {
  const state = new Map(Object.entries(initial));

  return {
    getItem: (key) => state.get(key) ?? null,
    setItem: (key, value) => {
      state.set(key, value);
    },
    removeItem: (key) => {
      state.delete(key);
    },
    dump: () => Object.fromEntries(state),
  };
};

const writePayload = (storage: TestStorage, key: string, payload: unknown): void => {
  storage.setItem(key, JSON.stringify(payload));
};

const camelToSnake = (value: string): string =>
  value.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);

const toLegacySnakeCase = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => toLegacySnakeCase(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
      camelToSnake(key),
      toLegacySnakeCase(nestedValue),
    ]),
  );
};

const prefixedIdPattern = /^[a-z][a-z0-9]{1,23}_[0-9a-f-]{36}$/;

const toLegacyUnprefixedIds = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => toLegacyUnprefixedIds(item));
  }

  if (typeof value === "string") {
    return prefixedIdPattern.test(value) ? value.replace(/^[a-z][a-z0-9]{1,23}_/, "") : value;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
      key,
      toLegacyUnprefixedIds(nestedValue),
    ]),
  );
};

describe("LocalProjectRepository migrations", () => {
  it("loads current-format payloads unchanged", () => {
    const seed = createSeedBlueprint();
    const storage = createTestStorage();
    const document = createStoredProjectsDocument([seed]);
    const stored = JSON.stringify(document);
    storage.setItem(projectsStorageKey, stored);

    const repository = new LocalProjectRepository(storage);
    const loaded = repository.loadAll();

    expect(loaded.report.status).toBe("loaded");
    expect(loaded.report.migrated).toBe(false);
    expect(loaded.projects).toEqual([seed]);
    expect(storage.getItem(projectsStorageKey)).toBe(stored);
  });

  it("migrates legacy snake_case payloads into the current storage contract", () => {
    const seed = createSeedBlueprint();
    const storage = createTestStorage();
    writePayload(storage, projectsStorageKey, [toLegacySnakeCase(seed)]);

    const repository = new LocalProjectRepository(storage);
    const loaded = repository.loadAll();
    const persisted = JSON.parse(storage.getItem(projectsStorageKey) ?? "{}") as {
      storageVersion?: number;
      projects?: Array<Record<string, unknown>>;
    };

    expect(loaded.report.status).toBe("migrated");
    expect(loaded.report.detectedStorageVersion).toBe(1);
    expect(loaded.projects).toHaveLength(1);
    expect(loaded.projects[0]?.decisionLogic.records.length).toBe(seed.decisionLogic.records.length);
    expect(persisted.storageVersion).toBe(currentStorageVersion);
    expect(persisted.projects?.[0]).toHaveProperty("decisionLogic");
    expect(persisted.projects?.[0]).not.toHaveProperty("decision_logic");
  });

  it("migrates legacy unprefixed IDs and preserves structural validity", () => {
    const seed = createSeedBlueprint();
    const storage = createTestStorage();
    writePayload(storage, projectsStorageKey, [toLegacyUnprefixedIds(seed)]);

    const repository = new LocalProjectRepository(storage);
    const loaded = repository.loadAll();
    const validation = validateBlueprint(loaded.projects[0] as ProjectBlueprint);

    expect(loaded.report.status).toBe("migrated");
    expect(loaded.report.migrated).toBe(true);
    expect(validation.buildReady).toBe(true);
  });

  it("quarantines unrecoverable payloads instead of discarding them", () => {
    const storage = createTestStorage();
    writePayload(storage, projectsStorageKey, { unsupported: true });

    const repository = new LocalProjectRepository(storage);
    const loaded = repository.loadAll();
    const quarantine = repository.listQuarantinedPayloads();

    expect(loaded.report.status).toBe("quarantined");
    expect(loaded.projects).toEqual([]);
    expect(quarantine).toHaveLength(1);
    expect(quarantine[0]?.rawPayload).toEqual({ unsupported: true });
    expect(storage.getItem(projectsStorageKey)).toBe(JSON.stringify({ unsupported: true }));
    expect(storage.getItem(projectsQuarantineStorageKey)).not.toBeNull();
  });

  it("does not seed over quarantined persistence", () => {
    const storage = createTestStorage();
    writePayload(storage, projectsStorageKey, { unsupported: true });

    const repository = new LocalProjectRepository(storage);
    const seeded = repository.seed([createSeedBlueprint()]);

    expect(seeded).toEqual([]);
    expect(repository.listQuarantinedPayloads()).toHaveLength(1);
    expect(storage.getItem(projectsStorageKey)).toBe(JSON.stringify({ unsupported: true }));
  });

  it("quarantines invalid migrated payloads that still fail the current schema", () => {
    const seed = createSeedBlueprint();
    const legacy = toLegacyUnprefixedIds(seed) as ProjectBlueprint & {
      actors: Array<{ id: string }>;
      outcomes: Array<{ id: string }>;
    };

    legacy.actors[0] = {
      ...legacy.actors[0],
      id: legacy.outcomes[0]?.id ?? legacy.actors[0]?.id,
    };

    const storage = createTestStorage();
    writePayload(storage, projectsStorageKey, [legacy]);

    const repository = new LocalProjectRepository(storage);
    const loaded = repository.loadAll();

    expect(loaded.report.status).toBe("quarantined");
    expect(loaded.projects).toEqual([]);
    expect(repository.listQuarantinedPayloads()).toHaveLength(1);
  });

  it("round-trips saved projects through the current storage document", () => {
    const storage = createTestStorage();
    const repository = new LocalProjectRepository(storage);
    const seed = createSeedBlueprint();

    repository.save(seed);
    const loaded = repository.loadAll();
    const stored = JSON.parse(storage.getItem(projectsStorageKey) ?? "{}") as {
      storageVersion?: number;
      projects?: Array<{ project?: { id?: string } }>;
    };

    expect(loaded.report.status).toBe("loaded");
    expect(loaded.projects[0]?.project.id).toBe(seed.project.id);
    expect(stored.storageVersion).toBe(currentStorageVersion);
    expect(stored.projects?.[0]?.project?.id).toBe(seed.project.id);
  });
});
