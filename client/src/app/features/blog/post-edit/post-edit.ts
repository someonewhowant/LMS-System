import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BlogService } from '../../../core/services/blog.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-post-edit',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './post-edit.html',
  styleUrl: './post-edit.scss',
})
export class PostEdit implements OnInit {
  private fb = inject(FormBuilder);
  private blogService = inject(BlogService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  isEditMode = signal<boolean>(false);
  postId = signal<number | null>(null);
  categories = signal<any[]>([]);
  isLoading = signal<boolean>(false);

  postForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    content: ['', [Validators.required, Validators.minLength(10)]],
    summary: [''],
    published: [false],
    categoryId: [null as number | null],
    tagsString: [''],
  });

  ngOnInit(): void {
    this.loadCategories();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditMode.set(true);
      const id = parseInt(idParam, 10);
      this.postId.set(id);
      this.loadPost(id);
    }
  }

  loadCategories(): void {
    this.blogService.getCategories().subscribe({
      next: (res) => this.categories.set(res),
      error: () => this.snackBar.open('Ошибка загрузки категорий', 'Закрыть', { duration: 3000 }),
    });
  }

  loadPost(id: number): void {
    this.isLoading.set(true);
    this.blogService.getPost(id.toString()).subscribe({
      next: (post) => {
        const tagsJoined = post.tags.map((t) => t.name).join(', ');
        this.postForm.patchValue({
          title: post.title,
          content: post.content,
          summary: post.summary || '',
          published: post.published,
          categoryId: post.categoryId || null,
          tagsString: tagsJoined,
        });
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.snackBar.open('Ошибка загрузки статьи', 'Закрыть', { duration: 3000 });
        this.router.navigate(['/blog']);
      },
    });
  }

  onSubmit(): void {
    if (this.postForm.invalid) return;

    this.isLoading.set(true);
    const formVal = this.postForm.getRawValue();

    const tags = formVal.tagsString
      ? formVal.tagsString
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
      : [];

    const postPayload = {
      title: formVal.title,
      content: formVal.content,
      summary: formVal.summary || undefined,
      published: formVal.published,
      categoryId: formVal.categoryId || undefined,
      tags,
    };

    if (this.isEditMode()) {
      this.blogService.updatePost(this.postId()!, postPayload).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.snackBar.open('Статья успешно обновлена!', 'Закрыть', { duration: 3000 });
          this.router.navigate(['/blog']);
        },
        error: (err) => {
          this.isLoading.set(false);
          const msg = err.error?.message || 'Ошибка обновления статьи';
          this.snackBar.open(msg, 'Закрыть', { duration: 5000 });
        },
      });
    } else {
      this.blogService.createPost(postPayload).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.snackBar.open('Статья успешно создана!', 'Закрыть', { duration: 3000 });
          this.router.navigate(['/blog']);
        },
        error: (err) => {
          this.isLoading.set(false);
          const msg = err.error?.message || 'Ошибка создания статьи';
          this.snackBar.open(msg, 'Закрыть', { duration: 5000 });
        },
      });
    }
  }
}
