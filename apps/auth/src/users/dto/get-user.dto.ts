import { IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class GetUserDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  id: number;
}
