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
import { PokeDto } from './dto/pokes.dto'
import { PokesService } from './pokes.service'

@Controller('pokes')
export class PokesController {
  constructor(private readonly pokes: PokesService) {}

  @Post()
  @HttpCode(200)
  poke(@CurrentUser() user: AuthUser, @Body() dto: PokeDto) {
    return this.pokes.poke(user.id, dto.userId)
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: CursorQueryDto) {
    return this.pokes.list(user.id, q.limit, q.cursor)
  }

  @Delete(':userId')
  @HttpCode(204)
  async dismiss(@CurrentUser() user: AuthUser, @Param('userId', ParseIntPipe) userId: number) {
    await this.pokes.dismiss(user.id, userId)
  }
}
