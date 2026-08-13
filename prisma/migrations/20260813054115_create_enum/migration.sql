/*
  Warnings:

  - You are about to drop the column `guestToken` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "orders" DROP COLUMN "guestToken";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "password";
