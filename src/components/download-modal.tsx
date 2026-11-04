import { CheckCircle2, Download, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { listen } from '@tauri-apps/api/event';

import Modal from './modal';
import { cn } from '../lib/cn';

interface DownloadProgress {
  percent: number;
  status: string;
}

interface DownloadModalProps {
  open: boolean;
}

export default function DownloadModal({ open }: DownloadModalProps) {
  return (
    <Modal
      open={open}
      onClose={() => {}}
      labelledBy="download-modal-title"
      className="w-sm"
    >
      {open && <DownloadContent />}
    </Modal>
  );
}

function DownloadContent() {
  const [progress, setProgress] = useState<DownloadProgress>({
    percent: 0,
    status: 'downloading',
  });

  useEffect(() => {
    const unlisten = listen<DownloadProgress>('download-progress', (event) => {
      setProgress(event.payload);
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  const isDone = progress.status === 'done';
  const isProcessing = progress.status === 'processing';

  const label = isDone
    ? 'Download complete'
    : isProcessing
      ? 'Processing video...'
      : 'Downloading video...';

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {isDone ? (
            <CheckCircle2 className="size-4.5" />
          ) : (
            <Download className="size-4.5" />
          )}
        </div>
        <h3
          id="download-modal-title"
          className="text-sm font-semibold text-on-surface"
        >
          {label}
        </h3>
      </div>

      <div
        role="progressbar"
        aria-valuenow={Math.round(progress.percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mb-2 h-1.5 overflow-hidden rounded-full bg-surface-highest"
      >
        <div
          className={cn(
            'h-full rounded-full bg-primary transition-[width] duration-300 ease-out',
            isProcessing && 'animate-pulse',
          )}
          style={{ width: `${Math.min(progress.percent, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-on-surface-variant tabular-nums">
        <span>{Math.round(progress.percent)}%</span>
        {!isDone && <Loader2 className="size-3 animate-spin" />}
      </div>
    </div>
  );
}
