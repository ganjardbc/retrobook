import { IsBoolean, IsOptional } from 'class-validator'

export class UpdateAdminSettingsDto {
  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean

  @IsOptional()
  @IsBoolean()
  registrationOpen?: boolean
}
