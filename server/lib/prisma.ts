import { PrismaClient } from '@prisma/client';

// Single shared instance — avoids exhausting the pooled Postgres connection
// limit that multiple PrismaClient instances would otherwise each open.
export const prisma = new PrismaClient();
