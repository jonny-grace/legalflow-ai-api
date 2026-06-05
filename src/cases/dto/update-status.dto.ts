import { IsEnum, IsNotEmpty } from 'class-validator';

export enum CaseStatus {
  NEW = 'NEW',
  REVIEWING = 'REVIEWING',
  CONTACTED = 'CONTACTED',
  CLOSED = 'CLOSED',
}

export class UpdateStatusDto {
  @IsEnum(CaseStatus, {
    message: 'Status must be one of: NEW, REVIEWING, CONTACTED, CLOSED',
  })
  @IsNotEmpty({ message: 'Status is required' })
  status: CaseStatus;
}
