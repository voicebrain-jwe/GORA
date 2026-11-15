import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateGameDto } from './dto/game.dto';

async function check(input: Record<string, unknown>) {
  const dto = plainToInstance(UpdateGameDto, input);
  return { dto, errors: await validate(dto) };
}

describe('game location details', () => {
  test('are optional and trimmed', async () => {
    const { dto, errors } = await check({ locationDetails: '  Beside SM City, near the parking  ' });

    expect(errors).toHaveLength(0);
    expect(dto.locationDetails).toBe('Beside SM City, near the parking');
  });

  test('blank details clear the field', async () => {
    const { dto, errors } = await check({ locationDetails: '   ' });

    expect(errors).toHaveLength(0);
    expect(dto.locationDetails).toBeNull();
  });

  test('are limited to 200 characters', async () => {
    const { errors } = await check({ locationDetails: 'x'.repeat(201) });

    expect(errors.map((error) => error.property)).toContain('locationDetails');
  });
});
