import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { TerminusModule } from '@nestjs/terminus';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CustomerEntity } from './customer.entity';
import { CustomersController } from './infrastructure/controllers/customers.controller';
import { CustomerRepositoryAdapter } from './infrastructure/repositories/customer-repository.adapter';
import { CreateCustomerHandler } from './application/handlers/create-customer.handler';
import { GetCustomersHandler } from './application/handlers/get-customers.handler';
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
      schema: 'crm',
      entities: [CustomerEntity],
      synchronize: true, // For development
    }),
    TypeOrmModule.forFeature([CustomerEntity]),
    CqrsModule,
    TerminusModule,
  ],
  controllers: [AppController, CustomersController, HealthController],
  providers: [
    AppService,
    {
      provide: 'CustomerRepositoryPort',
      useClass: CustomerRepositoryAdapter,
    },
    CreateCustomerHandler,
    GetCustomersHandler,
  ],
})
export class AppModule {}
