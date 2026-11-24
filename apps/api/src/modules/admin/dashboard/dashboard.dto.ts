import { Transform, Type } from 'class-transformer'
import { IsInt, Max, Min } from 'class-validator'

export class DashboardSeriesQuery {
  @Transform(({ value }) => (value === undefined ? 14 : value))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days = 14
}
