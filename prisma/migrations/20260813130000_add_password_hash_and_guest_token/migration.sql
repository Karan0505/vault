-- AlterTable
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password') THEN
    ALTER TABLE "users" RENAME COLUMN "password" TO "passwordHash";
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='passwordHash') THEN
    ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT;
  END IF;
END $$;

-- AlterTable
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='guestToken') THEN
    ALTER TABLE "orders" ADD COLUMN "guestToken" TEXT;
  END IF;
END $$;
