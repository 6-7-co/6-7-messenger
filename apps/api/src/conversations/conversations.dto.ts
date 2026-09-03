import { IsString, Length } from 'class-validator';

export class CreateDirectDto {
  @IsString()
  @Length(3, 24)
  username: string;
}
