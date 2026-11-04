import {
  AlertCircle,
  FolderOpen,
  Film,
  Link as LinkIcon,
  Loader2,
  Download,
} from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

import Button from '../../../components/button';
import DownloadModal from '../../../components/download-modal';
import Modal from '../../../components/modal';
import { cn } from '../../../lib/cn';
import { useAppStore } from '../../../stores/app-store';

type SourceType = 'local' | 'youtube';

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  prefillDir?: string | null;
}

export default function NewProjectModal({
  open: isOpen,
  onClose,
  prefillDir,
}: NewProjectModalProps) {
  const createProject = useAppStore((s) => s.createProject);
  const titleId = useId();

  const [name, setName] = useState('');
  const [dir, setDir] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('local');

  useEffect(() => {
    if (prefillDir) setDir(prefillDir);
  }, [prefillDir]);
  const [videoPath, setVideoPath] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setName('');
    setDir('');
    setSourceType('local');
    setVideoPath('');
    setYoutubeUrl('');
    setError('');
    setLoading(false);
    setDownloading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePickFolder = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected) setDir(selected);
  };

  const handlePickVideo = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        { name: 'Video', extensions: ['mp4', 'mkv', 'webm', 'avi', 'mov'] },
      ],
    });
    if (selected) setVideoPath(selected);
  };

  const canCreate =
    name.trim() &&
    dir.trim() &&
    (sourceType === 'local' ? videoPath.trim() : youtubeUrl.trim());

  const handleCreate = async () => {
    if (!canCreate) return;
    setLoading(true);
    setError('');

    try {
      let finalVideoPath: string | null = null;

      if (sourceType === 'local' && videoPath) {
        const fileName = await invoke<string>('copy_file_to_dir', {
          src: videoPath,
          destDir: dir,
        });
        finalVideoPath = fileName;
      }

      if (sourceType === 'youtube' && youtubeUrl) {
        setDownloading(true);
        try {
          const fileName = await invoke<string>('download_youtube', {
            url: youtubeUrl,
            destDir: dir,
          });
          finalVideoPath = fileName;
        } finally {
          setDownloading(false);
        }
      }

      await createProject({
        dir,
        name: name.trim(),
        sourceType,
        videoPath: finalVideoPath,
        youtubeUrl: sourceType === 'youtube' ? youtubeUrl : null,
      });

      handleClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

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
          New Project
        </h2>
      </div>

      <div className="flex flex-col gap-5 overflow-y-auto px-6 pb-6">
        <Field label="Project Name" htmlFor={`${titleId}-name`}>
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

        <Field label="Project Folder" htmlFor={`${titleId}-dir`}>
          <div className="flex gap-2">
            <input
              id={`${titleId}-dir`}
              type="text"
              value={dir}
              readOnly
              onClick={() => void handlePickFolder()}
              placeholder="Select a folder..."
              className={cn(INPUT, 'cursor-pointer')}
            />
            <Button onClick={() => void handlePickFolder()}>
              <FolderOpen />
              Browse
            </Button>
          </div>
        </Field>

        <Field label="Video Source">
          <div
            role="radiogroup"
            className="flex gap-1 rounded-lg border border-border bg-surface-low p-1"
          >
            <SourceTab
              active={sourceType === 'local'}
              onClick={() => setSourceType('local')}
              icon={<Film className="size-4" />}
              label="Local Video"
            />
            <SourceTab
              active={sourceType === 'youtube'}
              onClick={() => setSourceType('youtube')}
              icon={<Download className="size-4" />}
              label="YouTube"
            />
          </div>
        </Field>

        {sourceType === 'local' ? (
          <Field
            label="Video File"
            htmlFor={`${titleId}-video`}
            hint="The video will be copied into the project folder if not already there."
          >
            <div className="flex gap-2">
              <input
                id={`${titleId}-video`}
                type="text"
                value={videoPath}
                readOnly
                onClick={() => void handlePickVideo()}
                placeholder="Select a video file..."
                className={cn(INPUT, 'cursor-pointer')}
              />
              <Button onClick={() => void handlePickVideo()}>
                <Film />
                Browse
              </Button>
            </div>
          </Field>
        ) : (
          <Field
            label="YouTube URL"
            htmlFor={`${titleId}-url`}
            hint="The video will be downloaded using yt-dlp into the project folder."
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
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-error/25 bg-error/8 px-3 py-2.5 text-xs text-error"
          >
            <AlertCircle className="mt-px size-3.5 shrink-0" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        )}
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
            ? sourceType === 'youtube'
              ? 'Downloading...'
              : 'Creating...'
            : 'Create Project'}
        </Button>
      </div>

      <DownloadModal open={downloading} />
    </Modal>
  );
}

const INPUT =
  'h-9 w-full min-w-0 rounded-lg border border-border-strong bg-surface-low px-3 text-sm text-on-surface placeholder:text-outline outline-none transition-[border-color,box-shadow] focus:border-primary/70 focus:ring-3 focus:ring-primary/15';

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-on-surface-variant"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-outline">{hint}</p>}
    </div>
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
