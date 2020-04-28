import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';
import { getConnection, getCustomRepository, getRepository } from 'typeorm';
import uploadConfig from '../config/uploadConfig';
import Category from '../models/Category';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  fileName: string;
}

interface TransactionCSV {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute({ fileName }: Request): Promise<Transaction[]> {
    const data = csvParse({ delimiter: ', ', from_line: 2 });

    const filePath = path.join(uploadConfig.directory, fileName);
    const csvStream = fs.createReadStream(filePath);

    const parse = csvStream.pipe(data);

    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    const transactionsCSV: TransactionCSV[] = [];

    parse.on('data', async line => {
      const [title, type, value, category] = line;

      transactionsCSV.push({ title, type, value, category });
    });

    await new Promise(resolve => parse.on('end', resolve));

    const categories = transactionsCSV
      .map(transection => transection.category)
      .filter((elem, pos, self) => {
        return self.indexOf(elem) === pos;
      })
      .map(category => categoryRepository.create({ title: category }));

    await getConnection()
      .createQueryBuilder()
      .insert()
      .into(Category)
      .values(categories)
      .execute();

    const transactions = transactionsCSV.map(transaction => {
      const category_id = categories.find(
        category => category.title === transaction.category,
      )?.id;

      return transactionsRepository.create({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category_id,
      });
    });

    await getConnection()
      .createQueryBuilder()
      .insert()
      .into(Transaction)
      .values(transactions)
      .execute();

    await fs.promises.unlink(filePath);

    return transactions;
  }
}

export default ImportTransactionsService;
