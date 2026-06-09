import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LmsService, Course } from '../../../core/services/lms.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule,
  ],
  templateUrl: './course-list.html',
  styleUrl: './course-list.scss',
})
export class CourseList implements OnInit {
  private lmsService = inject(LmsService);
  protected authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  courses = signal<Course[]>([]);
  enrolledCourseIds = signal<Set<number>>(new Set());
  
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);
  totalCourses = signal<number>(0);
  limit = 6;
  isLoading = signal<boolean>(false);

  ngOnInit(): void {
    this.loadEnrolledAndCourses();
  }

  loadEnrolledAndCourses(): void {
    if (this.authService.currentUser()) {
      this.lmsService.getEnrolledCourses().subscribe({
        next: (res) => {
          const ids = new Set(res.map((c) => c.id));
          this.enrolledCourseIds.set(ids);
          this.loadCourses();
        },
        error: () => {
          this.loadCourses();
        },
      });
    } else {
      this.loadCourses();
    }
  }

  loadCourses(): void {
    this.isLoading.set(true);
    this.lmsService
      .getCourses({
        page: this.currentPage(),
        limit: this.limit,
        search: this.searchQuery(),
      })
      .subscribe({
        next: (res) => {
          this.courses.set(res.courses);
          this.totalPages.set(res.totalPages);
          this.totalCourses.set(res.total);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.snackBar.open('Ошибка загрузки курсов', 'Закрыть', { duration: 3000 });
        },
      });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadCourses();
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadCourses();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.loadCourses();
  }

  isEnrolled(courseId: number): boolean {
    return this.enrolledCourseIds().has(courseId);
  }
}
