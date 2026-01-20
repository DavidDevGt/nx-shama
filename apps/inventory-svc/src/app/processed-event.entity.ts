import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({ schema: 'inventory' })
export class ProcessedEvent {
  @PrimaryColumn()
  eventId: string;

  @PrimaryColumn()
  eventType: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  processedAt: Date;
}