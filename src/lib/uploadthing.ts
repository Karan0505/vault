import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/lib/auth";

const f = createUploadthing();

/**
 * Product media upload. Restricted to authenticated staff — customers
 * never hit this endpoint. Swap the provider for a raw S3 presigned-URL
 * flow later without touching callers: everything downstream only knows
 * about the resulting `url`.
 */
export const fileRouter = {
  productImage: f({ image: { maxFileSize: "8MB", maxFileCount: 10 } })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user?.staffRole) {
        throw new Error("Only staff can upload product media");
      }
      return { uploadedById: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedById: metadata.uploadedById, url: file.url };
    }),
} satisfies FileRouter;

export type VaultFileRouter = typeof fileRouter;
