import {
  Film,
  Link as LinkIcon,
  Loader2,
  Download,
  Music,
  Server,
} from 'lucide-react';
import { useCallback, useId, useState } from 'react';

import { open } from '@tauri-apps/plugin-dialog';

import { ErrorAlert, Field, INPUT } from './form';
import JellyfinConnect from './jellyfin-connect';
import JellyfinPicker, { type JellyfinPick } from './jellyfin-picker';
import Button from '../../../components/button';
import Modal from '../../../components/modal';
import { jellyfinStatus, type JellyfinStatus } from '../../../domains/jellyfin';
import {
  AUDIO_EXTENSIONS,
  type NewSongSource,
  VIDEO_EXTENSIONS,
} from '../../../domains/project';
import { cn } from '../../../lib/cn';
import { errorMessage } from '../../../lib/format';
import { useAppStore } from '../../../stores/app-store';

type SourceKind = 'video' | 'audio' | 'youtube' | 'jellyfin';

interface NewSongModalProps {
  open: boolean;
  onClose: () => void;
}

export default function NewSongModal({
  open: isOpen,
  onClose,
}: NewSongModalProps) {
  const createSong = useAppStore((s) => s.createSong);
  const titleId = useId();

  const [name, setName] = useState('');
  const [sourceKind, setSourceKind] = useState<SourceKind>('video');
  const [filePath, setFilePath] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [jellyfin, setJellyfin] = useState<JellyfinStatus | null | undefined>();
  const [pick, setPick] = useState<JellyfinPick | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setName('');
    setSourceKind('video');
    setFilePath('');
    setYoutubeUrl('');
    setJellyfin(undefined);
    setPick(null);
    setError('');
    setLoading(false);
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const handleSourceKind = (kind: SourceKind) => {
    setSourceKind(kind);
    setFilePath('');
    if (kind !== 'jellyfin') return;
    setJellyfin(undefined);
    jellyfinStatus()
      .then(setJellyfin)
      .catch((e: unknown) => {
        setJellyfin(null);
        setError(errorMessage(e));
      });
  };

  const handlePick = (next: JellyfinPick | null) => {
    setPick(next);
    if (next && !name.trim()) setName(next.item.name);
  };

  const handleSignOut = useCallback(() => {
    setJellyfin(null);
    setPick(null);
  }, []);

  const handlePickFile = async () => {
    const selected = await open({
      multiple: false,
      filters:
        sourceKind === 'audio'
          ? [{ name: 'Audio', extensions: AUDIO_EXTENSIONS }]
          : [{ name: 'Video', extensions: VIDEO_EXTENSIONS }],
    });
    if (selected) setFilePath(selected);
  };

  const isYoutube = sourceKind === 'youtube';
  const isJellyfin = sourceKind === 'jellyfin';
  const canCreate =
    name.trim() &&
    (isJellyfin
      ? jellyfin && pick
      : isYoutube
        ? youtubeUrl.trim()
        : filePath.trim());

  const songSource = (): NewSongSource => {
    if (isYoutube) return { type: 'youtube', url: youtubeUrl.trim() };
    if (isJellyfin && jellyfin && pick) {
      return {
        type: 'jellyfin',
        media: {
          type: pick.item.mediaType,
          duration: pick.item.duration,
          source: {
            type: 'jellyfin',
            itemId: pick.item.id,
            mediaSourceId: pick.mediaSourceId,
            serverId: jellyfin.serverId,
          },
        },
      };
    }
    return { type: 'file', path: filePath };
  };

  const handleCreate = async () => {
    if (!canCreate) return;
    setLoading(true);
    setError('');

    try {
      await createSong({ name: name.trim(), source: songSource() });
      reset();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      setLoading(false);
    }
  };

  const fileNoun = sourceKind === 'audio' ? 'an audio file' : 'a video file';

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      labelledBy={titleId}
      className="flex w-lg flex-col"
    >
      <div className="px-6 pt-6 pb-5">
        <h2
          id={titleId}
          className="font-display text-lg font-bold tracking-tight text-on-surface"
        >
          New Song
        </h2>
      </div>

      <div className="flex flex-col gap-5 overflow-y-auto px-6 pb-6">
        <Field label="Name" htmlFor={`${titleId}-name`}>
          <input
            id={`${titleId}-name`}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Concert Edit"
            autoFocus
            className={INPUT}
          />
        </Field>

        <Field label="Source">
          <div
            role="radiogroup"
            aria-label="Source"
            className="flex gap-1 rounded-lg border border-border bg-surface-low p-1"
          >
            <SourceTab
              active={sourceKind === 'video'}
              onClick={() => handleSourceKind('video')}
              icon={<Film className="size-4" />}
              label="Video file"
            />
            <SourceTab
              active={sourceKind === 'audio'}
              onClick={() => handleSourceKind('audio')}
              icon={<Music className="size-4" />}
              label="Audio file"
            />
            <SourceTab
              active={isYoutube}
              onClick={() => handleSourceKind('youtube')}
              icon={<Download className="size-4" />}
              label="YouTube"
            />
            <SourceTab
              active={isJellyfin}
              onClick={() => handleSourceKind('jellyfin')}
              icon={<Server className="size-4" />}
              label="Jellyfin"
            />
          </div>
        </Field>

        {isJellyfin ? (
          <div className="flex flex-col gap-1.5">
            {jellyfin === undefined ? (
              <Loader2
                role="status"
                aria-label="Checking Jellyfin sign-in"
                className="size-4 animate-spin text-outline"
              />
            ) : jellyfin ? (
              <JellyfinPicker
                status={jellyfin}
                value={pick}
                onChange={handlePick}
                onSignOut={handleSignOut}
              />
            ) : (
              <JellyfinConnect onConnected={setJellyfin} />
            )}
            <p className="text-xs text-outline">
              Nothing is downloaded. The video streams from your Jellyfin
              server.
            </p>
          </div>
        ) : isYoutube ? (
          <Field
            label="YouTube URL"
            htmlFor={`${titleId}-url`}
            hint="The video will be downloaded into your library."
          >
            <div className="relative">
              <LinkIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-outline" />
              <input
                id={`${titleId}-url`}
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className={cn(INPUT, 'pl-9')}
              />
            </div>
          </Field>
        ) : (
          <Field
            label={sourceKind === 'audio' ? 'Audio file' : 'Video file'}
            htmlFor={`${titleId}-file`}
            hint="The file will be copied into your library."
          >
            <div className="flex gap-2">
              <input
                id={`${titleId}-file`}
                type="text"
                value={filePath}
                readOnly
                onClick={() => void handlePickFile()}
                placeholder={`Select ${fileNoun}...`}
                className={cn(INPUT, 'cursor-pointer')}
              />
              <Button onClick={() => void handlePickFile()}>
                {sourceKind === 'audio' ? <Music /> : <Film />}
                Browse
              </Button>
            </div>
          </Field>
        )}

        {error && <ErrorAlert message={error} />}
      </div>

      <div className="flex justify-end gap-2 rounded-b-xl border-t border-border bg-surface-low/60 px-6 py-4">
        <Button intent="ghost" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          intent="primary"
          onClick={() => void handleCreate()}
          disabled={!canCreate || loading}
        >
          {loading && <Loader2 className="animate-spin" />}
          {loading
            ? isYoutube
              ? 'Downloading...'
              : 'Creating...'
            : 'Create Song'}
        </Button>
      </div>
    </Modal>
  );
}

function SourceTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        'flex h-8 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
        active
          ? 'bg-surface-highest text-on-surface shadow-raised'
          : 'text-on-surface-variant hover:text-on-surface',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
