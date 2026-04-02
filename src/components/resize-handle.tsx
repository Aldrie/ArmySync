import { Resizable } from 're-resizable';
import type { Enable, Size } from 're-resizable';
import type { CSSProperties, ReactNode } from 'react';

interface ResizePanelProps {
  direction: 'left' | 'right' | 'top' | 'bottom';
  defaultSize: Size;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  children: ReactNode;
}

const HANDLE_THICKNESS = 4;

const handleConfig: Record<
  ResizePanelProps['direction'],
  { enable: Enable; cursor: string }
> = {
  left: { enable: { left: true }, cursor: 'col-resize' },
  right: { enable: { right: true }, cursor: 'col-resize' },
  top: { enable: { top: true }, cursor: 'row-resize' },
  bottom: { enable: { bottom: true }, cursor: 'row-resize' },
};

const isHorizontal = (dir: ResizePanelProps['direction']) =>
  dir === 'top' || dir === 'bottom';

function Handle({
  direction,
  cursor,
}: {
  direction: ResizePanelProps['direction'];
  cursor: string;
}) {
  const horizontal = isHorizontal(direction);

  const style: CSSProperties = {
    position: 'absolute',
    cursor,
    zIndex: 10,
    ...(horizontal
      ? {
          left: 0,
          right: 0,
          height: HANDLE_THICKNESS,
          [direction]: -HANDLE_THICKNESS / 2,
        }
      : {
          top: 0,
          bottom: 0,
          width: HANDLE_THICKNESS,
          [direction]: -HANDLE_THICKNESS / 2,
        }),
  };

  return (
    <div className="hover:bg-primary/30 transition-colors" style={style} />
  );
}

export default function ResizePanel({
  direction,
  defaultSize,
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  children,
}: ResizePanelProps) {
  const { enable, cursor } = handleConfig[direction];

  return (
    <Resizable
      defaultSize={defaultSize}
      minWidth={minWidth}
      maxWidth={maxWidth}
      minHeight={minHeight}
      maxHeight={maxHeight}
      enable={enable}
      handleComponent={{
        [direction]: <Handle direction={direction} cursor={cursor} />,
      }}
    >
      {children}
    </Resizable>
  );
}
