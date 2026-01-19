import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface ProductInfo {
  id: string;
  name: string;
  price: number;
}

@Injectable()
export class InventoryClient {
  constructor(private readonly httpService: HttpService) {}

  async getProduct(productId: string): Promise<ProductInfo> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${process.env.INVENTORY_URL}/api/v1/products/${productId}`)
      );
      return response.data;
    } catch (error) {
      throw new Error(`Product ${productId} not found`);
    }
  }

  async getProducts(productIds: string[]): Promise<ProductInfo[]> {
    const promises = productIds.map(id => this.getProduct(id));
    return Promise.all(promises);
  }
}