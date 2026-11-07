import { createId } from '@paralleldrive/cuid2';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';

import {
  defaultProfile,
  displayColor,
  isUntouchedDefault,
  type Pad,
  type Profile,
} from '../../domains/remote';
import { cn } from '../../lib/cn';
import { useRemoteStore } from '../store';

const chipColor = (pad: Pad) => displayColor(pad.colors[0] ?? '#000000');

export function ProfileChips({
  profile,
  count,
  className,
}: {
  profile: Profile;
  count: number;
  className: string;
}) {
  return (
    <span aria-hidden className="flex gap-[3px]">
      {profile.pads.slice(0, count).map((pad) => (
        <span
          key={pad.id}
          className={cn('rounded-[3px]', className)}
          style={{ background: chipColor(pad) }}
        />
      ))}
    </span>
  );
}

const DELETE_WIDTH = 88;

function SwipeRow({
  disabled,
  open,
  onOpenChange,
  onDelete,
  label,
  children,
}: {
  disabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  label: string;
  children: ReactNode;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const offset = useRef(0);
  const [drag, setDrag] = useState<number | null>(null);
  const x = drag ?? (open ? -DELETE_WIDTH : 0);

  return (
    <div className="relative overflow-hidden rounded-xl">
      <button
        type="button"
        aria-label={`Delete ${label}`}
        tabIndex={open ? 0 : -1}
        onClick={onDelete}
        className="absolute inset-y-0 right-0 flex items-center justify-center gap-1.5 bg-[#93000a] text-[13px] font-semibold text-[#ffdad6]"
        style={{ width: DELETE_WIDTH }}
      >
        <Trash2 className="size-4" />
        Delete
      </button>
      <div
        className="relative bg-[#1c1b1b]"
        style={{
          transform: `translateX(${x}px)`,
          transition: drag === null ? 'transform 160ms ease-out' : 'none',
        }}
        onPointerDown={(e) => {
          if (disabled) return;
          start.current = { x: e.clientX, y: e.clientY };
          moved.current = false;
        }}
        onPointerMove={(e) => {
          if (!start.current) return;
          const dx = e.clientX - start.current.x;
          const dy = e.clientY - start.current.y;
          if (!moved.current && Math.abs(dx) < 8) return;
          if (!moved.current && Math.abs(dy) > Math.abs(dx)) {
            start.current = null;
            return;
          }
          if (!moved.current) e.currentTarget.setPointerCapture(e.pointerId);
          moved.current = true;
          const base = open ? -DELETE_WIDTH : 0;
          offset.current = Math.min(0, Math.max(-DELETE_WIDTH, base + dx));
          setDrag(offset.current);
        }}
        onPointerUp={() => {
          if (start.current && moved.current)
            onOpenChange(offset.current < -DELETE_WIDTH / 2);
          start.current = null;
          setDrag(null);
        }}
        onPointerCancel={() => {
          start.current = null;
          setDrag(null);
        }}
        onClickCapture={(e) => {
          if (!moved.current) return;
          moved.current = false;
          e.stopPropagation();
        }}
      >
        {children}
      </div>
    </div>
  );
}

function NameField({
  name,
  onSave,
  onDone,
}: {
  name: string;
  onSave: (name: string) => void;
  onDone: () => void;
}) {
  const [value, setValue] = useState(name);
  const done = useRef(false);
  const finish = (save: boolean) => {
    if (done.current) return;
    done.current = true;
    if (save) onSave(value);
    onDone();
  };
  return (
    <input
      autoFocus
      aria-label="Profile name"
      value={value}
      maxLength={40}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(true);
        if (e.key === 'Escape') finish(false);
      }}
      className="h-9 min-w-0 flex-1 rounded-lg border border-[#e1b6ff]/35 bg-[#131313] px-2.5 text-[13px] font-semibold text-[#e5e2e1] outline-none"
    />
  );
}

export default function ProfilesDialog({ onClose }: { onClose: () => void }) {
  const project = useRemoteStore((s) => s.project);
  const projectNames = useRemoteStore((s) => s.projectNames);
  const profiles = useRemoteStore((s) => s.profiles);
  const activeProfileId = useRemoteStore((s) => s.activeProfileId);
  const { saveProfiles, setActiveProfile, renameProfile, deleteProfile } =
    useRemoteStore.getState();
  const [tab, setTab] = useState<'song' | 'all'>('song');
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!project) return null;

  const own = profiles.filter((p) => p.projectId === project.id);
  const groups = new Map<string, Profile[]>([
    [`${project.name} · this project`, own],
  ]);
  if (tab === 'all')
    for (const p of profiles) {
      if (p.projectId === project.id || isUntouchedDefault(p)) continue;
      const title = projectNames[p.projectId] ?? 'Other';
      groups.set(title, [...(groups.get(title) ?? []), p]);
    }

  const add = (profile: Profile) => {
    saveProfiles([...profiles, profile]);
    setActiveProfile(profile.id);
    onClose();
  };

  const pick = (p: Profile) => {
    if (p.projectId !== project.id)
      return add({ ...p, id: createId(), projectId: project.id });
    setActiveProfile(p.id);
    onClose();
  };

  const current = profiles.find((p) => p.id === activeProfileId);

  return (
    <div className="absolute inset-0 z-30 bg-black/60">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profiles-title"
        className="absolute inset-y-4 left-1/2 flex w-[520px] -translate-x-1/2 flex-col gap-2.5 rounded-[22px] border border-white/12 bg-[#1c1b1b] px-4 py-3.5 text-[#e5e2e1] shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center gap-2.5">
          <h2
            id="profiles-title"
            className="flex-1 text-[17px] font-bold tracking-[-0.02em]"
          >
            Profiles
          </h2>
          <div
            role="group"
            aria-label="Show"
            className="flex gap-0.5 rounded-[9px] bg-[#131313] p-[3px]"
          >
            {(
              [
                ['song', 'This project'],
                ['all', 'All'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  'h-7 rounded-md px-2.5 text-[11px] font-semibold text-[#cec3d0]',
                  tab === id && 'bg-[#2a2a2a] text-[#e1b6ff]',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-[9px] text-[#cec3d0]"
          >
            <X className="size-[18px]" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 touch-pan-y flex-col gap-1 overflow-y-auto">
          {[...groups].map(([title, rows]) => (
            <div key={title} className="flex flex-col gap-1">
              <span className="px-1 pt-1.5 pb-0.5 text-[11px] font-semibold text-[#978e99]">
                {title}
              </span>
              {rows.map((p) => {
                const on = p.id === activeProfileId;
                const other = p.projectId !== project.id;
                const editing = editingId === p.id;
                const row = (
                  <div
                    className={cn(
                      'flex min-h-[52px] w-full items-center gap-3 rounded-xl border border-transparent px-3 py-1.5',
                      on && 'border-[#e1b6ff]/35 bg-[#e1b6ff]/8',
                    )}
                  >
                    <ProfileChips
                      profile={p}
                      count={5}
                      className="h-[22px] w-2.5"
                    />
                    {editing ? (
                      <NameField
                        name={p.name}
                        onSave={(name) => renameProfile(p.id, name)}
                        onDone={() => setEditingId(null)}
                      />
                    ) : (
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          if (swipedId) return setSwipedId(null);
                          pick(p);
                        }}
                        className="flex min-w-0 flex-1 flex-col gap-px text-left"
                      >
                        <span className="truncate text-[13px] font-semibold">
                          {p.name}
                        </span>
                        <span className="text-[11px] text-[#978e99]">
                          {p.pads.length} pads
                          {other && ' · using it makes a copy in this project'}
                        </span>
                      </button>
                    )}
                    {!other && !editing && (
                      <button
                        type="button"
                        aria-label={`Rename ${p.name}`}
                        onClick={() => {
                          setSwipedId(null);
                          setEditingId(p.id);
                        }}
                        className="flex size-9 shrink-0 items-center justify-center rounded-[9px] text-[#cec3d0]"
                      >
                        <Pencil className="size-4" />
                      </button>
                    )}
                    {on && !editing && (
                      <Check
                        className="size-[18px] shrink-0 text-[#e1b6ff]"
                        strokeWidth={2.4}
                      />
                    )}
                  </div>
                );
                return other ? (
                  <div key={p.id}>{row}</div>
                ) : (
                  <SwipeRow
                    key={p.id}
                    disabled={editing}
                    label={p.name}
                    open={swipedId === p.id}
                    onOpenChange={(open) => setSwipedId(open ? p.id : null)}
                    onDelete={() => {
                      setSwipedId(null);
                      deleteProfile(p.id);
                    }}
                  >
                    {row}
                  </SwipeRow>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={!current}
            onClick={() =>
              current &&
              add({ ...current, id: createId(), name: `${current.name} copy` })
            }
            className="h-10 flex-1 rounded-[9px] border border-white/12 bg-[#2a2a2a] text-[13px] font-medium disabled:opacity-40"
          >
            Duplicate current
          </button>
          <button
            type="button"
            onClick={() =>
              add({
                ...defaultProfile(project.id, createId(), createId),
                name: 'New profile',
              })
            }
            className="h-10 flex-1 rounded-[9px] bg-[#e1b6ff] text-[13px] font-bold text-[#43205d]"
          >
            New profile
          </button>
        </div>
      </div>
    </div>
  );
}
