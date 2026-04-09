import type { PropsWithChildren, ReactNode } from "react";

type SectionCardProps = PropsWithChildren<{
  title: string;
  description?: string;
  action?: ReactNode;
}>;

export const SectionCard = ({ title, description, action, children }: SectionCardProps) => (
  <section className="section-card">
    <div className="section-card__header">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="section-card__action">{action}</div> : null}
    </div>
    {children}
  </section>
);
