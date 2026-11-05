import { createId } from '@paralleldrive/cuid2';
import { Check, X } from 'lucide-react';
import { useState } from 'react';

import {
  defaultProfile,
  displayColor,
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

export default function ProfilesDialog({ onClose }: { onClose: () => void }) {
  const project = useRemoteStore((s) => s.project);
  const projectNames = useRemoteStore((s) => s.projectNames);
  const profiles = useRemoteStore((s) => s.profiles);
  const activeProfileId = useRemoteStore((s) => s.activeProfileId);
  const { saveProfiles, setActiveProfile } = useRemoteStore.getState();
  const [tab, setTab] = useState<'song' | 'all'>('song');

  if (!project) return null;

  const own = profiles.filter((p) => p.projectId === project.id);
  const groups = new Map<string, Profile[]>([
    [`${project.name} · this song`, own],
  ]);
  if (tab === 'all')
    for (const p of profiles) {
      if (p.projectId === project.id) continue;
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
                ['song', 'This song'],
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
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => pick(p)}
                    className={cn(
                      'flex min-h-[52px] w-full items-center gap-3 rounded-xl border border-transparent px-3 py-1.5 text-left',
                      on && 'border-[#e1b6ff]/35 bg-[#e1b6ff]/8',
                    )}
                  >
                    <ProfileChips
                      profile={p}
                      count={5}
                      className="h-[22px] w-2.5"
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-px">
                      <span className="text-[13px] font-semibold">
                        {p.name}
                      </span>
                      <span className="text-[11px] text-[#978e99]">
                        {p.pads.length} pads
                        {other && ' · using it makes a copy in this song'}
                      </span>
                    </span>
                    {on && (
                      <Check
                        className="size-[18px] text-[#e1b6ff]"
                        strokeWidth={2.4}
                      />
                    )}
                  </button>
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
