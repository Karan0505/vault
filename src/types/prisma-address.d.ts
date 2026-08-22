import type { Prisma } from "@prisma/client";

declare module "@prisma/client" {
  export interface Address {
    id: string;
    userId: string;
    label: string;
    fullName: string;
    address: string;
    apartment: string | null;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone: string | null;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }

  export namespace Prisma {
    export interface AddressDelegate {
      findMany(args?: any): Promise<Address[]>;
      findFirst(args?: any): Promise<Address | null>;
      findFirstOrThrow(args?: any): Promise<Address>;
      create(args: any): Promise<Address>;
      update(args: any): Promise<Address>;
      updateMany(args: any): Promise<{ count: number }>;
      delete(args: any): Promise<Address>;
      count(args?: any): Promise<number>;
    }
  }

  export interface PrismaClient {
    address: Prisma.AddressDelegate;
  }
}
