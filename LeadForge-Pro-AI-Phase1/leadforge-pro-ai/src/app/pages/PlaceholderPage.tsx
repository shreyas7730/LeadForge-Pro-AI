interface PlaceholderPageProps {
  title: string;
  description: string;
}

/**
 * Phase 1 workspace placeholder.
 * Real page content arrives in later phases.
 */
export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex h-full flex-col items-start justify-start">
      <div className="rounded-lg border border-border bg-card p-6 shadow-elev1">
        <h2 className="text-title text-foreground">{title}</h2>
        <p className="mt-2 max-w-md text-body text-foreground-secondary">
          {description}
        </p>
        <p className="mt-4 text-caption text-foreground-tertiary">
          This workspace will be implemented in a later phase.
        </p>
      </div>
    </div>
  );
}
