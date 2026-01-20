import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { TerminusModule } from '@nestjs/terminus';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Quotation } from './quotation.entity';
import { QuotationItem } from './quotation-item.entity';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';
import { PdfService } from './pdf.service';
import { InventoryClient } from './inventory.client';
import { CreateQuotationHandler } from './command-handlers/create-quotation.handler';
import { ApproveQuotationHandler } from './command-handlers/approve-quotation.handler';
import { GetQuotationSummaryHandler } from './query-handlers/get-quotation-summary.handler';
import { HealthController } from './health.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: 'shama_user',
      password: process.env.DB_PASSWORD,
      database: 'shama_platform',
      schema: 'sales',
      entities: [Quotation, QuotationItem],
      synchronize: false, // Use migrations in production
      migrations: ['dist/migrations/*.js'],
      migrationsRun: true,
    }),
    TypeOrmModule.forFeature([Quotation, QuotationItem]),
    CqrsModule,
    TerminusModule,
    ClientsModule.register([
      {
        name: 'NATS_CLIENT',
        transport: Transport.NATS,
        options: {
          servers: [process.env.NATS_URL || 'nats://localhost:4222'],
        },
      },
    ]),
  ],
  controllers: [AppController, QuotationsController, HealthController],
  providers: [
    AppService,
    QuotationsService,
    PdfService,
    InventoryClient,
    CreateQuotationHandler,
    ApproveQuotationHandler,
    GetQuotationSummaryHandler,
  ],
})
export class AppModule {}
