import type { ReactNode } from 'react';

// The one heading style used for every column and section.
export function Label({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="label">
      <span>{children}</span>
      {action}
    </div>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="page-title">{children}</h1>;
}
