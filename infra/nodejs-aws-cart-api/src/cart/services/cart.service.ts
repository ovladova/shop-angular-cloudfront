import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartEntity } from '../entities/cart.entity';
import { CartItemEntity } from '../entities/cart-item.entity';
import { CartStatuses, Cart, CartItem, Product } from '../models';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartEntity)
    private readonly cartRepo: Repository<CartEntity>,
    @InjectRepository(CartItemEntity)
    private readonly cartItemRepo: Repository<CartItemEntity>,
  ) {}

  async findByUserId(userId: string): Promise<Cart | null> {
    const cartEntity = await this.cartRepo.findOne({
      where: { user_id: userId, status: CartStatuses.OPEN },
      relations: ['items'],
    });
    if (!cartEntity) return null;
    return this.toCartDomain(cartEntity);
  }

  async createByUserId(userId: string): Promise<Cart> {
    const newCart = this.cartRepo.create({
      user_id: userId,
      status: CartStatuses.OPEN,
    });
    const saved = await this.cartRepo.save(newCart);
    const cartEntity = await this.cartRepo.findOne({ where: { id: saved.id }, relations: ['items']});

    if (!cartEntity) {
      throw new Error('Cart entity not found after creation');
    }

    return this.toCartDomain(cartEntity);
  }

  async findOrCreateByUserId(userId: string): Promise<Cart> {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;
    return this.createByUserId(userId);
  }

  async updateByUserId(userId: string, updatedCart: Cart): Promise<Cart> {
    const cartEntity = await this.cartRepo.findOne({
      where: { user_id: userId, status: CartStatuses.OPEN },
      relations: ['items'],
    });

    if (!cartEntity) {
      return this.createByUserId(userId);
    }

    await this.cartItemRepo.remove(cartEntity.items);

    const newItems = updatedCart.items.map((item) => {
      return this.cartItemRepo.create({
        product_id: parseInt(item.product.id, 10),
        count: item.count,
        cart: cartEntity,
      });
    });

    await this.cartItemRepo.save(newItems);

    const refreshed = await this.cartRepo.findOne({ where: { id: cartEntity.id }, relations: ['items']});

    if (!refreshed) {
      throw new Error('Cart not found after refresh');
    }

    return this.toCartDomain(refreshed);
  }

  async removeByUserId(userId: string): Promise<void> {
    const cartEntity = await this.cartRepo.findOne({ where: { user_id: userId, status: CartStatuses.OPEN }, relations: ['items']});
    if (cartEntity) {
      await this.cartItemRepo.remove(cartEntity.items);
      await this.cartRepo.remove(cartEntity);
    }
  }

  private toCartDomain(entity: CartEntity): Cart {
    return {
      id: String(entity.id),
      user_id: entity.user_id,
      created_at: entity.created_at.toISOString(),
      updated_at: entity.updated_at.toISOString(),
      status: entity.status,
      items: entity.items.map(i => this.toCartItemDomain(i)),
    };
  }

  private toCartItemDomain(entity: CartItemEntity): CartItem {
    const product: Product = {
      id: String(entity.product_id),
      title: `Product ${entity.product_id}`,
      description: `Description for product ${entity.product_id}`,
      price: 10,
    };

    return {
      product,
      count: entity.count,
    };
  }
}
