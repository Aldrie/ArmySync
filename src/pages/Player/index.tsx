import React from 'react';
import Player from '../../components/Player';
import { Container } from './styles';

const PlayerPage: React.FC = () => (
  <Container>
    <Player src="file:///D:/Downloads/BTS%20MIC%20Drop%20(Steve%20Aoki%20Remix).mp4" />
  </Container>
);

export default PlayerPage;
