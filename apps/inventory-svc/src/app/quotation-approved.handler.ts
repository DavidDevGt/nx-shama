import { Controller } from '@nestjs/common';
import { EventPattern, Payload, Ctx } from '@nestjs/microservices';
import { NatsContext } from '@nestjs/microservices';
import { QuotationApprovedEvent } from '@nx-shama/contracts';
import { ProductsService } from './products.service';

@Controller()
export class QuotationApprovedHandler {
  constructor(private readonly productsService: ProductsService) {}

  @EventPattern('quotation.approved')
  async handleQuotationApproved(@Payload() event: QuotationApprovedEvent) {
    // Reduce stock for each line item
    for (const item of event.lineItems) {
      await this.productsService.updateStock(item.productId, {
        adjustment: -item.quantity,
        reason: 'Sale',
      });
    }
  }
}