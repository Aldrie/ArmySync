import { Loader2, LogOut, Search } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import { ErrorAlert, Field, INPUT } from './form';
import Button from '../../../components/button';
import {
  JELLYFIN_SESSION_ERRORS,
  type JellyfinItem,
  type JellyfinStatus,
  logoutJellyfin,
  searchJellyfin,
} from '../../../domains/jellyfin';
import { cn } from '../../../lib/cn';
import { errorMessage, videoTime } from '../../../lib/format';
import { useAppStore } from '../../../stores/app-store';

export type JellyfinPick = { item: JellyfinItem; mediaSourceId: string };

const DEBOUNCE_MS = 300;

export default function JellyfinPicker({
  status,
  value,
  onChange,
  onSignOut,
}: {
  status: JellyfinStatus;
  value: JellyfinPick | null;
  onChange: (pick: JellyfinPick | null) => void;
  onSignOut: () => void;
}) {
  const id = useId();
  const projects = useAppStore((s) => s.projects);
  const [term, setTerm] = useState('');
  const [items, setItems] = useState<JellyfinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchJellyfin(term.trim())
        .then((found) => {
          if (cancelled) return;
          setItems(found);
          setError('');
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          const message = errorMessage(e);
          if (JELLYFIN_SESSION_ERRORS.includes(message)) onSignOut();
          else setError(message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [term, onSignOut]);

  const handleSignOut = async () => {
    try {
      await logoutJellyfin();
      onSignOut();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const usedBy = (itemId: string) =>
    projects
      .filter((p) => p.jellyfinItemId === itemId)
      .map((p) => p.name)
      .join(', ');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs text-on-surface-variant">
          Signed in as {status.userName} · {status.serverName}
        </p>
        <Button size="sm" intent="ghost" onClick={() => void handleSignOut()}>
          <LogOut />
          Sign out
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-outline" />
        <input
          type="search"
          aria-label="Search your Jellyfin"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setLoading(true);
          }}
          placeholder="Search your Jellyfin…"
          className={cn(INPUT, 'pr-9 pl-9')}
        />
        {loading && (
          <Loader2
            aria-label="Searching"
            className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-outline"
          />
        )}
      </div>

      <ul className="flex max-h-72 flex-col gap-0.5 overflow-y-auto rounded-lg border border-border bg-surface-low p-1">
        {items.map((item) => {
          const selected = value?.item.id === item.id;
          const used = usedBy(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  onChange(
                    selected
                      ? null
                      : { item, mediaSourceId: item.sources[0]?.id ?? item.id },
                  )
                }
                className={cn(
                  'flex w-full cursor-pointer flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors',
                  selected
                    ? 'bg-primary/12 ring-1 ring-primary/40'
                    : 'hover:bg-surface-high',
                )}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-on-surface">
                    {item.name}
                    {item.seriesName && (
                      <span className="text-outline"> · {item.seriesName}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-outline tabular-nums">
                    {item.itemType} · {videoTime(item.duration)}
                  </span>
                </span>
                {used && (
                  <span className="truncate text-xs text-outline">
                    Already used by {used}
                  </span>
                )}
              </button>
            </li>
          );
        })}
        {!loading && !error && items.length === 0 && (
          <li className="px-3 py-2 text-xs text-outline">No results.</li>
        )}
      </ul>

      {value && value.item.sources.length > 1 && (
        <Field label="Version" htmlFor={`${id}-version`}>
          <select
            id={`${id}-version`}
            value={value.mediaSourceId}
            onChange={(e) =>
              onChange({ item: value.item, mediaSourceId: e.target.value })
            }
            className={INPUT}
          >
            {value.item.sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      {error && <ErrorAlert message={error} />}
    </div>
  );
}
