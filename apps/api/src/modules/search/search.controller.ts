import { Controller, Get, Query } from '@nestjs/common'
import { AuthUser, CurrentUser } from '../auth/current-user.decorator'
import { SearchQueryDto } from './dto/search.dto'
import { SearchService } from './search.service'

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  people(@CurrentUser() user: AuthUser, @Query() q: SearchQueryDto) {
    return this.search.people(user.id, q.q, q.limit, q.cursor)
  }
}
