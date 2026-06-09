import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  summary?: string;
  imageUrl?: string;
  published: boolean;
  authorId: number;
  author: {
    id: number;
    name?: string;
    email: string;
    role: string;
  };
  categoryId?: number;
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  tags: {
    id: number;
    name: string;
    slug: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedPosts {
  data: Post[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class BlogService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/blog';

  getPosts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    tag?: string;
    publishedOnly?: boolean;
  }): Observable<PaginatedPosts> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          httpParams = httpParams.set(key, val.toString());
        }
      });
    }
    return this.http.get<PaginatedPosts>(this.apiUrl, { params: httpParams });
  }

  getPost(idOrSlug: string): Observable<Post> {
    return this.http.get<Post>(`${this.apiUrl}/${idOrSlug}`);
  }

  createPost(post: any): Observable<Post> {
    return this.http.post<Post>(this.apiUrl, post);
  }

  updatePost(id: number, post: any): Observable<Post> {
    return this.http.patch<Post>(`${this.apiUrl}/${id}`, post);
  }

  deletePost(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  getCategories(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/categories`);
  }

  getTags(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/tags`);
  }

  uploadImage(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${this.apiUrl}/upload`, formData);
  }
}
