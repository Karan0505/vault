import { NextResponse } from "next/server";
import { auth, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categoryInputSchema } from "@/lib/validation";
import { revalidateCategory } from "@/lib/revalidate";

export async function GET() {
  const session = await auth();
  if (!requireStaff(session?.user.staffRole ?? null)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const categories = await prisma.category.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user.staffRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = categoryInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const category = await prisma.category.create({ data: parsed.data });
  revalidateCategory(category.slug);
  return NextResponse.json({ category }, { status: 201 });
}
