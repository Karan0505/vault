-- AlterTable
ALTER TABLE "orders" DROP COLUMN IF EXISTS "guestToken";

-- AlterTable
ALTER TABLE "users" DROP COLUMN IF EXISTS "password";

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
