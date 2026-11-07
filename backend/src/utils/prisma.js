// src/utils/prisma.js
// Shared PrismaClient singleton so the entire backend reuses a single
// connection pool to Supabase instead of opening 19 separate pools.
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

const prisma = globalForPrisma.__simesPrisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__simesPrisma = prisma;
}

export default prisma;
export { prisma };
