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
  user-select: none;
  display: flex;
  flex-direction: column;
`;

export const TimelineWrapper = styled.div`
  padding: 12px 12px 0 12px;
  width: 100%;
  height: 100%;
  overflow: auto;
`;

export const Timeline = styled.div`
  width: 100%;
  height: 100%;
  position: relative;

  .info {
    font-size: 28px;
    user-select: none;
    font-weight: bold;
    position: absolute;
    right: 0;
    text-align: right;
    position: fixed;
    transform: translateY(-150%) translateX(-18%);
  }

  .range {
    z-index: 3;
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

      .first:after {
        left: 0;
      }

      .center:after {
        left: 0;
        right: 0;
        margin: 0 auto;
      }

      .last:after {
        right: 0;
      }
    }
  }
`;

export const TimelineFooter = styled.div`
  width: 100%;
  height: 64px;
  background: ${({ theme }) => theme.palette.surfaceOverlay.main};
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
`;

export const Zoom = styled.input.attrs({
  type: 'range', min: 0, max: 100, step: 0.1, defaultValue: 0,
})`
  cursor: pointer;
  width: 10%;
  height: 8px;
  border-radius: 2px;
  appearance: none;
  background-color: ${({ theme }) => theme.palette.surface.contrastColor};
  background-size: 0 100%;
  background-repeat: no-repeat;
  background-image:${({ theme }) => `-webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, ${theme.palette.primary.main}), color-stop(100%, ${theme.palette.primary.main}))`};

  &::-webkit-slider-thumb {
    appearance: none;
    width: 10px;
    height: 26px;
    border-radius: 8px;
    background: ${({ theme }) => theme.palette.primary.main};
    cursor: w-resize;
  }
`;

export const Needle = styled.i`
  background: ${({ theme }) => theme.palette.additional.red};
  position: absolute;
  width: 2px;
  z-index: 2;
  top: 0;
  left: 0;
  height: 100%;

  &:before {
    display: block;
    content: '';
    position: absolute;
    background: ${({ theme }) => theme.palette.additional.red};
    width: 16px;
    height: 16px;
    border-radius: 14px 14px 0 14px;
    transform: translateX(-7px) rotateZ(45deg);
  }
`;
