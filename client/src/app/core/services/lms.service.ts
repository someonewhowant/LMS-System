import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Lesson {
  id: number;
  title: string;
  order: number;
  moduleId: number;
  content?: string | null;
  videoUrl?: string | null;
  isCompleted?: boolean;
}

export interface QuizOption {
  id: number;
  text: string;
  isCorrect?: boolean;
}

export interface QuizQuestion {
  id: number;
  text: string;
  order: number;
  quizId: number;
  options: QuizOption[];
}

export interface Quiz {
  id: number;
  title: string;
  description?: string;
  order: number;
  moduleId: number;
  questions?: QuizQuestion[];
  isCompleted?: boolean;
  bestScore?: number | null;
}

export interface Module {
  id: number;
  title: string;
  description?: string;
  order: number;
  courseId: number;
  lessons: Lesson[];
  quizzes?: Quiz[];
}

export interface Course {
  id: number;
  title: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  published: boolean;
  authorId: number;
  author: {
    id: number;
    name?: string;
    email: string;
    role: string;
  };
  modules?: Module[];
  isEnrolled?: boolean;
  hasFullAccess?: boolean;
  _count?: {
    modules: number;
    enrollments: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedCourses {
  courses: Course[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root',
})
export class LmsService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/courses';

  getCourses(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Observable<PaginatedCourses> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          httpParams = httpParams.set(key, val.toString());
        }
      });
    }
    return this.http.get<PaginatedCourses>(this.apiUrl, { params: httpParams });
  }

  getCourse(idOrSlug: string): Observable<Course> {
    return this.http.get<Course>(`${this.apiUrl}/${idOrSlug}`);
  }

  enroll(courseId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${courseId}/enroll`, {});
  }

  unenroll(courseId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${courseId}/unenroll`, {});
  }

  getEnrolledCourses(): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.apiUrl}/enrolled`);
  }

  submitQuiz(
    quizId: number,
    answers: { questionId: number; selectedOptionIds: number[] }[]
  ): Observable<{
    id: number;
    score: number;
    correctCount: number;
    totalQuestions: number;
    completedAt: string;
    details: any[];
  }> {
    return this.http.post<any>(`${this.apiUrl}/quizzes/${quizId}/submit`, { answers });
  }

  toggleLessonProgress(lessonId: number, isCompleted: boolean): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/lessons/${lessonId}/progress`, { isCompleted });
  }
}
