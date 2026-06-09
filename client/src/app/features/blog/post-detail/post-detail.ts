import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BlogService, Post } from '../../../core/services/blog.service';
import { AuthService } from '../../../core/services/auth.service';
import { MarkdownPipe } from '../../../shared/pipes/markdown.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-post-detail',
  imports: [
    CommonModule,
    RouterLink,
    MarkdownPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './post-detail.html',
  styleUrl: './post-detail.scss',
})
export class PostDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private blogService = inject(BlogService);
  protected authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  post = signal<Post | null>(null);
  isLoading = signal<boolean>(true);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.loadPost(slug);
    } else {
      this.router.navigate(['/blog']);
    }
  }

  loadPost(slug: string): void {
    this.isLoading.set(true);
    this.blogService.getPost(slug).subscribe({
      next: (res) => {
        this.post.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err.error?.message || 'Пост не найден';
        this.snackBar.open(msg, 'Закрыть', { duration: 3000 });
        this.router.navigate(['/blog']);
      },
    });
  }

  canEdit(): boolean {
    const p = this.post();
    const user = this.authService.currentUser();
    if (!p || !user) return false;
    if (user.role === 'ADMIN') return true;
    return user.role === 'TEACHER' && p.authorId === user.id;
  }

  deletePost(): void {
    const p = this.post();
    if (!p) return;
    if (!confirm('Вы уверены, что хотите удалить этот пост?')) return;

    this.blogService.deletePost(p.id).subscribe({
      next: () => {
        this.snackBar.open('Пост успешно удален', 'Закрыть', { duration: 3000 });
        this.router.navigate(['/blog']);
      },
      error: (err) => {
        const msg = err.error?.message || 'Ошибка удаления поста';
        this.snackBar.open(msg, 'Закрыть', { duration: 5000 });
      },
    });
  }
}
