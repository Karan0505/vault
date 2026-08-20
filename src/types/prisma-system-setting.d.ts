import type { Prisma } from "@prisma/client";

export interface SystemSetting {
  key: string;
  value: Prisma.JsonValue;
  updatedAt: Date;
}

declare module "@prisma/client" {
  export interface PrismaClient {
    systemSetting: {
      findUnique(args: { where: { key: string } }): Promise<SystemSetting | null>;
      upsert(args: {
        where: { key: string };
        create: { key: string; value: Prisma.InputJsonValue };
        update: { value: Prisma.InputJsonValue };
      }): Promise<SystemSetting>;
      findMany(args?: any): Promise<SystemSetting[]>;
    };
  }
}
