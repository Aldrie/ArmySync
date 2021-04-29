import styled, { css } from 'styled-components';
import { EffectTypes } from '../../services/effect';

export interface IEffectProps {
  colors: string[];
  type: EffectTypes;
  width: number;
  left: number;
}

const colorEffectStyle = (colors: string[]) => css`
  background: ${colors[0]};
`;

const fadeEffectStyle = (colors: string[]) => css`
  background: linear-gradient(to right, ${colors[0]}, ${colors[1]});
`;

const flashEffect = (colors: string[]) => {
  const size = 5;

  return `
    background-image: repeating-linear-gradient(
      to right,
      ${colors.map((color, index) => `${color} ${size * index}%, ${color} ${(size * (index + 1))}%`)}
    );
  `;
};

const styleTypes = {
  [EffectTypes.COLOR]: colorEffectStyle,
  [EffectTypes.FADE]: fadeEffectStyle,
  [EffectTypes.FLASH]: flashEffect,
};

const Effect = styled.div<IEffectProps>`
  width: ${({ width }) => width || '0'}%;
  height: 100%;
  border-radius: 8px;
  position: absolute;
  left: ${({ left }) => left || '0'}%;

  ${({ type, colors }) => styleTypes[type](colors) || null};
`;

export default Effect;
