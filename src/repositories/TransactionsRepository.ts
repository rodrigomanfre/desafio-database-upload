import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    const totalInCome = transactions
      .filter(transaction => transaction.type === 'income')
      .reduce((acumulador, transaction) => acumulador + transaction.value, 0);

    const totalOutCome = transactions
      .filter(transaction => transaction.type === 'outcome')
      .reduce((acumulador, transaction) => acumulador + transaction.value, 0);

    const balance: Balance = {
      income: totalInCome,
      outcome: totalOutCome,
      total: totalInCome - totalOutCome,
    };

    return balance;
  }
}

export default TransactionsRepository;
