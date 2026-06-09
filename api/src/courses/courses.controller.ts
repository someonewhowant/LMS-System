import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { GetCoursesQueryDto } from './dto/get-courses-query.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get()
  findAll(@Query() query: GetCoursesQueryDto) {
    return this.coursesService.findAll(query);
  }

  @Get('enrolled')
  getEnrolled(@CurrentUser() user: JwtPayload) {
    return this.coursesService.getEnrolledCourses(user.sub);
  }

  @Public()
  @Get(':idOrSlug')
  async findOne(@Param('idOrSlug') idOrSlug: string, @Req() req: any) {
    let user: any = undefined;

    // Optional extraction of user from auth headers if present on public route
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        user = await this.jwtService.verifyAsync(token, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });
      } catch (err) {
        // Token is invalid or expired, proceed as guest
      }
    }

    return this.coursesService.findOne(idOrSlug, user);
  }

  @Post(':id/enroll')
  enroll(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.coursesService.enroll(id, user.sub);
  }

  @Post(':id/unenroll')
  unenroll(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.coursesService.unenroll(id, user.sub);
  }

  @Post('quizzes/:quizId/submit')
  submitQuiz(
    @Param('quizId', ParseIntPipe) quizId: number,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubmitQuizDto,
  ) {
    return this.coursesService.submitQuiz(quizId, user.sub, dto);
  }

  @Post('lessons/:lessonId/progress')
  toggleLessonProgress(
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @CurrentUser() user: JwtPayload,
    @Body('isCompleted') isCompleted: boolean,
  ) {
    return this.coursesService.toggleLessonProgress(
      lessonId,
      user.sub,
      isCompleted,
    );
  }
}
