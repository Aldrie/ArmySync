import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import color from 'color';

import StickSvg from '../../assets/bomb-stick.svg';

import { Container, Lamp, Cap } from './styles';

export interface IBombRef {
  setColor: (color: string) => void;
}

const Bomb: React.ForwardRefRenderFunction<IBombRef> = (_, ref) => {
  const lampRef = useRef<HTMLDivElement>();
  const coreRef = useRef<HTMLDivElement>();

  useImperativeHandle(ref, () => ({
    setColor: (colorCode) => {
      const customColor = color(colorCode);

      lampRef.current.style.background = customColor.darken(0.4).string();

      coreRef.current.style.background = colorCode;
      coreRef.current.style.boxShadow = ` 0 0 2vw ${colorCode}, 0 0 2vw ${colorCode}`;
    },
  }));

  return (
    <Container>
      <Lamp ref={lampRef}>
        <Cap />
        <div ref={coreRef} className="core" />
      </Lamp>
      <StickSvg />
    </Container>
  );
};

export default forwardRef(Bomb);
