import { useEffect } from 'react';

import { useAppStore } from '../../stores/app-store';

export default function HomePage() {
  const loadRecentProjects = useAppStore((s) => s.loadRecentProjects);

  useEffect(() => {
    void loadRecentProjects();
  }, [loadRecentProjects]);

  return (
    <div className="flex h-screen items-center justify-center bg-surface text-on-surface">
      <p className="text-on-surface-variant">Home page — coming next</p>
    </div>
  );
}
