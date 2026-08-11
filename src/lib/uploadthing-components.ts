import { generateUploadButton, generateUploadDropzone } from "@uploadthing/react";
import type { VaultFileRouter } from "@/lib/uploadthing";

export const UploadButton = generateUploadButton<VaultFileRouter>();
export const UploadDropzone = generateUploadDropzone<VaultFileRouter>();
