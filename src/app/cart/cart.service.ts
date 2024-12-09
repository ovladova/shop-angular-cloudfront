import { Injectable, signal } from '@angular/core';
import { computed } from '@angular/core';
import { CartApiService } from './cart-api.service';

interface CartItemData {
  product: { id: string; title?: string; price?: number; description?: string; };
  count: number;
}

interface CartResponse {
  data: {
    cart: {
      items: CartItemData[];
    }
  }
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  /** Key - product id, value - quantity */
  #cart = signal<Record<string, number>>({});
  cart = this.#cart.asReadonly();

  totalInCart = computed(() => {
    const values = Object.values(this.cart());
    return values.reduce((acc, val) => acc + val, 0);
  });

  constructor(private cartApi: CartApiService) {
    this.loadCart();
  }

  private loadCart(): void {
    this.cartApi.getCart().subscribe((response: CartResponse) => {
      const serverCart = response?.data?.cart?.items || [];
      const cartFromServer: Record<string, number> = {};
      for (const item of serverCart) {
        cartFromServer[item.product.id] = item.count;
      }
      this.#cart.set(cartFromServer);
    });
  }

  addItem(productId: string): void {
    const updatedCart = { ...this.cart() };
    updatedCart[productId] = (updatedCart[productId] || 0) + 1;
    this.syncWithServer(updatedCart);
  }

  removeItem(productId: string): void {
    const updatedCart = { ...this.cart() };
    if (!updatedCart[productId]) return;
    updatedCart[productId]--;
    if (updatedCart[productId] <= 0) {
      delete updatedCart[productId];
    }
    this.syncWithServer(updatedCart);
  }

  empty(): void {
    this.cartApi.clearCart().subscribe(() => {
      this.#cart.set({});
    });
  }

  checkout(payload: any): void {
    this.cartApi.checkout(payload).subscribe(() => {
      // After checkout, assume cart is cleared on backend
      this.#cart.set({});
    });
  }

  private syncWithServer(newCart: Record<string, number>): void {
    const items = Object.entries(newCart).map(([id, count]) => ({
      product: { id, title: 'Temporary', description: '', price: 10 }, // Placeholder data
      count,
    }));

    this.cartApi.updateCart({ items }).subscribe((response: CartResponse) => {
      const updatedItems = response?.data?.cart?.items || [];
      const updatedFromServer: Record<string, number> = {};
      for (const item of updatedItems) {
        updatedFromServer[item.product.id] = item.count;
      }
      this.#cart.set(updatedFromServer);
    });
  }
}
