import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateQuotationCommand } from './commands/create-quotation.command';
import { ApproveQuotationCommand } from './commands/approve-quotation.command';
import { GetQuotationSummaryQuery } from './queries/get-quotation-summary.query';
import { CreateQuotationDto, QuotationSummaryDto } from '@nx-shama/contracts';
import { Quotation } from './quotation.entity';

@Injectable()
export class QuotationsService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @InjectRepository(Quotation)
    private readonly quotationRepository: Repository<Quotation>,
  ) {}

  async create(dto: CreateQuotationDto, userId: string): Promise<string> {
    return this.commandBus.execute(new CreateQuotationCommand(dto, userId));
  }

  async approve(id: string, userId: string): Promise<void> {
    return this.commandBus.execute(new ApproveQuotationCommand(id, userId));
  }

  async findAll(): Promise<QuotationSummaryDto[]> {
    return this.queryBus.execute(new GetQuotationSummaryQuery());
  }

  async findById(id: string): Promise<Quotation | null> {
    return this.quotationRepository.findOne({
      where: { id },
      relations: ['items'],
    });
  }
}