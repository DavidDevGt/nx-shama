export class ApproveQuotationCommand {
  constructor(public readonly quotationId: string, public readonly userId: string) {}
}