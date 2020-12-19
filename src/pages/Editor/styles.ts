import styled from 'styled-components';

export const Container = styled.div`
  width: 100%;
  height: 100%;
  background: ${({ theme }) => theme.palette.surface.main};
  display: grid;
  grid-gap: 8% 16px;
  padding: 24px;
  grid-template-rows: 1fr 1fr;
  grid-template-columns: 1fr 1fr .6fr 1fr;
  grid-template-areas: 'video video bomb effect'
                       'timeline timeline timeline timeline';
`;

export const VideoContainer = styled.div`
  background: #000;
  grid-area: video;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;

  video {
    width: 100%;
    height: auto;
  }

  .controls {
    position: absolute;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    bottom: 0;
    transform: translateY(30px);

    svg {
      cursor: pointer;
      margin: 0 2px;
    }
  }
`;

export const BombContainer = styled.div`
  grid-area: bomb;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  position: relative;

  &:after {
    display: block;
    content: '';
    background: ${({ theme }) => theme.palette.additional.divider};
    height: 80%;
    width: 2px;
    position: absolute;
    right: 0;
    transform: translateX(9px);
  }
`;

export const EffectContainer = styled.div`
  grid-area: effect;
`;

export const TimelineContainer = styled.div`
  background: ${({ theme }) => theme.palette.onSurface.main};
  grid-area: timeline;
  border-radius: 8px;
  padding: 12px 12px 0 12px;
  overflow: auto;
`;

export const Timeline = styled.div`
  width: 100%;
  height: 100%;
  position: relative;

  .range {
    background: transparent;
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    appearance: none;

    &::-webkit-slider-thumb {
      appearance: none;
      width: 2px;
      height: 2px;
      visibility: hidden;
    }
  }

  .line {
    padding: 6px 0;
    width: 100%;
    display: flex;
    flex-wrap: wrap;

    .wrapper {
      width: 100%;
      height: 3px;
      background: ${({ theme }) => theme.palette.primary.contrastColor};
    }

    .spots {
      display: flex;
      justify-content: space-between;
      width: 100%;
      margin-bottom: 13px;
    
      .spot {
        height: 8px;
        font-size: 12px;
        font-weight: bold;
        position: relative;

        &:after {
          display: block;
          content: '';
          position: absolute;
          top: 14px;
          width: 3px;
          height: 16px;
          background: ${({ theme }) => theme.palette.primary.contrastColor};
        }
      }
    }
  }
`;

export const Needle = styled.i`
  background: ${({ theme }) => theme.palette.additional.red};
  position: absolute;
  width: 2px;
  top: 0;
  left: 0;
  height: 100%;

  &:before {
    display: block;
    content: '';
    position: absolute;
    top: 0;
    left: -7px;
    z-index: 2;
    background: ${({ theme }) => theme.palette.additional.red};
    width: 16px;
    height: 16px;
    border-radius: 14px 14px 0 14px;
    transform: rotateZ(45deg);
  }
`;
