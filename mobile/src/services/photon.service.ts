import type { MapPoint } from '@/utils/location-map';

/**
 * Place search with Photon (OpenStreetMap geocoder by komoot). Fair use: callers debounce,
 * wait for 3+ characters, and abort stale requests. Override the host with VITE_PHOTON_URL.
 */
const PHOTON_URL = import.meta.env.VITE_PHOTON_URL?.trim() || 'https://photon.komoot.io/api/';

export interface PhotonPlace {
  id: string;
  /** Short label, e.g. "Ayala Triangle Gardens". */
  name: string;
  /** Where it is, e.g. "Makati, Metro Manila, Philippines". */
  detail: string;
  latitude: number;
  longitude: number;
}

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, string | number | undefined>;
}

export const PHOTON_MIN_QUERY = 3;

export async function searchPhoton(
  query: string,
  options: { near?: MapPoint | null; limit?: number; signal?: AbortSignal } = {},
): Promise<PhotonPlace[]> {
  const q = query.trim();
  if (q.length < PHOTON_MIN_QUERY) return [];

  const params = new URLSearchParams({ q, limit: String(options.limit ?? 6), lang: 'en' });
  if (options.near) {
    params.set('lat', options.near.latitude.toFixed(4));
    params.set('lon', options.near.longitude.toFixed(4));
  }

  const response = await fetch(`${PHOTON_URL}?${params}`, { signal: options.signal });
  if (!response.ok) throw new Error(`Photon search failed (${response.status}).`);
  const body = (await response.json()) as { features?: PhotonFeature[] };
  return toPlaces(body.features ?? []);
}

/** The nearest named place to a point (Photon /reverse), or null when nothing is close. */
export async function reversePhoton(point: MapPoint, signal?: AbortSignal): Promise<PhotonPlace | null> {
  const params = new URLSearchParams({
    lat: point.latitude.toFixed(6),
    lon: point.longitude.toFixed(6),
    limit: '1',
    lang: 'en',
  });
  const response = await fetch(`${PHOTON_URL.replace(/\/api\/?$/, '/reverse')}?${params}`, { signal });
  if (!response.ok) throw new Error(`Photon reverse lookup failed (${response.status}).`);
  const body = (await response.json()) as { features?: PhotonFeature[] };
  return toPlaces(body.features ?? [])[0] ?? null;
}

export function toPlaces(features: readonly PhotonFeature[]): PhotonPlace[] {
  const seen = new Set<string>();
  const places: PhotonPlace[] = [];

  for (const feature of features) {
    const [longitude, latitude] = feature.geometry?.coordinates ?? [];
    const p = feature.properties ?? {};
    if (typeof latitude !== 'number' || typeof longitude !== 'number') continue;

    const text = (key: string) => (typeof p[key] === 'string' ? (p[key] as string).trim() : '');
    const street = [text('street'), text('housenumber')].filter(Boolean).join(' ');
    const name = text('name') || street || text('district') || text('city') || text('state');
    if (!name) continue;

    const detail = unique([street !== name ? street : '', text('district'), text('city'), text('state'), text('country')])
      .filter((part) => part && part !== name)
      .join(', ');
    const id = `${p.osm_type ?? ''}${p.osm_id ?? `${latitude},${longitude}`}`;
    const key = `${name}|${detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    places.push({ id, name, detail, latitude, longitude });
  }

  return places;
}

function unique(parts: string[]): string[] {
  return parts.filter((part, index) => parts.indexOf(part) === index);
}
