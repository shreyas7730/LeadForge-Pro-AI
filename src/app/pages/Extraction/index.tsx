import { useCallback, useEffect, useState } from 'react';
import { Play, Pause, Square, RotateCcw, RefreshCw } from 'lucide-react';
import { sendMessage } from '@/messaging';
import { useSessionStore } from '@/stores/session-store';
import { useResultsStore } from '@/stores/results-store';
import { businessRepository } from '@/repositories';
import { notificationService } from '@/services/notification-service';
import { DEFAULT_EXTRACTION_SETTINGS } from '@/types/domain';
import type { Business } from '@/types/domain';
import type { AnyMessage } from '@/types/messages';
import { formatDisplayDate } from '@/utils/date';
import { openDatabase } from '@/database';
import { cn } from '@/lib/utils';

function parseLines(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined | null;
}) {
  const display =
    value === undefined || value === null || value === ''
      ? '—'
      : String(value);
  return (
    <div className="min-w-0">
      <div className="text-micro text-foreground-tertiary">{label}</div>
      <div className="truncate text-caption text-foreground" title={display}>
        {display}
      </div>
    </div>
  );
}

function LinkField({
  label,
  href,
}: {
  label: string;
  href: string | undefined | null;
}) {
  return (
    <div className="min-w-0">
      <div className="text-micro text-foreground-tertiary">{label}</div>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-caption text-cyan hover:underline"
          title={href}
        >
          {href}
        </a>
      ) : (
        <div className="text-caption text-foreground-tertiary">—</div>
      )}
    </div>
  );
}

/** Temporary Phase 3 verification panel — real IndexedDB / live upsert data only. */
function VerificationPanel({
  businesses,
  onReload,
}: {
  businesses: Business[];
  onReload: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-warning/40 bg-card shadow-elev1">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <div>
          <div className="text-caption font-medium text-foreground">
            Verification — live discovered businesses
          </div>
          <div className="text-micro text-foreground-tertiary">
            Real data from IndexedDB + BUSINESS_UPSERT · {businesses.length}{' '}
            record{businesses.length === 1 ? '' : 's'}
          </div>
        </div>
        <button
          type="button"
          onClick={onReload}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-micro text-foreground-secondary hover:bg-elevated"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reload from DB
        </button>
      </div>

      {businesses.length === 0 ? (
        <div className="px-4 py-8 text-center text-caption text-foreground-secondary">
          No businesses stored yet. Start an extraction to see parsed Google
          results here.
        </div>
      ) : (
        <ul className="max-h-[480px] divide-y divide-border overflow-y-auto">
          {businesses.map((b) => (
            <li key={b.id} className="px-4 py-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="text-body-medium text-foreground">
                  {b.companyName}
                </div>
                <div className="shrink-0 text-micro text-foreground-tertiary">
                  {b.keyword} · {b.location}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <LinkField label="Website" href={b.website} />
                <LinkField label="Google Search URL" href={b.googleUrl} />
                <LinkField label="Google Maps URL" href={b.mapsUrl} />
                <Field label="Category" value={b.category} />
                <Field label="Address" value={b.address} />
                <Field label="Phone" value={b.phone} />
                <Field
                  label="Phones"
                  value={(b.phones ?? []).join(', ') || undefined}
                />
                <Field label="Rating" value={b.rating} />
                <Field label="Review count" value={b.reviewCount} />
                <Field label="Crawl status" value={b.crawlStatus} />
                <Field
                  label="Emails"
                  value={(b.emails ?? []).join(', ') || undefined}
                />
                <Field label="Email count" value={b.emailCount ?? b.emails?.length} />
                <Field
                  label="Social links"
                  value={
                    Object.entries(b.socialLinks ?? {})
                      .filter(([, v]) => Boolean(v))
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' · ') || undefined
                  }
                />
                <Field
                  label="Website title"
                  value={b.websiteTitle}
                />
                <Field
                  label="Last crawl"
                  value={
                    b.lastVisited
                      ? formatDisplayDate(b.lastVisited)
                      : undefined
                  }
                />
                <Field
                  label="Extracted at"
                  value={formatDisplayDate(b.extractedAt)}
                />
                <div className="min-w-0 sm:col-span-2 lg:col-span-3">
                  <div className="text-micro text-foreground-tertiary">
                    Snippet
                  </div>
                  <div className="text-caption text-foreground-secondary">
                    {b.snippet?.trim() ? b.snippet : '—'}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ExtractionPage() {
  const [keywordsText, setKeywordsText] = useState(
    'Timing Pulley Manufacturer\nCNC Machine Shop\nPackaging Machine Manufacturer'
  );
  const [locationsText, setLocationsText] = useState(
    'Ahmedabad\nMumbai\nDelhi'
  );
  const [busy, setBusy] = useState(false);

  const activeSession = useSessionStore((s) => s.activeSession);
  const tasks = useSessionStore((s) => s.tasks);
  const status = useSessionStore((s) => s.status);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const setTasks = useSessionStore((s) => s.setTasks);
  const updateTask = useSessionStore((s) => s.updateTask);
  const setStatus = useSessionStore((s) => s.setStatus);

  const businesses = useResultsStore((s) => s.items);
  const upsertBusiness = useResultsStore((s) => s.upsert);
  const setItems = useResultsStore((s) => s.setItems);
  const setTotalCount = useResultsStore((s) => s.setTotalCount);

  const reloadFromDb = useCallback(async () => {
    try {
      await openDatabase();
      const rows = await businessRepository.list(2000, 0);
      setItems(rows);
      setTotalCount(rows.length);
    } catch {
      // DB may not be ready yet
    }
  }, [setItems, setTotalCount]);

  // Load existing businesses + live messaging
  useEffect(() => {
    void reloadFromDb();

    const listener = (message: unknown) => {
      if (!message || typeof message !== 'object') return;
      const msg = message as AnyMessage;

      if (msg.type === 'BUSINESS_UPSERT') {
        upsertBusiness(msg.payload.business);
      }

      if (msg.type === 'TASK_PROGRESS') {
        updateTask(msg.payload.taskId, {
          status: msg.payload.status,
          progress: msg.payload.progress,
          businessesFound: msg.payload.businessesFound,
          emailsFound: msg.payload.emailsFound,
          pagesProcessed: msg.payload.pagesProcessed,
          error: msg.payload.error,
        });
      }

      if (msg.type === 'SESSION_STATUS') {
        setStatus(msg.payload.status);
        const prev = useSessionStore.getState().activeSession;
        setActiveSession({
          id: msg.payload.sessionId,
          taskIds: prev?.taskIds ?? [],
          status: msg.payload.status,
          startedAt: prev?.startedAt ?? Date.now(),
          totalBusinesses: msg.payload.totalBusinesses,
          totalEmails: msg.payload.totalEmails,
          settingsSnapshot:
            prev?.settingsSnapshot ?? DEFAULT_EXTRACTION_SETTINGS,
        });
      }

      if (msg.type === 'STATE_SNAPSHOT') {
        setActiveSession(msg.payload.session);
        setTasks(msg.payload.tasks);
        if (msg.payload.session) {
          setStatus(msg.payload.session.status);
        }
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    void sendMessage('GET_STATE', {}, { expectedResponseType: 'STATE_SNAPSHOT' })
      .then((res) => {
        if (res && res.type === 'STATE_SNAPSHOT') {
          setActiveSession(res.payload.session);
          setTasks(res.payload.tasks);
          if (res.payload.session) setStatus(res.payload.session.status);
        }
      })
      .catch(() => {
        // ignore
      });

    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [
    reloadFromDb,
    setActiveSession,
    setStatus,
    setTasks,
    updateTask,
    upsertBusiness,
  ]);

  const start = useCallback(async () => {
    const keywords = parseLines(keywordsText);
    const locations = parseLines(locationsText);
    if (keywords.length === 0 || locations.length === 0) {
      notificationService.warning(
        'Missing input',
        'Enter at least one keyword and one location.'
      );
      return;
    }
    setBusy(true);
    try {
      const res = await sendMessage(
        'START_SESSION',
        {
          keywords,
          locations,
          settings: DEFAULT_EXTRACTION_SETTINGS,
        },
        { expectedResponseType: 'SESSION_STATUS' }
      );
      if (res?.type === 'SESSION_STATUS') {
        setStatus('running');
        notificationService.success(
          'Extraction started',
          `${keywords.length * locations.length} search tasks queued`
        );
        const snap = await sendMessage(
          'GET_STATE',
          {},
          { expectedResponseType: 'STATE_SNAPSHOT' }
        );
        if (snap?.type === 'STATE_SNAPSHOT') {
          setActiveSession(snap.payload.session);
          setTasks(snap.payload.tasks);
        }
      }
    } catch (err) {
      notificationService.error(
        'Start failed',
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setBusy(false);
    }
  }, [keywordsText, locationsText, setActiveSession, setStatus, setTasks]);

  const pause = useCallback(async () => {
    if (!activeSession) return;
    setBusy(true);
    try {
      await sendMessage('PAUSE_SESSION', { sessionId: activeSession.id });
      setStatus('paused');
      notificationService.info('Extraction paused');
    } catch (err) {
      notificationService.error(
        'Pause failed',
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setBusy(false);
    }
  }, [activeSession, setStatus]);

  const resume = useCallback(async () => {
    if (!activeSession) return;
    setBusy(true);
    try {
      await sendMessage('RESUME_SESSION', { sessionId: activeSession.id });
      setStatus('running');
      notificationService.info('Extraction resumed');
    } catch (err) {
      notificationService.error(
        'Resume failed',
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setBusy(false);
    }
  }, [activeSession, setStatus]);

  const cancel = useCallback(async () => {
    if (!activeSession) return;
    setBusy(true);
    try {
      await sendMessage('CANCEL_SESSION', { sessionId: activeSession.id });
      setStatus('cancelled');
      notificationService.warning('Extraction cancelled');
    } catch (err) {
      notificationService.error(
        'Cancel failed',
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setBusy(false);
    }
  }, [activeSession, setStatus]);

  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const canStart = !isRunning && !isPaused;

  const totalFound = tasks.reduce((s, t) => s + t.businessesFound, 0);
  const completedTasks = tasks.filter((t) =>
    ['completed', 'failed', 'cancelled'].includes(t.status)
  ).length;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h2 className="text-title text-foreground">Extraction</h2>
        <p className="mt-1 text-body text-foreground-secondary">
          Enter keywords and locations. LeadForge generates every combination and
          discovers businesses from Google Search.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-caption text-foreground-secondary">
            Keywords (one per line)
          </span>
          <textarea
            className="min-h-[160px] rounded-lg border border-border bg-card px-3 py-2 text-body text-foreground outline-none focus-visible:ring-2 focus-visible:ring-cyan"
            value={keywordsText}
            onChange={(e) => setKeywordsText(e.target.value)}
            disabled={isRunning}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-caption text-foreground-secondary">
            Locations (one per line)
          </span>
          <textarea
            className="min-h-[160px] rounded-lg border border-border bg-card px-3 py-2 text-body text-foreground outline-none focus-visible:ring-2 focus-visible:ring-cyan"
            value={locationsText}
            onChange={(e) => setLocationsText(e.target.value)}
            disabled={isRunning}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || !canStart}
          onClick={() => void start()}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-md px-4 text-caption font-medium',
            'bg-emerald text-white hover:bg-emerald-hover disabled:opacity-50'
          )}
        >
          <Play className="h-4 w-4" />
          Start Extraction
        </button>
        <button
          type="button"
          disabled={busy || !isRunning}
          onClick={() => void pause()}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-elevated px-4 text-caption disabled:opacity-50"
        >
          <Pause className="h-4 w-4" />
          Pause
        </button>
        <button
          type="button"
          disabled={busy || !isPaused}
          onClick={() => void resume()}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-elevated px-4 text-caption disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          Resume
        </button>
        <button
          type="button"
          disabled={busy || (!isRunning && !isPaused)}
          onClick={() => void cancel()}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-danger/40 px-4 text-caption text-danger disabled:opacity-50"
        >
          <Square className="h-4 w-4" />
          Cancel
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 shadow-elev1">
        <div className="flex flex-wrap gap-6 text-caption">
          <div>
            <div className="text-foreground-tertiary">Status</div>
            <div className="text-body-medium capitalize text-foreground">
              {status}
            </div>
          </div>
          <div>
            <div className="text-foreground-tertiary">Tasks</div>
            <div className="text-body-medium text-foreground">
              {completedTasks}/{tasks.length || '—'}
            </div>
          </div>
          <div>
            <div className="text-foreground-tertiary">Businesses found</div>
            <div className="text-body-medium text-foreground">{totalFound}</div>
          </div>
          <div>
            <div className="text-foreground-tertiary">Stored records</div>
            <div className="text-body-medium text-foreground">
              {businesses.length}
            </div>
          </div>
          <div>
            <div className="text-foreground-tertiary">Session</div>
            <div className="font-mono text-micro text-foreground-secondary">
              {activeSession?.id?.slice(0, 8) ?? '—'}
            </div>
          </div>
        </div>
      </div>

      {tasks.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-elev1">
          <div className="border-b border-border px-4 py-2 text-caption text-foreground-secondary">
            Search queue
          </div>
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 px-4 py-2 text-caption"
              >
                <div className="min-w-0">
                  <div className="truncate text-foreground">{t.query}</div>
                  <div className="text-micro text-foreground-tertiary">
                    {t.status}
                    {t.error ? ` · ${t.error}` : ''}
                  </div>
                </div>
                <div className="shrink-0 text-right text-micro text-foreground-secondary">
                  <div>{t.businessesFound} found</div>
                  <div>{t.progress}%</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <VerificationPanel
        businesses={businesses}
        onReload={() => void reloadFromDb()}
      />
    </div>
  );
}
