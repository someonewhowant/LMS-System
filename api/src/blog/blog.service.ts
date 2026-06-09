import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { GetPostsQueryDto } from './dto/get-posts-query.dto';
import { slugify } from '../common/utils/slugify';

@Injectable()
export class BlogService {
  constructor(private prisma: PrismaService) { }

  async create(authorId: number, createPostDto: CreatePostDto) {
    const { tags, categoryId, ...data } = createPostDto;

    const baseSlug = slugify(createPostDto.title);
    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    const slug = `${baseSlug}-${uniqueSuffix}`;

    const postData: any = {
      ...data,
      slug,
      author: { connect: { id: authorId } },
    };

    if (categoryId) {
      postData.category = { connect: { id: categoryId } };
    }

    if (tags && tags.length > 0) {
      postData.tags = {
        connectOrCreate: tags.map((tag) => ({
          where: { name: tag },
          create: { name: tag, slug: slugify(tag) },
        })),
      };
    }

    return this.prisma.post.create({
      data: postData,
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
        category: true,
        tags: true,
      },
    });
  }

  async findAll(query: GetPostsQueryDto) {
    const { page = 1, limit = 10, search, category, tag, publishedOnly = true } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (publishedOnly) {
      where.published = true;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { summary: { contains: search } },
      ];
    }

    if (category) {
      where.category = {
        slug: category,
      };
    }

    if (tag) {
      where.tags = {
        some: {
          slug: tag,
        },
      };
    }

    const [total, posts] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        skip,
        take: limit,
        include: {
          author: {
            select: { id: true, name: true, email: true, role: true },
          },
          category: true,
          tags: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: posts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(idOrSlug: string) {
    const id = parseInt(idOrSlug, 10);
    const where = isNaN(id) ? { slug: idOrSlug } : { id };

    const post = await this.prisma.post.findFirst({
      where,
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
        category: true,
        tags: true,
      },
    });

    if (!post) {
      throw new NotFoundException(`Пост не найден`);
    }

    return post;
  }

  async update(id: number, updatePostDto: UpdatePostDto, user: { sub: number; role: string }) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Пост не найден`);
    }

    if (user.role === 'TEACHER' && post.authorId !== user.sub) {
      throw new ForbiddenException('Вы можете редактировать только собственные посты');
    }

    const { tags, categoryId, ...data } = updatePostDto;
    const updateData: any = { ...data };

    if (categoryId !== undefined) {
      updateData.category = categoryId ? { connect: { id: categoryId } } : { disconnect: true };
    }

    if (tags) {
      updateData.tags = {
        set: [],
        connectOrCreate: tags.map((tag) => ({
          where: { name: tag },
          create: { name: tag, slug: slugify(tag) },
        })),
      };
    }

    return this.prisma.post.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
        category: true,
        tags: true,
      },
    });
  }

  async remove(id: number, user: { sub: number; role: string }) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Пост не найден`);
    }

    if (user.role === 'TEACHER' && post.authorId !== user.sub) {
      throw new ForbiddenException('Вы можете удалять только собственные посты');
    }

    return this.prisma.post.delete({ where: { id } });
  }

  async getCategories() {
    return this.prisma.category.findMany();
  }

  async createCategory(name: string) {
    const slug = slugify(name);
    return this.prisma.category.create({
      data: { name, slug },
    });
  }

  async getTags() {
    return this.prisma.tag.findMany();
  }
}
