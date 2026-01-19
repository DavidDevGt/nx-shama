import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { QuotationItem } from './quotation-item.entity';
import { QuotationStatus } from '@nx-shama/contracts';

export interface LineItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  productName?: string;
}

@Entity({ schema: 'sales' })
export class Quotation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  customerId: string;

  @Column({
    type: 'enum',
    enum: QuotationStatus,
    default: QuotationStatus.DRAFT,
  })
  status: QuotationStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'jsonb', nullable: true })
  lineItems: LineItem[]; // Snapshot when SOLD

  @Column({ type: 'jsonb', nullable: true })
  eventStream: any[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'uuid' })
  createdBy: string;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt: Date;

  @Column({ type: 'int', default: 1 })
  version: number;

  @OneToMany(() => QuotationItem, item => item.quotation)
  items: QuotationItem[];

  // Domain methods
  approve(): void {
    if (this.status !== QuotationStatus.PENDING) {
      throw new Error('Solo cotizaciones PENDING pueden aprobarse');
    }

    this.status = QuotationStatus.SOLD;
    this.lineItems = this.freezePrices();
    this.updatedAt = new Date();

    // Event sourcing lite
    this.addEvent({
      event: 'QuotationApproved',
      timestamp: new Date(),
      data: { totalAmount: this.totalAmount }
    });
  }

  private freezePrices(): LineItem[] {
    // This would be called with current prices from inventory
    return this.lineItems?.map(item => ({
      ...item,
      priceSnapshot: true
    })) || [];
  }

  private addEvent(event: any): void {
    if (!this.eventStream) {
      this.eventStream = [];
    }
    this.eventStream.push(event);
  }
}