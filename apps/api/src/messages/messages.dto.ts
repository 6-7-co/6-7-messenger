import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class ListMessagesQuery {
  @IsOptional()
  @IsString()
  before?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class SendTextDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;
}

export class EditMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;
}

export class SendImageDto {
  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsInt()
  width?: number;

  @IsOptional()
  @IsInt()
  height?: number;

  @IsOptional()
  @IsInt()
  size?: number;
}

export class PinMessageDto {
  @IsString()
  messageId: string;
}
