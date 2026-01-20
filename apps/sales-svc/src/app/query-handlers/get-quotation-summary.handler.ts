import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetQuotationSummaryQuery } from '../queries/get-quotation-summary.query';
import { Quotation } from '../quotation.entity';
import { QuotationSummaryDto } from '@nx-shama/contracts';

@QueryHandler(GetQuotationSummaryQuery)
export class GetQuotationSummaryHandler implements IQueryHandler<GetQuotationSummaryQuery> {
  constructor(
    @InjectRepository(Quotation)
    private readonly quotationRepository: Repository<Quotation>,
  ) {}

  async execute(query: GetQuotationSummaryQuery): Promise<QuotationSummaryDto[]> {
    const qb = this.quotationRepository
      .createQueryBuilder('q')
      .leftJoin('crm.customers', 'c', 'q.customer_id = c.id')
      .leftJoin('sales.quotation_items', 'qi', 'q.id = qi.quotation_id')
      .select([
        'q.id',
        'q.status',
        'q.total_amount as totalAmount',
        'c.name as customerName',
        'COUNT(qi.id) as itemCount',
        'q.created_at as createdAt',
      ])
      .groupBy('q.id, c.name')
      .orderBy('q.created_at', 'DESC');

    if (query.limit) {
      qb.limit(query.limit);
    }

    if (query.offset) {
      qb.offset(query.offset);
    }

    // Apply filters
    if (query.filters.status) {
      qb.andWhere('q.status = :status', { status: query.filters.status });
    }

    if (query.filters.customerName) {
      qb.andWhere('c.name ILIKE :customerName', { customerName: `%${query.filters.customerName}%` });
    }

    if (query.filters.minAmount) {
      qb.andWhere('q.total_amount >= :minAmount', { minAmount: query.filters.minAmount });
    }

    if (query.filters.maxAmount) {
      qb.andWhere('q.total_amount <= :maxAmount', { maxAmount: query.filters.maxAmount });
    }

    if (query.filters.dateFrom) {
      qb.andWhere('q.created_at >= :dateFrom', { dateFrom: query.filters.dateFrom });
    }

    if (query.filters.dateTo) {
      qb.andWhere('q.created_at <= :dateTo', { dateTo: query.filters.dateTo });
    }

    const results = await qb.getRawMany();

    return results.map(row => ({
      id: row.id,
      customerName: row.customername,
      status: row.status,
      totalAmount: parseFloat(row.totalamount),
      itemCount: parseInt(row.itemcount),
      createdAt: row.createdat,
    }));
  }
}