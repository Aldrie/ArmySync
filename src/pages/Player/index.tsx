import React from 'react';
import { VIDEO_PATH } from '../../constants';

import Player from '../../components/Player';
import { Container } from './styles';

const PlayerPage: React.FC = () => (
  <Container>
    <Player src={VIDEO_PATH} />
  </Container>
);

export default PlayerPage;
