import { Injectable } from '@angular/core';
import { ApiService } from '../core/api.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CartApiService extends ApiService {
  getCart(): Observable<any> {
    if (!this.endpointEnabled('cart')) {
      console.warn('Cart endpoint is disabled. Check your environment config.');
      return new Observable<any>((observer) => {
        observer.next({ data: { cart: { items: [] } } });
        observer.complete();
      });
    }
    const url = this.getUrl('cart', 'api/profile/cart');
    return this.http.get(url);
  }

  updateCart(cart: { items: any[] }): Observable<any> {
    if (!this.endpointEnabled('cart')) {
      console.warn('Cart endpoint is disabled. Update aborted.');
      return new Observable<any>((observer) => observer.complete());
    }
    const url = this.getUrl('cart', 'api/profile/cart');
    return this.http.put(url, cart);
  }

  clearCart(): Observable<any> {
    if (!this.endpointEnabled('cart')) {
      console.warn('Cart endpoint is disabled. Clear aborted.');
      return new Observable<any>((observer) => observer.complete());
    }
    const url = this.getUrl('cart', 'api/profile/cart');
    return this.http.delete(url);
  }

  checkout(payload: any): Observable<any> {
    if (!this.endpointEnabled('cart')) {
      console.warn('Cart endpoint is disabled. Checkout aborted.');
      return new Observable<any>((observer) => observer.complete());
    }
    const url = this.getUrl('cart', 'api/profile/cart/checkout');
    return this.http.post(url, payload);
  }
}
