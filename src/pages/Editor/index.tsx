import React, {
  useCallback, useEffect, useRef, useMemo, useState,
} from 'react';
import { FaPlay } from 'react-icons/fa';
import { ImStop2 } from 'react-icons/im';
import { GiPauseButton } from 'react-icons/gi';
import Bomb, { IBombRef } from '../../components/Bomb';

import * as format from '../../utils/format';

import { sync } from '../../services/player';

import {
  Container,
  VideoContainer,
  BombContainer,
  EffectContainer,
  TimelineContainer,
  Timeline,
  Needle,
} from './styles';

const EditorPage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>();
  const needleRef = useRef<HTMLVideoElement>();
  const timeRef = useRef<HTMLInputElement>();
  const bombRef = useRef<IBombRef>();

  const [duration, setDuration] = useState<number>(0);

  const timelineSpots = useCallback(() => {
    const spotsCount = 8;
    const percent = duration / (spotsCount - 1);
    return new Array(spotsCount).fill(null)
      .map((item, index) => format.videoTime(percent * index));
  }, [duration]);

  const playVideo = useCallback(() => {
    videoRef.current.play();
  }, [videoRef.current]);

  const pauseVideo = useCallback(() => {
    videoRef.current.pause();
  }, [videoRef.current]);

  const stopVideo = useCallback(() => {
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
  }, [videoRef.current]);

  const handleTimeChange = useCallback((value: string) => {
    const videoTime = (videoRef.current.duration * Number(value)) / 100;
    videoRef.current.currentTime = videoTime;
    needleRef.current.style.left = `${value}%`;
  }, [needleRef.current, videoRef.current]);

  const canPlayVideoListener = useCallback(() => {
    setDuration(videoRef.current.duration);
  }, [videoRef.current]);

  const videoTimeChangeListener = useCallback(() => {
    sync(videoRef.current.currentTime, (color) => bombRef.current.setColor(color));

    const videoPercent = (
      (videoRef.current.currentTime * 100) / videoRef.current.duration
    ).toFixed(2);

    timeRef.current.value = videoPercent;
    needleRef.current.style.left = `${videoPercent}%`;
  }, [videoRef.current, timeRef.current, needleRef.current, bombRef.current]);

  useEffect(() => {
    videoRef.current.addEventListener('canplay', canPlayVideoListener);
    videoRef.current.addEventListener('timeupdate', videoTimeChangeListener);

    return () => {
      videoRef.current.removeEventListener('canplay', canPlayVideoListener);
      videoRef.current.removeEventListener('timeupdate', videoTimeChangeListener);
    };
  }, []);

  return (
    <Container>
      <VideoContainer>
        <video
          ref={videoRef}
          src="file:///D:/Downloads/BTS%20MIC%20Drop%20(Steve%20Aoki%20Remix).mp4"
        />
        <div className="controls">
          <FaPlay size="24px" onClick={playVideo} />
          <GiPauseButton size="24px" onClick={pauseVideo} />
          <ImStop2 size="24px" onClick={stopVideo} />
        </div>
      </VideoContainer>
      <BombContainer>
        <Bomb ref={bombRef} />
      </BombContainer>
      <EffectContainer />
      <TimelineContainer>
        <Timeline>
          <input type="range" className="range" min="0" max="100" step="0.1" ref={timeRef} onChange={(event) => handleTimeChange(event.target.value)} />
          <div className="line">
            <Needle ref={needleRef} />
            <div className="spots">
              {timelineSpots().map((value) => <span className="spot">{value}</span>)}
            </div>
            <div className="wrapper" />
          </div>
        </Timeline>
      </TimelineContainer>
    </Container>
  );
};

export default EditorPage;
