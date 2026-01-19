import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApproveQuotationCommand } from '../commands/approve-quotation.command';
import { Quotation } from '../quotation.entity';
import { QuotationStatus, QuotationApprovedEvent, QuotationApprovedLineItem } from '@nx-shama/contracts';

@CommandHandler(ApproveQuotationCommand)
export class ApproveQuotationHandler implements ICommandHandler<ApproveQuotationCommand> {
  constructor(
    @InjectRepository(Quotation)
    private readonly quotationRepository: Repository<Quotation>,
    @Inject('NATS_CLIENT') private natsClient: ClientProxy,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: ApproveQuotationCommand): Promise<void> {
    const { quotationId, userId } = command;

    const quotation = await this.quotationRepository.findOne({
      where: { id: quotationId },
      relations: ['items'],
    });

    if (!quotation) {
      throw new Error('Quotation not found');
    }

    // Use domain method
    quotation.approve();

    // Load line items from items if not set
    if (!quotation.lineItems) {
      quotation.lineItems = quotation.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }));
    }

    await this.quotationRepository.save(quotation);

    // Publish event
    const lineItems = quotation.lineItems.map(item =>
      new QuotationApprovedLineItem(item.productId, item.quantity, item.unitPrice)
    );
    const event = new QuotationApprovedEvent(
      quotationId,
      quotation.totalAmount,
      Date.now(),
      lineItems,
    );

    await this.natsClient.emit('quotation.approved', event).toPromise();
  }
}