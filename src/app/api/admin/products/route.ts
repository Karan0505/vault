import { NextResponse } from "next/server";
import { auth, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productInputSchema } from "@/lib/validation";
import { createProduct, DuplicateVariantError } from "@/lib/products.server";

export async function GET(request: Request) {
  const session = await auth();
  if (!requireStaff(session?.user.staffRole ?? null)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const take = Math.min(Number(searchParams.get("take") ?? 25), 100);

  const products = await prisma.product.findMany({
    take,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { updatedAt: "desc" },
    include: {
      category: true,
      variants: { select: { id: true, priceAmount: true, priceCurrency: true } },
    },
  });

  const nextCursor = products.length === take ? products[products.length - 1]?.id ?? null : null;

  return NextResponse.json({ products, nextCursor });
}

export async function POST(request: Request) {
  const session = await auth();
  const role = session?.user.staffRole ?? null;
  if (!requireStaff(role) || role === "support" || role === "fulfilment") {
    // Pricing and catalogue edits are admin-only — support/fulfilment are read-mostly here.
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = productInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const product = await createProduct(parsed.data, session?.user.id);
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateVariantError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Slug or SKU already in use" },
        { status: 409 }
      );
    }
    throw error;
  }
}
