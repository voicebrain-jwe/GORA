import type { FeedActivity } from '@/types/feed';
import type { PlayerSummary } from '@/types/player';
import type { SportsLocation } from '@/types/sport';
import { apiRequest } from './api-client';

export async function fetchPlayers(token: string): Promise<PlayerSummary[]> {
  return apiRequest('/profiles/discover/players', { token });
}

export async function fetchLocations(): Promise<SportsLocation[]> {
  // Game locations come from /games/discover. Never invent nearby venues.
  return [];
}

/** Game completions, joins, and badge unlocks from people the viewer follows or is friends with. */
export async function fetchActivities(): Promise<FeedActivity[]> {
  return [];
}

export async function fetchFriends(): Promise<PlayerSummary[]> {
  return [];
}
