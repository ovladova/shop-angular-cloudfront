import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { CartEntity } from './cart.entity';

@Entity('cart_items')
export class CartItemEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: false })
  product_id: number;

  @Column({ type: 'int', default: 1 })
  count: number;

  @ManyToOne(() => CartEntity, (cart) => cart.items, { onDelete: 'CASCADE' })
  cart: CartEntity;
}
