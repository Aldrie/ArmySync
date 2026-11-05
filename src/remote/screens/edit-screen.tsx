import { DragDropProvider } from '@dnd-kit/react';
import { isSortable, useSortable } from '@dnd-kit/react/sortable';
import { createId } from '@paralleldrive/cuid2';
import {
  ChevronDown,
  EyeOff,
  GripVertical,
  Heart,
  Pencil,
  Plus,
} from 'lucide-react';
import { useState } from 'react';

import { BORAHAE, type Pad } from '../../domains/remote';
import { isBorahaePad, padBackground, padLook } from '../look';
import { useRemoteStore } from '../store';
import PadEditorModal from './pad-editor-modal';
import ProfilesDialog, { ProfileChips } from './profiles-dialog';

const TILE_CONTROL =
  'absolute flex size-9 touch-none items-center justify-center rounded-[9px] bg-black/55 text-white';

function EditPad({
  pad,
  index,
  onEdit,
}: {
  pad: Pad;
  index: number;
  onEdit: () => void;
}) {
  const { ref, handleRef } = useSortable({
    id: pad.id,
    index,
    transition: null,
  });
  const label = isBorahaePad(pad)
    ? 'Borahae'
    : [pad.kind, ...pad.colors].join(' ');

  return (
    <div
      ref={ref}
      onContextMenu={(e) => e.preventDefault()}
      className="relative flex touch-none items-center justify-center overscroll-none rounded-[14px] select-none [-webkit-touch-callout:none]"
      style={{
        ...padLook(pad, []).style,
        opacity: pad.kind === 'blackout' ? 1 : 0.85,
        background: padBackground(pad),
      }}
    >
      {pad.kind === 'blackout' && (
        <EyeOff className="size-[26px] text-[#cec3d0]" strokeWidth={1.8} />
      )}
      {isBorahaePad(pad) && (
        <Heart
          className="size-[26px] text-white/92"
          fill="currentColor"
          strokeWidth={0}
        />
      )}
      <button
        ref={handleRef}
        type="button"
        aria-label={`Move pad ${label}`}
        className={`${TILE_CONTROL} top-1.5 left-1.5`}
      >
        <GripVertical className="size-4" />
      </button>
      <button
        type="button"
        aria-label={`Edit pad ${label}`}
        onClick={onEdit}
        className={`${TILE_CONTROL} right-1.5 bottom-1.5`}
      >
        <Pencil className="size-4" />
      </button>
    </div>
  );
}

export default function EditScreen() {
  const profile = useRemoteStore((s) =>
    s.profiles.find((p) => p.id === s.activeProfileId),
  );
  const { saveProfiles, setMode } = useRemoteStore.getState();
  const [editing, setEditing] = useState<Pad | null>(null);
  const [profilesOpen, setProfilesOpen] = useState(false);

  const pads = profile?.pads ?? [];
  const savePads = (next: Pad[]) => {
    if (!profile) return;
    saveProfiles(
      useRemoteStore
        .getState()
        .profiles.map((p) => (p.id === profile.id ? { ...p, pads: next } : p)),
    );
  };

  return (
    <div className="relative flex h-full flex-col gap-2 px-8 pt-3 pb-4">
      <header className="flex h-9 shrink-0 items-center gap-2.5">
        <span className="text-sm font-semibold">Edit pads</span>
        <span className="flex-1 text-center text-[11px] font-medium text-[#978e99]">
          Pencil edits · handle drags to reorder
        </span>
        {profile && (
          <button
            type="button"
            aria-label={`Profile: ${profile.name}. Change profile`}
            onClick={() => setProfilesOpen(true)}
            className="flex h-8 items-center gap-2 rounded-lg border border-white/12 bg-[#1c1b1b] pr-2 pl-1.5 text-[#e5e2e1]"
          >
            <ProfileChips profile={profile} count={4} className="h-4 w-1.5" />
            <span className="text-xs font-medium">{profile.name}</span>
            <ChevronDown className="size-3.5 text-[#978e99]" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setMode('live')}
          className="flex h-9 items-center rounded-[9px] bg-[#e1b6ff] px-4 text-[13px] font-bold text-[#43205d]"
        >
          Done
        </button>
      </header>

      <DragDropProvider
        onDragEnd={({ canceled, operation: { source } }) => {
          if (canceled || !isSortable(source)) return;
          const { initialIndex, index } = source;
          if (initialIndex === index) return;
          const next = [...pads];
          next.splice(index, 0, ...next.splice(initialIndex, 1));
          savePads(next);
        }}
      >
        <div className="grid min-h-0 flex-1 auto-rows-[minmax(0,1fr)] grid-cols-5 gap-2">
          {pads.map((pad, index) => (
            <EditPad
              key={pad.id}
              pad={pad}
              index={index}
              onEdit={() => setEditing(pad)}
            />
          ))}
          <button
            type="button"
            aria-label="Add pad"
            disabled={!profile}
            onClick={() =>
              setEditing({
                id: createId(),
                kind: 'color',
                colors: [BORAHAE.command],
              })
            }
            className="flex items-center justify-center rounded-[14px] border border-dashed border-[#4b444e] text-[#cec3d0]"
          >
            <Plus className="size-[22px]" />
          </button>
        </div>
      </DragDropProvider>

      {editing && (
        <PadEditorModal
          pad={editing}
          isNew={!pads.some((p) => p.id === editing.id)}
          onClose={() => setEditing(null)}
          onRemove={() => {
            savePads(pads.filter((p) => p.id !== editing.id));
            setEditing(null);
          }}
          onSave={(pad) => {
            savePads(
              pads.some((p) => p.id === pad.id)
                ? pads.map((p) => (p.id === pad.id ? pad : p))
                : [...pads, pad],
            );
            setEditing(null);
          }}
        />
      )}
      {profilesOpen && (
        <ProfilesDialog onClose={() => setProfilesOpen(false)} />
      )}
    </div>
  );
}
