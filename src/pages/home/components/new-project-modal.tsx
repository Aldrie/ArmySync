import {
  FolderOpen,
  Film,
  Link as LinkIcon,
  Loader2,
  Download,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

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
    <Modal open={isOpen} onClose={handleClose}>
      <div className="w-lg rounded-xl border border-outline-variant bg-surface-container p-6 shadow-2xl">
        <h2 className="mb-6 text-lg font-semibold text-on-surface">
          New Project
        </h2>

        {/* Project name */}
        <fieldset className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-on-surface-variant">
            Project Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Concert Edit"
            className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface placeholder:text-outline outline-none transition-colors focus:border-primary"
          />
        </fieldset>

        {/* Project folder */}
        <fieldset className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-on-surface-variant">
            Project Folder
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={dir}
              readOnly
              placeholder="Select a folder..."
              className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface placeholder:text-outline outline-none"
            />
            <button
              onClick={() => void handlePickFolder()}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-high px-3 py-2 text-sm text-on-surface transition-colors hover:bg-surface-highest"
            >
              <FolderOpen className="h-4 w-4" />
              Browse
            </button>
          </div>
        </fieldset>

        {/* Source type toggle */}
        <fieldset className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-on-surface-variant">
            Video Source
          </label>
          <div className="flex gap-1 rounded-lg border border-outline-variant bg-surface p-1">
            <SourceTab
              active={sourceType === 'local'}
              onClick={() => setSourceType('local')}
              icon={<Film className="h-4 w-4" />}
              label="Local Video"
            />
            <SourceTab
              active={sourceType === 'youtube'}
              onClick={() => setSourceType('youtube')}
              icon={<Download className="h-4 w-4" />}
              label="YouTube"
            />
          </div>
        </fieldset>

        {/* Source field */}
        <fieldset className="mb-6">
          {sourceType === 'local' ? (
            <>
              <label className="mb-1.5 block text-xs font-medium text-on-surface-variant">
                Video File
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={videoPath}
                  readOnly
                  placeholder="Select a video file..."
                  className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface placeholder:text-outline outline-none"
                />
                <button
                  onClick={() => void handlePickVideo()}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-high px-3 py-2 text-sm text-on-surface transition-colors hover:bg-surface-highest"
                >
                  <Film className="h-4 w-4" />
                  Browse
                </button>
              </div>
              <p className="mt-1.5 text-xs text-outline">
                The video will be copied into the project folder if not already
                there.
              </p>
            </>
          ) : (
            <>
              <label className="mb-1.5 block text-xs font-medium text-on-surface-variant">
                YouTube URL
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 py-2">
                <LinkIcon className="h-4 w-4 shrink-0 text-outline" />
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-on-surface placeholder:text-outline outline-none"
                />
              </div>
              <p className="mt-1.5 text-xs text-outline">
                The video will be downloaded using yt-dlp into the project
                folder.
              </p>
            </>
          )}
        </fieldset>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={handleClose}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-high disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleCreate()}
            disabled={!canCreate || loading}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading
              ? sourceType === 'youtube'
                ? 'Downloading...'
                : 'Creating...'
              : 'Create Project'}
          </button>
        </div>
      </div>

      <DownloadModal open={downloading} />
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
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-surface-high text-on-surface'
          : 'text-outline hover:text-on-surface-variant',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
