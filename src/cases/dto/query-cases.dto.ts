import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CaseStatus } from './update-status.dto';

export enum CasePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export class QueryCasesDto {
  // Pagination
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  // Filters
  @IsOptional()
  @IsEnum(CaseStatus, {
    message: 'Status must be one of: NEW, REVIEWING, CONTACTED, CLOSED',
  })
  status?: CaseStatus;

  @IsOptional()
  @IsEnum(CasePriority, {
    message: 'Priority must be one of: LOW, MEDIUM, HIGH',
  })
  priority?: CasePriority;

  @IsOptional()
  @IsString()
  caseType?: string;

  // Search
  @IsOptional()
  @IsString()
  search?: string;
}
