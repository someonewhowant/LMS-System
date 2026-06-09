import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';

@Controller('teacher')
@UseGuards(RolesGuard)
@Roles('TEACHER', 'ADMIN')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  // Courses
  @Post('courses')
  createCourse(@CurrentUser() user: any, @Body() dto: CreateCourseDto) {
    return this.teacherService.createCourse(user.sub, dto);
  }

  @Get('courses')
  getCourses(@CurrentUser() user: any) {
    return this.teacherService.getCourses(user.sub, user.role);
  }

  @Get('courses/:id')
  getCourse(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.teacherService.getCourse(id, user.sub, user.role);
  }

  @Patch('courses/:id')
  updateCourse(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.teacherService.updateCourse(id, user.sub, user.role, dto);
  }

  @Delete('courses/:id')
  deleteCourse(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.teacherService.deleteCourse(id, user.sub, user.role);
  }

  // Modules
  @Post('courses/:courseId/modules')
  createModule(
    @Param('courseId', ParseIntPipe) courseId: number,
    @CurrentUser() user: any,
    @Body() dto: CreateModuleDto,
  ) {
    return this.teacherService.createModule(courseId, user.sub, user.role, dto);
  }

  @Patch('modules/:id')
  updateModule(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() dto: UpdateModuleDto,
  ) {
    return this.teacherService.updateModule(id, user.sub, user.role, dto);
  }

  @Delete('modules/:id')
  deleteModule(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.teacherService.deleteModule(id, user.sub, user.role);
  }

  // Lessons
  @Post('modules/:moduleId/lessons')
  createLesson(
    @Param('moduleId', ParseIntPipe) moduleId: number,
    @CurrentUser() user: any,
    @Body() dto: CreateLessonDto,
  ) {
    return this.teacherService.createLesson(moduleId, user.sub, user.role, dto);
  }

  @Patch('lessons/:id')
  updateLesson(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.teacherService.updateLesson(id, user.sub, user.role, dto);
  }

  @Delete('lessons/:id')
  deleteLesson(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.teacherService.deleteLesson(id, user.sub, user.role);
  }

  // Quizzes
  @Post('modules/:moduleId/quizzes')
  createQuiz(
    @Param('moduleId', ParseIntPipe) moduleId: number,
    @CurrentUser() user: any,
    @Body() dto: CreateQuizDto,
  ) {
    return this.teacherService.createQuiz(moduleId, user.sub, user.role, dto);
  }

  @Patch('quizzes/:id')
  updateQuiz(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() dto: UpdateQuizDto,
  ) {
    return this.teacherService.updateQuiz(id, user.sub, user.role, dto);
  }

  @Delete('quizzes/:id')
  deleteQuiz(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.teacherService.deleteQuiz(id, user.sub, user.role);
  }
}
