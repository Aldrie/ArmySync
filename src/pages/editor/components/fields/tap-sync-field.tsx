import { useCallback } from 'react';

import TapSyncButton from '../../../../components/tap-sync-button';

interface TapSyncFieldProps {
  onChange: (value: number) => void;
}

export default function TapSyncField({ onChange }: TapSyncFieldProps) {
  const handleEstimate = useCallback(
    ({ bpm }: { bpm: number; isFinalEstimate: boolean }) => {
      onChange(bpm);
    },
    [onChange],
  );

  return <TapSyncButton onBpmEstimate={handleEstimate} />;
}
