import { IsArray, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class QuizAnswerDto {
  @IsInt()
  questionId: number;

  @IsArray()
  @IsInt({ each: true })
  selectedOptionIds: number[];
}

export class SubmitQuizDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers: QuizAnswerDto[];
}
