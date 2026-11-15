import { describe, expect, test } from 'vitest';
import { toPlaces } from '@/services/photon.service';

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
});
