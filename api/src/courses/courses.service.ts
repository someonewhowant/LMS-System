import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetCoursesQueryDto } from './dto/get-courses-query.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: GetCoursesQueryDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      published: true,
    };

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              modules: true,
              enrollments: true,
            },
          },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      courses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(idOrSlug: string, user?: { sub: number; role: string }) {
    const isId = !isNaN(Number(idOrSlug));
    const where = isId ? { id: Number(idOrSlug) } : { slug: idOrSlug };

    const course = await this.prisma.course.findFirst({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
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
                    options: {
                      select: {
                        id: true,
                        text: true,
                        questionId: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Курс не найден');
    }

    const userId = user?.sub;
    const userRole = user?.role;

    // Check if enrolled or has access (admin or author/teacher)
    let isEnrolled = false;
    let hasFullAccess = false;

    if (userId) {
      if (userRole === 'ADMIN' || course.authorId === userId) {
        hasFullAccess = true;
        isEnrolled = true;
      } else {
        const enrollment = await this.prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId,
              courseId: course.id,
            },
          },
        });
        if (enrollment) {
          isEnrolled = true;
          hasFullAccess = true;
        }
      }
    }

    // Fetch progress if has access
    const progressMap = new Map<number, boolean>();
    const quizResultsMap = new Map<number, number>();
    const quizCompletedMap = new Map<number, boolean>();

    if (userId && isEnrolled) {
      const progresses = await this.prisma.progress.findMany({
        where: {
          userId,
          lesson: {
            module: {
              courseId: course.id,
            },
          },
        },
      });
      for (const p of progresses) {
        progressMap.set(p.lessonId, p.isCompleted);
      }

      // Fetch user quiz results
      const quizResults = await this.prisma.userQuizResult.findMany({
        where: {
          userId,
          quiz: {
            module: {
              courseId: course.id,
            },
          },
        },
        orderBy: {
          completedAt: 'desc',
        },
      });
      for (const qr of quizResults) {
        quizCompletedMap.set(qr.quizId, true);
        const currentBest = quizResultsMap.get(qr.quizId) || 0;
        if (qr.score > currentBest) {
          quizResultsMap.set(qr.quizId, qr.score);
        }
      }
    }

    // Format modules, lessons & quizzes based on access rights
    const formattedModules = course.modules.map((module) => {
      const formattedLessons = module.lessons.map((lesson) => {
        const { content, videoUrl, ...lessonMeta } = lesson;
        return {
          ...lessonMeta,
          isCompleted: progressMap.get(lesson.id) || false,
          // Only show premium content if user has full access
          content: hasFullAccess ? content : null,
          videoUrl: hasFullAccess ? videoUrl : null,
        };
      });

      const formattedQuizzes = module.quizzes.map((quiz) => {
        return {
          ...quiz,
          isCompleted: quizCompletedMap.has(quiz.id),
          bestScore: quizResultsMap.get(quiz.id) !== undefined ? quizResultsMap.get(quiz.id) : null,
        };
      });

      return {
        ...module,
        lessons: formattedLessons,
        quizzes: formattedQuizzes,
      };
    });

    return {
      ...course,
      modules: formattedModules,
      isEnrolled,
      hasFullAccess,
    };
  }

  async enroll(courseId: number, userId: number) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Курс не найден');
    }

    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      return existingEnrollment;
    }

    return this.prisma.enrollment.create({
      data: {
        userId,
        courseId,
      },
    });
  }

  async unenroll(courseId: number, userId: number) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Курс не найден');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Вы не записаны на этот курс');
    }

    return this.prisma.enrollment.delete({
      where: {
        id: enrollment.id,
      },
    });
  }

  async getEnrolledCourses(userId: number) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                modules: true,
                enrollments: true,
              },
            },
          },
        },
      },
    });

    return enrollments.map((e) => e.course);
  }

  async submitQuiz(quizId: number, userId: number, dto: SubmitQuizDto) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        module: {
          include: {
            course: true,
          },
        },
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Тест не найден');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Check enrollment
    const isEnrolled = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: quiz.module.courseId,
        },
      },
    });

    if (!isEnrolled && user.role !== 'ADMIN' && quiz.module.course.authorId !== userId) {
      throw new ForbiddenException('Вы не записаны на этот курс');
    }

    const totalQuestions = quiz.questions.length;
    if (totalQuestions === 0) {
      const result = await this.prisma.userQuizResult.create({
        data: {
          userId,
          quizId,
          score: 100,
        },
      });
      return {
        id: result.id,
        score: 100,
        correctCount: 0,
        totalQuestions: 0,
        completedAt: result.completedAt,
        details: [],
      };
    }

    let correctCount = 0;

    const details = quiz.questions.map((q) => {
      const studentAnswer = dto.answers.find((a) => a.questionId === q.id);
      const correctOptionIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);
      const selectedOptionIds = studentAnswer?.selectedOptionIds || [];

      // Check if student selected exactly all correct options and no incorrect options
      const isCorrect =
        correctOptionIds.length === selectedOptionIds.length &&
        correctOptionIds.every((id) => selectedOptionIds.includes(id));

      if (isCorrect) {
        correctCount++;
      }

      return {
        questionId: q.id,
        text: q.text,
        isCorrect,
        selectedOptionIds,
        correctOptionIds,
        options: q.options,
      };
    });

    const score = (correctCount / totalQuestions) * 100;

    const result = await this.prisma.userQuizResult.create({
      data: {
        userId,
        quizId,
        score,
      },
    });

    return {
      id: result.id,
      score,
      correctCount,
      totalQuestions,
      completedAt: result.completedAt,
      details,
    };
  }

  async toggleLessonProgress(lessonId: number, userId: number, isCompleted: boolean) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Урок не найден');
    }

    // Check enrollment
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: lesson.module.courseId,
        },
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('Вы не записаны на этот курс');
    }

    return this.prisma.progress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      create: {
        userId,
        lessonId,
        isCompleted,
      },
      update: {
        isCompleted,
      },
    });
  }
}
