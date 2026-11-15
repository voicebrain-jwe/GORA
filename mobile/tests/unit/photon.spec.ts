import { afterEach, describe, expect, test, vi } from 'vitest';
import { reversePhoton, toPlaces } from '@/services/photon.service';

afterEach(() => vi.unstubAllGlobals());

describe('Photon place results', () => {
  test('names a place and lists where it is', () => {
    const places = toPlaces([
      {
        geometry: { coordinates: [121.0244, 14.5571] },
        properties: { osm_type: 'W', osm_id: 1, name: 'Ayala Triangle Gardens', city: 'Makati', state: 'Metro Manila', country: 'Philippines' },
      },
    ]);

    expect(places).toEqual([
      { id: 'W1', name: 'Ayala Triangle Gardens', detail: 'Makati, Metro Manila, Philippines', latitude: 14.5571, longitude: 121.0244 },
    ]);
  });

  test('falls back to the street for unnamed addresses and skips duplicates and bad points', () => {
    const address = { geometry: { coordinates: [121, 14.5] as [number, number] }, properties: { street: 'Rizal Ave', housenumber: '12', city: 'Manila' } };
    const places = toPlaces([address, address, { properties: { name: 'No point' } }]);

    expect(places).toHaveLength(1);
    expect(places[0]).toMatchObject({ name: 'Rizal Ave 12', detail: 'Manila' });
  });

  test('names the current location from the nearest place', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ features: [{ geometry: { coordinates: [121.0239, 14.5556] }, properties: { name: 'Ayala Triangle Gardens', city: 'Makati' } }] })),
    );
    vi.stubGlobal('fetch', fetchMock);

    const place = await reversePhoton({ latitude: 14.5556, longitude: 121.0239 });

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/reverse?lat=14.555600&lon=121.023900');
    expect(place).toMatchObject({ name: 'Ayala Triangle Gardens', detail: 'Makati' });
  });
});
