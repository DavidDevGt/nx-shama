import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateQuotationCommand } from '../commands/create-quotation.command';
import { Quotation } from '../quotation.entity';
import { QuotationItem } from '../quotation-item.entity';
import { QuotationStatus } from '@nx-shama/contracts';
import { InventoryClient } from '../inventory.client';

@CommandHandler(CreateQuotationCommand)
export class CreateQuotationHandler implements ICommandHandler<CreateQuotationCommand> {
  constructor(
    @InjectRepository(Quotation)
    private readonly quotationRepository: Repository<Quotation>,
    @InjectRepository(QuotationItem)
    private readonly itemRepository: Repository<QuotationItem>,
    private readonly publisher: EventPublisher,
    private readonly inventoryClient: InventoryClient,
  ) {}

  async execute(command: CreateQuotationCommand): Promise<string> {
    const { dto, userId } = command;

    // Get product information from inventory
    const productIds = dto.items.map(item => item.productId);
    const products = await this.inventoryClient.getProducts(productIds);
    const productMap = new Map(products.map(p => [p.id, p]));

    // Create quotation
    const quotation = this.quotationRepository.create({
      customerId: dto.customerId,
      status: QuotationStatus.DRAFT,
      totalAmount: 0, // Will be calculated
      createdBy: userId,
      eventStream: [{ event: 'Created', ts: new Date() }],
    });

    const savedQuotation = await this.quotationRepository.save(quotation);

    // Create items with real prices
    let total = 0;
    const lineItems = [];
    for (const item of dto.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      const quotationItem = this.itemRepository.create({
        quotationId: savedQuotation.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
      });
      await this.itemRepository.save(quotationItem);

      total += item.quantity * product.price;
      lineItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
        productName: product.name,
      });
    }

    // Update quotation with total and line items
    savedQuotation.totalAmount = total;
    savedQuotation.lineItems = lineItems;
    await this.quotationRepository.save(savedQuotation);

    return savedQuotation.id;
  }
}