import { Controller, Get, Query } from '@nestjs/common'
import { AuthUser, CurrentUser } from '../auth/current-user.decorator'
import { PostsService } from '../posts/posts.service'
import { SearchQueryDto } from './dto/search.dto'
import { SearchService } from './search.service'

@Controller('search')
export class SearchController {
  constructor(
    private readonly search: SearchService,
    private readonly posts: PostsService,
  ) {}

  @Get()
  people(@CurrentUser() user: AuthUser, @Query() q: SearchQueryDto) {
    return this.search.people(user.id, q.q, q.limit, q.cursor)
  }

  @Get('posts')
  postsByContent(@CurrentUser() user: AuthUser, @Query() q: SearchQueryDto) {
    return this.posts.search(user.id, q.q, q.limit, q.cursor)
  }
}
