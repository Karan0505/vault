import { createRouteHandler } from "uploadthing/next";
import { fileRouter } from "@/lib/uploadthing";

export const { GET, POST } = createRouteHandler({ router: fileRouter });
