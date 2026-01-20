import { Controller } from '@nestjs/common';
import { EventPattern, Payload, Ctx } from '@nestjs/microservices';
import { NatsContext } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuotationApprovedEvent } from '@nx-shama/contracts';
import { ProductsService } from './products.service';
import { ProcessedEvent } from './processed-event.entity';

@Controller()
export class QuotationApprovedHandler {
  constructor(
    private readonly productsService: ProductsService,
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
        await this.productsService.updateStock(item.productId, {
          adjustment: -item.quantity,
          reason: 'Sale',
        });
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