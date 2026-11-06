import type { FollowState } from '../../stores/player-store';

export type FollowPill =
  | 'No light show'
  | 'Pick a show'
  | 'Nothing playing'
  | 'Reconnecting'
  | 'Paused on TV'
  | 'Starting on TV'
  | 'Following';

export const followPill = (
  follow: FollowState,
  isPlaying: boolean,
): FollowPill => {
  if (follow.status === 'lost') return 'Reconnecting';
  if (follow.status === 'starting') return 'Starting on TV';
  if (follow.status === 'idle') return 'Nothing playing';
  if (follow.itemId !== null && follow.candidates.length === 0)
    return 'No light show';
  if (!isPlaying) return 'Paused on TV';
  if (follow.candidates.length > 1 && !follow.chosen) return 'Pick a show';
  return 'Following';
};
