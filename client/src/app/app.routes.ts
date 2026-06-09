import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth';

export const routes: Routes = [
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'blog',
    loadComponent: () => import('./features/blog/post-list/post-list').then((m) => m.PostList),
  },
  {
    path: 'blog/create',
    loadComponent: () => import('./features/blog/post-edit/post-edit').then((m) => m.PostEdit),
    canActivate: [authGuard],
    data: { roles: ['ADMIN', 'TEACHER'] },
  },
  {
    path: 'blog/edit/:id',
    loadComponent: () => import('./features/blog/post-edit/post-edit').then((m) => m.PostEdit),
    canActivate: [authGuard],
    data: { roles: ['ADMIN', 'TEACHER'] },
  },
  {
    path: 'blog/:slug',
    loadComponent: () => import('./features/blog/post-detail/post-detail').then((m) => m.PostDetail),
  },
  {
    path: '',
    redirectTo: 'blog',
    pathMatch: 'full',
  },
];
