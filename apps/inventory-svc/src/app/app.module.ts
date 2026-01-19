import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductEntity } from './product.entity';
import { ProductsController } from './infrastructure/controllers/products.controller';
import { ProductRepositoryAdapter } from './infrastructure/repositories/product-repository.adapter';
import { CreateProductHandler } from './application/handlers/create-product.handler';
import { UpdateStockHandler } from './application/handlers/update-stock.handler';
import { GetProductsHandler } from './application/handlers/get-products.handler';
import { QuotationApprovedHandler } from './quotation-approved.handler';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: 'shama_user',
      password: process.env.DB_PASSWORD,
      database: 'shama_platform',
      schema: 'inventory',
      entities: [ProductEntity],
      synchronize: true, // For development
    }),
    TypeOrmModule.forFeature([ProductEntity]),
    CqrsModule,
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
  controllers: [AppController, ProductsController],
  providers: [
    AppService,
    {
      provide: 'ProductRepositoryPort',
      useClass: ProductRepositoryAdapter,
    },
    CreateProductHandler,
    UpdateStockHandler,
    GetProductsHandler,
    QuotationApprovedHandler,
  ],
})
export class AppModule {}
