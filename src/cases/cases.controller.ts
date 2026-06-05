import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { QueryCasesDto } from './dto/query-cases.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, Role } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';

@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  // ── POST /api/cases ────────────────────────────────────────
  // PUBLIC - No authentication required
  // Client submits their intake form
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCaseDto) {
    return this.casesService.create(dto);
  }

  // ── GET /api/cases ─────────────────────────────────────────
  // PROTECTED - Requires JWT
  // Staff views case list with optional filters
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.REVIEWER)
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: QueryCasesDto) {
    return this.casesService.findAll(query);
  }

  // ── GET /api/cases/:id ─────────────────────────────────────
  // PROTECTED - Requires JWT
  // Staff views full case detail with AI analysis and audit logs
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.REVIEWER)
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.casesService.findOne(id);
  }

  // ── PATCH /api/cases/:id/status ────────────────────────────
  // PROTECTED - Requires JWT
  // Staff updates case status
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.REVIEWER)
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.casesService.updateStatus(id, dto, user.sub);
  }
}
