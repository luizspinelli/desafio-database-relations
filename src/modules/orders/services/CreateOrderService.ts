import { inject, injectable } from 'tsyringe';
import { isUuid } from 'uuidv4';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({
    customer_id,
    products,
  }: IRequest): Promise<Order | void> {
    if (!isUuid(customer_id)) {
      throw new AppError('Customer needs to be valid');
    }

    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer needs to be valid');
    }

    const productsFound = await this.productsRepository.findAllById(products);

    if (!productsFound.length) {
      throw new AppError('Invalid product');
    }

    const productsOrder = productsFound.map(productFound => {
      const foundProduct = products.find(
        product => product.id === productFound.id,
      );

      if (!foundProduct) {
        throw new AppError('Product not found');
      }

      if (foundProduct.quantity > productFound.quantity) {
        throw new AppError('Insufficient quantity');
      }

      return {
        product_id: productFound.id,
        price: productFound.price,
        quantity: foundProduct?.quantity || 0,
      };
    });

    await this.productsRepository.updateQuantity(products);

    const order = await this.ordersRepository.create({
      customer,
      products: productsOrder,
    });

    return order;
  }
}

export default CreateOrderService;
