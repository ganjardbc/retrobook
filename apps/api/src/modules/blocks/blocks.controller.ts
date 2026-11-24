import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common'
import { AuthUser, CurrentUser } from '../auth/current-user.decorator'
import { CursorQueryDto } from '../posts/dto/post.dto'
import { BlockUserDto } from './dto/block.dto'
import { BlocksService } from './blocks.service'

@Controller('blocks')
export class BlocksController {
  constructor(private readonly blocks: BlocksService) {}

  @Post()
  block(@CurrentUser() user: AuthUser, @Body() dto: BlockUserDto) {
    return this.blocks.block(user.id, dto.userId)
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: CursorQueryDto) {
    return this.blocks.list(user.id, q.limit, q.cursor)
  }

  @Delete(':userId')
  @HttpCode(204)
  async unblock(@CurrentUser() user: AuthUser, @Param('userId', ParseIntPipe) userId: number) {
    await this.blocks.unblock(user.id, userId)
  }
}
