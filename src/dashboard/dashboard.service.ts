import { Injectable } from '@nestjs/common';
import { CasesService } from '../cases/cases.service';

@Injectable()
export class DashboardService {
  constructor(private readonly casesService: CasesService) {}

  async getMetrics() {
    return this.casesService.getMetrics();
  }
}
