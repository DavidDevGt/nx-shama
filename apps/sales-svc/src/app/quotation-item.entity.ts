import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Quotation } from './quotation.entity';

@Entity({ schema: 'sales', name: 'quotation_items' })
export class QuotationItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  quotationId: string;

  @Column('uuid')
  productId: string;

  @Column('int')
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitPriceSnapshot: number;

  @Column({ nullable: true })
  productName: string;

  @ManyToOne(() => Quotation, quotation => quotation.items)
  quotation: Quotation;
}