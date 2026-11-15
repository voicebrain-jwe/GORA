import { Transform } from 'class-transformer';
import { Matches, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { trimLowercase } from '../../common/validation/transforms';
import { PASSWORD_MAX_LENGTH } from './register.dto';

export class LoginDto {
  @Transform(trimLowercase)
  @IsString()
  @Matches(/^(?:[^\s@]+@[^\s@]+\.[^\s@]+|[a-z0-9][a-z0-9._]{1,28}[a-z0-9])$/, {
    message: 'Enter a valid email or username.',
  })
  @MaxLength(254)
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}
