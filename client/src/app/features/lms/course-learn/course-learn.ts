import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LmsService, Course, Module, Lesson, Quiz } from '../../../core/services/lms.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SafeUrlPipe } from '../../../shared/pipes/safe-url.pipe';
import { MarkdownPipe } from '../../../shared/pipes/markdown.pipe';

interface SelectedAnswer {
  questionId: number;
  selectedOptionIds: number[];
}

@Component({
  selector: 'app-course-learn',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatRadioModule,
    MatSnackBarModule,
    SafeUrlPipe,
    MarkdownPipe,
  ],
  templateUrl: './course-learn.html',
  styleUrl: './course-learn.scss',
})
export class CourseLearn implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private lmsService = inject(LmsService);
  protected authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  course = signal<Course | null>(null);
  isLoading = signal<boolean>(true);
  
  // Sidebar selection
  selectedLesson = signal<Lesson | null>(null);
  selectedQuiz = signal<Quiz | null>(null);

  // Quiz taking state
  quizAnswers = signal<SelectedAnswer[]>([]);
  quizResult = signal<any | null>(null);
  isSubmittingQuiz = signal<boolean>(false);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.loadCourse(slug);
    } else {
      this.router.navigate(['/courses']);
    }
  }

  loadCourse(slug: string, autoSelect = true): void {
    this.lmsService.getCourse(slug).subscribe({
      next: (res) => {
        if (!res.isEnrolled) {
          this.snackBar.open('Вы должны быть записаны на курс для доступа к обучению', 'Закрыть', { duration: 5000 });
          this.router.navigate(['/courses', slug]);
          return;
        }

        this.course.set(res);
        this.isLoading.set(false);

        if (autoSelect) {
          this.subscribeToRouteParams();
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.snackBar.open('Ошибка загрузки материалов курса', 'Закрыть', { duration: 3000 });
        this.router.navigate(['/courses']);
      },
    });
  }

  subscribeToRouteParams(): void {
    this.route.queryParams.subscribe((params) => {
      const lessonId = params['lessonId'] ? Number(params['lessonId']) : null;
      const quizId = params['quizId'] ? Number(params['quizId']) : null;
      const currentCourse = this.course();

      if (!currentCourse || !currentCourse.modules) return;

      let found = false;

      // Find selected lesson or quiz in syllabus
      for (const mod of currentCourse.modules) {
        if (lessonId) {
          const les = mod.lessons.find((l) => l.id === lessonId);
          if (les) {
            this.selectedLesson.set(les);
            this.selectedQuiz.set(null);
            found = true;
            break;
          }
        } else if (quizId) {
          const qz = mod.quizzes?.find((q) => q.id === quizId);
          if (qz) {
            this.selectedLesson.set(null);
            this.selectedQuiz.set(qz);
            this.initializeQuizState(qz);
            found = true;
            break;
          }
        }
      }

      // Default selection (first lesson of first module)
      if (!found && currentCourse.modules.length > 0) {
        const firstModule = currentCourse.modules[0];
        if (firstModule.lessons.length > 0) {
          this.selectLesson(firstModule.lessons[0]);
        } else if (firstModule.quizzes && firstModule.quizzes.length > 0) {
          this.selectQuiz(firstModule.quizzes[0]);
        }
      }
    });
  }

  selectLesson(lesson: Lesson): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { lessonId: lesson.id, quizId: null },
      queryParamsHandling: 'merge',
    });
  }

  selectQuiz(quiz: Quiz): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { quizId: quiz.id, lessonId: null },
      queryParamsHandling: 'merge',
    });
  }

  toggleLessonProgress(): void {
    const lesson = this.selectedLesson();
    if (!lesson) return;

    const newStatus = !lesson.isCompleted;
    this.lmsService.toggleLessonProgress(lesson.id, newStatus).subscribe({
      next: () => {
        // Update local lesson state
        lesson.isCompleted = newStatus;
        
        // Refresh sidebar course details silently to update counts/progress
        const currentCourse = this.course();
        if (currentCourse) {
          this.loadCourse(currentCourse.slug, false);
        }

        this.snackBar.open(
          newStatus ? 'Урок отмечен как пройденный!' : 'Отметка о прохождении снята',
          'Закрыть',
          { duration: 2000 }
        );
      },
      error: () => {
        this.snackBar.open('Не удалось обновить прогресс', 'Закрыть', { duration: 3000 });
      },
    });
  }

  // QUIZ LOGIC
  initializeQuizState(quiz: Quiz): void {
    this.quizResult.set(null);
    if (!quiz.questions) {
      this.quizAnswers.set([]);
      return;
    }

    const initialAnswers = quiz.questions.map((q) => ({
      questionId: q.id,
      selectedOptionIds: [],
    }));
    this.quizAnswers.set(initialAnswers);
  }

  onSingleChoiceChange(questionId: number, optionId: number): void {
    const answers = [...this.quizAnswers()];
    const index = answers.findIndex((a) => a.questionId === questionId);
    if (index !== -1) {
      answers[index].selectedOptionIds = [optionId];
      this.quizAnswers.set(answers);
    }
  }

  onMultiChoiceChange(questionId: number, optionId: number, checked: boolean): void {
    const answers = [...this.quizAnswers()];
    const index = answers.findIndex((a) => a.questionId === questionId);
    if (index !== -1) {
      const selected = [...answers[index].selectedOptionIds];
      if (checked) {
        if (!selected.includes(optionId)) {
          selected.push(optionId);
        }
      } else {
        const optIndex = selected.indexOf(optionId);
        if (optIndex !== -1) {
          selected.splice(optIndex, 1);
        }
      }
      answers[index].selectedOptionIds = selected;
      this.quizAnswers.set(answers);
    }
  }

  isOptionSelected(questionId: number, optionId: number): boolean {
    const answer = this.quizAnswers().find((a) => a.questionId === questionId);
    return answer ? answer.selectedOptionIds.includes(optionId) : false;
  }

  submitQuiz(): void {
    const quiz = this.selectedQuiz();
    if (!quiz) return;

    // Verify all questions have at least one selection
    const unanswered = this.quizAnswers().some((a) => a.selectedOptionIds.length === 0);
    if (unanswered && !confirm('Вы ответили не на все вопросы. Действительно отправить тест?')) {
      return;
    }

    this.isSubmittingQuiz.set(true);
    this.lmsService.submitQuiz(quiz.id, this.quizAnswers()).subscribe({
      next: (res) => {
        this.isSubmittingQuiz.set(false);
        this.quizResult.set(res);
        
        // Refresh course info to update bestScore and complete status
        const currentCourse = this.course();
        if (currentCourse) {
          this.loadCourse(currentCourse.slug, false);
        }

        this.snackBar.open(`Тест сдан! Результат: ${res.score}%`, 'Закрыть', { duration: 5000 });
      },
      error: (err) => {
        this.isSubmittingQuiz.set(false);
        const msg = err.error?.message || 'Ошибка отправки теста';
        this.snackBar.open(msg, 'Закрыть', { duration: 5000 });
      },
    });
  }

  retakeQuiz(): void {
    const quiz = this.selectedQuiz();
    if (quiz) {
      this.initializeQuizState(quiz);
    }
  }
}
