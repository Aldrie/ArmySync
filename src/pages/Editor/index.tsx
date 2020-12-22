import React, {
  useCallback, useRef, useMemo, useState,
} from 'react';
import { FaPlay } from 'react-icons/fa';
import { ImStop2 } from 'react-icons/im';
import { GiPauseButton } from 'react-icons/gi';
import { BsDiamondHalf } from 'react-icons/bs';
import Bomb, { IBombRef } from '../../components/Bomb';

import * as format from '../../utils/format';
import { useForceRender } from '../../utils/hooks';

import { sync } from '../../services/player';

import {
  Container,
  VideoContainer,
  BombContainer,
  EffectContainer,
  TimelineContainer,
  TimelineWrapper,
  Timeline,
  Needle,
  TimelineFooter,
  Zoom,
} from './styles';

const EditorPage: React.FC = () => {
  const [spotsCount, setSpotsCount] = useState(5);

  const videoRef = useRef<HTMLVideoElement>();
  const timelineRef = useRef<HTMLDivElement>();
  const needleRef = useRef<HTMLSpanElement>();
  const timeRef = useRef<HTMLInputElement>();
  const infoRef = useRef<HTMLSpanElement>();
  const zoomRef = useRef<HTMLInputElement>();
  const bombRef = useRef<IBombRef>();

  const forceRender = useForceRender();

  const timelineSpots = useMemo(() => {
    const percent = videoRef.current?.duration / (spotsCount - 1);
    return new Array(spotsCount).fill(null)
      .map((item, index) => {
        const value = format.videoTime(percent * index);
        const typeClass = index === 0 ? 'first' : index === spotsCount - 1 ? 'last' : 'center';

        return <span className={`spot ${typeClass}`}>{value}</span>;
      });
  }, [videoRef.current, spotsCount]);

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

  const handleInputTimeChange = useCallback((value: string) => {
    const videoTime = (videoRef.current.duration * Number(value)) / 100;
    videoRef.current.currentTime = videoTime;
    needleRef.current.style.left = `${value}%`;
  }, [needleRef.current, videoRef.current]);

  const handleZoomInputChange = useCallback((value: string) => {
    const style = `${value}% 100%`;
    zoomRef.current.style.backgroundSize = style;

    const timelinePercent = 100 + (100 * (Number(value) / 100));
    timelineRef.current.style.width = `${timelinePercent}%`;

    const maxSpots = Math.floor(videoRef.current.duration / 4);

    if (spotsCount < 8 && Number(value) > 50) {
      setSpotsCount(8);
    }

    if (spotsCount < 12 && Number(value) > 75) {
      setSpotsCount(12);
    }

    if (spotsCount < maxSpots && Number(value) > 90) {
      setSpotsCount(maxSpots);
    }

    if (spotsCount >= maxSpots && Number(value) < 90) {
      setSpotsCount(12);
    }

    if (spotsCount >= 12 && Number(value) < 75) {
      setSpotsCount(8);
    }

    if (spotsCount >= 8 && Number(value) < 50) {
      setSpotsCount(5);
    }
  }, [zoomRef.current, timelineRef.current, videoRef.current, spotsCount]);

  const handleVideoTimeChange = useCallback(() => {
    sync(videoRef.current.currentTime, (color) => bombRef.current.setColor(color));

    const videoPercent = (
      (videoRef.current.currentTime * 100) / videoRef.current.duration
    ).toFixed(2);

    timeRef.current.value = videoPercent;
    needleRef.current.style.left = `${videoPercent}%`;

    infoRef.current.innerText = format.videoTime(videoRef.current.currentTime);
  }, [videoRef.current, timeRef.current, needleRef.current, bombRef.current]);

  return (
    <Container>
      <VideoContainer>
        <video
          ref={videoRef}
          src="file:///D:/Downloads/BTS%20MIC%20Drop%20(Steve%20Aoki%20Remix).mp4"
          onLoadedData={() => forceRender()}
          onTimeUpdate={handleVideoTimeChange}
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
        <TimelineWrapper>
          <Timeline ref={timelineRef}>
            <span className="info">
              <span ref={infoRef}>{format.videoTime(videoRef.current?.currentTime)}</span>
              &nbsp;/&nbsp;
              <span>{format.videoTime(videoRef.current?.duration)}</span>
            </span>
            <input type="range" className="range" min="0" max="100" step="0.1" ref={timeRef} onChange={(event) => handleInputTimeChange(event.target.value)} />
            <div className="line">
              <Needle ref={needleRef} />
              <div className="spots">
                {timelineSpots && timelineSpots}
              </div>
              <div className="wrapper" />
            </div>
          </Timeline>
        </TimelineWrapper>
        <TimelineFooter>
          <BsDiamondHalf size="26" />
          <Zoom ref={zoomRef} onChange={(event) => handleZoomInputChange(event.target.value)} />
        </TimelineFooter>
      </TimelineContainer>
    </Container>
  );
};

export default EditorPage;
