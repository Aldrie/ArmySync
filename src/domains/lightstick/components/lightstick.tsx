import Color from 'color';
import { forwardRef, useImperativeHandle, useRef } from 'react';

import BombStickSvg from '../../../assets/bomb-stick.svg?react';

export interface LightstickRef {
  setColor: (color: string) => void;
}

const Lightstick = forwardRef<LightstickRef>(function Lightstick(_, ref) {
  const lampRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    setColor: (colorCode: string) => {
      const customColor = Color(colorCode);

      if (lampRef.current) {
        lampRef.current.style.background = customColor.darken(0.4).string();
      }
      if (coreRef.current) {
        coreRef.current.style.background = colorCode;
        coreRef.current.style.boxShadow = `0 0 2vw ${colorCode}, 0 0 2vw ${colorCode}`;
      }
    },
  }));

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        ref={lampRef}
        className="relative w-[10vw] h-[10vw] rounded-full p-[0.6vw]"
        style={{ background: 'rgba(255, 255, 255, 0.4)' }}
      >
        {/* Cap */}
        <div
          className="absolute top-[5%] right-[8%] w-[28%] h-[6%] rounded bg-zinc-950"
          style={{ transform: 'rotateZ(32deg)' }}
        >
          <div className="absolute -top-[25%] left-0 right-0 mx-auto h-[28%] w-[28%] rounded-t bg-red-900" />
        </div>
        {/* Core */}
        <div
          ref={coreRef}
          className="w-full h-full rounded-full bg-white"
          style={{ boxShadow: '0 0 2vw #fff, 0 0 2vw #fff' }}
        />
      </div>
      <BombStickSvg className="w-[4vw] -mt-[5%] z-2" />
    </div>
  );
});

export default Lightstick;
