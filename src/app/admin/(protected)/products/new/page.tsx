import { prisma } from "@/lib/prisma";
import { ProductForm, type ProductFormValue } from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const initialValue: ProductFormValue = {
    title: "",
    slug: "",
    description: "",
    status: "draft",
    categoryId: null,
    optionNames: [],
    optionValues: {},
    variants: [],
    media: [],
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow">Catalogue</p>
        <h1 className="mt-2 font-display text-3xl text-ink-50">New product</h1>
      </div>
      <ProductForm categories={categories} initialValue={initialValue} />
    </div>
  );
}
