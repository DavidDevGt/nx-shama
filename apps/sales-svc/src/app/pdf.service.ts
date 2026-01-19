import { Injectable } from '@nestjs/common';
import * as PdfMake from 'pdfmake/build/pdfmake';
import * as PdfFonts from 'pdfmake/build/vfs_fonts';

@Injectable()
export class PdfService {
  constructor() {
    // Register fonts
    PdfMake.vfs = PdfFonts.pdfMake.vfs;
  }

  async generateQuotationPdf(quotation: any, customer: any): Promise<Buffer> {
    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      header: {
        text: 'FERRETERÍA SHAMA',
        style: 'header',
        alignment: 'center',
        margin: [0, 20, 0, 10],
      },
      footer: (currentPage: number, pageCount: number) => ({
        text: `Página ${currentPage} de ${pageCount}`,
        alignment: 'center',
        margin: [0, 20, 0, 0],
      }),
      content: [
        {
          text: 'COTIZACIÓN',
          style: 'title',
          alignment: 'center',
          margin: [0, 0, 0, 20],
        },
        {
          columns: [
            {
              text: [
                { text: 'Cliente: ', bold: true },
                customer.name + '\n',
                { text: 'NIT: ', bold: true },
                customer.nit + '\n',
                { text: 'Dirección: ', bold: true },
                customer.address + '\n',
                { text: 'Email: ', bold: true },
                customer.email,
              ],
            },
            {
              text: [
                { text: 'Fecha: ', bold: true },
                new Date(quotation.createdAt).toLocaleDateString('es-GT') + '\n',
                { text: 'Cotización #: ', bold: true },
                quotation.id + '\n',
                { text: 'Estado: ', bold: true },
                quotation.status,
              ],
              alignment: 'right',
            },
          ],
          margin: [0, 0, 0, 20],
        },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'Producto', style: 'tableHeader' },
                { text: 'Cantidad', style: 'tableHeader' },
                { text: 'Precio Unit.', style: 'tableHeader' },
                { text: 'Total', style: 'tableHeader' },
              ],
              ...quotation.lineItems.map((item: any) => [
                item.productName || 'Producto',
                item.quantity.toString(),
                `Q${item.unitPrice.toFixed(2)}`,
                `Q${(item.quantity * item.unitPrice).toFixed(2)}`,
              ]),
            ],
          },
          margin: [0, 0, 0, 20],
        },
        {
          text: `Total: Q${quotation.totalAmount.toFixed(2)}`,
          style: 'total',
          alignment: 'right',
          margin: [0, 0, 0, 20],
        },
        {
          text: 'Esta cotización es válida por 30 días.',
          style: 'footerText',
          alignment: 'center',
        },
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          color: '#f0c800',
        },
        title: {
          fontSize: 16,
          bold: true,
          color: '#2E2725',
        },
        tableHeader: {
          bold: true,
          fillColor: '#f0c800',
          color: '#2E2725',
        },
        total: {
          fontSize: 14,
          bold: true,
          color: '#f0c800',
        },
        footerText: {
          fontSize: 10,
          italics: true,
        },
      },
    };

    return new Promise((resolve, reject) => {
      const pdfDoc = PdfMake.createPdf(docDefinition);
      pdfDoc.getBuffer((buffer: Buffer) => {
        resolve(buffer);
      });
    });
  }
}