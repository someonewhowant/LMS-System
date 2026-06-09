import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { BlogService } from './blog.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { GetPostsQueryDto } from './dto/get-posts-query.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@Controller('blog')
@UseGuards(RolesGuard)
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post('upload')
  @Roles('ADMIN', 'TEACHER')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './uploads';
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new Error('Разрешены только изображения!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadFile(@UploadedFile() file: any) {
    return {
      url: `/uploads/${file.filename}`,
    };
  }

  @Post()
  @Roles('ADMIN', 'TEACHER')
  create(@CurrentUser() user: any, @Body() createPostDto: CreatePostDto) {
    return this.blogService.create(user.sub, createPostDto);
  }

  @Public()
  @Get()
  findAll(@Query() query: GetPostsQueryDto) {
    return this.blogService.findAll(query);
  }

  @Public()
  @Get('categories')
  getCategories() {
    return this.blogService.getCategories();
  }

  @Post('categories')
  @Roles('ADMIN')
  createCategory(@Body('name') name: string) {
    return this.blogService.createCategory(name);
  }

  @Public()
  @Get('tags')
  getTags() {
    return this.blogService.getTags();
  }

  @Public()
  @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.blogService.findOne(idOrSlug);
  }

  @Patch(':id')
  @Roles('ADMIN', 'TEACHER')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePostDto: UpdatePostDto,
    @CurrentUser() user: any,
  ) {
    return this.blogService.update(id, updatePostDto, user);
  }

  @Delete(':id')
  @Roles('ADMIN', 'TEACHER')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.blogService.remove(id, user);
  }
}
