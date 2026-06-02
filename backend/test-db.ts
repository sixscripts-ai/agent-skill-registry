import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

async function runTests() {
  console.log('--- Starting Database Tests ---');
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Aborting tests.');
    process.exit(1);
  }
  
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // Test 1: Connect and run a simple query
    console.log('Testing connection...');
    await prisma.$queryRaw`SELECT 1 as result`;
    console.log('✅ Connection successful!');

    // Since we don't have the Prisma schema models handy, let's just test basic connectivity and raw SQL
    // We can also test SQL Injection handling by Prisma
    console.log('Testing SQL Injection protection (parameterized query)...');
    
    // Malicious payload that would cause issues if not parameterized properly
    const maliciousInput = "1; DROP TABLE users; --";
    
    // In Prisma, using $queryRaw with template literals uses parameterized queries, which protects against SQLi
    const result = await prisma.$queryRaw`SELECT * FROM pg_catalog.pg_tables WHERE tablename = ${maliciousInput}`;
    console.log('✅ SQL Injection protection confirmed (query executed safely without syntax error).');
    
    // Testing Error Handling
    console.log('Testing Database Error Handling...');
    try {
      await prisma.$queryRaw`SELECT * FROM table_that_does_not_exist`;
      console.log('❌ Error: Query should have failed but did not.');
    } catch (e) {
      console.log('✅ Error handling successful. Caught expected exception on invalid query.');
    }

  } catch (err) {
    console.error('Database tests failed!', err);
  } finally {
    await prisma.$disconnect();
    console.log('--- Database Tests Complete ---');
  }
}

runTests();
