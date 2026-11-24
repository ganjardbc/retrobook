import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import type { Request } from 'express'
import { AuthUser, CurrentUser } from '../../auth/current-user.decorator'
import { Roles } from '../roles.decorator'
import { RolesGuard } from '../roles.guard'
import { AdminModerationService } from './admin-moderation.service'
import { AdminModerationQuery, BulkModerationDto, SetModerationHiddenDto } from './admin-moderation.dto'

@Controller('admin')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminModerationController {
  constructor(private readonly moderation: AdminModerationService) {}

  @Get('posts')
  posts(@Query() query: AdminModerationQuery) { return this.moderation.listPosts(query) }

  @Patch('posts/:id')
  setPostHidden(@CurrentUser() admin: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: SetModerationHiddenDto, @Req() request: Request) {
    return this.moderation.setPostHidden(admin.id, id, dto.hidden, request.ip)
  }

  @Delete('posts/:id')
  deletePost(@CurrentUser() admin: AuthUser, @Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    return this.moderation.deletePost(admin.id, id, request.ip)
  }

  @Post('posts/bulk')
  bulkPosts(@CurrentUser() admin: AuthUser, @Body() dto: BulkModerationDto, @Req() request: Request) {
    return this.moderation.bulkPosts(admin.id, dto.ids, dto.action, dto.reason, request.ip)
  }

  @Get('comments')
  comments(@Query() query: AdminModerationQuery) { return this.moderation.listComments(query) }

  @Patch('comments/:id')
  setCommentHidden(@CurrentUser() admin: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: SetModerationHiddenDto, @Req() request: Request) {
    return this.moderation.setCommentHidden(admin.id, id, dto.hidden, request.ip)
  }

  @Delete('comments/:id')
  deleteComment(@CurrentUser() admin: AuthUser, @Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    return this.moderation.deleteComment(admin.id, id, request.ip)
  }

  @Post('comments/bulk')
  bulkComments(@CurrentUser() admin: AuthUser, @Body() dto: BulkModerationDto, @Req() request: Request) {
    return this.moderation.bulkComments(admin.id, dto.ids, dto.action, dto.reason, request.ip)
  }
}
