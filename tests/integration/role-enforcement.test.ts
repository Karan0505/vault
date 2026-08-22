import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuditActor } from "@/lib/auth/audit.server";

const hasDb = Boolean(process.env.DATABASE_URL);

// getStaffActor is the one seam between "who is making this request" and
// everything downstream — mocking it here means these tests exercise the
// real route handlers (real hasPermission calls, real NextResponse
// construction) without needing a real authenticated session or a
// database, since a 401/403 response is returned before the route ever
// touches Prisma.
vi.mock("@/lib/auth/session", () => ({
  getStaffActor: vi.fn(),
}));

import { getStaffActor } from "@/lib/auth/session";
import { POST as refundRoute } from "@/app/api/admin/orders/[id]/refund/route";
import { POST as adjustRoute } from "@/app/api/admin/inventory/[variantId]/adjust/route";
import { PATCH as productPatchRoute } from "@/app/api/admin/products/[id]/route";

function actorWithRole(role: AuditActor["role"]): AuditActor {
  return { userId: "user_1", email: "staff@vault.internal", role };
}

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("role enforcement at the HTTP route boundary", () => {
  beforeEach(() => {
    vi.mocked(getStaffActor).mockReset();
  });

  it("support gets 403 from the refund route — the brief's exact constraint", async () => {
    vi.mocked(getStaffActor).mockResolvedValue(actorWithRole("support"));

    const response = await refundRoute(jsonRequest({ kind: "goodwill", amount: 100, reason: "test" }), {
      params: Promise.resolve({ id: "order_1" }),
    });

    expect(response.status).toBe(403);
  });

  it("fulfilment gets 403 from the product write route — the brief's other exact constraint", async () => {
    vi.mocked(getStaffActor).mockResolvedValue(actorWithRole("fulfilment"));

    const response = await productPatchRoute(
      jsonRequest({
        title: "Test",
        slug: "test",
        status: "draft",
        categoryId: null,
        optionNames: [],
        variants: [],
        media: [],
      }),
      { params: Promise.resolve({ id: "product_1" }) }
    );

    expect(response.status).toBe(403);
  });

  it("support gets 403 from the inventory adjustment route", async () => {
    vi.mocked(getStaffActor).mockResolvedValue(actorWithRole("support"));

    const response = await adjustRoute(jsonRequest({ delta: 5, reason: "received" }), {
      params: Promise.resolve({ variantId: "variant_1" }),
    });

    expect(response.status).toBe(403);
  });

  it("an unauthenticated request gets 401, not 403, from a permission-gated route", async () => {
    vi.mocked(getStaffActor).mockResolvedValue(null);

    const response = await refundRoute(jsonRequest({ kind: "goodwill", amount: 100, reason: "test" }), {
      params: Promise.resolve({ id: "order_1" }),
    });

    expect(response.status).toBe(401);
  });

  it.skipIf(!hasDb)("fulfilment (unlike support) is not rejected by the refund route's permission check", async () => {
    vi.mocked(getStaffActor).mockResolvedValue(actorWithRole("fulfilment"));

    const response = await refundRoute(jsonRequest({ kind: "goodwill", amount: 100, reason: "test" }), {
      params: Promise.resolve({ id: "order_1" }),
    });

    // Malformed body (missing nothing here, but no DB in this test
    // context) — the point under test is only that the permission gate
    // itself passed fulfilment through; it must not be 403.
    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(401);
  });
});
