import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BlogService, Post } from '../../../core/services/blog.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-post-list',
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatSnackBarModule,
  ],
  templateUrl: './post-list.html',
  styleUrl: './post-list.scss',
})
export class PostList implements OnInit {
  private blogService = inject(BlogService);
  protected authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  posts = signal<Post[]>([]);
  categories = signal<any[]>([]);
  tags = signal<any[]>([]);

  selectedCategory = signal<string>('');
  selectedTag = signal<string>('');
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);
  totalPosts = signal<number>(0);
  limit = 6;
  isLoading = signal<boolean>(false);

  ngOnInit(): void {
    this.loadFilters();
    this.loadPosts();
  }

  loadFilters(): void {
    this.blogService.getCategories().subscribe({
      next: (res) => this.categories.set(res),
      error: () => this.snackBar.open('Ошибка загрузки категорий', 'Закрыть', { duration: 3000 }),
    });

    this.blogService.getTags().subscribe({
      next: (res) => this.tags.set(res),
      error: () => this.snackBar.open('Ошибка загрузки тегов', 'Закрыть', { duration: 3000 }),
    });
  }

  loadPosts(): void {
    this.isLoading.set(true);
    const isPrivileged = this.authService.hasRole('ADMIN') || this.authService.hasRole('TEACHER');

    this.blogService
      .getPosts({
        page: this.currentPage(),
        limit: this.limit,
        search: this.searchQuery(),
        category: this.selectedCategory(),
        tag: this.selectedTag(),
        publishedOnly: !isPrivileged,
      })
      .subscribe({
        next: (res) => {
          this.posts.set(res.data);
          this.totalPages.set(res.meta.totalPages);
          this.totalPosts.set(res.meta.total);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.snackBar.open('Ошибка загрузки постов', 'Закрыть', { duration: 3000 });
        },
      });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadPosts();
  }

  onCategoryChange(catSlug: string): void {
    this.selectedCategory.set(catSlug);
    this.currentPage.set(1);
    this.loadPosts();
  }

  onTagChange(tagSlug: string): void {
    this.selectedTag.set(tagSlug);
    this.currentPage.set(1);
    this.loadPosts();
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadPosts();
  }

  clearFilters(): void {
    this.selectedCategory.set('');
    this.selectedTag.set('');
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.loadPosts();
  }

  canEdit(post: Post): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return user.role === 'TEACHER' && post.authorId === user.id;
  }

  deletePost(event: Event, id: number): void {
    event.stopPropagation();
    event.preventDefault();
    if (!confirm('Вы уверены, что хотите удалить этот пост?')) return;

    this.blogService.deletePost(id).subscribe({
      next: () => {
        this.snackBar.open('Пост успешно удален', 'Закрыть', { duration: 3000 });
        this.loadPosts();
      },
      error: (err) => {
        const msg = err.error?.message || 'Ошибка удаления поста';
        this.snackBar.open(msg, 'Закрыть', { duration: 5000 });
      },
    });
  }
}
