import type { GameDiscoveryQuery, GameDiscoveryResponse } from '@/types/discovery';
import type { ApiGame, CreateGameInput, GameListQuery, JoinedGame, UpdateGameInput } from '@/types/game';
import type { ApiPostComment } from '@/types/post';
import { apiRequest } from './api-client';

function toSearch(query: object): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }

  const search = params.toString();
  return search ? `?${search}` : '';
}

/**
 * Game REST calls. The host is always the signed-in user (from the JWT on the server), so
 * no host id or status is ever sent; cancelling is its own call and never deletes a game.
 */

export function createGame(token: string, input: CreateGameInput): Promise<ApiGame> {
  return apiRequest<ApiGame>('/games', { method: 'POST', body: input, token });
}

export function getGame(token: string, gameId: string): Promise<ApiGame> {
  return apiRequest<ApiGame>(`/games/${encodeURIComponent(gameId)}`, { token });
}

export function listGames(token: string, query: GameListQuery = {}): Promise<ApiGame[]> {
  return apiRequest<ApiGame[]>(`/games${toSearch(query)}`, { token });
}

/**
 * Real GORA games for the map and list. latitude/longitude only center this one search;
 * they are sent nowhere else and never saved.
 */
export function discoverGames(token: string, query: GameDiscoveryQuery = {}): Promise<GameDiscoveryResponse> {
  return apiRequest<GameDiscoveryResponse>(`/games/discover${toSearch(query)}`, { token });
}

export function listHostedGames(token: string): Promise<ApiGame[]> {
  return apiRequest<ApiGame[]>('/games/mine', { token });
}

export function listJoinedGames(token: string): Promise<JoinedGame[]> {
  return apiRequest<JoinedGame[]>('/games/joined', { token });
}

/** Games the signed-in user is an ACTIVE player in (not hosted, not left or removed). */
export function listPlayingGames(token: string): Promise<ApiGame[]> {
  return apiRequest<ApiGame[]>('/games/playing', { token });
}

export function updateGame(token: string, gameId: string, input: UpdateGameInput): Promise<ApiGame> {
  return apiRequest<ApiGame>(`/games/${encodeURIComponent(gameId)}`, { method: 'PATCH', body: input, token });
}

export function cancelGame(token: string, gameId: string): Promise<ApiGame> {
  return apiRequest<ApiGame>(`/games/${encodeURIComponent(gameId)}/cancel`, { method: 'PATCH', token });
}

/** GET/POST/DELETE /games/:id/comments: discussion under a posted game. */
export interface GameCommentPage {
  comments: ApiPostComment[];
  nextCursor: string | null;
  total: number;
}

export function listGameComments(token: string, gameId: string, cursor?: string): Promise<GameCommentPage> {
  const query = new URLSearchParams({ limit: '20' });
  if (cursor) query.set('cursor', cursor);
  return apiRequest<GameCommentPage>(`/games/${encodeURIComponent(gameId)}/comments?${query}`, { token });
}

export function addGameComment(
  token: string,
  gameId: string,
  content: string,
): Promise<{ comment: ApiPostComment; total: number }> {
  return apiRequest(`/games/${encodeURIComponent(gameId)}/comments`, { method: 'POST', body: { content }, token });
}

export function deleteGameComment(token: string, gameId: string, commentId: string): Promise<{ total: number }> {
  return apiRequest(`/games/${encodeURIComponent(gameId)}/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
    token,
  });
}
