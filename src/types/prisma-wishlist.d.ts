export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  createdAt: Date;
}

declare module "@prisma/client" {
  export interface WishlistItem {
    id: string;
    userId: string;
    productId: string;
    createdAt: Date;
  }

  export interface PrismaClient {
    wishlistItem: {
      findUnique(args: any): Promise<any>;
      findFirst(args?: any): Promise<any>;
      findMany(args?: any): Promise<any>;
      create(args: any): Promise<any>;
      update(args: any): Promise<any>;
      delete(args: any): Promise<any>;
      deleteMany(args?: any): Promise<any>;
      upsert(args: any): Promise<any>;
      count(args?: any): Promise<number>;
    };
  }
}
