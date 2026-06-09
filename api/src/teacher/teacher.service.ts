import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { slugify } from '../common/utils/slugify';

@Injectable()
export class TeacherService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkCourseAccess(courseId: number, userId: number, role: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Курс не найден');
    }

    if (role !== 'ADMIN' && course.authorId !== userId) {
      throw new ForbiddenException('У вас нет прав для изменения этого курса');
    }

    return course;
  }

  async createCourse(authorId: number, dto: CreateCourseDto) {
    let slug = slugify(dto.title);
    
    // Ensure unique slug
    let uniqueSlug = slug;
    let counter = 1;
    while (await this.prisma.course.findFirst({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    return this.prisma.course.create({
      data: {
        ...dto,
        slug: uniqueSlug,
        authorId,
      },
    });
  }

  async getCourses(userId: number, role: string) {
    const where = role === 'ADMIN' ? {} : { authorId: userId };
    return this.prisma.course.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
    });
  }

  async getCourse(courseId: number, userId: number, role: string) {
    await this.checkCourseAccess(courseId, userId, role);

    return this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
            },
            quizzes: {
              orderBy: { order: 'asc' },
              include: {
                questions: {
                  orderBy: { order: 'asc' },
                  include: {
                    options: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async updateCourse(courseId: number, userId: number, role: string, dto: UpdateCourseDto) {
    await this.checkCourseAccess(courseId, userId, role);

    const updateData: any = { ...dto };

    if (dto.title) {
      let slug = slugify(dto.title);
      let uniqueSlug = slug;
      let counter = 1;
      
      // Ensure unique slug (excluding current course)
      while (
        await this.prisma.course.findFirst({
          where: {
            slug: uniqueSlug,
            id: { not: courseId },
          },
        })
      ) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }
      updateData.slug = uniqueSlug;
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data: updateData,
    });
  }

  async deleteCourse(courseId: number, userId: number, role: string) {
    await this.checkCourseAccess(courseId, userId, role);

    return this.prisma.course.delete({
      where: { id: courseId },
    });
  }

  // Modules
  async createModule(courseId: number, userId: number, role: string, dto: CreateModuleDto) {
    await this.checkCourseAccess(courseId, userId, role);

    return this.prisma.module.create({
      data: {
        ...dto,
        courseId,
      },
    });
  }

  async updateModule(moduleId: number, userId: number, role: string, dto: UpdateModuleDto) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!module) {
      throw new NotFoundException('Модуль не найден');
    }

    await this.checkCourseAccess(module.courseId, userId, role);

    return this.prisma.module.update({
      where: { id: moduleId },
      data: dto,
    });
  }

  async deleteModule(moduleId: number, userId: number, role: string) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!module) {
      throw new NotFoundException('Модуль не найден');
    }

    await this.checkCourseAccess(module.courseId, userId, role);

    return this.prisma.module.delete({
      where: { id: moduleId },
    });
  }

  // Lessons
  async createLesson(moduleId: number, userId: number, role: string, dto: CreateLessonDto) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!module) {
      throw new NotFoundException('Модуль не найден');
    }

    await this.checkCourseAccess(module.courseId, userId, role);

    return this.prisma.lesson.create({
      data: {
        ...dto,
        moduleId,
      },
    });
  }

  async updateLesson(lessonId: number, userId: number, role: string, dto: UpdateLessonDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });

    if (!lesson) {
      throw new NotFoundException('Урок не найден');
    }

    await this.checkCourseAccess(lesson.module.courseId, userId, role);

    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: dto,
    });
  }

  async deleteLesson(lessonId: number, userId: number, role: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });

    if (!lesson) {
      throw new NotFoundException('Урок не найден');
    }

    await this.checkCourseAccess(lesson.module.courseId, userId, role);

    return this.prisma.lesson.delete({
      where: { id: lessonId },
    });
  }

  // Quizzes
  async createQuiz(moduleId: number, userId: number, role: string, dto: CreateQuizDto) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!module) {
      throw new NotFoundException('Модуль не найден');
    }

    await this.checkCourseAccess(module.courseId, userId, role);

    const { questions, ...quizData } = dto;

    return this.prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.create({
        data: {
          ...quizData,
          moduleId,
        },
      });

      if (questions && questions.length > 0) {
        for (const questionDto of questions) {
          const question = await tx.question.create({
            data: {
              text: questionDto.text,
              order: questionDto.order,
              quizId: quiz.id,
            },
          });

          if (questionDto.options && questionDto.options.length > 0) {
            await tx.questionOption.createMany({
              data: questionDto.options.map((option) => ({
                text: option.text,
                isCorrect: option.isCorrect,
                questionId: question.id,
              })),
            });
          }
        }
      }

      return tx.quiz.findUnique({
        where: { id: quiz.id },
        include: {
          questions: {
            include: {
              options: true,
            },
          },
        },
      });
    });
  }

  async updateQuiz(quizId: number, userId: number, role: string, dto: UpdateQuizDto) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { module: true },
    });

    if (!quiz) {
      throw new NotFoundException('Тест не найден');
    }

    await this.checkCourseAccess(quiz.module.courseId, userId, role);

    return this.prisma.quiz.update({
      where: { id: quizId },
      data: dto,
    });
  }

  async deleteQuiz(quizId: number, userId: number, role: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { module: true },
    });

    if (!quiz) {
      throw new NotFoundException('Тест не найден');
    }

    await this.checkCourseAccess(quiz.module.courseId, userId, role);

    return this.prisma.quiz.delete({
      where: { id: quizId },
    });
  }
}
