import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";

const bodySchema = z.object({
  tag: z.string().min(1),
});

/**
 * Generic tag-based revalidation, guarded by a shared secret. Admin
 * mutations call revalidateProduct()/revalidateCategory() directly and
 * never need this route — it exists for out-of-process callers (a
 * future CMS webhook, a manual ops action) that only know a tag name.
 */
export async function POST(request: Request) {
  const secret = request.headers.get("x-revalidate-secret");
  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  revalidateTag(parsed.data.tag);
  return NextResponse.json({ revalidated: true, tag: parsed.data.tag });
}
