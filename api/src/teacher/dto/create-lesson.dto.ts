import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsInt()
  @Min(0)
  order: number;

  @IsOptional()
  @IsString()
  videoUrl?: string;
}
