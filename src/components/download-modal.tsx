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
    <Modal open={open} onClose={() => {}}>
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
    <div className="w-sm rounded-xl border border-outline-variant bg-surface-container p-6 shadow-2xl">
      <div className="mb-4 flex items-center gap-3">
        {isDone ? (
          <CheckCircle2 className="h-5 w-5 text-primary" />
        ) : (
          <Download className="h-5 w-5 text-primary" />
        )}
        <h3 className="text-sm font-semibold text-on-surface">{label}</h3>
      </div>

      <div className="mb-2 h-2 overflow-hidden rounded-full bg-surface-high">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            isDone ? 'bg-primary' : 'bg-primary/80',
          )}
          style={{ width: `${Math.min(progress.percent, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-on-surface-variant">
        <span>{Math.round(progress.percent)}%</span>
        {!isDone && <Loader2 className="h-3 w-3 animate-spin" />}
      </div>
    </div>
  );
}
