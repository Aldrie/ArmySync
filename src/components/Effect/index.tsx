import React from 'react';

import { Container, IEffectProps } from './styles';

const Effect: React.FC<IEffectProps> = ({
  colors, type, width, left,
}) => (
  <Container colors={colors} type={type} width={width} left={left} />
);

export default Effect;
