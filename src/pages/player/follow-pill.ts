import type { FollowState } from '../../stores/player-store';

export type FollowPill =
  | 'No light show'
  | 'Pick a show'
  | 'Nothing playing'
  | 'Reconnecting'
  | 'Paused on TV'
  | 'Following';

export const followPill = (
  follow: FollowState,
  isPlaying: boolean,
): FollowPill => {
  if (follow.itemId !== null && follow.candidates.length === 0)
    return 'No light show';
  if (follow.candidates.length > 1) return 'Pick a show';
  if (follow.status === 'idle') return 'Nothing playing';
  if (follow.status === 'lost') return 'Reconnecting';
  if (!isPlaying) return 'Paused on TV';
  return 'Following';
};
