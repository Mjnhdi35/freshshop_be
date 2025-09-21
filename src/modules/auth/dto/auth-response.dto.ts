import { Expose } from 'class-transformer';
import { UserRole } from '../../users/entities/user.entity';

export class AuthResponseDto {
  @Expose()
  accessToken: string;

  @Expose()
  refreshToken: string;

  @Expose()
  user: {
    id: string;
    email: string;
    displayName?: string;
    isActive: boolean;
    avatar?: string;
    role: UserRole;
  };
}
