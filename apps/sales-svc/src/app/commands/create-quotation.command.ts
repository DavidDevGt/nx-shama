import { CreateQuotationDto } from '@nx-shama/contracts';

export class CreateQuotationCommand {
  constructor(public readonly dto: CreateQuotationDto, public readonly userId: string) {}
}