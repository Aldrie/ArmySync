import { RotateCw, X } from 'lucide-react';

import Button from './button';
import IconButton from './icon-button';
import { TEST_COLOR, useBleStore } from '../stores/ble-store';

const testColorCss = `rgb(${TEST_COLOR.join(' ')})`;

function ColorTestCard() {
  const test = useBleStore((s) => s.colorTest);
  const device = useBleStore((s) =>
    s.connectedDevices.find((d) => d.id === s.colorTest?.deviceId),
  );
  const { answerColorTest, retryColorTest, disconnect } =
    useBleStore.getState();
  if (!test || !device) return null;

  return (
    <div
      role="status"
      className="mx-1 mb-2 flex flex-col gap-2.5 rounded-lg border border-border bg-surface-container p-3"
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="size-5 shrink-0 rounded-full shadow-raised"
          style={{ background: testColorCss }}
        />
        <span className="text-[13px] font-medium text-on-surface">
          {test.failed
            ? `${device.name} isn't lighting up`
            : `Is ${device.name} purple now?`}
        </span>
      </div>
      {test.failed ? (
        <>
          <p className="text-xs leading-normal text-on-surface-variant">
            Paired but no color usually means weak batteries. Swap them, or turn
            the lightstick off and on, then try again.
          </p>
          <div className="flex gap-2">
            <Button intent="tonal" size="sm" onClick={retryColorTest}>
              Show again
            </Button>
            <Button
              intent="ghost"
              size="sm"
              onClick={() => void disconnect(device.id)}
            >
              Disconnect
            </Button>
          </div>
        </>
      ) : (
        <div className="flex gap-2">
          <Button
            intent="tonal"
            size="sm"
            onClick={() => answerColorTest(true)}
          >
            Yes
          </Button>
          <Button
            intent="ghost"
            size="sm"
            onClick={() => answerColorTest(false)}
          >
            No
          </Button>
        </div>
      )}
    </div>
  );
}

function DroppedRows() {
  const dropped = useBleStore((s) => s.dropped);
  const { connect, forgetDropped } = useBleStore.getState();

  return dropped.map((d) => (
    <div
      key={d.id}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-on-surface-variant"
    >
      <span className="min-w-0 flex-1 truncate">
        <span className="font-medium text-on-surface">{d.name}</span>{' '}
        disconnected
      </span>
      <Button intent="tonal" size="sm" onClick={() => void connect(d.id)}>
        <RotateCw />
        Reconnect
      </Button>
      <IconButton label="Dismiss" onClick={() => forgetDropped(d.id)}>
        <X />
      </IconButton>
    </div>
  ));
}

export function BleNotices() {
  const error = useBleStore((s) => s.connectError);

  return (
    <>
      <ColorTestCard />
      <DroppedRows />
      {error && (
        <p role="alert" className="px-3 py-1.5 text-xs text-error">
          {error}
        </p>
      )}
    </>
  );
}

export function UnlistedButton({
  showUnlisted,
  onToggle,
}: {
  showUnlisted: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mx-3 my-1 cursor-pointer self-start text-xs font-medium text-primary hover:underline"
    >
      {showUnlisted ? 'Show lightsticks only' : "My lightstick isn't listed"}
    </button>
  );
}
