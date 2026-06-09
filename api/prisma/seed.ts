import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./dev.db'
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Create Users
  const passwordHash = bcrypt.hashSync('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@lms.com' },
    update: {},
    create: {
      email: 'admin@lms.com',
      password: passwordHash,
      name: 'Александр Админ',
      role: 'ADMIN',
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@lms.com' },
    update: {},
    create: {
      email: 'teacher@lms.com',
      password: passwordHash,
      name: 'Елена Преподаватель',
      role: 'TEACHER',
    },
  });

  console.log('Users seeded:', { admin: admin.email, teacher: teacher.email });

  // 2. Create Categories
  const catWeb = await prisma.category.upsert({
    where: { slug: 'web-development' },
    update: {},
    create: {
      name: 'Веб-разработка',
      slug: 'web-development',
    },
  });

  const catAI = await prisma.category.upsert({
    where: { slug: 'artificial-intelligence' },
    update: {},
    create: {
      name: 'Искусственный интеллект',
      slug: 'artificial-intelligence',
    },
  });

  const catNews = await prisma.category.upsert({
    where: { slug: 'news' },
    update: {},
    create: {
      name: 'Новости платформы',
      slug: 'news',
    },
  });

  console.log('Categories seeded:', [catWeb.name, catAI.name, catNews.name]);

  // 3. Create Tags
  const tagNest = await prisma.tag.upsert({
    where: { slug: 'nestjs' },
    update: {},
    create: { name: 'NestJS', slug: 'nestjs' },
  });

  const tagAngular = await prisma.tag.upsert({
    where: { slug: 'angular' },
    update: {},
    create: { name: 'Angular', slug: 'angular' },
  });

  const tagTypeScript = await prisma.tag.upsert({
    where: { slug: 'typescript' },
    update: {},
    create: { name: 'TypeScript', slug: 'typescript' },
  });

  const tagAI = await prisma.tag.upsert({
    where: { slug: 'ai' },
    update: {},
    create: { name: 'AI', slug: 'ai' },
  });

  console.log('Tags seeded:', [tagNest.name, tagAngular.name, tagTypeScript.name, tagAI.name]);

  // 4. Create Posts
  const postsData = [
    {
      title: 'Введение в NestJS: Создание масштабируемых бэкендов',
      slug: 'introduction-to-nestjs',
      summary: 'Узнайте основы NestJS, его архитектуру и преимущества использования в современных веб-приложениях.',
      content: `# Введение в NestJS

NestJS — это прогрессивный Node.js фреймворк для создания эффективных, надежных и масштабируемых серверных приложений.

## Почему NestJS?

1. **Архитектура**: Основана на Angular, что упрощает переиспользование паттернов проектирования.
2. **TypeScript**: Полная поддержка TypeScript из коробки.
3. **Модульность**: Простая группировка связанных компонентов.

### Пример контроллера:
\`\`\`typescript
@Controller('users')
export class UsersController {
  @Get()
  findAll(): string {
    return 'Этот эндпоинт возвращает всех пользователей';
  }
}
\`\`\`
`,
      published: true,
      categoryId: catWeb.id,
      authorId: teacher.id,
      tags: {
        connect: [{ id: tagNest.id }, { id: tagTypeScript.id }],
      },
    },
    {
      title: 'Angular 19: Будущее веб-разработки уже здесь',
      slug: 'angular-19-future-of-web-dev',
      summary: 'Обзор ключевых нововведений в Angular 19, включая новые возможности сигналов, улучшенную производительность и zoneless change detection.',
      content: `# Нововведения Angular 19

Angular продолжает развиваться быстрыми темпами, привнося революционные улучшения в экосистему фронтенда.

## Главные фичи:

- **Zoneless приложения**: Избавьтесь от zone.js для ускорения рендеринга.
- **Новый синтаксис Signals**: Улучшенная реактивность и простота реактивного программирования.
- **Встроенный контроль потока шаблонов**: Использование операторов \`@if\`, \`@for\` вместо директив.

### Пример использования Signals:
\`\`\`typescript
import { signal, computed } from '@angular/core';

const count = signal(0);
const doubleCount = computed(() => count() * 2);

console.log(doubleCount()); // 0
count.set(5);
console.log(doubleCount()); // 10
\`\`\`
`,
      published: true,
      categoryId: catWeb.id,
      authorId: admin.id,
      tags: {
        connect: [{ id: tagAngular.id }, { id: tagTypeScript.id }],
      },
    },
    {
      title: 'Запуск новой платформы дистанционного обучения',
      slug: 'lms-platform-launch',
      summary: 'Официальный запуск обновленной LMS платформы на базе NestJS и Angular. Инструкция по началу работы для студентов.',
      content: `# Мы запустились!

Мы рады представить вам нашу новую интерактивную платформу для обучения программированию и технологиям.

## Что вас ждет:
* **Курсы** от ведущих экспертов отрасли.
* **Интерактивные тесты** для проверки знаний.
* **Индивидуальный чат** с преподавателями.
* **Личный кабинет** с отслеживанием прогресса.

Регистрируйтесь прямо сейчас и приступайте к обучению!
`,
      published: true,
      categoryId: catNews.id,
      authorId: admin.id,
      tags: {
        connect: [{ id: tagAngular.id }],
      },
    },
  ];

  for (const postInfo of postsData) {
    const { tags, ...rest } = postInfo;
    await prisma.post.upsert({
      where: { slug: rest.slug },
      update: {},
      create: {
        ...rest,
        tags,
      },
    });
  }

  console.log('Posts seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
