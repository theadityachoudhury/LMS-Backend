import { PrismaClient, Prisma } from '@prisma/client';

//what if it throws error
const dbQuery = new PrismaClient({
  log: ['warn', 'error'],
});

export { dbQuery, Prisma };
