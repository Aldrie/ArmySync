import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';

import AwesomeDebouncePromise from 'awesome-debounce-promise';

import { FaPlay, FaExpand } from 'react-icons/fa';
import { GiPauseButton } from 'react-icons/gi';
import { HiVolumeUp, HiVolumeOff } from 'react-icons/hi';

import {
  Container,
  Controls,
  Seekbar,
  Sound,
} from './styles';

interface IPlayerProps {
  src: string;
}

const Player: React.FC<IPlayerProps> = ({ src }) => {
  const [playing, setPlaying] = useState(false);
  const [mute, setMute] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [hideMouse, setHideMouse] = useState(false);

  const videoRef = useRef<HTMLVideoElement>();
  const videoContainerRef = useRef<HTMLDivElement>();
  const seekBarRef = useRef<HTMLInputElement>();
  const timeRef = useRef<HTMLSpanElement>();
  const volumeRef = useRef<HTMLInputElement>();

  const deboucedMouseMove = useMemo(() => AwesomeDebouncePromise(
    () => setHideMouse(true), 2000,
  ), []);

  const videoDurationFormated = useMemo(() => () => {
    const minutes = Math.floor(videoRef.current.duration / 60);
    const seconds = Math.floor(videoRef.current.duration % 60);

    return `${minutes}:${seconds}`;
  }, [videoRef.current]);

  const handlePlayClick = useCallback(() => {
    if (playing) {
      videoRef.current.pause();
      return setPlaying(false);
    }
    videoRef.current.play();
    return setPlaying(true);
  }, [playing]);

  const handleSeekbarChange = useCallback((event: React.FormEvent<any>) => {
    const { value } = event?.target as any;

    videoRef.current.currentTime = (videoRef.current.duration * value) / 100;

    const style = `${value}% 100%`;

    seekBarRef.current.style.backgroundSize = style;
  }, []);

  const handleVolumeChange = useCallback((event: React.FormEvent<any>) => {
    const { value } = event?.target as any;

    const newVolume = value / 100;
    videoRef.current.volume = newVolume;

    if (newVolume === 0 && !mute) {
      setMute(true);
    } else if (newVolume > 0 && mute) {
      setMute(false);
    }

    const style = `${value}% 100%`;

    volumeRef.current.style.backgroundSize = style;
  }, [mute]);

  const handleVolumeClick = useCallback(() => {
    videoRef.current.volume = mute ? 1 : 0;

    const volumeValue = (mute ? 100 : 0).toString();
    const style = `${volumeValue}% 100%`;

    volumeRef.current.value = volumeValue;
    volumeRef.current.style.backgroundSize = style;
    setMute(!mute);
  }, [mute]);

  const handleExpandClick = useCallback(() => {
    if (!fullscreen) {
      setFullscreen(true);
      return videoContainerRef.current.requestFullscreen();
    }

    setFullscreen(false);
    return document.exitFullscreen();
  }, [fullscreen]);

  const videoListener = useCallback(() => {
    const videoPercent = (videoRef.current.currentTime * 100) / videoRef.current.duration;

    const style = `${videoPercent + 0.1}% 100%`;

    seekBarRef.current.style.backgroundSize = style;
    seekBarRef.current.value = videoPercent.toString();

    const currentMinutes = Math.floor(videoRef.current.currentTime / 60);
    const currentSeconds = Math.floor(videoRef.current.currentTime % 60);

    timeRef.current.innerText = `${currentMinutes}:${currentSeconds < 10 ? `0${currentSeconds}` : currentSeconds} / ${videoDurationFormated()}`;
  }, []);

  const videoContainerMouseListener = useCallback(async () => {
    setHideMouse(false);
    await deboucedMouseMove();
    setHideMouse(true);
  }, []);

  useEffect(() => {
    videoRef.current.addEventListener('timeupdate', videoListener);

    return () => videoRef.current.removeEventListener('timeupdate', videoListener);
  }, []);

  return (
    <Container
      ref={videoContainerRef}
      hideMouse={hideMouse}
      onMouseMove={videoContainerMouseListener}
    >
      <video
        src={src}
        ref={videoRef}
        onDoubleClick={handleExpandClick}
        onClick={handlePlayClick}
        onEnded={handlePlayClick}
      />
      <Controls>
        <button className="play" type="button" onClick={handlePlayClick}>
          {playing ? <GiPauseButton size="22px" className="play" /> : <FaPlay size="22px" className="play" />}
        </button>
        <Seekbar>
          <input type="range" min="0" max="100" step="0.01" defaultValue="0" ref={seekBarRef} onChange={handleSeekbarChange} />
        </Seekbar>
        <span className="time" ref={timeRef}>0:00 / 0:00</span>
        <Sound>
          <button className="volume" type="button" onClick={handleVolumeClick}>
            {mute ? <HiVolumeOff size="24px" className="volume" /> : <HiVolumeUp size="24px" className="volume" />}
          </button>
          <input type="range" min="0" max="100" step="0.01" defaultValue="100" ref={volumeRef} onChange={handleVolumeChange} />
        </Sound>
        <FaExpand size="28px" className="expand" onClick={handleExpandClick} />
      </Controls>
    </Container>
  );
};

export default Player;
