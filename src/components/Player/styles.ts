import styled from 'styled-components';

interface IContainer {
  hideMouse?: boolean;
}

export const Container = styled.div<IContainer>`
  cursor: ${({ hideMouse }) => (hideMouse ? 'none' : 'normal')};
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  background: #000;

  video {
    min-width: 100%;
    max-height: 100%;

    &::-webkit-media-controls, &::-webkit-media-controls-enclosure {
      display:none !important;
    }
  }
  
  overflow: hidden;
  
  &:hover {
    div {
      ${({ hideMouse }) => !hideMouse && 'transform: none;'};
    }
  }
`;

export const Controls = styled.div`
  z-index: 2147483647;
  user-select: none;
  transform: translateY(100%);
  width: 100%;
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 18px;
  bottom: 0;
  background: ${({ theme }) => theme.palette.additional.playerBackground};

  transition: transform ease 240ms;

  svg {
    color: ${({ theme }) => theme.palette.surface.contrastColor};
  }

  .play {
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    border: none;
    background: none;
  }

  .time {
    width: 12%;
    font-size: 14px;
    font-weight: bold;
    text-align: center;
  }

  .expand {
    cursor: pointer;
    margin-left: 12px;
  }
`;

export const Seekbar = styled.div`
  width: 100%;
  margin-left: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;

  input {
    cursor: pointer;
    width: 100%;
    height: 6px;
    border-radius: 3px;
    appearance: none;
    background-color: ${({ theme }) => theme.palette.surface.contrastColor};
    background-size: 0% 100%;
    background-repeat: no-repeat;
    background-image:${({ theme }) => `-webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, ${theme.palette.primary.main}), color-stop(100%, ${theme.palette.primary.main}))`};

    &::-webkit-slider-thumb {
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 8px;
      background: ${({ theme }) => theme.palette.primary.main};
      cursor: pointer;
    }
  }
`;

export const Sound = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;

  .volume {
    cursor: pointer;
    border: none;
    background: transparent;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-right: 2px;
  }

  input {
    cursor: pointer;
    width: 100%;
    height: 6px;
    border-radius: 3px;
    appearance: none;
    background-color: ${({ theme }) => theme.palette.surface.contrastColor};
    background-size: 100% 100%;
    background-repeat: no-repeat;
    background-image:${({ theme }) => `-webkit-gradient(linear, 50% 0%, 50% 100%, color-stop(0%, ${theme.palette.primary.main}), color-stop(100%, ${theme.palette.primary.main}))`};

    &::-webkit-slider-thumb {
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 8px;
      background: ${({ theme }) => theme.palette.primary.main};
      cursor: pointer;
    }
  }
`;
