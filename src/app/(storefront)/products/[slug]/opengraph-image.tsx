import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db/prisma";
import { formatMoney } from "@/lib/payments/money";

export const alt = "Product from VAULT";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let product: { title: string; variants: { priceAmount: number; priceCurrency: string }[] } | null = null;
  try {
    product = await prisma.product.findFirst({
      where: { slug, status: "active" },
      include: { variants: { orderBy: { priceAmount: "asc" }, take: 1 } },
    });
  } catch {
    // Graceful fallback for build-time rendering when DB is not reachable
  }

  const price = product?.variants[0];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "#0B0E11",
          color: "#EDF0F3",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "999px",
              border: "2px solid #D2A54F",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              color: "#D2A54F",
              fontStyle: "italic",
            }}
          >
            V
          </div>
          <div style={{ fontSize: 28, letterSpacing: 2 }}>VAULT</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 64, fontStyle: "italic", lineHeight: 1.15, maxWidth: 900 }}>
            {product?.title ?? "Product"}
          </div>
          {price && (
            <div style={{ fontSize: 34, color: "#B4863C", fontFamily: "monospace" }}>
              {formatMoney({ amount: price.priceAmount, currency: price.priceCurrency })}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
