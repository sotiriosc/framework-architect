import type { QuarantinedPayload, RepositoryLoadReport } from "@/persistence/types";
import { SectionCard } from "@/ui/components/SectionCard";

type PersistenceStatusPanelProps = {
  loadReport: RepositoryLoadReport | null;
  quarantinedPayloads: QuarantinedPayload[];
};

const formatStatus = (status: RepositoryLoadReport["status"]): string =>
  ({
    empty: "Empty",
    loaded: "Loaded",
    migrated: "Migrated",
    quarantined: "Quarantined",
  })[status];

export const PersistenceStatusPanel = ({
  loadReport,
  quarantinedPayloads,
}: PersistenceStatusPanelProps) => {
  if (!loadReport && quarantinedPayloads.length === 0) {
    return null;
  }

  const latestQuarantine = quarantinedPayloads
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

  return (
    <SectionCard
      title="Persistence status"
      description="Advanced view of the local storage load, migration, and quarantine state."
    >
      {loadReport ? (
        <>
          <div className="validation-summary">
            <div>
              <span className="eyebrow">Load status</span>
              <strong>{formatStatus(loadReport.status)}</strong>
            </div>
            <div>
              <span className="eyebrow">Storage version</span>
              <strong>
                {loadReport.detectedStorageVersion ?? "none"} / {loadReport.currentStorageVersion}
              </strong>
            </div>
            <div>
              <span className="eyebrow">Quarantine</span>
              <strong>{quarantinedPayloads.length}</strong>
            </div>
          </div>

          {loadReport.message ? <p className="muted">{loadReport.message}</p> : null}

          {loadReport.migrationSteps.length > 0 ? (
            <ul className="stacked-list">
              {loadReport.migrationSteps.map((step) => (
                <li key={step} className="stacked-list__item">
                  {step}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      {latestQuarantine ? (
        <p className="muted">
          Latest quarantine: {latestQuarantine.failureStage} failure at {latestQuarantine.createdAt}.
        </p>
      ) : null}
    </SectionCard>
  );
};
