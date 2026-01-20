import { Controller } from '@nestjs/common';
import { EventPattern, Payload, Ctx } from '@nestjs/microservices';
import { NatsContext } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommandBus } from '@nestjs/cqrs';
import { QuotationApprovedEvent } from '@nx-shama/contracts';
import { UpdateStockCommand } from './application/commands/update-stock.command';
import { ProcessedEvent } from './processed-event.entity';

@Controller()
export class QuotationApprovedHandler {
  constructor(
    private readonly commandBus: CommandBus,
    @InjectRepository(ProcessedEvent)
    private readonly processedEventRepository: Repository<ProcessedEvent>,
  ) {}

  @EventPattern('quotation.approved')
  async handleQuotationApproved(@Payload() event: QuotationApprovedEvent) {
    const eventId = event.quotationId;
    const eventType = 'quotation.approved';

    // Check if already processed
    const existing = await this.processedEventRepository.findOne({
      where: { eventId, eventType },
    });

    if (existing) {
      console.log(`Event ${eventId} already processed, skipping`);
      return;
    }

    try {
      // Reduce stock for each line item
      for (const item of event.lineItems) {
        await this.commandBus.execute(new UpdateStockCommand(item.productId, -item.quantity));
      }

      // Mark as processed
      await this.processedEventRepository.save({
        eventId,
        eventType,
      });
    } catch (error) {
      console.error(`Failed to process event ${eventId}:`, error);
      throw error; // Re-throw to let NATS handle retry
    }
  }
}