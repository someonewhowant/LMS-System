import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LmsService, Course } from '../../../core/services/lms.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatExpansionModule,
    MatSnackBarModule,
  ],
  templateUrl: './course-detail.html',
  styleUrl: './course-detail.scss',
})
export class CourseDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private lmsService = inject(LmsService);
  protected authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  course = signal<Course | null>(null);
  isLoading = signal<boolean>(true);
  isEnrolling = signal<boolean>(false);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.loadCourse(slug);
    } else {
      this.router.navigate(['/courses']);
    }
  }

  loadCourse(slug: string): void {
    this.isLoading.set(true);
    this.lmsService.getCourse(slug).subscribe({
      next: (res) => {
        this.course.set(res);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.snackBar.open('Ошибка загрузки информации о курсе', 'Закрыть', { duration: 3000 });
        this.router.navigate(['/courses']);
      },
    });
  }

  enroll(): void {
    const user = this.authService.currentUser();
    if (!user) {
      this.snackBar.open('Пожалуйста, войдите в систему, чтобы записаться на курс', 'Войти', {
        duration: 5000,
      }).onAction().subscribe(() => {
        this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      });
      return;
    }

    const currentCourse = this.course();
    if (!currentCourse) return;

    this.isEnrolling.set(true);
    this.lmsService.enroll(currentCourse.id).subscribe({
      next: () => {
        this.isEnrolling.set(false);
        this.snackBar.open('Вы успешно записались на курс!', 'Закрыть', { duration: 3000 });
        // Reload course info to get access to content
        this.loadCourse(currentCourse.slug);
      },
      error: (err) => {
        this.isEnrolling.set(false);
        const msg = err.error?.message || 'Ошибка при записи на курс';
        this.snackBar.open(msg, 'Закрыть', { duration: 5000 });
      },
    });
  }

  unenroll(): void {
    const currentCourse = this.course();
    if (!currentCourse) return;

    if (!confirm('Вы действительно хотите отказаться от обучения на этом курсе? Ваш прогресс будет сохранен, но доступ к материалам закроется.')) {
      return;
    }

    this.isEnrolling.set(true);
    this.lmsService.unenroll(currentCourse.id).subscribe({
      next: () => {
        this.isEnrolling.set(false);
        this.snackBar.open('Вы успешно отписались от курса', 'Закрыть', { duration: 3000 });
        this.loadCourse(currentCourse.slug);
      },
      error: (err) => {
        this.isEnrolling.set(false);
        const msg = err.error?.message || 'Ошибка при отмене записи';
        this.snackBar.open(msg, 'Закрыть', { duration: 5000 });
      },
    });
  }

  // Helper to check if a lesson is completed
  getCompletedLessonsCount(): number {
    const currentCourse = this.course();
    if (!currentCourse || !currentCourse.modules) return 0;
    
    let count = 0;
    for (const mod of currentCourse.modules) {
      for (const les of mod.lessons) {
        if (les.isCompleted) {
          count++;
        }
      }
    }
    return count;
  }

  // Helper to count total lessons
  getTotalLessonsCount(): number {
    const currentCourse = this.course();
    if (!currentCourse || !currentCourse.modules) return 0;
    
    let count = 0;
    for (const mod of currentCourse.modules) {
      count += mod.lessons.length;
    }
    return count;
  }

  // Calculate overall course progress percentage
  getProgressPercentage(): number {
    const total = this.getTotalLessonsCount();
    if (total === 0) return 0;
    return Math.round((this.getCompletedLessonsCount() / total) * 100);
  }
}
